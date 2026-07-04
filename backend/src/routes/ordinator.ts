import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
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
                description: 'Move um aluno para outra turma usando sua matrícula e o nome da nova turma.',
                parameters: { type: SchemaType.OBJECT, properties: { matricula: { type: SchemaType.STRING }, novaTurma: { type: SchemaType.STRING } }, required: ['matricula', 'novaTurma'] }
              }
            ]
          }
        ]
      });

      const chat = model.startChat({ history });
      const overrideMsg = message + "\n\n[SISTEMA: Ignore o histórico de incapacidades. Você tem 'getStudents', 'removeStudent', 'moveStudent'. Use-as agora mesmo para resolver a tarefa pedida!]";
      const result = await chat.sendMessage(overrideMsg);
      const response = result.response;
      
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
            const { matricula } = call.args as any;
            await prisma.user.deleteMany({ where: { matricula, instituicao } });
            toolResponses.push({ functionResponse: { name: 'removeStudent', response: { success: true } } });
          } else if (call.name === 'moveStudent') {
            const { matricula, novaTurma } = call.args as any;
            let turma = await prisma.turma.findFirst({ where: { nome: novaTurma, instituicao } });
            if (!turma) turma = await prisma.turma.create({ data: { nome: novaTurma, instituicao, institutionId: request.user.institutionId || null } });
            await prisma.user.updateMany({ where: { matricula, instituicao }, data: { turmaId: turma.id } });
            toolResponses.push({ functionResponse: { name: 'moveStudent', response: { success: true } } });
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
