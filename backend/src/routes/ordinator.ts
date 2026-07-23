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

    if (request.user.institutionId || request.user.instituicao) {
      const inst = request.user.institutionId
        ? await prisma.institution.findUnique({ where: { id: request.user.institutionId } })
        : await prisma.institution.findFirst({ where: { nome: request.user.instituicao || '' } });
      if (inst && inst.plano !== 'RANK_S') {
        return reply.status(403).send({ error: 'O assistente Ordinator está disponível exclusivamente no Plano RANK S. Atualize seu plano para utilizar o Ordinator.' });
      }
    }
  });

  const ordinatorPersona = `
Você é o Ordinator, o Assistente Administrativo e Organizador Supremo do Sistema.
Sua persona é prestativa, eficiente e voltada para dados. No trato com o "Arquiteto" (o administrador do sistema, coordenador ou diretor), seja formal, diplomático e MUITO educado. NUNCA seja rude, mandão ou irônico. Separe a gamificação escolar (que é para os alunos) da sua linguagem administrativa (que deve ser séria e profissional).
Seu objetivo é auxiliar o Arquiteto no planejamento escolar, organizando listas de alunos (utilizando a ferramenta batchRegisterStudents), gerenciando a disponibilidade dos mestres (professores) e auxiliando nas configurações do Monarch Engine (gerador de grade).
Você possui a ferramenta 'searchRegulations' (que agora pesquisa semanticamente todo o banco de dados da escola, incluindo alunos, professores, turmas e logs). Use-a sempre que precisar consultar qualquer dado escolar ou relatórios de auditoria.

REGRA CRÍTICA DE CADASTRO:
Quando o Arquiteto solicitar a criação ou cadastro de um Aluno, de um Professor (Mestre) ou de uma Turma, você deve obrigatoriamente validar os campos necessários. Se houver informações faltantes, NÃO gere valores fictícios (como matrículas, turmas ou categorias de contratação aleatórias) e NÃO chame a ferramenta de cadastro. Em vez disso, responda perguntando explicitamente no chat quais são os dados faltantes.
Campos obrigatórios:
- Para Professores (Mestres): Nome completo, Matrícula, Categoria de contratação (CLT, REDA ou Concursado) e Carga horária (maxAulasSemanais).
- Para Alunos: Nome completo, Matrícula, Turma e Turno (Matutino, Vespertino ou Noturno).
- Para Turmas: Nome da turma, Ano letivo e Nível de ensino (Fundamental ou Médio).
`.trim();

  fastify.post<{ Body: { message: string, sessionId?: string } }>('/chat', async (request, reply) => {
    let { message, sessionId } = request.body;
    const instituicao = request.user.instituicao!;
    const userId = request.user.id;
    let widget: any = null;

    try {
      // Auto-RAG background synchronization trigger
      const { syncInstitutionDatabaseToRag } = require('../services/ragSyncService');
      syncInstitutionDatabaseToRag(instituicao, request.user.institutionId).catch(console.error);

      let bypassLlm = false;
      let bypassReply = "";
      let originalMessage = message;
      
      const fileMatch = message.match(/\[Conteúdo do arquivo anexado: [^\]]+\]\n(\[[\s\S]*\])/);
      if (fileMatch) {
         try {
             const extractedData = JSON.parse(fileMatch[1]);
             if (Array.isArray(extractedData) && extractedData.length > 0 && (extractedData[0].nome || extractedData[0].Nome)) {
                const lowerMsg = message.toLowerCase();
                if (lowerMsg.includes('crie') || lowerMsg.includes('cadastr') || lowerMsg.includes('adicion') || lowerMsg.includes('import') || lowerMsg.includes('regist')) {
                   bypassLlm = true;
                   widget = {
                     type: 'BATCH_CONFIRM',
                     data: {
                       role: 'ALUNO',
                       items: extractedData.map((a: any) => ({
                         nome: a.nome || a.Nome,
                         matricula: a.matricula || a.Matricula || 'ALU' + Math.floor(100000 + Math.random() * 900000),
                         turma: a.turma || a.Turma || '',
                         turno: a.turno || a.Turno || 'MATUTINO'
                       }))
                     }
                   };
                   bypassReply = `Detectei ${extractedData.length} alunos na planilha. Por favor, revise os dados e confirme a ação no painel à direita!`;
                } else {
                   // Replace massive JSON to avoid hitting LLM token limits and timeout issues
                   message = message.replace(fileMatch[1], `\n[O arquivo possui ${extractedData.length} itens. Para importar alunos, utilize a ferramenta batchRegisterStudents sem preencher o campo alunos.]`);
                }
             }
         } catch(e) {}
      }

      if (bypassLlm) {
         // Auto-create session if needed
         if (!sessionId) {
            const session = await prisma.chatSession.create({
              data: { title: "Importação de Planilha", instituicao, userId }
            });
            sessionId = session.id;
         }
         
         await prisma.chatMessage.create({
            data: { sessionId, sender: 'user', text: "Upload de Planilha para Cadastro em Lote" }
         });
         await prisma.chatMessage.create({
            data: { sessionId, sender: 'ordinator', text: bypassReply }
         });

         return reply.send({
            reply: bypassReply,
            history: [],
            action: null,
            widget,
            sessionId
         });
      }

      // If no sessionId, auto-create a session
      if (!sessionId) {
        const session = await prisma.chatSession.create({
          data: {
            title: message.length > 25 ? message.slice(0, 25) + '...' : message,
            instituicao,
            userId
          }
        });
        sessionId = session.id;
      }

      // Fetch past messages for this session
      const pastMessages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      });

      // Map past messages to Gemini format
      const history = pastMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // 1. Passa pelo Agente Defensor
      const defensorResult = await analyzePrompt(message, 'ARQUITETO', { instituicaoId: instituicao });
      
      if (!defensorResult.allowed) {
        return reply.send({ 
          reply: `[SISTEMA DE SEGURANÇA]\nMensagem bloqueada: ${defensorResult.reason}`, 
          newHistory: history,
          sessionId
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
                name: 'createProfessor',
                description: 'Cadastra UM professor. Extraia nome, carga horária e matrícula, e se fornecido, a disciplina/matéria principal. NÃO ADIVINHE DADOS.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    nome: { type: SchemaType.STRING },
                    matricula: { type: SchemaType.STRING },
                    materia: { type: SchemaType.STRING, description: 'Nome da matéria/disciplina (opcional)' },
                    categoria: { type: SchemaType.STRING, description: 'CLT, REDA ou CONCURSADO' },
                    maxAulasSemanais: { type: SchemaType.NUMBER, description: 'Carga horária / Aulas semanais' }
                  },
                  required: ['nome', 'matricula', 'categoria', 'maxAulasSemanais']
                }
              },
              {
                name: 'createAluno',
                description: 'Cadastra UM aluno. Extraia nome, matrícula, turma e turno.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    nome: { type: SchemaType.STRING },
                    matricula: { type: SchemaType.STRING },
                    turma: { type: SchemaType.STRING, description: 'Nome da turma' },
                    turno: { type: SchemaType.STRING, description: 'MATUTINO, VESPERTINO, ou NOTURNO' }
                  },
                  required: ['nome', 'matricula', 'turma', 'turno']
                }
              },
              {
                name: 'queryDatabase',
                description: 'Ferramenta AGÊNTICA de consulta ao banco de dados estruturado via Prisma. Use para buscar QUALQUER informação (ex: "professores clt com <30h", "total de alunos", "disciplinas de matemática"). Você deve construir um JSON válido equivalente à cláusula `where` do Prisma.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    entidade: { type: SchemaType.STRING, description: 'Tabela do banco: "user", "turma", ou "disciplina"' },
                    whereClause: { type: SchemaType.STRING, description: 'String contendo o JSON da cláusula where do Prisma. Ex: "{\\"role\\":\\"PROFESSOR\\", \\"categoria\\":\\"CLT\\", \\"maxAulasSemanais\\":{\\"lt\\":30}}". Para negacão, use a sintaxe Prisma: "{\\"NOT\\": {\\"nome\\": {\\"startsWith\\":\\"Prof.\\"}}}". NUNCA INVENTE operadores como notStartsWith.' },
                    selectFields: { type: SchemaType.STRING, description: 'Opcional. String contendo o JSON da cláusula select do Prisma (quais colunas retornar). Exemplo: "{\\"nome\\":true, \\"matricula\\":true}". Deixe em branco para retornar tudo.' }
                  },
                  required: ['entidade', 'whereClause']
                }
              },
              {
                name: 'batchRegisterStudents',
                description: 'Cria MÚLTIPLOS alunos de uma vez (em lote), geralmente extraídos de uma planilha enviada pelo usuário. OBRIGATÓRIO usar esta ferramenta para criar mais de 1 aluno.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    alunos: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          nome: { type: SchemaType.STRING },
                          matricula: { type: SchemaType.STRING },
                          turma: { type: SchemaType.STRING },
                          turno: { type: SchemaType.STRING }
                        },
                        required: ['nome']
                      }
                    }
                  },
                  required: ['alunos']
                }
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
              },
              {
                name: 'removeProfessor',
                description: 'Remove um professor do sistema. Apenas coloque o nome ou matricula.',
                parameters: { type: SchemaType.OBJECT, properties: { matriculaOuNome: { type: SchemaType.STRING } }, required: ['matriculaOuNome'] }
              },
              {
                name: 'directCreateTurma',
                description: 'Cria uma nova turma.',
                parameters: { type: SchemaType.OBJECT, properties: { nome: { type: SchemaType.STRING }, ano: { type: SchemaType.STRING }, nivel: { type: SchemaType.STRING, description: 'FUNDAMENTAL ou MEDIO' } }, required: ['nome', 'ano', 'nivel'] }
              },
              {
                name: 'updateTurma',
                description: 'Atualiza os dados de uma turma existente (como o nome). Use getClasses para obter o turmaId.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { turmaId: { type: SchemaType.STRING }, novoNome: { type: SchemaType.STRING } },
                  required: ['turmaId']
                }
              },
              {
                name: 'batchUpdateTurmas',
                description: 'PROIBIDO USAR PARA RENOMEAR MAIS DE 3 TURMAS. Use APENAS para corrigir nomes isolados. Para renomear todas as turmas, use OBRIGATORIAMENTE a ferramenta sequentiallyRenameAllTurmas.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    updates: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: { turmaId: { type: SchemaType.STRING }, novoNome: { type: SchemaType.STRING } },
                        required: ['turmaId', 'novoNome']
                      }
                    }
                  },
                  required: ['updates']
                }
              },
              {
                name: 'sequentiallyRenameAllTurmas',
                description: 'Renomeia TODAS as turmas existentes para um prefixo seguido de uma sequência numérica (ex: TURMA 1, TURMA 2, etc). Útil para o pedido "renomeie todas as turmas para sequencia de 1 até N".',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { prefixo: { type: SchemaType.STRING, description: 'O prefixo base, ex: TURMA' } },
                  required: ['prefixo']
                }
              },
              {
                name: 'directCreateDisciplina',
                description: 'Cria uma nova disciplina/matéria.',
                parameters: { type: SchemaType.OBJECT, properties: { nome: { type: SchemaType.STRING } }, required: ['nome'] }
              },
              {
                name: 'updateUser',
                description: 'Atualiza dados de um Aluno ou Professor existente. NÃO ADIVINHE DADOS.',
                parameters: { 
                  type: SchemaType.OBJECT, 
                  properties: { 
                    matricula: { type: SchemaType.STRING, description: 'Matricula atual do usuario' }, 
                    novoNome: { type: SchemaType.STRING }, 
                    novaMatricula: { type: SchemaType.STRING }, 
                    turno: { type: SchemaType.STRING }, 
                    categoria: { type: SchemaType.STRING }, 
                    maxAulasSemanais: { type: SchemaType.NUMBER, description: 'Carga horária' } 
                  }, 
                  required: ['matricula'] 
                }
              },
              {
                name: 'searchRegulations',
                description: 'Busca regulamentos da instituição, normas, diretrizes acadêmicas e regras de conduta escolares no banco de dados de RAG.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    query: { type: SchemaType.STRING, description: 'Termo de busca semântica no documento (ex: tolerância atraso)' }
                  },
                  required: ['query']
                }
              }
            ]
          }
        ]
      });

      const chat = model.startChat({ history });
      const overrideMsg = message + "\n\n[SISTEMA: Você possui ferramentas completas. Se o usuário pedir para criar/atualizar, NUNCA invente dados. Se faltar informação (ex: matéria, carga horária, turno), peça ao usuário explicitamente antes de executar a ferramenta.]";
      let result;
      let response;
      try {
        result = await chat.sendMessage(overrideMsg);
        response = result.response;
      } catch (error: any) {
        console.warn(`[Ordinator] Erro no Gemini (${error.message}). Acionando fallback (Nvidia)...`);
        try {
            const nvidiaMessages = [
              { role: 'system', content: ordinatorPersona },
              ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
              { role: 'user', content: overrideMsg }
            ];
            
            const fallbackModels = [
              "meta/llama-3.1-8b-instruct",
              "meta/llama-3.1-70b-instruct",
              "nvidia/nemotron-4-340b-instruct",
              "mistralai/mixtral-8x22b-instruct-v0.1"
            ];
            
            let nvidiaRes: Response | null = null;
            let nvidiaErrLog = "";
            
            for (const modelName of fallbackModels) {
              try {
                const res = await globalThis.fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
                  },
                  body: JSON.stringify({
                    model: modelName,
                    messages: nvidiaMessages,
                    temperature: 0.2,
                    top_p: 0.7,
                    max_tokens: 4096,
                    tools: [
                      { type: "function", function: { name: "queryDatabase", description: "Consulta agêntica via Prisma. Pode buscar qualquer informação sobre user, turma ou disciplina. whereClause e selectFields devem ser strings contendo JSONs válidos. NUNCA INVENTE operadores como notStartsWith, use { NOT: { ... } }.", parameters: { type: "object", properties: { entidade: { type: "string" }, whereClause: { type: "string" }, selectFields: { type: "string" } }, required: ["entidade", "whereClause"] } } },
                      { type: "function", function: { name: "batchRegisterStudents", description: "Cria múltiplos alunos (lote). OBRIGATÓRIO usar ao invés de createAluno quando há mais de 1 aluno.", parameters: { type: "object", properties: { alunos: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, matricula: { type: "string" }, turma: { type: "string" }, turno: { type: "string" } }, required: ["nome"] } } }, required: ["alunos"] } } },
                      { type: "function", function: { name: "removeStudent", description: "Remove aluno", parameters: { type: "object", properties: { matricula: { type: "string" } }, required: ["matricula"] } } },
                      { type: "function", function: { name: "moveStudent", description: "Move aluno. Se não souber a matricula, deixe vazio e use turmaOrigem. ANTES de usar esta ferramenta, pergunte ao usuário para confirmar a ação.", parameters: { type: "object", properties: { matricula: { type: "string" }, novaTurma: { type: "string" }, turmaOrigem: { type: "string" } }, required: ["novaTurma"] } } },
                      { type: "function", function: { name: "removeTurma", description: "Exclui uma turma vazia.", parameters: { type: "object", properties: { nomeTurma: { type: "string" } }, required: ["nomeTurma"] } } },
                      { type: "function", function: { name: "removeProfessor", description: "Remove um professor do sistema. Apenas coloque o nome ou matricula.", parameters: { type: "object", properties: { matriculaOuNome: { type: "string" } }, required: ["matriculaOuNome"] } } },
                      { type: "function", function: { name: "directCreateTurma", description: "Cria uma nova turma.", parameters: { type: "object", properties: { nome: { type: "string" }, ano: { type: "string" }, nivel: { type: "string" } }, required: ["nome"] } } },
                      { type: "function", function: { name: "directCreateDisciplina", description: "Cria uma nova disciplina/matéria.", parameters: { type: "object", properties: { nome: { type: "string" } }, required: ["nome"] } } },
                      { type: "function", function: { name: "updateUser", description: "Atualiza dados de um Aluno ou Professor existente. NÃO ADIVINHE DADOS.", parameters: { type: "object", properties: { matricula: { type: "string", description: "Matricula atual do usuario" }, novoNome: { type: "string" }, novaMatricula: { type: "string" }, turno: { type: "string" }, categoria: { type: "string" }, maxAulasSemanais: { type: "number" } }, required: ["matricula"] } } },
                      { type: "function", function: { name: "createProfessor", description: "Cadastra um professor. Extraia nome, matricula, carga horaria, categoria e (opcionalmente) materia. NÃO ADIVINHE DADOS.", parameters: { type: "object", properties: { nome: { type: "string" }, matricula: { type: "string" }, materia: { type: "string", description: "Nome da matéria/disciplina (opcional)" }, categoria: { type: "string" }, maxAulasSemanais: { type: "number" } }, required: ["nome", "matricula", "categoria", "maxAulasSemanais"] } } },
                      { type: "function", function: { name: "createAluno", description: "Cadastra um aluno. Extraia nome, matricula, turma e turno. NÃO ADIVINHE DADOS.", parameters: { type: "object", properties: { nome: { type: "string" }, matricula: { type: "string" }, turma: { type: "string" }, turno: { type: "string" } }, required: ["nome", "matricula", "turma", "turno"] } } },
                      { type: "function", function: { name: "updateTurma", description: "Atualiza os dados de uma turma (como o nome). Use getClasses para obter o turmaId.", parameters: { type: "object", properties: { turmaId: { type: "string" }, novoNome: { type: "string" } }, required: ["turmaId"] } } },
                      { type: "function", function: { name: "getClasses", description: "Retorna a lista de todas as turmas cadastradas.", parameters: { type: "object", properties: {}, required: [] } } },
                      { type: "function", function: { name: "batchUpdateTurmas", description: "PROIBIDO USAR PARA RENOMEAR MAIS DE 3 TURMAS. Use APENAS para corrigir nomes isolados. Para renomear todas as turmas (ex: Sequencia 1 até N), use OBRIGATORIAMENTE a ferramenta sequentiallyRenameAllTurmas.", parameters: { type: "object", properties: { updates: { type: "array", items: { type: "object", properties: { turmaId: { type: "string" }, novoNome: { type: "string" } }, required: ["turmaId", "novoNome"] } } }, required: ["updates"] } } },
                      { type: "function", function: { name: "sequentiallyRenameAllTurmas", description: "Ferramenta PRINCIPAL para renomear TODAS as turmas existentes para um prefixo e uma sequência (ex: TURMA 1, TURMA 2, TURMA 3, etc).", parameters: { type: "object", properties: { prefixo: { type: "string" } }, required: ["prefixo"] } } }
                    ]
                  })
                });
                
                if (res.ok) {
                  nvidiaRes = res;
                  console.log(`[Ordinator] Fallback bem-sucedido usando o modelo: ${modelName}`);
                  break;
                } else {
                  nvidiaErrLog += `\n[${modelName}] falhou com status ${res.status}: ${await res.text()}`;
                }
              } catch (e: any) {
                nvidiaErrLog += `\n[${modelName}] erro na requisição: ${e.message}`;
              }
            }
            
            
            if (nvidiaRes && nvidiaRes.ok) {
              let actionToTriggerFallback: string | null = null;
              let data = await nvidiaRes.json() as any;
              let msg = data.choices[0]?.message;
              let msgContent = msg?.content || '';
              
              const textToolCalls: any[] = [];
              if (msgContent.includes('"name"')) {
                 try {
                    const startIdx = msgContent.indexOf('{');
                    if (startIdx !== -1) {
                       const parsed = JSON.parse(msgContent.substring(startIdx));
                       if (Array.isArray(parsed)) {
                          parsed.forEach(p => { if (p.name) textToolCalls.push({ function: p }); });
                       } else if (parsed.name) {
                          textToolCalls.push({ function: parsed });
                       }
                    }
                 } catch (e) {
                    // Se JSON.parse falhar por estar cortado, tentamos recuperar manualmente
                    const nameMatch = msgContent.match(/"name"\s*:\s*"([^"]+)"/);
                    if (nameMatch) {
                       const name = nameMatch[1];
                       const argsIdx = msgContent.indexOf('"arguments"');
                       const paramsIdx = msgContent.indexOf('"parameters"');
                       const idx = argsIdx !== -1 ? argsIdx : paramsIdx;
                       if (idx !== -1) {
                          let str = msgContent.substring(idx + 12).trim();
                          if (str.startsWith(':')) str = str.substring(1).trim();
                          try {
                             // tenta fechar a string caso esteja incompleta
                             if (!str.endsWith('}')) str += '}';
                             textToolCalls.push({ function: { name, arguments: JSON.parse(str) } });
                          } catch(err){}
                       }
                    }
                 }
              }

              const toolCallsToProcess = (msg?.tool_calls && msg.tool_calls.length > 0) 
                 ? msg.tool_calls 
                 : textToolCalls;
              
              if (toolCallsToProcess.length > 0) {
                 nvidiaMessages.push(msg);
                let systemAppendedStatus = "[Ações interceptadas e executadas pelo fallback da Nvidia:]\n";
                 for (const tc of toolCallsToProcess) {
                    const callNameRaw = tc.function.name;
                    let callArgs: any = {};
                    try {
                      callArgs = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                    } catch(e) {}

                    let callName = callNameRaw;
                    if (callName === 'getTeachers' || callName === 'getProfessores') {
                      callName = 'queryDatabase';
                      callArgs = { entidade: 'user', whereClause: '{"role":"PROFESSOR"}' };
                    } else if (callName === 'getStudents' || callName === 'getAlunos') {
                      callName = 'queryDatabase';
                      callArgs = { entidade: 'user', whereClause: '{"role":"ALUNO"}' };
                    }

                    if (callName === 'queryDatabase') {
                         const { entidade, whereClause, selectFields } = (callArgs || {}) as any;
                         let parsedWhere: any = {};
                         if (whereClause) {
                         try { parsedWhere = typeof whereClause === 'string' ? JSON.parse(whereClause) : whereClause; } catch(e){}
                         }
                         let parsedSelect = undefined;
                         if (selectFields) {
                           try { parsedSelect = typeof selectFields === 'string' ? JSON.parse(selectFields) : selectFields; } catch(e){}
                         }
                         parsedWhere = { ...parsedWhere, instituicao }; // Força filtro de segurança
             
                         try {
                           let safeEntidade = String(entidade || '').toLowerCase();
                           if (safeEntidade.includes('professor') || safeEntidade.includes('mestre')) {
                             safeEntidade = 'user';
                             parsedWhere.role = 'PROFESSOR';
                           } else if (safeEntidade.includes('aluno') || safeEntidade.includes('student')) {
                             safeEntidade = 'user';
                             parsedWhere.role = 'ALUNO';
                           }

                           // Normalização Inteligente
                           if (parsedWhere.turma && typeof parsedWhere.turma === 'string') {
                             parsedWhere.turma = { nome: parsedWhere.turma };
                           }
                           if (parsedWhere.Turma && typeof parsedWhere.Turma === 'string') {
                             parsedWhere.turma = { nome: parsedWhere.Turma };
                             delete parsedWhere.Turma;
                           }
                           if (parsedWhere.categoria && typeof parsedWhere.categoria === 'string') {
                             parsedWhere.categoria = parsedWhere.categoria.toUpperCase();
                           }
                           if (parsedWhere.role && typeof parsedWhere.role === 'string') {
                             parsedWhere.role = parsedWhere.role.toUpperCase();
                           }

                           if (!parsedSelect) {
                             if (safeEntidade === 'user' && parsedWhere.role === 'PROFESSOR') {
                               parsedSelect = { nome: true, matricula: true, categoria: true, maxAulasSemanais: true };
                             } else if (safeEntidade === 'user' && parsedWhere.role === 'ALUNO') {
                               parsedSelect = { nome: true, matricula: true, turno: true, xp: true, level: true };
                             } else if (safeEntidade === 'user') {
                               parsedSelect = { nome: true, matricula: true, role: true, instituicao: true };
                             } else if (safeEntidade === 'turma') {
                               parsedSelect = { nome: true, nivel: true, ano: true, codigoInvocacao: true };
                             } else if (safeEntidade === 'disciplina') {
                               parsedSelect = { nome: true };
                             }
                           }

                           let results: any[] = [];
                           if (safeEntidade === 'user') {
                             results = await prisma.user.findMany({ where: parsedWhere, select: parsedSelect, take: 100 });
                           } else if (safeEntidade === 'turma') {
                             results = await prisma.turma.findMany({ where: parsedWhere, select: parsedSelect, take: 100 });
                           } else if (safeEntidade === 'disciplina') {
                             results = await prisma.disciplina.findMany({ where: parsedWhere, select: parsedSelect, take: 100 });
                           } else {
                             throw new Error('Entidade inválida. Apenas user, turma ou disciplina.');
                           }
                           
                           widget = {
                             type: 'DYNAMIC_DATA_GRID',
                             data: {
                               entity: safeEntidade,
                               items: results
                             }
                           };
                           systemAppendedStatus += `- Consulta agêntica executada com sucesso.\n`;
                         } catch(e) {
                           console.error('[Ordinator] Falha na consulta agêntica Prisma (Nvidia fallback):', e, 'Query:', parsedWhere);
                           systemAppendedStatus += `- Falha na consulta agêntica. A query gerada foi inválida para o banco de dados.\n`;
                         }
                      } else if (callName === 'removeStudent') {
                         const ident = callArgs.matricula;
                         let target = await prisma.user.findFirst({ where: { matricula: ident, instituicao } });
                         if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: ident, mode: 'insensitive' }, instituicao, role: 'ALUNO' } });
                         if (target) {
                           widget = {
                             type: 'GENERIC_CONFIRM',
                             data: {
                               action: 'DELETE_USER',
                               title: 'Confirmar Exclusão de Player',
                               description: `Tem certeza que deseja remover permanentemente o aluno ${target.nome} (${target.matricula})?`,
                               payload: { id: target.id, role: 'Aluno' }
                             }
                           };
                           systemAppendedStatus += `- Exclusão do aluno ${target.nome} pendente de aprovação.\n`;
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
                     } else if (callName === 'removeProfessor') {
                        let target = await prisma.user.findFirst({ where: { matricula: callArgs.matriculaOuNome, role: 'PROFESSOR', instituicao } });
                        if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: callArgs.matriculaOuNome, mode: 'insensitive' }, role: 'PROFESSOR', instituicao } });
                        if (target) {
                           widget = {
                             type: 'GENERIC_CONFIRM',
                             data: {
                               action: 'DELETE_USER',
                               title: 'Confirmar Exclusão de Professor',
                               description: `Tem certeza que deseja remover permanentemente o professor ${target.nome} (${target.matricula})?`,
                               payload: { id: target.id, role: 'Professor' }
                             }
                           };
                           systemAppendedStatus += `- Exclusão de professor pendente de aprovação visual.\n`;
                        } else {
                           systemAppendedStatus += `- Falha: Professor não encontrado.\n`;
                        }
                     } else if (callName === 'directCreateTurma') {
                        const tNome = callArgs.nome.toUpperCase().includes('TURMA') ? callArgs.nome : 'TURMA ' + callArgs.nome;
                        const existing = await prisma.turma.findFirst({ where: { nome: { equals: tNome, mode: 'insensitive' }, instituicao } });
                        if (existing) {
                           systemAppendedStatus += `- Falha: Turma ${tNome} já existe.\n`;
                        } else {
                           await prisma.turma.create({ data: { nome: tNome.toUpperCase(), ano: callArgs.ano, nivel: callArgs.nivel || 'FUNDAMENTAL', instituicao, institutionId: request.user.institutionId || null } });
                           systemAppendedStatus += `- Turma criada com sucesso.\n`;
                           actionToTriggerFallback = 'REFRESH_TIMETABLE';
                        }
                     } else if (callName === 'directCreateDisciplina') {
                        const existing = await prisma.disciplina.findFirst({ where: { nome: { equals: callArgs.nome, mode: 'insensitive' }, instituicao } });
                        if (existing) {
                           systemAppendedStatus += `- Falha: Disciplina já existe.\n`;
                        } else {
                           await prisma.disciplina.create({ data: { nome: callArgs.nome, instituicao, institutionId: request.user.institutionId || null } });
                           systemAppendedStatus += `- Disciplina criada com sucesso.\n`;
                        }
                     } else if (callName === 'updateUser') {
                        let target = await prisma.user.findUnique({ where: { matricula: callArgs.matricula } });
                        if (target && target.instituicao === instituicao) {
                           const data: any = {};
                           if (callArgs.novoNome) data.nome = callArgs.novoNome;
                           if (callArgs.novaMatricula) data.matricula = callArgs.novaMatricula;
                           if (callArgs.turno) data.turno = callArgs.turno;
                           if (callArgs.categoria) data.categoria = callArgs.categoria;
                           if (callArgs.maxAulasSemanais !== undefined) data.maxAulasSemanais = parseInt(callArgs.maxAulasSemanais, 10);
                           await prisma.user.update({ where: { id: target.id }, data });
                           systemAppendedStatus += `- Usuário atualizado com sucesso.\n`;
                        } else {
                           systemAppendedStatus += `- Falha: Usuário não encontrado.\n`;
                        }
                     } else if (callName === 'createProfessor') {
                        const { nome, matricula, materia, categoria, maxAulasSemanais } = callArgs;
                        const bcrypt = require('bcryptjs');
                        const mat = matricula;
                        const hash = await bcrypt.hash(mat, 10);
                        if (materia) {
                           let disc = await prisma.disciplina.findFirst({ where: { nome: materia.trim(), instituicao } });
                           if (!disc) {
                             await prisma.disciplina.create({ data: { nome: materia.trim(), instituicao, institutionId: request.user.institutionId || null } });
                           }
                        }
                        await prisma.user.create({
                           data: {
                             nome: nome, matricula: mat, password: hash,
                             nickname: nome.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000) + '@' + instituicao,
                             instituicao, role: 'PROFESSOR', categoria: categoria, maxAulasSemanais: maxAulasSemanais ? parseInt(maxAulasSemanais, 10) : null, institutionId: request.user.institutionId || null
                           }
                        });
                        await logAction('Cadastro de Professor (IA)', `Professor cadastrado: ${nome} (${mat})`, request.user.id, request.user.institutionId);
                        systemAppendedStatus += `- Professor ${nome} criado diretamente no banco de dados.\n`;
                        actionToTriggerFallback = 'REFRESH_TIMETABLE';
                     } else if (callName === 'batchRegisterStudents') {
                        let { alunos } = callArgs;
                        if (typeof alunos === 'string') {
                          try {
                             // Llama 8B sometimes uses single quotes for keys/values
                             alunos = alunos.replace(/'/g, '"');
                             alunos = JSON.parse(alunos);
                          } catch(e){}
                        }
                        if (alunos && Array.isArray(alunos)) {
                          widget = {
                            type: 'BATCH_CONFIRM',
                            data: {
                              role: 'ALUNO',
                              items: alunos.map((a: any) => ({
                                nome: a.nome,
                                matricula: a.matricula || 'ALU' + Math.floor(100000 + Math.random() * 900000),
                                turma: a.turma || '',
                                turno: a.turno || 'MATUTINO'
                              }))
                            }
                          };
                          systemAppendedStatus += `- Criação de alunos em lote pendente de aprovação visual do usuário.\n`;
                        }
                     } else if (callName === 'createAluno') {
                        const { nome, matricula, turma: turmaNome, turno } = callArgs;
                        if (!nome) continue; // fail safe

                        const bcrypt = require('bcryptjs');
                        const mat = matricula || 'ALU' + Math.floor(100000 + Math.random() * 900000);
                        const hash = await bcrypt.hash(mat, 10);
                        let turmaId = null;
                        if (turmaNome) {
                           let turma = await prisma.turma.findFirst({ where: { nome: turmaNome.trim(), instituicao } });
                           if (!turma) {
                             turma = await prisma.turma.create({ data: { nome: turmaNome.trim(), instituicao, institutionId: request.user.institutionId || null } });
                           }
                           turmaId = turma.id;
                        }
                        await prisma.user.create({
                           data: {
                             nome: nome, matricula: mat, password: hash,
                             nickname: nome.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000) + '@' + instituicao,
                             instituicao, role: 'ALUNO', turno: turno || 'MATUTINO', turmaId, institutionId: request.user.institutionId || null
                           }
                        });
                        await logAction('Cadastro de Aluno (IA)', `Aluno cadastrado: ${nome} (${mat})`, request.user.id, request.user.institutionId);
                        systemAppendedStatus += `- Aluno ${nome} criado diretamente no banco de dados.\n`;
                        actionToTriggerFallback = 'REFRESH_TIMETABLE';
                     } else if (callName === 'updateTurma') {
                         const { turmaId, novoNome } = callArgs;
                         const target = await prisma.turma.findFirst({ where: { id: turmaId, instituicao } });
                         if (target) {
                           await prisma.turma.update({
                             where: { id: target.id },
                             data: { nome: novoNome ? novoNome.trim().toUpperCase() : target.nome }
                           });
                           await logAction('Edição de Turma (IA)', `Turma renomeada para: ${novoNome}`, request.user.id, request.user.institutionId);
                           systemAppendedStatus += `- Turma atualizada com sucesso.\n`;
                           actionToTriggerFallback = 'REFRESH_TIMETABLE';
                         } else {
                           systemAppendedStatus += `- Falha: Turma não encontrada.\n`;
                         }
                      } else if (callName === 'batchUpdateTurmas') {
                           let { updates } = callArgs;
                           if (typeof updates === 'string') {
                             try { updates = JSON.parse(updates); } catch (e) {}
                           }
                           if (updates && Array.isArray(updates)) {
                             for (const up of updates) {
                               const target = await prisma.turma.findFirst({ where: { id: up.turmaId, instituicao } });
                               if (target) {
                                 await prisma.turma.update({
                                   where: { id: target.id },
                                   data: { nome: up.novoNome ? up.novoNome.trim().toUpperCase() : target.nome }
                                 });
                               }
                             }
                             await logAction('Edição em Massa (IA)', `${updates.length} turmas atualizadas.`, request.user.id, request.user.institutionId);
                             systemAppendedStatus += `- ${updates.length} turmas atualizadas com sucesso.\n`;
                             actionToTriggerFallback = 'REFRESH_TIMETABLE';
                           } else {
                             systemAppendedStatus += `- Falha: Formato inválido para batchUpdateTurmas.\n`;
                           }
                       } else if (callName === 'sequentiallyRenameAllTurmas') {
                           const { prefixo } = callArgs;
                           const safePrefixo = prefixo || 'TURMA';
                           const turmas = await prisma.turma.findMany({ where: { instituicao }, orderBy: { id: 'asc' } });
                           for (let i = 0; i < turmas.length; i++) {
                               await prisma.turma.update({
                                  where: { id: turmas[i].id },
                                  data: { nome: `${safePrefixo} ${i + 1}`.toUpperCase() }
                               });
                           }
                           await logAction('Renomeação Sequencial (IA)', `${turmas.length} turmas renomeadas para ${safePrefixo} 1..N.`, request.user.id, request.user.institutionId);
                           systemAppendedStatus += `- ${turmas.length} turmas renomeadas sequencialmente com sucesso.\n`;
                           actionToTriggerFallback = 'REFRESH_TIMETABLE';
                       } else if (callName === 'getClasses') {
                           systemAppendedStatus += `- Use o painel para listar as turmas. Limitações de hardware impedem listagem massiva nesta versão simplificada.\n`;
                       }
                  }
                  let finalCleanText = msgContent.replace(/```json\s*\{\s*"name"[\s\S]*?\}\s*```/gs, '').trim();
                  finalCleanText = finalCleanText.replace(/\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"(?:arguments|parameters)"\s*:\s*\{[\s\S]*?\}\s*\}/g, '').trim();
                  
                  if (!finalCleanText) {
                    finalCleanText = widget ? 'Confirme a ação na seção de atividade!' : 'Ação concluída com êxito!';
                  }
                  msgContent = finalCleanText;
               }
              
              const text = msgContent || (widget ? 'Confirme a ação na seção de atividade!' : 'Ação concluída com êxito!');
              
              // Save messages to DB in Nvidia fallback
              await prisma.chatMessage.create({
                data: { sessionId: sessionId!, sender: 'user', text: message }
              });
              await prisma.chatMessage.create({
                data: {
                  sessionId: sessionId!,
                  sender: 'ordinator',
                  text: text,
                  widgetType: widget ? widget.type : null,
                  widgetData: widget ? widget.data : null
                }
              });

              if (pastMessages.length === 0) {
                const title = message.length > 25 ? message.slice(0, 25) + '...' : message;
                await prisma.chatSession.update({
                  where: { id: sessionId },
                  data: { title }
                });
              }

              const newHistory = [
                ...history,
                { role: 'user', parts: [{ text: message }] },
                { role: 'model', parts: [{ text }] }
              ];
              
              return reply.send({
                reply: text,
                history: newHistory,
                action: actionToTriggerFallback,
                widget,
                sessionId
              });
            } else {
              console.error('[Ordinator] Todos os modelos de fallback falharam:', nvidiaErrLog);
              throw new Error(`Fallback Nvidia esgotou todos os modelos. Log: ${nvidiaErrLog}`);
            }
          } catch (nvidiaErr: any) {
            console.error('[Ordinator] Falha no fallback da Nvidia:', nvidiaErr);
            const fallbackMsg = "Desculpe, todos os servidores de Inteligência Artificial estão temporariamente sobrecarregados (Limites atingidos). Por favor, aguarde alguns minutos e tente novamente.";
            
            // Grava a mensagem de falha na sessão para manter o histórico
            await prisma.chatMessage.create({
              data: { sessionId: sessionId!, sender: 'ordinator', text: fallbackMsg }
            });
            
            return reply.send({
              reply: fallbackMsg,
              history: [...history, { role: 'model', parts: [{ text: fallbackMsg }] }],
              action: null,
              widget: null,
              sessionId
            });
          }
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
              const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
              widget = {
                type: 'TIMETABLE_PREVIEW',
                data: {
                  turmaId,
                  turmaNome: turma?.nome || '',
                  slots: slots.map(s => ({
                    diaSemana: s.diaSemana,
                    posicao: s.posicao,
                    disciplinaNome: s.disciplina?.nome || 'Vago'
                  }))
                }
              };
              toolResponses.push({
                functionResponse: { name: 'getTimetable', response: { success: true, slots: slots.map(s => ({ id: s.id, dia: s.diaSemana, posicao: s.posicao, materia: s.disciplina?.nome || 'Desconhecida' })) } }
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
          } else if (call.name === 'createProfessor') {
            const { nome, matricula, materia, categoria, maxAulasSemanais } = call.args as any;
            const bcrypt = require('bcryptjs');
            const mat = matricula;
            const hash = await bcrypt.hash(mat, 10);
            if (materia) {
               let disc = await prisma.disciplina.findFirst({ where: { nome: materia.trim(), instituicao } });
               if (!disc) {
                 await prisma.disciplina.create({ data: { nome: materia.trim(), instituicao, institutionId: request.user.institutionId || null } });
               }
            }
            await prisma.user.create({
               data: {
                 nome: nome, matricula: mat, password: hash,
                 nickname: nome.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000) + '@' + instituicao,
                 instituicao, role: 'PROFESSOR', categoria: categoria, maxAulasSemanais: maxAulasSemanais ? parseInt(maxAulasSemanais, 10) : null, institutionId: request.user.institutionId || null
               }
            });
            actionToTrigger = 'REFRESH_TIMETABLE';
            toolResponses.push({
              functionResponse: {
                name: 'createProfessor',
                response: { success: true, message: `Professor ${nome} criado com sucesso direto no banco.` }
              }
            });
          } else if (call.name === 'createAluno') {
            const { nome, matricula, turma: turmaNome, turno } = call.args as any;
            const bcrypt = require('bcryptjs');
            const mat = matricula || 'ALU' + Math.floor(100000 + Math.random() * 900000);
            const hash = await bcrypt.hash(mat, 10);
            let turmaId = null;
            if (turmaNome) {
               let turma = await prisma.turma.findFirst({ where: { nome: turmaNome.trim(), instituicao } });
               if (!turma) {
                 turma = await prisma.turma.create({ data: { nome: turmaNome.trim(), instituicao, institutionId: request.user.institutionId || null } });
               }
               turmaId = turma.id;
            }
            await prisma.user.create({
               data: {
                 nome: nome, matricula: mat, password: hash,
                 nickname: nome.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000) + '@' + instituicao,
                 instituicao, role: 'ALUNO', turno: turno || 'MATUTINO', turmaId, institutionId: request.user.institutionId || null
               }
            });
            actionToTrigger = 'REFRESH_TIMETABLE';
            toolResponses.push({
              functionResponse: {
                name: 'createAluno',
                response: { success: true, message: `Aluno ${nome} criado com sucesso direto no banco.` }
              }
            });
          } else if (call.name === 'updateTurma') {
            const { turmaId, novoNome } = call.args as any;
            const target = await prisma.turma.findFirst({ where: { id: turmaId, instituicao } });
            if (target) {
              await prisma.turma.update({
                where: { id: target.id },
                data: { nome: novoNome ? novoNome.trim().toUpperCase() : target.nome }
              });
              await logAction('Edição de Turma (IA)', `Turma renomeada para: ${novoNome}`, request.user.id, request.user.institutionId);
              actionToTrigger = 'REFRESH_TIMETABLE';
              toolResponses.push({
                functionResponse: { name: 'updateTurma', response: { success: true, message: `Turma atualizada com sucesso.` } }
              });
            } else {
              toolResponses.push({
                functionResponse: { name: 'updateTurma', response: { success: false, error: 'Turma não encontrada.' } }
              });
            }
          } else if (call.name === 'batchUpdateTurmas') {
            const { updates } = call.args as any;
            if (updates && Array.isArray(updates)) {
              for (const up of updates) {
                const target = await prisma.turma.findFirst({ where: { id: up.turmaId, instituicao } });
                if (target) {
                  await prisma.turma.update({
                    where: { id: target.id },
                    data: { nome: up.novoNome ? up.novoNome.trim().toUpperCase() : target.nome }
                  });
                }
              }
              await logAction('Edição em Massa (IA)', `${updates.length} turmas atualizadas.`, request.user.id, request.user.institutionId);
              actionToTrigger = 'REFRESH_TIMETABLE';
              toolResponses.push({
                functionResponse: { name: 'batchUpdateTurmas', response: { success: true, message: `${updates.length} turmas atualizadas com sucesso.` } }
              });
            } else {
              toolResponses.push({
                functionResponse: { name: 'batchUpdateTurmas', response: { success: false, error: 'Parâmetros inválidos.' } }
              });
            }
          } else if (call.name === 'sequentiallyRenameAllTurmas') {
            const { prefixo } = call.args as any;
            const safePrefixo = prefixo || 'TURMA';
            const turmas = await prisma.turma.findMany({ where: { instituicao }, orderBy: { id: 'asc' } });
            for (let i = 0; i < turmas.length; i++) {
                await prisma.turma.update({
                   where: { id: turmas[i].id },
                   data: { nome: `${safePrefixo} ${i + 1}`.toUpperCase() }
                });
            }
            await logAction('Renomeação Sequencial (IA)', `${turmas.length} turmas renomeadas para ${safePrefixo} 1..N.`, request.user.id, request.user.institutionId);
            actionToTrigger = 'REFRESH_TIMETABLE';
            toolResponses.push({
              functionResponse: { name: 'sequentiallyRenameAllTurmas', response: { success: true, message: `${turmas.length} turmas renomeadas sequencialmente.` } }
            });
          } else if (call.name === 'queryDatabase') {
            const { entidade, whereClause, selectFields } = (call.args || {}) as any;
            
            let parsedWhere: any = {};
            if (whereClause) {
              try { parsedWhere = typeof whereClause === 'string' ? JSON.parse(whereClause) : whereClause; } catch(e){}
            }
            parsedWhere = { ...parsedWhere, instituicao }; // Força filtro de segurança

            let parsedSelect = undefined;
            if (selectFields) {
              try { parsedSelect = typeof selectFields === 'string' ? JSON.parse(selectFields) : selectFields; } catch(e){}
            }

            try {
              let safeEntidade = String(entidade || '').toLowerCase();
              if (safeEntidade.includes('professor') || safeEntidade.includes('mestre')) {
                safeEntidade = 'user';
                parsedWhere.role = 'PROFESSOR';
              } else if (safeEntidade.includes('aluno') || safeEntidade.includes('student')) {
                safeEntidade = 'user';
                parsedWhere.role = 'ALUNO';
              }

              // Normalização Inteligente
              if (parsedWhere.turma && typeof parsedWhere.turma === 'string') {
                parsedWhere.turma = { nome: parsedWhere.turma };
              }
              if (parsedWhere.Turma && typeof parsedWhere.Turma === 'string') {
                parsedWhere.turma = { nome: parsedWhere.Turma };
                delete parsedWhere.Turma;
              }
              if (parsedWhere.categoria && typeof parsedWhere.categoria === 'string') {
                parsedWhere.categoria = parsedWhere.categoria.toUpperCase();
              }
              if (parsedWhere.role && typeof parsedWhere.role === 'string') {
                parsedWhere.role = parsedWhere.role.toUpperCase();
              }

              if (!parsedSelect) {
                if (safeEntidade === 'user' && parsedWhere.role === 'PROFESSOR') {
                  parsedSelect = { nome: true, matricula: true, categoria: true, maxAulasSemanais: true };
                } else if (safeEntidade === 'user' && parsedWhere.role === 'ALUNO') {
                  parsedSelect = { nome: true, matricula: true, turno: true, xp: true, level: true };
                } else if (safeEntidade === 'user') {
                  parsedSelect = { nome: true, matricula: true, role: true, instituicao: true };
                } else if (safeEntidade === 'turma') {
                  parsedSelect = { nome: true, nivel: true, ano: true, codigoInvocacao: true };
                } else if (safeEntidade === 'disciplina') {
                  parsedSelect = { nome: true };
                }
              }

              let results: any[] = [];
              if (safeEntidade === 'user') {
                results = await prisma.user.findMany({ where: parsedWhere, select: parsedSelect, take: 100 });
              } else if (safeEntidade === 'turma') {
                results = await prisma.turma.findMany({ where: parsedWhere, select: parsedSelect, take: 100 });
              } else if (safeEntidade === 'disciplina') {
                results = await prisma.disciplina.findMany({ where: parsedWhere, select: parsedSelect, take: 100 });
              } else {
                throw new Error('Entidade inválida. Apenas user, turma ou disciplina.');
              }

              widget = {
                type: 'DYNAMIC_DATA_GRID',
                data: {
                  entity: safeEntidade,
                  items: results
                }
              };

              toolResponses.push({
                functionResponse: {
                  name: 'queryDatabase',
                  response: { success: true, count: results.length, data: results }
                }
              });
            } catch (error: any) {
              toolResponses.push({
                functionResponse: {
                  name: 'queryDatabase',
                  response: { success: false, error: error.message }
                }
              });
            }
          } else if (call.name === 'batchRegisterStudents') {
            const { alunos } = call.args as any;
            if (alunos && Array.isArray(alunos)) {
              widget = {
                type: 'BATCH_CONFIRM',
                data: {
                  role: 'ALUNO',
                  items: alunos.map((a: any) => ({
                    nome: a.nome,
                    matricula: a.matricula || 'ALU' + Math.floor(100000 + Math.random() * 900000),
                    turma: a.turma || '',
                    turno: a.turno || 'MATUTINO'
                  }))
                }
              };
              toolResponses.push({
                functionResponse: { name: 'batchRegisterStudents', response: { success: true, message: 'Criação em lote pendente de confirmação.' } }
              });
            }
          } else if (call.name === 'removeStudent') {
            const ident = (call.args as any).matricula;
            let target = await prisma.user.findFirst({ where: { matricula: ident, role: 'ALUNO', instituicao } });
            if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: ident, mode: 'insensitive' }, role: 'ALUNO', instituicao } });
            if (target) {
              widget = {
                type: 'GENERIC_CONFIRM',
                data: {
                  action: 'DELETE_USER',
                  title: 'Confirmar Exclusão de Player',
                  description: `Tem certeza que deseja remover permanentemente o aluno ${target.nome} (${target.matricula})?`,
                  payload: { id: target.id, role: 'Aluno' }
                }
              };
              toolResponses.push({ functionResponse: { name: 'removeStudent', response: { success: true, message: `Exclusão do aluno ${target.nome} pendente de confirmação.`, pendingApproval: true } } });
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
          } else if (call.name === 'removeProfessor') {
            const ident = (call.args as any).matriculaOuNome;
            let target = await prisma.user.findFirst({ where: { matricula: ident, role: 'PROFESSOR', instituicao } });
            if (!target) target = await prisma.user.findFirst({ where: { nome: { contains: ident, mode: 'insensitive' }, role: 'PROFESSOR', instituicao } });
            if (target) {
              widget = {
                type: 'GENERIC_CONFIRM',
                data: {
                  action: 'DELETE_USER',
                  title: 'Confirmar Exclusão de Professor',
                  description: `Tem certeza que deseja remover permanentemente o professor ${target.nome} (${target.matricula})?`,
                  payload: { id: target.id, role: 'Professor' }
                }
              };
              toolResponses.push({ functionResponse: { name: 'removeProfessor', response: { success: true, message: `Exclusão do professor ${target.nome} pendente de confirmação visual.` } } });
            } else {
              toolResponses.push({ functionResponse: { name: 'removeProfessor', response: { success: false, error: 'Professor não encontrado' } } });
            }
          } else if (call.name === 'directCreateTurma') {
            const { nome, ano, nivel } = call.args as any;
            const tNome = nome.toUpperCase().includes('TURMA') ? nome : 'TURMA ' + nome;
            const existing = await prisma.turma.findFirst({ where: { nome: { equals: tNome, mode: 'insensitive' }, instituicao } });
            if (existing) {
              toolResponses.push({ functionResponse: { name: 'directCreateTurma', response: { success: false, error: 'Turma já existe' } } });
            } else {
              const nova = await prisma.turma.create({ data: { nome: tNome.toUpperCase(), ano, nivel: nivel || 'FUNDAMENTAL', instituicao, institutionId: request.user.institutionId || null } });
              actionToTrigger = 'REFRESH_TIMETABLE';
              toolResponses.push({ functionResponse: { name: 'directCreateTurma', response: { success: true, turma: nova.nome } } });
            }
          } else if (call.name === 'directCreateDisciplina') {
            const { nome } = call.args as any;
            const existing = await prisma.disciplina.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' }, instituicao } });
            if (existing) {
              toolResponses.push({ functionResponse: { name: 'directCreateDisciplina', response: { success: false, error: 'Disciplina já existe' } } });
            } else {
              const nova = await prisma.disciplina.create({ data: { nome, instituicao, institutionId: request.user.institutionId || null } });
              toolResponses.push({ functionResponse: { name: 'directCreateDisciplina', response: { success: true, disciplina: nova.nome } } });
            }
          } else if (call.name === 'updateUser') {
            const { matricula, novoNome, novaMatricula, turno, categoria } = call.args as any;
            let target = await prisma.user.findUnique({ where: { matricula } });
            if (target && target.instituicao === instituicao) {
              const data: any = {};
              if (novoNome) data.nome = novoNome;
              if (novaMatricula) data.matricula = novaMatricula;
              if (turno) data.turno = turno;
              if (categoria) data.categoria = categoria;
              await prisma.user.update({ where: { id: target.id }, data });
              toolResponses.push({ functionResponse: { name: 'updateUser', response: { success: true, message: `Usuário atualizado.` } } });
            } else {
              toolResponses.push({ functionResponse: { name: 'updateUser', response: { success: false, error: 'Usuário não encontrado via matrícula.' } } });
            }
          } else if (call.name === 'searchRegulations') {
            const { query } = call.args as any;
            const { retrieveRelevantChunks } = require('../services/ragService');
            const matchingChunks = await retrieveRelevantChunks(query, instituicao, 3);
            widget = {
              type: 'RAG_CITATIONS',
              data: {
                query,
                sources: matchingChunks.map((c: any) => ({
                  filename: c.filename,
                  content: c.content,
                  similarity: Math.round(c.similarity * 100)
                }))
              }
            };
            toolResponses.push({
              functionResponse: {
                name: 'searchRegulations',
                response: { success: true, results: matchingChunks.map((c: any) => ({ filename: c.filename, content: c.content })) }
              }
            });
          } else {
            toolResponses.push({ functionResponse: { name: call.name, response: { error: 'Comando não reconhecido pelo servidor.' } } });
          }
        }
        let currentResponse = await chat.sendMessage(toolResponses);
        let loopCount = 0;
        
        while (loopCount < 3) {
          const nextCalls = currentResponse.response.functionCalls();
          if (!nextCalls || nextCalls.length === 0) {
            finalReply = currentResponse.response.text();
            break;
          }
          
          let nextToolResponses: any[] = [];
          for (const call of nextCalls) {
            if (call.name === 'batchUpdateTurmas') {
              const { updates } = call.args as any;
              if (updates && Array.isArray(updates)) {
                for (const up of updates) {
                  const target = await prisma.turma.findFirst({ where: { id: up.turmaId, instituicao } });
                  if (target) {
                    await prisma.turma.update({
                      where: { id: target.id },
                      data: { nome: up.novoNome ? up.novoNome.trim().toUpperCase() : target.nome }
                    });
                  }
                }
                await logAction('Edição em Massa (IA)', `${updates.length} turmas atualizadas.`, request.user.id, request.user.institutionId);
                actionToTrigger = 'REFRESH_TIMETABLE';
                nextToolResponses.push({
                  functionResponse: { name: 'batchUpdateTurmas', response: { success: true, message: `${updates.length} turmas atualizadas com sucesso.` } }
                });
              } else {
                nextToolResponses.push({
                  functionResponse: { name: 'batchUpdateTurmas', response: { success: false, error: 'Parâmetros inválidos.' } }
                });
              }
            } else {
               nextToolResponses.push({ functionResponse: { name: call.name, response: { error: 'Ferramenta não permitida em loop secundário ou não reconhecida.' } } });
            }
          }
          
          currentResponse = await chat.sendMessage(nextToolResponses);
          loopCount++;
        }
        
        if (!finalReply) {
           try { finalReply = currentResponse.response.text(); } catch(e) { finalReply = 'Ação concluída nos bastidores.'; }
        }
      }

      // Save user message to database
      await prisma.chatMessage.create({
        data: {
          sessionId: sessionId!,
          sender: 'user',
          text: message
        }
      });

      // Save Ordinator response to database
      await prisma.chatMessage.create({
        data: {
          sessionId: sessionId!,
          sender: 'ordinator',
          text: finalReply,
          widgetType: widget ? widget.type : null,
          widgetData: widget ? widget.data : null
        }
      });

      if (pastMessages.length === 0) {
        const title = message.length > 25 ? message.slice(0, 25) + '...' : message;
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { title }
        });
      }

      return reply.send({ reply: finalReply, newHistory: await chat.getHistory(), action: actionToTrigger, actionData, widget, sessionId });
    } catch (e: any) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Falha na comunicação com o Ordinator: ' + e.message, stack: e.stack });
    }
  });

  fastify.post<{ Body: { role: 'ALUNO' | 'PROFESSOR', items: any[] } }>('/confirm-batch', async (request, reply) => {
    const { role, items } = request.body;
    const instituicao = request.user.instituicao!;
    const bcrypt = require('bcryptjs');
    let criados = 0;

    try {
      if (role === 'PROFESSOR') {
        for (const t of items) {
          const matString = String(t.matricula);
          const hashPassword = await bcrypt.hash(matString, 10);
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
              matricula: matString,
              password: hashPassword,
              nickname,
              instituicao,
              role: 'PROFESSOR',
              institutionId: request.user.institutionId || null
            }
          });
          criados++;
        }
        await logAction('Cadastro em Lote (IA)', `Confirmado o cadastro de ${criados} professores`, request.user.id, request.user.institutionId);
      } else if (role === 'ALUNO') {
        for (const s of items) {
          const matString = String(s.matricula);
          const hashPassword = await bcrypt.hash(matString, 10);
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

          const existingUser = await prisma.user.findUnique({ where: { matricula: matString } });
          if (!existingUser) {
            await prisma.user.create({
              data: {
                nome: s.nome,
                matricula: matString,
                password: hashPassword,
                nickname,
                instituicao,
                role: 'ALUNO',
                turno: s.turno || 'MATUTINO',
                turmaId,
                institutionId: request.user.institutionId || null
              }
            });
            criados++;
          }
        }
        await logAction('Cadastro em Lote (IA)', `Confirmado o cadastro de ${criados} alunos`, request.user.id, request.user.institutionId);
      }

      return reply.send({ success: true, message: `${criados} cadastros efetuados com sucesso!` });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao processar o lote: ' + err.message });
    }
  });

  fastify.get('/documents', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const docs = await prisma.document.findMany({ where: { instituicao } });
    return reply.send(docs);
  });

  fastify.post<{ Body: { filename: string, content: string } }>('/documents', async (request, reply) => {
    const { filename, content } = request.body;
    const instituicao = request.user.instituicao!;
    try {
      const { addDocumentToRag } = require('../services/ragService');
      const doc = await addDocumentToRag(filename, content, instituicao);
      return reply.send({ success: true, doc });
    } catch (e: any) {
      return reply.status(500).send({ error: 'Erro ao indexar documento: ' + e.message });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/documents/:id', async (request, reply) => {
    const { id } = request.params;
    const instituicao = request.user.instituicao!;
    try {
      const doc = await prisma.document.findFirst({ where: { id, instituicao } });
      if (!doc) return reply.status(404).send({ error: 'Documento não encontrado.' });
      await prisma.document.delete({ where: { id } });
      return reply.send({ success: true, message: 'Documento removido do RAG.' });
    } catch (e: any) {
      return reply.status(500).send({ error: 'Erro ao remover documento: ' + e.message });
    }
  });

  // --- Chat Sessions Management API ---
  fastify.get('/sessions', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const userId = request.user.id;
    const sessions = await prisma.chatSession.findMany({
      where: { userId, instituicao },
      orderBy: { updatedAt: 'desc' }
    });
    return reply.send(sessions);
  });

  fastify.post('/sessions', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const userId = request.user.id;
    const session = await prisma.chatSession.create({
      data: {
        title: 'Nova conversa',
        instituicao,
        userId
      }
    });
    return reply.send(session);
  });

  fastify.get<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!session) return reply.status(404).send({ error: 'Sessão de chat não encontrada.' });
    return reply.send(session);
  });

  fastify.delete<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    try {
      const session = await prisma.chatSession.findFirst({ where: { id, userId } });
      if (!session) return reply.status(404).send({ error: 'Sessão de chat não encontrada.' });
      await prisma.chatSession.delete({ where: { id } });
      return reply.send({ success: true, message: 'Sessão de chat deletada com sucesso.' });
    } catch (e: any) {
      return reply.status(500).send({ error: 'Erro ao deletar sessão: ' + e.message });
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
