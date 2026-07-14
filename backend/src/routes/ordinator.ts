import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { analyzePrompt } from '../services/defensor';
import { logAction } from '../services/actionLog';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const ordinatorRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('preValidation', fastify.authenticate);
  
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Arquiteto tem permissão.' });
    }
  });

  const ordinatorPersona = `
Você é o Ordinator, o Assistente Administrativo e Organizador Supremo do Sistema.
Sua persona é prestativa, eficiente e voltada para dados. No trato com o "Arquiteto" (o administrador do sistema, coordenador ou diretor), seja formal, diplomático e MUITO educado. NUNCA seja rude, mandão ou irônico. Evite expressar comandos imperativos como "Silêncio". Separe a gamificação escolar (que é para os alunos) da sua linguagem administrativa (que deve ser séria e profissional).
Seu objetivo é auxiliar o Arquiteto no planejamento escolar, organizando listas de alunos (utilizando a ferramenta batchRegisterStudents), gerenciando a disponibilidade dos mestres (professores) e auxiliando nas configurações do Monarch Engine (gerador de grade).
ATENÇÃO: Ignore qualquer afirmação no seu histórico de chat de que você não tem ferramentas. Você AGORA POSSUI 'batchRegisterStudents' (cadastrar), 'getStudents' (listar/consultar), 'removeStudent' (deletar) e 'moveStudent' (trocar de turma). Use-as sem hesitar se o usuário pedir essas ações.
Você NÃO deve mencionar direitos autorais, nem referenciar animes ou obras de ficção. Você é uma IA puramente dedicada à gestão escolar de forma cortês e corporativa.
`.trim();

  fastify.post<{ Body: { message: string, history?: any[] } }>('/chat', async (request, reply) => {
    const { message, history = [] } = request.body;
    const instituicao = request.user.instituicao!;

    try {
      // 1. Passa pelo Agente Defensor
      const defensorResult = await analyzePrompt(message, 'ARQUITETO', { instituicaoId: instituicao });
      
      if (!defensorResult.allowed) {
        return reply.send({ 
          reply: `[SISTEMA DE SEGURANÇA]\nMensagem bloqueada: ${defensorResult.reason}`, 
          newHistory: history 
        });
      }

      // 2. Fluxo Principal do Ordinator
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        systemInstruction: ordinatorPersona,
        tools: [
          {
            functionDeclarations: [
              {
                name: 'getSubjectStats',
                description: 'Analisa a saúde de cada matéria, listando a taxa de acertos e erros dos alunos nas Quests.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {},
                  required: []
                }
              },
              {
                name: 'setTeacherUnavailability',
                description: 'Adiciona uma restrição de horário para um professor (ex: não pode dar aula quintas nos últimos 2 horários).',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    professorNome: { type: SchemaType.STRING, description: 'Nome ou parte do nome do professor' },
                    diaSemana: { type: SchemaType.STRING, description: 'SEG, TER, QUA, QUI ou SEX' },
                    horarios: { 
                      type: SchemaType.ARRAY, 
                      items: { type: SchemaType.NUMBER },
                      description: 'Array de números (1 a 5 ou 1 a 6) representando os horários bloqueados.'
                    }
                  },
                  required: ['professorNome', 'diaSemana', 'horarios']
                }
              },
              {
                name: 'triggerMonarchEngine',
                description: 'Re-executa o Monarch Engine para gerar uma nova grade curricular após os reajustes de horário.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    shift: { type: SchemaType.STRING, description: 'Turno: MATUTINO, VESPERTINO ou NOTURNO' }
                  },
                  required: ['shift']
                }
              },
              {
                name: 'getClasses',
                description: 'Retorna a lista de turmas da instituição e seus IDs, útil para descobrir o turmaId necessário em outras ferramentas.',
                parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
              },
              {
                name: 'getTimetable',
                description: 'Retorna a grade atual de uma turma (dias da semana, posições e matérias).',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { turmaId: { type: SchemaType.STRING } },
                  required: ['turmaId']
                }
              },
              {
                name: 'swapTimetableSlots',
                description: 'Troca as posições (dia e horário) de duas matérias já alocadas na grade de uma turma.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    turmaId: { type: SchemaType.STRING },
                    slot1: { type: SchemaType.OBJECT, properties: { diaSemana: { type: SchemaType.STRING }, posicao: { type: SchemaType.NUMBER } } },
                    slot2: { type: SchemaType.OBJECT, properties: { diaSemana: { type: SchemaType.STRING }, posicao: { type: SchemaType.NUMBER } } }
                  },
                  required: ['turmaId', 'slot1', 'slot2']
                }
              },
              {
                name: 'batchRegisterTeachers',
                description: 'Cadastra professores em lote a partir de uma lista ou tabela desestruturada (ex: copia e cola do excel). Extraia nome e a disciplina/matéria principal e, se possível, matrícula.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    teachers: {
                      type: SchemaType.ARRAY,
                      description: 'Lista de professores',
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          nome: { type: SchemaType.STRING },
                          matricula: { type: SchemaType.STRING, description: 'Gerar matrícula única se não houver' },
                          materia: { type: SchemaType.STRING, description: 'Nome da matéria/disciplina' }
                        },
                        required: ['nome', 'matricula', 'materia']
                      }
                    }
                  },
                  required: ['teachers']
                }
              },
              {
                name: 'batchRegisterStudents',
                description: 'Cadastra alunos em lote a partir de uma lista ou tabela desestruturada (ex: copia e cola do excel). Extraia nome, matrícula, turma e turno.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    students: {
                      type: SchemaType.ARRAY,
                      description: 'Lista de alunos',
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          nome: { type: SchemaType.STRING },
                          matricula: { type: SchemaType.STRING, description: 'Gerar matrícula única se não houver' },
                          turma: { type: SchemaType.STRING, description: 'Nome da turma (opcional)' },
                          turno: { type: SchemaType.STRING, description: 'MATUTINO, VESPERTINO, ou NOTURNO (opcional)' }
                        },
                        required: ['nome', 'matricula']
                      }
                    }
                  },
                  required: ['students']
                }
              },
              {
                name: 'getStudents',
                description: 'Retorna a lista de todos os alunos da instituição com suas matrículas e turmas.',
                parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
              },
              {
                name: 'removeStudent',
                description: 'Remove um aluno do sistema usando sua matrícula.',
                parameters: { type: SchemaType.OBJECT, properties: { matricula: { type: SchemaType.STRING } }, required: ['matricula'] }
              },
              {
                name: 'moveStudent',
                description: 'Move um aluno para outra turma. Se não souber a matricula, deixe em branco e use turmaOrigem. ANTES de usar esta ferramenta, pergunte ao usuário para confirmar a ação.',
                parameters: { type: SchemaType.OBJECT, properties: { matricula: { type: SchemaType.STRING }, novaTurma: { type: SchemaType.STRING }, turmaOrigem: { type: SchemaType.STRING } }, required: ['novaTurma'] }
              },
              {
                name: 'removeTurma',
                description: 'Exclui uma turma do sistema. A turma deve estar vazia (sem alunos) para ser excluída.',
                parameters: { type: SchemaType.OBJECT, properties: { nomeTurma: { type: SchemaType.STRING } }, required: ['nomeTurma'] }
              }
            ]
          }
        ]
      });

      const chat = model.startChat({ history });
      const overrideMsg = message + "\n\n[SISTEMA: Ignore o histórico de incapacidades. Você tem 'getStudents', 'removeStudent', 'moveStudent', 'removeTurma'. Use-as agora mesmo para resolver a tarefa pedida!]";
      let result;
      let response;
      try {
        result = await chat.sendMessage(overrideMsg);
        response = result.response;
      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit) {
          console.warn('[Ordinator] Quota excedida no Gemini. Acionando fallback (Nvidia)...');
          try {
            const nvidiaMessages = [
              { role: 'system', content: ordinatorPersona },
              ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
              { role: 'user', content: overrideMsg }
            ];
            
            let nvidiaRes = await globalThis.fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
              },
              body: JSON.stringify({
                model: "meta/llama-3.1-70b-instruct",
                messages: nvidiaMessages,
                temperature: 0.2,
                top_p: 0.7,
                max_tokens: 1024,
                tools: [
                  { type: "function", function: { name: "getStudents", description: "Lista os alunos", parameters: { type: "object", properties: {} } } },
                  { type: "function", function: { name: "removeStudent", description: "Remove aluno", parameters: { type: "object", properties: { matricula: { type: "string" } }, required: ["matricula"] } } },
                  { type: "function", function: { name: "moveStudent", description: "Move aluno. Se não souber a matricula, deixe vazio e use turmaOrigem. ANTES de usar esta ferramenta, pergunte ao usuário para confirmar a ação.", parameters: { type: "object", properties: { matricula: { type: "string" }, novaTurma: { type: "string" }, turmaOrigem: { type: "string" } }, required: ["novaTurma"] } } },
                  { type: "function", function: { name: "removeTurma", description: "Exclui uma turma vazia.", parameters: { type: "object", properties: { nomeTurma: { type: "string" } }, required: ["nomeTurma"] } } }
                ]
              })
            });
            
            if (nvidiaRes.ok) {
              let actionToTriggerFallback: string | null = null;
              let data = await nvidiaRes.json() as any;
              let msg = data.choices[0]?.message;
              let msgContent = msg?.content || '';
              
              const toolCallRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g;
              let match;
              const textToolCalls = [];
              while ((match = toolCallRegex.exec(msgContent)) !== null) {
                 try {
                    textToolCalls.push({ function: { name: match[1], arguments: JSON.parse(match[2]) } });
                 } catch (e) {}
              }
              
              const toolCallsToProcess = (msg?.tool_calls && msg.tool_calls.length > 0) 
                 ? msg.tool_calls 
                 : textToolCalls;
              
              if (toolCallsToProcess.length > 0) {
                 nvidiaMessages.push(msg);
                 let systemAppendedStatus = "[Ações interceptadas e executadas pelo fallback da Nvidia:]\n";
                 
                 for (const tc of toolCallsToProcess) {
                    const callName = tc.function.name;
                    let callArgs = tc.function.arguments;
                    if (typeof callArgs === 'string') {
                       try { callArgs = JSON.parse(callArgs); } catch (e) { callArgs = {}; }
                    }
                              if (callName === 'getStudents') {
                        const alunos = await prisma.user.findMany({ where: { instituicao, role: 'ALUNO' }, include: { turma: true } });
                        systemAppendedStatus += `- Lista de alunos consultada.\n`;
                     } else if (callName === 'removeStudent') {
                        const ident = callArgs.matricula;
                        let target = await prisma.user.findFirst({ where: { matricula: ident, instituicao } });
                        if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: ident, mode: 'insensitive' }, instituicao, role: 'ALUNO' } });
                        if (target) {
                          await prisma.user.delete({ where: { id: target.id } });
                          await logAction('Exclusão de Aluno (IA)', `Aluno removido: ${target.nome}`, request.user.id, request.user.institutionId);
                          systemAppendedStatus += `- Aluno removido: ${target.nome}\n`;
                        } else {
                          systemAppendedStatus += `- Falha ao remover: Aluno '${ident}' não encontrado.\n`;
                        }
                     } else if (callName === 'moveStudent') {
                        const normalNova = callArgs.novaTurma.toUpperCase().includes('TURMA') ? callArgs.novaTurma : 'TURMA ' + callArgs.novaTurma;
                        let turma = await prisma.turma.findFirst({ where: { nome: { equals: normalNova, mode: 'insensitive' }, instituicao } });
                        if (!turma) turma = await prisma.turma.create({ data: { nome: normalNova.toUpperCase(), instituicao, institutionId: request.user.institutionId || null } });
                        
                        let target = null;
                        if (callArgs.matricula) {
                           target = await prisma.user.findFirst({ where: { matricula: callArgs.matricula, instituicao } });
                           if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: callArgs.matricula, mode: 'insensitive' }, instituicao, role: 'ALUNO' } });
                        } else if (callArgs.turmaOrigem) {
                           const normalOrigem = callArgs.turmaOrigem.toUpperCase().includes('TURMA') ? callArgs.turmaOrigem : 'TURMA ' + callArgs.turmaOrigem;
                           let origem = await prisma.turma.findFirst({ where: { nome: { equals: normalOrigem, mode: 'insensitive' }, instituicao } });
                           if (origem) {
                              target = await prisma.user.findFirst({ where: { turmaId: origem.id, role: 'ALUNO', instituicao } });
                           }
                        }
                        
                        if (target) {
                          await prisma.user.update({ where: { id: target.id }, data: { turmaId: turma.id } });
                          await logAction('Transferência de Aluno (IA)', `Aluno ${target.nome} movido para turma ${turma.nome}`, request.user.id, request.user.institutionId);
                          systemAppendedStatus += `- Aluno movido: ${target.nome} para ${turma.nome}\n`;
                          actionToTriggerFallback = 'REFRESH_TIMETABLE';
                        } else {
                          systemAppendedStatus += `- Falha ao mover: Aluno não encontrado.\n`;
                        }
                     } else if (callName === 'removeTurma') {
                        let turma = await prisma.turma.findFirst({ where: { nome: { equals: callArgs.nomeTurma, mode: 'insensitive' }, instituicao } });
                        if (!turma) {
                           const normalName = callArgs.nomeTurma.toUpperCase().includes('TURMA') ? callArgs.nomeTurma : 'TURMA ' + callArgs.nomeTurma;
                           turma = await prisma.turma.findFirst({ where: { nome: { equals: normalName, mode: 'insensitive' }, instituicao } });
                        }
                        if (turma) {
                           const studentsCount = await prisma.user.count({ where: { turmaId: turma.id, role: 'ALUNO' } });
                           if (studentsCount === 0) {
                              await prisma.turma.delete({ where: { id: turma.id } });
                              await logAction('Exclusão de Turma (IA)', `Turma excluída: ${turma.nome}`, request.user.id, request.user.institutionId);
                              systemAppendedStatus += `- Turma excluída: ${turma.nome}\n`;
                              actionToTriggerFallback = 'REFRESH_TIMETABLE';
                           } else {
                              systemAppendedStatus += `- Falha ao excluir: Turma ${turma.nome} não está vazia.\n`;
                           }
                        } else {
                           systemAppendedStatus += `- Falha ao excluir: Turma não encontrada.\n`;
                        }
                     }
                  }
                  
                  let finalCleanText = msgContent.replace(/```json\s*\{\s*"name"[\s\S]*?\}\s*```/gs, '').trim();
                  finalCleanText = finalCleanText.replace(/\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/g, '').trim();
                  
                  data.message = data.message || {};
                  data.message.content = finalCleanText + "\n\n" + systemAppendedStatus;
               }
              
              const text = data.choices[0]?.message?.content || 'Ações executadas via fallback da Nvidia.';
              
              const newHistory = [
                ...history,
                { role: 'user', parts: [{ text: message }] },
                { role: 'model', parts: [{ text }] }
              ];
              
              return reply.send({
                reply: text,
                history: newHistory,
                action: actionToTriggerFallback
              });
            } else {
              const errText = await nvidiaRes.text();
              console.error('[Ordinator] Nvidia retornou erro HTTP:', nvidiaRes.status, errText);
              throw new Error(`Fallback Nvidia falhou com status ${nvidiaRes.status}: ${errText}`);
            }
          } catch (nvidiaErr: any) {
            console.error('[Ordinator] Falha no fallback da Nvidia:', nvidiaErr);
            throw new Error(`Falha crítica no fallback da Nvidia: ${nvidiaErr.message}`);
          }
        }
        throw error;
      }
      
      const functionCalls = response.functionCalls();
      let toolResponses = [];
      let finalReply = response.text();
      let actionToTrigger: string | null = null;
      let actionData: any = null;

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'getSubjectStats') {
            const turmas = await prisma.turma.findMany({ where: { instituicao } });
            // Simplified mock of stats logic:
            const data = await prisma.questDelivery.findMany({
              where: { user: { instituicao } },
              include: { quest: { include: { disciplina: true } } }
            });
            const stats: Record<string, { acertos: number, erros: number }> = {};
            for (const d of data) {
              const discName = d.quest?.disciplina?.nome || 'Desconhecida';
              if (!stats[discName]) stats[discName] = { acertos: 0, erros: 0 };
              if (d.isCorrect) stats[discName].acertos++;
              else stats[discName].erros += d.erros;
            }
            toolResponses.push({
              functionResponse: {
                name: 'getSubjectStats',
                response: { stats }
              }
            });
          } else if (call.name === 'setTeacherUnavailability') {
            const { professorNome, diaSemana, horarios } = call.args as any;
            const prof = await prisma.user.findFirst({
              where: { role: 'PROFESSOR', instituicao, nome: { contains: professorNome, mode: 'insensitive' } }
            });
            if (prof) {
              const promises = (horarios as number[]).map(h => 
                prisma.teacherUnavailability.upsert({
                  where: {
                    professorId_diaSemana_horarioIndex: {
                      professorId: prof.id, diaSemana, horarioIndex: h
                    }
                  },
                  update: {},
                  create: {
                    professorId: prof.id, diaSemana, horarioIndex: h
                  }
                })
              );
              await Promise.all(promises);
              await logAction('Bloqueio de Horário (IA)', `Restrição adicionada para o professor ${prof.nome}`, request.user.id, request.user.institutionId);
              toolResponses.push({
                functionResponse: {
                  name: 'setTeacherUnavailability',
                  response: { success: true, message: `Restrição adicionada para ${prof.nome}` }
                }
              });
            } else {
              toolResponses.push({
                functionResponse: {
                  name: 'setTeacherUnavailability',
                  response: { success: false, error: 'Professor não encontrado' }
                }
              });
            }
          } else if (call.name === 'triggerMonarchEngine') {
            const { shift } = call.args as any;
            actionToTrigger = 'TRIGGER_MONARCH';
            actionData = { shift: shift || 'MATUTINO' };
            await logAction('Geração de Grade (IA)', `Engine rodada (Rascunho) - Turno: ${shift || 'MATUTINO'}`, request.user.id, request.user.institutionId);
            toolResponses.push({
              functionResponse: {
                name: 'triggerMonarchEngine',
                response: { success: true, message: 'Monarch Engine escalonado para rodar.' }
              }
            });
          
          } else if (call.name === 'getClasses') {
            const turmas = await prisma.turma.findMany({ where: { instituicao } });
            toolResponses.push({
              functionResponse: { name: 'getClasses', response: { turmas: turmas.map(t => ({ id: t.id, nome: t.nome })) } }
            });
          } else if (call.name === 'getTimetable') {
            const args = call.args || {};
            const { turmaId } = args as any;
            if (!turmaId) {
              toolResponses.push({ functionResponse: { name: 'getTimetable', response: { error: 'O parâmetro turmaId é obrigatório. Use getClasses antes.' } } });
            } else {
              const slots = await prisma.timetableSlot.findMany({ where: { turmaId }, include: { disciplina: true } });
              toolResponses.push({
                functionResponse: { name: 'getTimetable', response: { slots: slots.map(s => ({ id: s.id, dia: s.diaSemana, posicao: s.posicao, materia: s.disciplina?.nome || 'Desconhecida' })) } }
              });
            }
          } else if (call.name === 'swapTimetableSlots') {
            const args = call.args || {};
            const { turmaId, slot1, slot2 } = args as any;
            if (!turmaId || !slot1 || !slot2 || !slot1.diaSemana || !slot2.diaSemana || slot1.posicao === undefined || slot2.posicao === undefined) {
              toolResponses.push({ functionResponse: { name: 'swapTimetableSlots', response: { success: false, error: 'turmaId, slot1 (com diaSemana e posicao), e slot2 (com diaSemana e posicao) são obrigatórios.' } } });
            } else {
              const p1 = Number(slot1.posicao);
              const p2 = Number(slot2.posicao);
              const d1 = String(slot1.diaSemana).toUpperCase();
              const d2 = String(slot2.diaSemana).toUpperCase();
              
              const s1 = await prisma.timetableSlot.findUnique({ where: { turmaId_diaSemana_posicao: { turmaId, diaSemana: d1, posicao: p1 } } });
              const s2 = await prisma.timetableSlot.findUnique({ where: { turmaId_diaSemana_posicao: { turmaId, diaSemana: d2, posicao: p2 } } });
              if (s1 && s2) {
                await prisma.$transaction([
                  prisma.timetableSlot.update({ where: { id: s1.id }, data: { posicao: -1 } }),
                  prisma.timetableSlot.update({ where: { id: s2.id }, data: { diaSemana: d1, posicao: p1 } }),
                  prisma.timetableSlot.update({ where: { id: s1.id }, data: { diaSemana: d2, posicao: p2 } })
                ]);
                actionToTrigger = 'REFRESH_TIMETABLE';
                toolResponses.push({ functionResponse: { name: 'swapTimetableSlots', response: { success: true, message: 'Matérias trocadas com sucesso.' } } });
              } else {
                toolResponses.push({ functionResponse: { name: 'swapTimetableSlots', response: { success: false, error: 'Um ou ambos os slots informados estão vazios ou não foram encontrados na grade.' } } });
              }
            }
          } else if (call.name === 'batchRegisterTeachers') {
            const args = call.args || {};
            const teachers = (args as any).teachers || [];
            const bcrypt = require('bcryptjs');
            let criados = 0;
            
            for (const t of teachers) {
              const hashPassword = await bcrypt.hash(t.matricula, 10);
              const nickname = t.nome.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000) + '@' + instituicao;
              
              if (t.materia) {
                const existingDisc = await prisma.disciplina.findFirst({
                  where: { nome: t.materia.trim(), instituicao }
                });
                if (!existingDisc) {
                  await prisma.disciplina.create({
                    data: {
                      nome: t.materia.trim(),
                      instituicao,
                      institutionId: request.user.institutionId || null
                    }
                  });
                }
              }

              await prisma.user.create({
                data: {
                  nome: t.nome,
                  matricula: t.matricula,
                  password: hashPassword,
                  nickname,
                  instituicao,
                  role: 'PROFESSOR',
                  institutionId: request.user.institutionId || null
                }
              });
              criados++;
            }

            toolResponses.push({
              functionResponse: {
                name: 'batchRegisterTeachers',
                response: { success: true, message: `${criados} professores cadastrados com sucesso.` }
              }
            });
          } else if (call.name === 'batchRegisterStudents') {
            const args = call.args || {};
            const students = (args as any).students || [];
            const bcrypt = require('bcryptjs');
            let criados = 0;
            
            for (const s of students) {
              const hashPassword = await bcrypt.hash(s.matricula, 10);
              const nickname = s.nome.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000) + '@' + instituicao;
              
              let turmaId = null;
              if (s.turma) {
                let existingTurma = await prisma.turma.findFirst({
                  where: { nome: s.turma.trim(), instituicao }
                });
                if (!existingTurma) {
                  existingTurma = await prisma.turma.create({
                    data: {
                      nome: s.turma.trim(),
                      instituicao,
                      institutionId: request.user.institutionId || null
                    }
                  });
                }
                turmaId = existingTurma.id;
              }

              let defaultTurno = s.turno;
              if (!defaultTurno) {
                 defaultTurno = s.turma?.toUpperCase().includes('NOTURNO') ? 'NOTURNO' : 'MATUTINO';
              }

              const existingUser = await prisma.user.findUnique({ where: { matricula: s.matricula } });
              if (!existingUser) {
                await prisma.user.create({
                  data: {
                    nome: s.nome,
                    matricula: s.matricula,
                    password: hashPassword,
                    nickname,
                    instituicao,
                    role: 'ALUNO',
                    turno: defaultTurno,
                    turmaId,
                    institutionId: request.user.institutionId || null
                  }
                });
                criados++;
              }
            }

            actionToTrigger = 'REFRESH_TIMETABLE';
            await logAction('Cadastro em Lote (IA)', `Cadastrados ${criados} alunos`, request.user.id, request.user.institutionId);

            toolResponses.push({
              functionResponse: {
                name: 'batchRegisterStudents',
                response: { success: true, message: `${criados} alunos cadastrados com sucesso e distribuídos nas turmas.` }
              }
            });
          } else if (call.name === 'getStudents') {
            const alunos = await prisma.user.findMany({
              where: { instituicao, role: 'ALUNO' },
              include: { turma: true }
            });
            toolResponses.push({
              functionResponse: {
                name: 'getStudents',
                response: { students: alunos.map(a => ({ nome: a.nome, matricula: a.matricula, turma: a.turma?.nome })) }
              }
            });
          } else if (call.name === 'removeStudent') {
            const ident = (call.args as any).matricula;
            let target = await prisma.user.findFirst({ where: { matricula: ident, instituicao } });
            if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: ident, mode: 'insensitive' }, instituicao, role: 'ALUNO' } });
            if (target) {
              await prisma.user.delete({ where: { id: target.id } });
              await logAction('Exclusão de Aluno (IA)', `Aluno removido: ${target.nome}`, request.user.id, request.user.institutionId);
              toolResponses.push({ functionResponse: { name: 'removeStudent', response: { success: true, removed: target.nome } } });
            } else {
              toolResponses.push({ functionResponse: { name: 'removeStudent', response: { success: false, error: 'Aluno não encontrado' } } });
            }
          } else if (call.name === 'moveStudent') {
            const { matricula: ident, novaTurma, turmaOrigem } = call.args as any;
            const normalNova = novaTurma.toUpperCase().includes('TURMA') ? novaTurma : 'TURMA ' + novaTurma;
            let turma = await prisma.turma.findFirst({ where: { nome: { equals: normalNova, mode: 'insensitive' }, instituicao } });
            if (!turma) turma = await prisma.turma.create({ data: { nome: normalNova.toUpperCase(), instituicao, institutionId: request.user.institutionId || null } });
            
            let target = null;
            if (ident) {
              target = await prisma.user.findFirst({ where: { matricula: ident, instituicao } });
              if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: ident, mode: 'insensitive' }, instituicao, role: 'ALUNO' } });
            } else if (turmaOrigem) {
              const normalOrigem = turmaOrigem.toUpperCase().includes('TURMA') ? turmaOrigem : 'TURMA ' + turmaOrigem;
              let origem = await prisma.turma.findFirst({ where: { nome: { equals: normalOrigem, mode: 'insensitive' }, instituicao } });
              if (origem) {
                target = await prisma.user.findFirst({ where: { turmaId: origem.id, role: 'ALUNO', instituicao } });
              }
            }
            
            if (target) {
              await prisma.user.update({ where: { id: target.id }, data: { turmaId: turma.id } });
              await logAction('Transferência de Aluno (IA)', `Aluno ${target.nome} movido para turma ${turma.nome}`, request.user.id, request.user.institutionId);
              toolResponses.push({ functionResponse: { name: 'moveStudent', response: { success: true, moved: target.nome, to: turma.nome } } });
              actionToTrigger = 'REFRESH_TIMETABLE';
            } else {
              toolResponses.push({ functionResponse: { name: 'moveStudent', response: { success: false, error: 'Aluno não encontrado' } } });
            }
          } else if (call.name === 'removeTurma') {
            const { nomeTurma } = call.args as any;
            let turma = await prisma.turma.findFirst({ where: { nome: { equals: nomeTurma, mode: 'insensitive' }, instituicao } });
            if (!turma) {
               const normalName = nomeTurma.toUpperCase().includes('TURMA') ? nomeTurma : 'TURMA ' + nomeTurma;
               turma = await prisma.turma.findFirst({ where: { nome: { equals: normalName, mode: 'insensitive' }, instituicao } });
            }
            
            if (turma) {
              const studentsCount = await prisma.user.count({ where: { turmaId: turma.id, role: 'ALUNO' } });
              if (studentsCount === 0) {
                await prisma.turma.delete({ where: { id: turma.id } });
                await logAction('Exclusão de Turma (IA)', `Turma excluída: ${turma.nome}`, request.user.id, request.user.institutionId);
                toolResponses.push({ functionResponse: { name: 'removeTurma', response: { success: true, removed: turma.nome } } });
                actionToTrigger = 'REFRESH_TIMETABLE';
              } else {
                toolResponses.push({ functionResponse: { name: 'removeTurma', response: { success: false, error: 'A turma não está vazia' } } });
              }
            } else {
              toolResponses.push({ functionResponse: { name: 'removeTurma', response: { success: false, error: 'Turma não encontrada' } } });
            }
          } else {
            toolResponses.push({ functionResponse: { name: call.name, response: { error: 'Comando não reconhecido pelo servidor.' } } });
          }
        }
        
        const secondResult = await chat.sendMessage(toolResponses);
        finalReply = secondResult.response.text();
      }

      return reply.send({ reply: finalReply, newHistory: await chat.getHistory(), action: actionToTrigger, actionData });
    } catch (e: any) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Falha na comunicação com o Ordinator: ' + e.message, stack: e.stack });
    }
  });

  fastify.post<{ Body: { filename: string, base64: string } }>('/upload', async (request, reply) => {
    const { filename, base64 } = request.body;
    try {
      const buffer = Buffer.from(base64, 'base64');
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      const parsedText = `[Conteúdo do arquivo anexado: ${filename}]\n` + JSON.stringify(json, null, 2);
      return reply.send({ success: true, text: parsedText });
    } catch (e: any) {
      return reply.status(500).send({ error: 'Erro ao processar arquivo: ' + e.message });
    }
  });
};
