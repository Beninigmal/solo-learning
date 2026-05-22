import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import crypto from 'crypto';

const WINDOW_MINUTES = 120;
const WAIT_TTL_MINUTES = 40;
const QUEST_EXPIRES_DAYS = 7;

interface GenerateQuestBody {
  semana: string;
  turmaId: string;
  tema: string;
  complexidade: string;
  exigeCalculo: boolean;
  disciplinaId: string;
}

class GeminiRotator {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.reloadKeys();
  }

  public reloadKeys(): void {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    this.keys = rawKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);
  }

  public getActiveKey(): string {
    if (this.keys.length === 0) {
      this.reloadKeys();
    }
    if (this.keys.length === 0) {
      throw new Error("Nenhuma API Key do Gemini configurada.");
    }
    return this.keys[this.currentIndex];
  }

  public rotateKey(): void {
    if (this.keys.length <= 1) return;
    const oldIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    console.warn(`[Gemini Rotator] Chave ${oldIndex} esgotada. Rotacionando para a chave ${this.currentIndex}.`);
  }

  public get totalKeys(): number {
    return this.keys.length;
  }
}

const rotator = new GeminiRotator();

export const questsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  const callGemini = async (prompt: string, image?: { data: string, mimeType: string }, attempt: number = 0): Promise<string> => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    try {
      const activeKey = rotator.getActiveKey();
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const parts: any[] = [prompt];
      if (image) {
        parts.push({
          inlineData: {
            data: image.data,
            mimeType: image.mimeType
          }
        });
      }
      
      const result = await model.generateContent(parts);
      let raw = result.response.text().trim();
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return raw;

    } catch (error: any) {
      const status = error.status || error.statusCode || 500;
      const isRateLimit = status === 429 || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota");

      if (isRateLimit && attempt < rotator.totalKeys - 1) {
        rotator.rotateKey();
        return callGemini(prompt, image, attempt + 1);
      }
      throw error;
    }
  };

  // ─── GET /quests/history ──────────────────────────────────────────────────
  // Professor visualiza o histórico de missões geradas
  fastify.get('/history', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    try {
      const history = await prisma.quest.findMany({
        where: {
          turmaAlvo: request.user.role === 'ADMIN' ? {} : {
            turmaDisciplinas: {
              some: {
                professorId: request.user.id
              }
            }
          }
        },
        include: { 
          turmaAlvo: true,
          deliveries: {
            select: { isCorrect: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedHistory = history.map(q => {
        const total = q.deliveries.length;
        const correct = q.deliveries.filter(d => d.isCorrect === true).length;
        const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        // Remove deliveries array from response to keep it clean
        const { deliveries, ...questData } = q;
        
        return {
          ...questData,
          successRate,
          totalDeliveries: total
        };
      });

      return reply.send(formattedHistory);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao buscar histórico.', details: error.message });
    }
  });

  // ─── GET /quests/daily ─────────────────────────────────────────────────────
  fastify.get('/daily', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const now = new Date();

    try {
      // Expirar quests de 7 dias ultrapassadas
      await prisma.questDelivery.updateMany({
        where: {
          userId,
          status: { in: ['SCHEDULED', 'DELIVERED'] },
          quest: { expiresAt: { lte: now } }
        },
        data: { status: 'EXPIRED' }
      });

      // Expirar fila de espera (WAITING > 40 min)
      await prisma.questDelivery.updateMany({
        where: { userId, status: 'WAITING', expiresAt: { lte: now } },
        data: { status: 'EXPIRED' }
      });

      const delivered = await prisma.questDelivery.findFirst({
        where: { userId, status: 'DELIVERED' },
        include: { quest: true },
        orderBy: { deliveredAt: 'desc' }
      });

      if (delivered) {
        return reply.status(200).send({
          deliveryId: delivered.id,
          question: delivered.quest.enunciado,
          xp: Math.max(Math.round(delivered.quest.xp * Math.pow(0.75, delivered.erros)), 25), // Maldição
          nivel: delivered.quest.nivel,
          tags: delivered.quest.tags,
          erros: delivered.erros
        });
      }

      const waiting = await prisma.questDelivery.findFirst({
        where: { userId, status: 'WAITING', expiresAt: { gt: now } },
        include: { quest: true },
        orderBy: { waitingSince: 'asc' }
      });

      if (waiting) {
        const reactivated = await prisma.questDelivery.update({
          where: { id: waiting.id },
          data: { status: 'DELIVERED', deliveredAt: now }
        });
        return reply.status(200).send({
          deliveryId: reactivated.id,
          question: waiting.quest.enunciado,
          xp: Math.max(Math.round(waiting.quest.xp * Math.pow(0.75, waiting.erros)), 25),
          nivel: waiting.quest.nivel,
          fromQueue: true,
          tags: waiting.quest.tags,
          erros: waiting.erros
        });
      }

      const scheduled = await prisma.questDelivery.findFirst({
        where: { userId, status: 'SCHEDULED', scheduledAt: { lte: now } },
        include: { quest: true },
        orderBy: { scheduledAt: 'asc' }
      });

      if (scheduled) {
        const updated = await prisma.questDelivery.update({
          where: { id: scheduled.id },
          data: { status: 'DELIVERED', deliveredAt: now }
        });
        return reply.status(200).send({
          deliveryId: updated.id,
          question: scheduled.quest.enunciado,
          xp: Math.max(Math.round(scheduled.quest.xp * Math.pow(0.75, scheduled.erros)), 25),
          nivel: scheduled.quest.nivel,
          tags: scheduled.quest.tags,
          erros: scheduled.erros
        });
      }

      return reply.status(404).send({ error: 'Aguardando novas missões do Mestre.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar quest.', details: error.message });
    }
  });

  // ─── POST /quests/generate ─────────────────────────────────────────────────
  fastify.post<{ Body: GenerateQuestBody }>('/generate', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { semana, turmaId, tema, complexidade, exigeCalculo, disciplinaId } = request.body;
    console.log('GENERATE QUEST BODY:', request.body);
    if (!turmaId || !tema || !complexidade || !disciplinaId) {
      return reply.status(400).send({ error: 'Campos obrigatórios: turmaId, tema, complexidade, disciplinaId.' });
    }

    try {
      const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turma) return reply.status(404).send({ error: 'Turma não encontrada.' });

      const disciplina = await prisma.disciplina.findUnique({ where: { id: disciplinaId } });
      if (!disciplina) return reply.status(404).send({ error: 'Disciplina não encontrada.' });

      // Verificar vínculo se não for Admin
      if (request.user.role !== 'ADMIN') {
        const vinculo = await prisma.turmaDisciplina.findFirst({
          where: {
            turmaId,
            disciplinaId,
            professorId: request.user.id
          }
        });

        if (!vinculo) {
          return reply.status(403).send({ error: 'Você não tem permissão para criar quests desta disciplina para esta turma.' });
        }
      }

      const prompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie EXATAMENTE 6 perguntas sobre o tema "${tema}" para a Semana "${semana}".
Nível de ensino/Complexidade alvo: ${complexidade} (FUNDAMENTAL, MEDIO ou LIVRE).

REGRAS IMPORTANTES:
- Linguagem simples e direta.
- As respostas podem ser numéricas ou em texto (uma palavra ou frase curta), dependendo do que for mais adequado para a pergunta.
- Não dê a resposta.
- Progressão de dificuldade de 1 a 6.
- Adeque a complexidade das perguntas ao nível "${complexidade}".
${exigeCalculo 
  ? '- As perguntas DEVEM exigir que o aluno desenvolva cálculos matemáticos ou físicos no papel para chegar à resposta. EVITE perguntas puramente teóricas ou de identificação. Foque em problemas que exijam contas.'
  : '- As perguntas devem ser teóricas ou de resposta direta, sem necessidade de desenvolvimento de cálculos complexos.'
}
- A pergunta 6 deve ser uma pergunta "BOSS": altamente complexa, que desafie o aluno e exija o uso de todo o conhecimento do tema.
- Retorne APENAS um JSON no formato especificado abaixo. Não inclua texto explicativo adicional.
Exemplo de formato esperado:
{
  "q1": "Escreva a lei da função que representa o valor...",
  "q2": "Dada a função f(x) = 3x - 9, determine...",
  "q3": "Um reservatório com 500 litros de água apresenta...",
  "q4": "A função f(x) = ax + b passa pelos pontos...",
  "q5": "Uma empresa vende um produto por R$ 50,00...",
  "q6": "Um projétil é lançado verticalmente com velocidade..."
}
`;

      let raw = await callGemini(prompt);
      
      // Limpa blocos de código markdown se houver
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();

      // Extrai apenas o JSON entre as chaves
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }

      const questions = JSON.parse(raw);
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + QUEST_EXPIRES_DAYS * 24 * 60 * 60 * 1000); // 7 dias
      const batchId = crypto.randomUUID();

      // Mapeamento de XP e Nível por ordem
      const questConfig = [
        { level: 'FACIL', xp: 100 },
        { level: 'MEDIO', xp: 150 },
        { level: 'DIFICIL', xp: 200 },
        { level: 'DIFICIL', xp: 200 },
        { level: 'DIFICIL', xp: 200 },
        { level: 'BOSS', xp: 500 } // BOSS vale mais XP!
      ];

      let firstQuestId = '';

      for (let i = 1; i <= 6; i++) {
        const key = `q${i}`;
        const enunciado = questions[key] || questions[key.toUpperCase()]; // Tenta minúsculo e maiúsculo
        
        if (!enunciado) {
          throw new Error(`Formato de resposta da IA inválido. Esperado chave ${key}.`);
        }

        const config = questConfig[i - 1];

        const quest = await prisma.quest.create({
          data: {
            disciplinaId: disciplina.id,
            enunciado,
            tags: exigeCalculo ? ['CALCULO'] : [],
            xp: config.xp,
            nivel: config.level,
            batchId,
            ordem: i,
            turmaAlvoId: turma.id,
            semana,
            tema,
            expiresAt
          }
        });

        if (i === 1) {
          firstQuestId = quest.id;
        }
      }

      const alunos = await prisma.user.findMany({ where: { turmaId: turma.id, role: 'ALUNO' } });

      if (alunos.length > 0) {
        await prisma.questDelivery.createMany({
          data: alunos.map((aluno: any) => ({
            questId: firstQuestId,
            userId: aluno.id,
            status: 'SCHEDULED',
            scheduledAt: now
          }))
        });
      }

      return reply.status(201).send({ batch: batchId, count: alunos.length });

    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar quests.', details: error.message });
    }
  });
  // ─── POST /quests/mock-boss ────────────────────────────────────────────────
  fastify.post<{ Body: { turmaId: string; tema: string; semana: string; duracaoDias?: number } }>('/mock-boss', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { turmaId, tema, semana, duracaoDias } = request.body;
    if (!turmaId || !tema) return reply.status(400).send({ error: 'TurmaId e Tema são obrigatórios.' });

    try {
      const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turma) return reply.status(404).send({ error: 'Turma não encontrada.' });

      let disciplina = await prisma.disciplina.findUnique({ where: { nome: 'Missões Gerais' } });
      if (!disciplina) {
        disciplina = await prisma.disciplina.create({ data: { nome: 'Missões Gerais' } });
      }

      const prompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie uma pergunta épica e desafiadora de nível "BOSS" sobre o tema "${tema}".
Esta pergunta deve ser complexa e exigir que o aluno demonstre domínio sobre o assunto.
Retorne APENAS um JSON no formato especificado abaixo. Não inclua texto explicativo adicional.
Exemplo de formato esperado:
{
  "pergunta": "Um foguete de testes é lançado de uma base militar..."
}`;

      let raw = await callGemini(prompt);
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }
      const result = JSON.parse(raw);
      const enunciado = result.pergunta || result.PERGUNTA;

      if (!enunciado) {
        throw new Error("Formato de resposta da IA inválido. Esperado chave 'pergunta'.");
      }

      const batchId = crypto.randomUUID();
      const now = new Date();
      const duracao = duracaoDias && duracaoDias > 0 ? duracaoDias : 1;
      const windowEnd = new Date(now.getTime() + duracao * 24 * 60 * 60 * 1000); 

      // Criar apenas uma quest BOSS com ordem 1 para ser entregue imediatamente
      const quest = await prisma.quest.create({
        data: {
          disciplinaId: disciplina.id,
          enunciado: enunciado,
          tags: ['TESTE', 'BOSS'],
          xp: 500,
          nivel: 'BOSS',
          batchId,
          ordem: 1,
          turmaAlvoId: turma.id,
          semana: semana || "Teste",
          tema: tema,
          windowEnd,
          expiresAt: windowEnd
        }
      });

      const alunos = await prisma.user.findMany({ where: { turmaId: turma.id, role: 'ALUNO' } });

      if (alunos.length > 0) {
        await prisma.questDelivery.createMany({
          data: alunos.map((aluno: any) => ({
            questId: quest.id,
            userId: aluno.id,
            status: 'SCHEDULED',
            scheduledAt: now
          }))
        });
      }

      return reply.status(201).send({ message: 'BOSS invocado com sucesso!', batchId });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao invocar BOSS com IA.', details: error.message });
    }
  });
  // ─── POST /quests/wait ─────────────────────────────────────────────────────
  fastify.post<{ Body: { deliveryId: string } }>('/wait', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId } = request.body;
    const userId = request.user.id;
    const now = new Date();
    if (!deliveryId) return reply.status(400).send({ error: 'deliveryId é obrigatório.' });
    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId } });
      if (!delivery || delivery.userId !== userId) return reply.status(404).send({ error: 'Entrega não encontrada.' });
      const expiresAt = new Date(now.getTime() + WAIT_TTL_MINUTES * 60 * 1000);
      await prisma.questDelivery.update({
        where: { id: deliveryId },
        data: { status: 'WAITING', waitingSince: now, expiresAt }
      });
      return reply.status(200).send({ message: 'Aguardando...', expiresAt });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao processar espera.' });
    }
  });

  // ─── POST /quests/request-next ─────────────────────────────────────────────
  fastify.post<{ Body: { disciplinaId?: string } }>('/request-next', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { disciplinaId } = request.body || {};
    const userId = request.user.id;
    const now = new Date();

    try {
      // 1. Verificar se já existe uma quest WAITING para este usuário que possamos reativar
      const waiting = await prisma.questDelivery.findFirst({
        where: {
          userId,
          status: 'WAITING',
          expiresAt: { gt: now },
          quest: {
            nivel: { notIn: ['BOSS', 'MINIBOSS'] },
            ...(disciplinaId ? { disciplinaId } : {})
          }
        },
        include: { quest: true },
        orderBy: { waitingSince: 'asc' }
      });

      if (waiting) {
        await prisma.questDelivery.update({
          where: { id: waiting.id },
          data: { status: 'DELIVERED', deliveredAt: now }
        });
        return reply.status(200).send({ message: 'Missão reativada com sucesso!' });
      }

      // 2. Buscar se já existe uma entrega SCHEDULED pré-criada no banco
      const scheduled = await prisma.questDelivery.findFirst({
        where: {
          userId,
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
          quest: {
            nivel: { notIn: ['BOSS', 'MINIBOSS'] },
            ...(disciplinaId ? { disciplinaId } : {})
          }
        },
        include: { quest: true },
        orderBy: { scheduledAt: 'asc' }
      });

      if (scheduled) {
        await prisma.questDelivery.update({
          where: { id: scheduled.id },
          data: { status: 'DELIVERED', deliveredAt: now }
        });
        return reply.status(200).send({ message: 'Missão invocada com sucesso!' });
      }

      // 3. Caso contrário, buscar dinamicamente a próxima quest sequencial na disciplina
      // Verificar se o aluno já tem uma quest DELIVERED (ativa na tela) desta matéria
      const active = await prisma.questDelivery.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          quest: {
            nivel: { notIn: ['BOSS', 'MINIBOSS'] },
            ...(disciplinaId ? { disciplinaId } : {})
          }
        }
      });

      if (active) {
        return reply.status(400).send({ error: 'Você já possui uma missão ativa na sua tela desta matéria. Resolva-a primeiro!' });
      }

      // Buscar a última quest entregue ao usuário nesta disciplina (independentemente do status: COMPLETED, WAITING ou EXPIRED)
      const lastDelivered = await prisma.questDelivery.findFirst({
        where: {
          userId,
          quest: {
            nivel: { notIn: ['BOSS', 'MINIBOSS'] },
            ...(disciplinaId ? { disciplinaId } : {})
          }
        },
        include: { quest: true },
        orderBy: { quest: { ordem: 'desc' } }
      });

      let nextQuest;

      if (lastDelivered) {
        const batchId = lastDelivered.quest.batchId;
        const currentOrdem = lastDelivered.quest.ordem;

        // Busca a próxima quest no mesmo lote
        nextQuest = await prisma.quest.findFirst({
          where: {
            batchId,
            ordem: currentOrdem + 1,
            nivel: { notIn: ['BOSS', 'MINIBOSS'] }
          }
        });
      }

      // Se não houver entregues ou não houver próxima no lote, busca a primeira do último lote da turma do aluno
      if (!nextQuest) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.turmaId) {
          return reply.status(404).send({ error: 'Aluno sem turma associada.' });
        }

        const latestQuest = await prisma.quest.findFirst({
          where: { 
            turmaAlvoId: user.turmaId,
            nivel: { notIn: ['BOSS', 'MINIBOSS'] },
            ...(disciplinaId ? { disciplinaId } : {})
          },
          orderBy: { createdAt: 'desc' }
        });

        if (latestQuest) {
          const batchId = latestQuest.batchId;
          const firstInBatch = await prisma.quest.findFirst({
            where: { batchId, ordem: 1 }
          });

          if (firstInBatch) {
            // Verificar se já existe entrega para essa primeira quest do lote
            const hasDelivery = await prisma.questDelivery.findFirst({
              where: { userId, questId: firstInBatch.id }
            });
            if (!hasDelivery) {
              nextQuest = firstInBatch;
            }
          }
        }
      }

      if (nextQuest) {
        // Cria nova entrega como DELIVERED
        await prisma.questDelivery.create({
          data: {
            questId: nextQuest.id,
            userId,
            status: 'DELIVERED',
            deliveredAt: now,
            scheduledAt: now
          }
        });
        return reply.status(200).send({ message: 'Missão invocada com sucesso!' });
      }

      return reply.status(404).send({ error: 'Todas as dungeons desta matéria estão seladas no momento.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao invocar missão.', details: error.message });
    }
  });

  fastify.post<{ Body: { deliveryId: string; question: string; answer: string; image?: string; artifactId?: string } }>('/daily/submit', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId, question, answer, image, artifactId } = request.body;
    const userId = request.user.id;
    const now = new Date();
    if (!deliveryId || !question || !answer) return reply.status(400).send({ error: 'Campos obrigatórios faltando.' });
    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId }, include: { quest: true } });
      if (!delivery || delivery.userId !== userId) return reply.status(404).send({ error: 'Entrega não encontrada.' });
      
      let prompt = answer === 'Cálculo na imagem'
        ? `Você é um tutor educacional rigoroso que avalia respostas de alunos de escola pública brasileira.
REGRA CRÍTICA: Respostas vazias, evasivas, de brincadeira, ou que apenas digam que o aluno não sabe a resposta (ex: "Não sei", "não entendi", "...", "sei lá", "não faço ideia") devem ser marcadas como ABSOLUTAMENTE INCORRETAS com status "error". Nunca marque admissões de desconhecimento como corretas.
A pergunta foi: "${question}".
O aluno optou por desenvolver o raciocínio na imagem. Analise APENAS a imagem e avalie a resposta.

Se CORRETO: retorne JSON: {"status": "success", "message": "Mensagem motivacional curta de parabenização"}
Se ERRADO: retorne JSON: {"status": "error", "message": "Explique de forma educativa o que errou e dê uma dica sobre o raciocínio correto, MAS NÃO revele a resposta final."}`
        : `Você é um tutor educacional rigoroso que avalia respostas de alunos de escola pública brasileira.
REGRA CRÍTICA: Respostas vazias, evasivas, de brincadeira, ou que apenas digam que o aluno não sabe a resposta (ex: "Não sei", "não entendi", "...", "sei lá", "não faço ideia") devem ser marcadas como ABSOLUTAMENTE INCORRETAS com status "error". Nunca marque admissões de desconhecimento como corretas, mesmo que sejam honestas.
A pergunta foi: "${question}".
A resposta do aluno foi: "${answer}".

Se CORRETO: retorne JSON: {"status": "success", "message": "Mensagem motivacional curta de parabenização"}
Se ERRADO: retorne JSON: {"status": "error", "message": "Explique de forma educativa o conceito por trás do erro e dê uma dica para o aluno melhorar, MAS NÃO revele a resposta final."}`;

      if (artifactId === 'sapatilhas_veloz') {
        prompt += `\nNOTA: O aluno usou o artefato 'Sapatilhas do Veloz' que reduz a dificuldade. Seja benevolente na avaliação, aceitando aproximações ou pequenos erros de digitação.`;
      }

      let imageData = image;
      if (image && image.startsWith('data:')) {
        imageData = image.split(',')[1];
      }

      let responseText = await callGemini(prompt, imageData ? { data: imageData, mimeType: 'image/jpeg' } : undefined);
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        responseText = responseText.substring(firstBrace, lastBrace + 1);
      }

      const validation = JSON.parse(responseText);
      const isCorrect = validation.status === 'success';

      if (isCorrect) {
        // Calcular XP com maldição de 25% por erro acumulado (Boss e Mini Boss não sofrem maldição)
        const isBoss = delivery.quest.nivel === 'BOSS' || delivery.quest.nivel === 'MINIBOSS';
        const effectiveErros = artifactId === 'escudo_arcano' ? 0 : delivery.erros;
        let xpFinal = isBoss
          ? delivery.quest.xp
          : Math.max(Math.round(delivery.quest.xp * Math.pow(0.75, effectiveErros)), 25);
        
        if (artifactId === 'elixir_dourado') {
          xpFinal *= 2;
        }

        await prisma.questDelivery.update({
          where: { id: deliveryId },
          data: { status: 'COMPLETED', answeredAt: new Date(), isCorrect: true }
        });
        await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpFinal } } });
        
        // --- LÓGICA DE SPAWN DO MINI BOSS ---
        let miniBossSpawned = false;
        try {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user && user.turmaId) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            // Buscar entregas concluídas hoje com sucesso
            const todayCompleted = await prisma.questDelivery.findMany({
              where: {
                userId,
                status: 'COMPLETED',
                isCorrect: true,
                answeredAt: { gte: startOfDay }
              },
              include: { quest: true }
            });

            // Agrupar e contar por disciplina
            const subjectCounts: Record<string, number> = {};
            for (const d of todayCompleted) {
              const discId = d.quest.disciplinaId;
              subjectCounts[discId] = (subjectCounts[discId] || 0) + 1;
            }

            const counts = Object.values(subjectCounts);
            const hasThreeAndThree = counts.filter(c => c >= 3).length >= 2;
            const hasTwoTwoTwo = counts.filter(c => c >= 2).length >= 3;

            if (hasThreeAndThree || hasTwoTwoTwo) {
              // Verificar se já spawnou um Mini Boss hoje para este usuário
              const alreadyTriggered = await prisma.quest.findFirst({
                where: {
                  nivel: 'MINIBOSS',
                  createdAt: { gte: startOfDay },
                  deliveries: {
                    some: { userId }
                  }
                }
              });

              if (!alreadyTriggered) {
                // Selecionar disciplina candidata
                const candidateSubjects = Object.keys(subjectCounts).filter(discId => subjectCounts[discId] >= 2);
                const chosenSubjectId = candidateSubjects[0] || todayCompleted[0]?.quest.disciplinaId;

                if (chosenSubjectId) {
                  const discipline = await prisma.disciplina.findUnique({ where: { id: chosenSubjectId } });
                  const subjectName = discipline ? discipline.nome : 'Estudos Gerais';

                  const miniBossPrompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie uma pergunta desafiadora de nível "MINIBOSS" sobre o assunto "${subjectName}".
Esta pergunta deve ser um pouco mais difícil que as normais para testar o conhecimento do aluno, mas ela deve ser respondível e não insana (ou seja, de nível adequado para alunos do ensino médio/fundamental).
Retorne APENAS um JSON no seguinte formato:
{
  "pergunta": "Texto da pergunta aqui..."
}`;
                  const rawResponse = await callGemini(miniBossPrompt);
                  let cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                  const firstBraceIndex = cleaned.indexOf('{');
                  const lastBraceIndex = cleaned.lastIndexOf('}');
                  if (firstBraceIndex !== -1 && lastBraceIndex !== -1) {
                    cleaned = cleaned.substring(firstBraceIndex, lastBraceIndex + 1);
                  }
                  const parsed = JSON.parse(cleaned);
                  const enunciadoMiniBoss = parsed.pergunta || parsed.PERGUNTA;

                  if (enunciadoMiniBoss) {
                    const quest = await prisma.quest.create({
                      data: {
                        disciplinaId: chosenSubjectId,
                        enunciado: enunciadoMiniBoss,
                        tags: ['MINIBOSS'],
                        xp: 300,
                        nivel: 'MINIBOSS',
                        batchId: crypto.randomUUID(),
                        ordem: 1,
                        turmaAlvoId: user.turmaId,
                        semana: 'Mini Boss',
                        tema: `Mini Boss - ${subjectName}`,
                        expiresAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // expira em 1 dia
                      }
                    });

                    // Buscar participantes da Party (máximo 3)
                    const userParticipant = await prisma.raidParticipant.findFirst({
                      where: { userId, raid: { status: 'OPEN' } },
                      include: { raid: { include: { participantes: true } } }
                    });

                    const targetUserIds = userParticipant 
                      ? userParticipant.raid.participantes.map(p => p.userId).slice(0, 3)
                      : [userId];

                    await prisma.questDelivery.createMany({
                      data: targetUserIds.map(uid => ({
                        questId: quest.id,
                        userId: uid,
                        status: 'DELIVERED',
                        scheduledAt: now,
                        deliveredAt: now
                      }))
                    });

                    miniBossSpawned = true;
                  }
                }
              }
            }
          }
        } catch (spawnErr) {
          request.log.error({ err: spawnErr }, 'Erro ao tentar spawnar Mini Boss');
        }

        return reply.send({ ...validation, xpGanho: xpFinal, miniBossSpawned });
      } else {
        // Incrementar erro e manter DELIVERED para nova tentativa (escudo arcano cancela aumento de erro e remove maldição anterior)
        const novosErros = artifactId === 'escudo_arcano' ? 0 : delivery.erros + 1;
        await prisma.questDelivery.update({
          where: { id: deliveryId },
          data: { erros: novosErros }
        });

        // Criar WrongAnswer no Baú apenas se não usou escudo arcano
        if (artifactId !== 'escudo_arcano') {
          await prisma.wrongAnswer.upsert({
            where: { userId_questId: { userId, questId: delivery.questId } },
            update: { tentativas: { increment: 1 } },
            create: { userId, questId: delivery.questId, tentativas: 1 }
          });
        }

        const isBoss = delivery.quest.nivel === 'BOSS' || delivery.quest.nivel === 'MINIBOSS';
        const xpRestante = isBoss
          ? delivery.quest.xp
          : Math.max(Math.round(delivery.quest.xp * Math.pow(0.75, novosErros)), 25);
        return reply.send({ ...validation, xpRestante, erros: novosErros });
      }
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao submeter resposta.' });
    }
  });

  // ─── POST /quests/store-in-chest ───────────────────────────────────────────
  // Aluno guarda a quest atual no Baú sem responder (adia para depois)
  fastify.post<{ Body: { deliveryId: string } }>('/store-in-chest', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId } = request.body;
    const userId = request.user.id;
    if (!deliveryId) return reply.status(400).send({ error: 'deliveryId é obrigatório.' });
    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId } });
      if (!delivery || delivery.userId !== userId) return reply.status(404).send({ error: 'Entrega não encontrada.' });

      // Cria ou incrementa entrada no Baú sem marcar como erro
      await prisma.wrongAnswer.upsert({
        where: { userId_questId: { userId, questId: delivery.questId } },
        update: {},
        create: { userId, questId: delivery.questId, tentativas: 0 }
      });

      // Marca a entrega como WAITING para liberar o slot da missão diária
      await prisma.questDelivery.update({
        where: { id: deliveryId },
        data: { status: 'WAITING', waitingSince: new Date() }
      });

      return reply.status(200).send({ message: 'Missão guardada no Baú com sucesso!' });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao guardar no baú.' });
    }
  });

  // ─── GET /quests/wrong-answers ─────────────────────────────────────────────
  fastify.get('/wrong-answers', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const wrongAnswers = await prisma.wrongAnswer.findMany({
        where: { userId, resolvido: false },
        include: { quest: true }
      });
      return reply.send(wrongAnswers);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao buscar baú de perguntas.', details: error.message });
    }
  });

  // ─── POST /quests/wrong-answers/:id/retry ──────────────────────────────────
  fastify.post<{ Params: { id: string }; Body: { answer: string; image?: string; artifactId?: string } }>('/wrong-answers/:id/retry', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { answer, image, artifactId } = request.body;
    const userId = request.user.id;

    try {
      const wrongAnswer = await prisma.wrongAnswer.findUnique({
        where: { id },
        include: { quest: true }
      });

      if (!wrongAnswer || wrongAnswer.userId !== userId) {
        return reply.status(404).send({ error: 'Registro não encontrado.' });
      }

      let prompt = answer === 'Cálculo na imagem'
        ? `Você é um tutor educacional rigoroso.
REGRA CRÍTICA: Respostas vazias, evasivas, de brincadeira, ou que apenas digam que o aluno não sabe a resposta (ex: "Não sei", "não entendi", "...", "sei lá", "não faço ideia") devem ser marcadas como ABSOLUTAMENTE INCORRETAS com status "error". Nunca marque admissões de desconhecimento como corretas.
Atenção: O aluno NÃO digitou a resposta em texto. A resposta dele e o raciocínio estão EXCLUSIVAMENTE na imagem enviada.
Ignore a mensagem 'Cálculo na imagem'.
Analise a imagem para extrair a resposta final e o raciocínio. Verifique se a resposta encontrada na imagem está correta para a pergunta: "${wrongAnswer.quest.enunciado}".
Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`
        : `Você é um tutor educacional rigoroso.
REGRA CRÍTICA: Respostas vazias, evasivas, de brincadeira, ou que apenas digam que o aluno não sabe a resposta (ex: "Não sei", "não entendi", "...", "sei lá", "não faço ideia") devem ser marcadas como ABSOLUTAMENTE INCORRETAS com status "error". Nunca marque admissões de desconhecimento como corretas, mesmo que sejam honestas.
Valide a resposta "${answer}" para a pergunta "${wrongAnswer.quest.enunciado}". Se uma imagem foi enviada, ela contém o raciocínio matemático do aluno. Analise-o para ver se está correto e se bate com a resposta digitada. Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`;

      if (artifactId === 'sapatilhas_veloz') {
        prompt += `\nNOTA: O aluno usou o artefato 'Sapatilhas do Veloz' que reduz a dificuldade. Seja benevolente na avaliação, aceitando aproximações ou pequenos erros de digitação.`;
      }

      let imageData = image;
      if (image && image.startsWith('data:')) {
        imageData = image.split(',')[1];
      }

      let responseText = await callGemini(prompt, imageData ? { data: imageData, mimeType: 'image/jpeg' } : undefined);
      
      // Limpa blocos de código markdown se houver
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      // Extrai apenas o JSON entre as chaves
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        responseText = responseText.substring(firstBrace, lastBrace + 1);
      }

      const validation = JSON.parse(responseText);

      if (validation.status === 'success') {
        await prisma.wrongAnswer.update({
          where: { id },
          data: { resolvido: true }
        });

        // Atualizar a entrega original para COMPLETED e isCorrect: true
        await prisma.questDelivery.update({
          where: {
            questId_userId: {
              questId: wrongAnswer.questId,
              userId
            }
          },
          data: {
            status: 'COMPLETED',
            isCorrect: true,
            answeredAt: new Date()
          }
        }).catch(err => {
          console.error('[QuestDelivery Update Error in Baú Retry]', err);
        });

        const questXp = wrongAnswer.quest.xp;
        const effectiveErros = artifactId === 'escudo_arcano' ? 0 : wrongAnswer.tentativas;
        const isBoss = wrongAnswer.quest.nivel === 'BOSS' || wrongAnswer.quest.nivel === 'MINIBOSS';

        let xpGanho = isBoss 
          ? questXp 
          : Math.max(Math.round(questXp * Math.pow(0.75, effectiveErros)), 25);

        if (artifactId === 'elixir_dourado') {
          xpGanho *= 2; // Duplica o XP
        }

        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: xpGanho } }
        });

        // Se acertou usando escudo arcano, remove a maldição do QuestDelivery no BD resetando erros para 0!
        if (artifactId === 'escudo_arcano') {
          await prisma.questDelivery.updateMany({
            where: { userId, questId: wrongAnswer.questId },
            data: { erros: 0 }
          }).catch(console.error);
        }

        return reply.send({ ...validation, xpGanho });
      } else {
        const novasTentativas = artifactId === 'escudo_arcano' ? 0 : wrongAnswer.tentativas + 1;
        await prisma.wrongAnswer.update({
          where: { id },
          data: { tentativas: novasTentativas }
        });
        if (artifactId === 'escudo_arcano') {
          await prisma.questDelivery.updateMany({
            where: { userId, questId: wrongAnswer.questId },
            data: { erros: 0 }
          }).catch(console.error);
        }

        const isBoss = wrongAnswer.quest.nivel === 'BOSS' || wrongAnswer.quest.nivel === 'MINIBOSS';
        const xpRestante = isBoss
          ? wrongAnswer.quest.xp
          : Math.max(Math.round(wrongAnswer.quest.xp * Math.pow(0.75, novasTentativas)), 25);

        return reply.send({ ...validation, xpRestante, erros: novasTentativas });
      }
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao processar tentativa.', details: error.message, stack: error.stack });
    }
  });

  // ─── GET /quests/party/join-redirect ───────────────────────────────────────
  fastify.get<{ Querystring: { code: string } }>('/party/join-redirect', async (request, reply) => {
    const { code } = request.query;
    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Portal Solen</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              background-color: #020617;
              color: #f8fafc;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .spinner {
              border: 4px solid rgba(255,255,255,0.1);
              width: 50px;
              height: 50px;
              border-radius: 50%;
              border-left-color: #00f3ff;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { font-size: 1.5rem; margin-bottom: 10px; color: #00f3ff; text-transform: uppercase; letter-spacing: 2px; }
            p { color: #94a3b8; font-size: 0.9rem; max-width: 300px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h1>Abrindo o Portal Solen...</h1>
          <p>Você será redirecionado para a Party em instantes.</p>
          <script>
            setTimeout(() => {
              window.location.href = "solen://party/join?code=${code}";
            }, 1000);
          </script>
        </body>
      </html>
    `);
  });

  // ─── GET /quests/party/active ──────────────────────────────────────────────
  fastify.get('/party/active', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const participant = await prisma.raidParticipant.findFirst({
        where: { userId, raid: { status: 'OPEN' } },
        include: {
          raid: {
            include: {
              participantes: {
                include: {
                  user: {
                    select: { nome: true, nickname: true, xp: true, lastActiveAt: true }
                  }
                }
              }
            }
          }
        }
      });
      return reply.send(participant ? participant.raid : null);
    } catch (e) {
      return reply.status(500).send({ error: 'Erro ao buscar Party.' });
    }
  });

  // ─── POST /quests/party/create ─────────────────────────────────────────────
  fastify.post('/party/create', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const creator = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!creator || !creator.turmaId) {
        return reply.status(400).send({ error: 'Você precisa estar vinculado a uma Turma para criar uma Party.' });
      }

      const active = await prisma.raidParticipant.findFirst({
        where: { userId, raid: { status: 'OPEN' } }
      });
      if (active) {
        return reply.status(400).send({ error: 'Você já está em uma Party ativa.' });
      }

      // Gerar código único de 6 dígitos
      const codigo = 'RAID-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const raid = await prisma.raid.create({
        data: {
          codigo,
          participantes: {
            create: { userId }
          }
        },
        include: {
          participantes: {
            include: {
              user: {
                select: { nome: true, nickname: true, xp: true, lastActiveAt: true }
              }
            }
          }
        }
      });

      return reply.send(raid);
    } catch (e) {
      return reply.status(500).send({ error: 'Erro ao criar Party.' });
    }
  });

  // ─── POST /quests/party/join ───────────────────────────────────────────────
  fastify.post<{ Body: { codigo: string } }>('/party/join', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const { codigo } = request.body;
    if (!codigo) return reply.status(400).send({ error: 'Código é obrigatório.' });

    try {
      const active = await prisma.raidParticipant.findFirst({
        where: { userId, raid: { status: 'OPEN' } }
      });
      if (active) {
        return reply.status(400).send({ error: 'Você já está em uma Party ativa.' });
      }

      const raid = await prisma.raid.findFirst({
        where: { codigo: codigo.trim().toUpperCase(), status: 'OPEN' },
        include: { 
          participantes: {
            include: {
              user: true
            }
          } 
        }
      });

      if (!raid) {
         return reply.status(404).send({ error: 'Party ou Raid não encontrada ou já encerrada.' });
      }

      if (raid.participantes.length >= 3) {
         return reply.status(400).send({ error: 'Esta Party já atingiu o limite máximo de 3 aventureiros.' });
      }

      const joiningUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!joiningUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      // Buscar participantes daquela Raid diretamente e frescos para validar turma
      const currentParticipants = await prisma.raidParticipant.findMany({
        where: { raidId: raid.id },
        include: { user: true }
      });

      if (currentParticipants.length > 0) {
        const creatorUser = currentParticipants[0].user;
        if (!creatorUser.turmaId || !joiningUser.turmaId || creatorUser.turmaId !== joiningUser.turmaId) {
          return reply.status(400).send({ error: 'Você só pode entrar em uma Party com alunos da mesma turma!' });
        }
      } else {
        return reply.status(400).send({ error: 'Esta Party está vazia ou sem criador ativo.' });
      }

      const updatedRaid = await prisma.raid.update({
        where: { id: raid.id },
        data: {
          participantes: {
            create: { userId }
          }
        },
        include: {
          participantes: {
            include: {
              user: {
                select: { nome: true, nickname: true, xp: true, lastActiveAt: true }
              }
            }
          }
        }
      });

      return reply.send(updatedRaid);
    } catch (e) {
      return reply.status(500).send({ error: 'Erro ao entrar na Party.' });
    }
  });

  // ─── POST /quests/party/leave ──────────────────────────────────────────────
  fastify.post('/party/leave', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const activeParticipant = await prisma.raidParticipant.findFirst({
        where: { userId, raid: { status: 'OPEN' } },
        include: { raid: { include: { participantes: true } } }
      });

      if (!activeParticipant) {
        return reply.status(400).send({ error: 'Você não está em nenhuma Party ativa.' });
      }

      await prisma.raidParticipant.delete({
        where: { id: activeParticipant.id }
      });

      if (activeParticipant.raid.participantes.length <= 1) {
        await prisma.raid.update({
          where: { id: activeParticipant.raidId },
          data: { status: 'FAILED' }
        });
      }

      return reply.send({ message: 'Você saiu da Party com sucesso.' });
    } catch (e) {
      return reply.status(500).send({ error: 'Erro ao sair da Party.' });
    }
  });

  // ─── GET /quests/subject-stats ──────────────────────────────────────────────
  fastify.get('/subject-stats', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { turmaId: true }
      });

      if (!student || !student.turmaId) {
        return reply.send([]);
      }

      // Buscar disciplinas vinculadas à turma
      const turmaDisciplinas = await prisma.turmaDisciplina.findMany({
        where: { turmaId: student.turmaId },
        include: { disciplina: true }
      });

      const stats = [];

      for (const td of turmaDisciplinas) {
        const disciplina = td.disciplina;

        // X (Acertos): COMPLETED com isCorrect = true
        const acertos = await prisma.questDelivery.count({
          where: {
            userId,
            isCorrect: true,
            quest: {
              disciplinaId: disciplina.id,
              nivel: { notIn: ['BOSS', 'MINIBOSS'] }
            }
          }
        });

        // F (Falhas): Com erro > 0 ou isCorrect = false
        const falhas = await prisma.questDelivery.count({
          where: {
            userId,
            quest: {
              disciplinaId: disciplina.id,
              nivel: { notIn: ['BOSS', 'MINIBOSS'] }
            },
            OR: [
              { erros: { gt: 0 } },
              { isCorrect: false }
            ]
          }
        });

        // Y (Disponíveis): Quests no banco daquela disciplina menos as que já foram entregues
        const totalQuestsInClass = await prisma.quest.count({
          where: {
            turmaAlvoId: student.turmaId,
            disciplinaId: disciplina.id,
            nivel: { notIn: ['BOSS', 'MINIBOSS'] }
          }
        });

        const totalDeliveredQuests = await prisma.questDelivery.count({
          where: {
            userId,
            quest: {
              disciplinaId: disciplina.id,
              nivel: { notIn: ['BOSS', 'MINIBOSS'] }
            },
            status: { in: ['DELIVERED', 'WAITING', 'COMPLETED', 'EXPIRED'] }
          }
        });

        const disponiveis = Math.max(totalQuestsInClass - totalDeliveredQuests, 0);

        stats.push({
          disciplinaId: disciplina.id,
          nome: disciplina.nome,
          acertos,
          falhas,
          disponiveis
        });
      }

      return reply.send(stats);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar estatísticas de matérias.', details: error.message });
    }
  });

  // ==========================================
  // FEATURE: PERGUNTA DOURADA (DIRETOR <-> ALUNO)
  // ==========================================

  // 1. Criar Pergunta Dourada (Apenas Diretor/ADMIN/PROFESSOR)
  fastify.post<{ Body: { enunciado: string; turmaId: string } }>('/golden-question', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR')) {
        return reply.status(403).send({ error: 'Apenas diretores e mestres podem forjar perguntas douradas.' });
      }

      const { enunciado, turmaId } = request.body;
      if (!enunciado || !turmaId) {
        return reply.status(400).send({ error: 'Campos enunciado e turmaId são obrigatórios.' });
      }

      const goldenQuestion = await prisma.goldenQuestion.create({
        data: {
          enunciado,
          turmaId,
          criadorId: user.id
        }
      });

      return reply.status(201).send(goldenQuestion);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar pergunta dourada.', details: error.message });
    }
  });

  // 2. Listar Perguntas Douradas e Respostas (Apenas Diretor/ADMIN/PROFESSOR - Filtradas por Criador)
  fastify.get('/golden-questions', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR')) {
        return reply.status(403).send({ error: 'Apenas diretores e mestres podem ver o histórico de perguntas douradas.' });
      }

      const questions = await prisma.goldenQuestion.findMany({
        where: {
          criadorId: user.id
        },
        include: {
          turma: {
            include: {
              users: {
                where: { role: 'ALUNO' }
              }
            }
          },
          respostas: {
            include: {
              user: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = questions.map((q: any) => {
        const totalStudents = q.turma.users.length;
        const answeredCount = q.respostas.length;
        const rate = totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0;

        return {
          id: q.id,
          enunciado: q.enunciado,
          turmaId: q.turmaId,
          turmaNome: q.turma.nome,
          totalAlunos: totalStudents,
          respostasContadas: answeredCount,
          taxaResposta: rate,
          respostas: q.respostas.map((r: any) => ({
            id: r.id,
            alunoNome: r.user.nome,
            alunoMatricula: r.user.matricula,
            resposta: r.resposta,
            createdAt: r.createdAt
          })),
          createdAt: q.createdAt
        };
      });

      return reply.send(formatted);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao listar perguntas douradas.', details: error.message });
    }
  });

  // 3. Obter Pergunta Dourada Ativa (Apenas Aluno)
  fastify.get('/golden-question/active', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const student = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!student || student.role !== 'ALUNO' || !student.turmaId) {
        return reply.send(null);
      }

      // Busca a pergunta dourada mais recente para a turma do aluno
      const latestQuestion = await prisma.goldenQuestion.findFirst({
        where: { turmaId: student.turmaId },
        orderBy: { createdAt: 'desc' }
      });

      if (!latestQuestion) {
        return reply.send(null);
      }

      // Verifica se o aluno já respondeu a esta pergunta específica
      const answered = await prisma.goldenAnswer.findUnique({
        where: {
          goldenQuestionId_userId: {
            goldenQuestionId: latestQuestion.id,
            userId: student.id
          }
        }
      });

      if (answered) {
        return reply.send(null);
      }

      return reply.send(latestQuestion);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar pergunta dourada ativa.', details: error.message });
    }
  });

  // 4. Responder a Pergunta Dourada (Apenas Aluno)
  fastify.post<{ Body: { goldenQuestionId: string; resposta: string } }>('/golden-question/answer', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const student = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!student || student.role !== 'ALUNO') {
        return reply.status(403).send({ error: 'Apenas alunos podem responder a perguntas douradas.' });
      }

      const { goldenQuestionId, resposta } = request.body;
      if (!goldenQuestionId || !resposta || resposta.trim() === '') {
        return reply.status(400).send({ error: 'Campos goldenQuestionId e resposta são obrigatórios.' });
      }

      // Verifica se a pergunta realmente existe e pertence à turma do aluno
      const question = await prisma.goldenQuestion.findUnique({ where: { id: goldenQuestionId } });
      if (!question || question.turmaId !== student.turmaId) {
        return reply.status(404).send({ error: 'Pergunta dourada não encontrada ou indisponível para sua turma.' });
      }

      const answer = await prisma.goldenAnswer.upsert({
        where: {
          goldenQuestionId_userId: {
            goldenQuestionId,
            userId: student.id
          }
        },
        update: {
          resposta
        },
        create: {
          goldenQuestionId,
          userId: student.id,
          resposta
        }
      });

      return reply.status(201).send(answer);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao registrar resposta da pergunta dourada.', details: error.message });
    }
  });

  // ==========================================
  // 5. ATUALIZAR UNIDADE DA TURMA (Mestre/Diretor)
  // ==========================================
  fastify.put<{ Params: { id: string }; Body: { unidade: number } }>('/turmas/:id/unidade', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR')) {
        return reply.status(403).send({ error: 'Apenas diretores e mestres podem alterar a unidade da turma.' });
      }
      const { id } = request.params;
      const { unidade } = request.body;
      if (unidade < 1 || unidade > 3) {
        return reply.status(400).send({ error: 'Unidade inválida. Escolha entre 1, 2 ou 3.' });
      }
      const updated = await prisma.turma.update({
        where: { id },
        data: { unidade }
      });
      return reply.send({ message: 'Unidade atualizada com sucesso.', turma: updated });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar unidade.', details: error.message });
    }
  });

  // ==========================================
  // 6. MANEJO DE DISCIPLINAS (Matérias)
  // ==========================================
  fastify.post<{ Body: { nome: string } }>('/disciplinas', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Apenas o Diretor/ADMIN pode criar matérias.' });
      }
      const { nome } = request.body;
      if (!nome || nome.trim() === '') {
        return reply.status(400).send({ error: 'Nome da matéria é obrigatório.' });
      }
      const exists = await prisma.disciplina.findFirst({ where: { nome: { equals: nome.trim(), mode: 'insensitive' } } });
      if (exists) {
        return reply.status(400).send({ error: 'Uma matéria com este nome já existe.' });
      }
      const created = await prisma.disciplina.create({
        data: { nome: nome.trim() }
      });
      return reply.status(201).send(created);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar matéria.', details: error.message });
    }
  });

  fastify.get('/disciplinas', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const disciplines = await prisma.disciplina.findMany({
        include: {
          professores: {
            include: {
              professor: true
            }
          }
        },
        orderBy: { nome: 'asc' }
      });
      const formatted = disciplines.map(d => ({
        id: d.id,
        nome: d.nome,
        professores: d.professores.map(p => ({
          id: p.professor.id,
          nome: p.professor.nome,
          nickname: p.professor.nickname,
          matricula: p.professor.matricula,
          temp: p.temp
        }))
      }));
      return reply.send(formatted);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao listar matérias.', details: error.message });
    }
  });

  fastify.post<{ Body: { professorId: string; disciplinaId: string; temp?: any } }>('/disciplinas/professor', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Apenas o Diretor/ADMIN pode vincular professores.' });
      }
      const { professorId, disciplinaId, temp } = request.body;
      const parsedTemp = temp === true || temp === 'true';
      const relation = await prisma.disciplinaProfessor.upsert({
        where: {
          professorId_disciplinaId: { professorId, disciplinaId }
        },
        update: {
          temp: parsedTemp
        },
        create: { 
          professorId, 
          disciplinaId,
          temp: parsedTemp
        }
      });
      return reply.status(201).send({ message: 'Professor vinculado com sucesso!', relation });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao vincular professor.', details: error.message });
    }
  });

  fastify.delete<{ Body: { professorId: string; disciplinaId: string } }>('/disciplinas/professor', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Apenas o Diretor/ADMIN pode desvincular professores.' });
      }
      const { professorId, disciplinaId } = request.body;
      await prisma.disciplinaProfessor.delete({
        where: {
          professorId_disciplinaId: { professorId, disciplinaId }
        }
      });
      return reply.send({ message: 'Vínculo do professor removido com sucesso!' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover vínculo.', details: error.message });
    }
  });

  // ==========================================
  // 7. GRADE DE HORÁRIOS (Timetable)
  // ==========================================
  fastify.get<{ Params: { turmaId: string } }>('/turmas/:turmaId/timetable', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { turmaId } = request.params;
      const slots = await prisma.timetableSlot.findMany({
        where: { turmaId },
        include: {
          disciplina: true
        },
        orderBy: [
          { diaSemana: 'asc' },
          { posicao: 'asc' }
        ]
      });
      return reply.send(slots);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar grade de horários.', details: error.message });
    }
  });

  fastify.post<{ Params: { turmaId: string }; Body: { slots: { diaSemana: string; posicao: number; disciplinaId: string }[] } }>('/turmas/:turmaId/timetable', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR')) {
        return reply.status(403).send({ error: 'Apenas diretores e mestres podem editar a grade de horários.' });
      }
      const { turmaId } = request.params;
      const { slots } = request.body;

      const createdSlots = [];
      for (const slot of slots) {
        const s = await prisma.timetableSlot.upsert({
          where: {
            turmaId_diaSemana_posicao: {
              turmaId,
              diaSemana: slot.diaSemana,
              posicao: slot.posicao
            }
          },
          update: {
            disciplinaId: slot.disciplinaId
          },
          create: {
            turmaId,
            diaSemana: slot.diaSemana,
            posicao: slot.posicao,
            disciplinaId: slot.disciplinaId
          }
        });
        createdSlots.push(s);
      }
      return reply.send({ message: 'Grade de horários atualizada com sucesso!', slots: createdSlots });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao salvar grade de horários.', details: error.message });
    }
  });

  // ==========================================
  // 8. AGENDA E CALENDÁRIO
  // ==========================================
  fastify.get('/calendar/events', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

      let events;
      if (user.role === 'ALUNO') {
        if (!user.turmaId) return reply.send([]);
        events = await prisma.calendarEvent.findMany({
          where: { turmaId: user.turmaId },
          include: {
            professor: true,
            turma: true
          },
          orderBy: { data: 'asc' }
        });
      } else {
        events = await prisma.calendarEvent.findMany({
          where: { professorId: user.id },
          include: {
            professor: true,
            turma: true
          },
          orderBy: { data: 'asc' }
        });
      }

      const formatted = events.map(e => ({
        id: e.id,
        titulo: e.titulo,
        descricao: e.descricao,
        data: e.data.toISOString(),
        tipo: e.tipo,
        turmaNome: e.turma.nome,
        turmaId: e.turmaId,
        professorNome: e.professor.nome
      }));

      return reply.send(formatted);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao listar agenda.', details: error.message });
    }
  });

  fastify.post<{ Body: { titulo: string; descricao?: string; data: string; tipo: string; turmaId: string } }>('/calendar/events', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR')) {
        return reply.status(403).send({ error: 'Apenas mestres e diretores podem adicionar datas na agenda.' });
      }
      const { titulo, descricao, data, tipo, turmaId } = request.body;
      if (!titulo || !data || !tipo || !turmaId) {
        return reply.status(400).send({ error: 'Campos titulo, data, tipo e turmaId são obrigatórios.' });
      }
      const event = await prisma.calendarEvent.create({
        data: {
          titulo,
          descricao,
          data: new Date(data),
          tipo,
          turmaId,
          professorId: user.id
        }
      });
      return reply.status(201).send(event);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar evento na agenda.', details: error.message });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/calendar/events/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR')) {
        return reply.status(403).send({ error: 'Apenas mestres e diretores podem apagar da agenda.' });
      }
      const { id } = request.params;
      const event = await prisma.calendarEvent.findUnique({ where: { id } });
      if (!event) {
        return reply.status(404).send({ error: 'Evento não encontrado.' });
      }
      if (event.professorId !== user.id && user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Você não tem permissão para remover este apontamento.' });
      }
      await prisma.calendarEvent.delete({ where: { id } });
      return reply.send({ message: 'Apontamento removido com sucesso!' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover apontamento da agenda.', details: error.message });
    }
  });

  // RAID TEXT CHAT ROUTES
  fastify.get<{ Params: { raidId: string } }>('/raids/:raidId/messages', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { raidId } = request.params;
      const messages = await prisma.raidMessage.findMany({
        where: { raidId },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              nickname: true,
              lastActiveAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      return messages;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar mensagens do chat.' });
    }
  });

  fastify.post<{ Params: { raidId: string }; Body: { content: string } }>('/raids/:raidId/messages', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { raidId } = request.params;
      const { content } = request.body;
      const userId = request.user.id;

      if (!content || !content.trim()) {
        return reply.status(400).send({ error: 'Mensagem vazia.' });
      }

      const message = await prisma.raidMessage.create({
        data: {
          raidId,
          userId,
          content
        },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              nickname: true,
              lastActiveAt: true
            }
          }
        }
      });
      return message;
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao enviar mensagem.' });
    }
  });
};
