import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import crypto from 'crypto';
import { sendPushNotification } from '../utils/push';
import { PrismaQuestRepository } from '../infra/database/repositories/PrismaQuestRepository';
import { PrismaUserRepository } from '../infra/database/repositories/PrismaUserRepository';
import { GeminiAIProvider } from '../infra/providers/gemini/GeminiAIProvider';
import { ExpoNotificationProvider } from '../infra/providers/expo/ExpoNotificationProvider';
import { GenerateAIQuestsUseCase } from '../core/use-cases/quests/GenerateAIQuestsUseCase';
import { ApproveQuestBatchUseCase } from '../core/use-cases/quests/ApproveQuestBatchUseCase';
import { QuestController } from '../presentation/controllers/QuestController';

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
  tipoQuest?: string;
}

class GeminiRotator {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.reloadKeys();
  }

  public reloadKeys(): void {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    this.keys = rawKeys.split(",").map(k => k.replace(/['"]/g, "").trim()).filter(k => k.length > 0);
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
  const questRepository = new PrismaQuestRepository();
  const userRepository = new PrismaUserRepository();
  const aiProvider = new GeminiAIProvider();
  const notificationProvider = new ExpoNotificationProvider();
  
  const generateAIQuestsUseCase = new GenerateAIQuestsUseCase(questRepository, userRepository, aiProvider);
  const approveQuestBatchUseCase = new ApproveQuestBatchUseCase(questRepository, userRepository, notificationProvider);
  
  const questController = new QuestController(generateAIQuestsUseCase, approveQuestBatchUseCase, questRepository);

  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', fastify.validateInstitution);

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
      let disciplinaIds: string[] = [];
      if (request.user.role === 'PROFESSOR') {
        const vinculos = await prisma.turmaDisciplina.findMany({
          where: { professorId: request.user.id }
        });
        disciplinaIds = vinculos.map(v => v.disciplinaId);
      }

      const history = await prisma.quest.findMany({
        where: {
          turmaAlvo: request.user.role === 'ADMIN' ? {} : {
            turmaDisciplinas: {
              some: {
                professorId: request.user.id
              }
            }
          },
          ...(request.user.role === 'PROFESSOR' ? { disciplinaId: { in: disciplinaIds } } : {})
        },
        include: { 
          turmaAlvo: true,
          deliveries: {
            select: { 
              id: true,
              status: true,
              isCorrect: true,
              erros: true,
              answeredAt: true,
              studentAnswer: true,
              studentImage: true,
              user: {
                select: {
                  nome: true,
                  nickname: true,
                  matricula: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedHistory = history.map(q => {
        const total = q.deliveries.length;
        const correct = q.deliveries.filter(d => d.isCorrect === true).length;
        const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return {
          ...q,
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
      // Buscar todas as entregas de Mini Boss ativas (status DELIVERED, nivel MINIBOSS)
      const activeMiniBosses = await prisma.questDelivery.findMany({
        where: {
          userId,
          status: 'DELIVERED',
          quest: { nivel: 'MINIBOSS' }
        },
        include: { quest: { include: { disciplina: true } } },
        orderBy: { quest: { createdAt: 'desc' } }
      });

      if (activeMiniBosses.length > 0) {
        return reply.status(200).send({
          isMultiBoss: true,
          bosses: activeMiniBosses.map(d => {
            const monsterMatch = d.quest.enunciado.match(/O inimigo (.*?) surgiu/);
            const monsterName = monsterMatch ? monsterMatch[1] : 'Monstro';
            
            const parts = d.quest.enunciado.split('\n\n');
            const cleanQuestion = parts.slice(1).join('\n\n') || d.quest.enunciado;

            return {
              deliveryId: d.id,
              question: cleanQuestion,
              rawEnunciado: d.quest.enunciado,
              xp: Math.max(Math.round(d.quest.xp * Math.pow(0.75, d.erros)), 25),
              nivel: d.quest.nivel,
              subjectName: d.quest.disciplina?.nome || 'Estudos Gerais',
              erros: d.erros,
              monsterName,
              expiresAt: d.quest.expiresAt
            };
          })
        });
      }

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
          erros: delivered.erros,
          expiresAt: delivered.quest.expiresAt
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
          erros: waiting.erros,
          expiresAt: waiting.quest.expiresAt
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
  fastify.post<{ Body: GenerateQuestBody }>('/generate', { preValidation: [fastify.authenticate] }, (req, rep) => questController.generate(req, rep));

  // ─── GET /quests/pending ──────────────────────────────────────────────────
  fastify.get('/pending', { preValidation: [fastify.authenticate] }, (req, rep) => questController.getPending(req, rep));

  // ─── POST /quests/batch/:batchId/approve ──────────────────────────────────
  fastify.post<{ Params: { batchId: string } }>('/batch/:batchId/approve', { preValidation: [fastify.authenticate] }, (req, rep) => questController.approveBatch(req, rep));

  // ─── POST /quests/:id/regenerate ──────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/:id/regenerate', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { id } = request.params;

    try {
      const quest = await prisma.quest.findUnique({
        where: { id }
      });

      if (!quest) {
        return reply.status(404).send({ error: 'Quest não encontrada.' });
      }

      const prompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie UMA única pergunta sobre o tema "${quest.tema || 'Geral'}" no nível "${quest.nivel || 'MEDIO'}".
Regras:
- Resposta curta e objetiva.
- Linguagem extremamente simples e voltada a estudantes locais.
- Retorne APENAS o enunciado da pergunta. Sem numeração, sem aspas adicionais, sem introduções ou explicações.
`;

      const raw = await callGemini(prompt);
      const enunciado = raw.trim();

      const updated = await prisma.quest.update({
        where: { id },
        data: { enunciado }
      });

      return reply.send(updated);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao regenerar quest.', details: error.message });
    }
  });

  // ─── POST /quests/:id/refine ──────────────────────────────────────────────
  fastify.post<{ Params: { id: string }; Body: { prompt: string } }>('/:id/refine', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { id } = request.params;
    const { prompt: userPrompt } = request.body;

    if (!userPrompt || !userPrompt.trim()) {
      return reply.status(400).send({ error: 'Instruções de refinamento são obrigatórias.' });
    }

    try {
      const quest = await prisma.quest.findUnique({
        where: { id }
      });

      if (!quest) {
        return reply.status(404).send({ error: 'Quest não encontrada.' });
      }

      const systemPrompt = `Você é um assistente educacional de física/matemática/ciências para escolas públicas brasileiras.
Temos esta pergunta existente:
"${quest.enunciado}"

O professor deu o seguinte feedback de refinamento/ajuste:
"${userPrompt}"

Com base nesse feedback, reescreva a pergunta de forma excelente.
Regras:
- Mantendo o mesmo nível "${quest.nivel}" e tema "${quest.tema || 'Geral'}".
- Retorne APENAS o novo enunciado da pergunta. Sem numeração, sem aspas adicionais, sem introduções ou explicações.
`;

      const raw = await callGemini(systemPrompt);
      const enunciado = raw.trim();

      const updated = await prisma.quest.update({
        where: { id },
        data: { enunciado }
      });

      return reply.send(updated);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao afiar quest.', details: error.message });
    }
  });

  // ─── PUT /quests/:id ──────────────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: { enunciado: string } }>('/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { id } = request.params;
    const { enunciado } = request.body;

    if (!enunciado || !enunciado.trim()) {
      return reply.status(400).send({ error: 'O enunciado é obrigatório.' });
    }

    try {
      const updated = await prisma.quest.update({
        where: { id },
        data: { enunciado: enunciado.trim() }
      });

      return reply.send(updated);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao atualizar quest.', details: error.message });
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

      let disciplina = await prisma.disciplina.findFirst({ where: { nome: 'Missões Gerais', instituicao: request.user.instituicao || null } });
      if (!disciplina) {
        disciplina = await prisma.disciplina.create({ data: { nome: 'Missões Gerais', instituicao: request.user.instituicao || null } });
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

        const tokens = alunos.map(a => a.expoPushToken).filter((t): t is string => !!t);
        if (tokens.length > 0) {
          sendPushNotification(
            tokens,
            '⚠️ BOSS Invocado!',
            `Um BOSS terrível invadiu a guilda da turma ${turma.nome}! Preparem-se!`,
            { type: 'BOSS_SPAWNED' }
          ).catch(console.error);
        }
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
            status: 'ATIVA',
            nivel: { notIn: ['BOSS', 'MINIBOSS'] }
          }
        });
      }

      // Se não houver entregues ou não houver próxima no lote, busca a primeira quest disponível do lote mais recente da turma
      if (!nextQuest) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.turmaId) {
          return reply.status(404).send({ error: 'Aluno sem turma associada.' });
        }

        // Busca todos os IDs de quests já entregues ao aluno nesta disciplina (qualquer status)
        const alreadyDeliveredIds = await prisma.questDelivery.findMany({
          where: {
            userId,
            quest: {
              nivel: { notIn: ['BOSS', 'MINIBOSS'] },
              ...(disciplinaId ? { disciplinaId } : {})
            }
          },
          select: { questId: true }
        });
        const deliveredQuestIds = alreadyDeliveredIds.map(d => d.questId);

        // Busca a próxima quest ATIVA da turma que o aluno ainda não recebeu, ordenada por lote mais recente e ordem
        nextQuest = await prisma.quest.findFirst({
          where: {
            turmaAlvoId: user.turmaId,
            status: 'ATIVA',
            nivel: { notIn: ['BOSS', 'MINIBOSS'] },
            ...(disciplinaId ? { disciplinaId } : {}),
            id: { notIn: deliveredQuestIds.length > 0 ? deliveredQuestIds : ['__none__'] }
          },
          orderBy: [{ createdAt: 'desc' }, { ordem: 'asc' }]
        });
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

  // Helper to handle Party XP distribution, dynamic XP adjustment, War Banner buff, and Chat messages
  const processPartyXpAndChat = async (
    userId: string,
    questId: string,
    questXp: number,
    xpFinalBeforeBuffs: number,
    deliveryId: string,
    artifactId?: string
  ): Promise<{ xpFinal: number; xpToAward: number; xpGanho: number }> => {
    const now = new Date();

    // 1. Fetch user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nome: true, nickname: true }
    });
    const userName = user?.nickname || user?.nome || 'Caçador';

    // 2. Fetch active open party and its participants
    const activeRaidParticipant = await prisma.raidParticipant.findFirst({
      where: { userId, raid: { status: 'OPEN' } },
      include: {
        raid: {
          include: {
            participantes: {
              include: {
                user: {
                  select: { id: true, nome: true, nickname: true }
                }
              }
            }
          }
        }
      }
    });

    let xpFinal = xpFinalBeforeBuffs;

    // 3. Apply War Banner buff (+20% XP) if active
    const isWarBannerActive = activeRaidParticipant?.raid?.bandeiraGuerraActive &&
      activeRaidParticipant?.raid?.bandeiraGuerraExpires &&
      new Date(activeRaidParticipant.raid.bandeiraGuerraExpires) > now;

    if (isWarBannerActive) {
      xpFinal = Math.round(xpFinal * 1.2);
    }

    // 4. Retrieve the current delivery's xpParcial
    const currentDelivery = await prisma.questDelivery.findUnique({
      where: { id: deliveryId },
      select: { xpParcial: true }
    });
    const xpParcial = currentDelivery?.xpParcial || 0;

    let xpToAward = xpFinal;
    let xpGanho = xpFinal;

    if (xpParcial > 0) {
      if (artifactId) {
        // If using an artifact: win total amount calculated by artifact (xpFinal) without subtracting partial
        xpToAward = xpFinal;
        xpGanho = xpParcial + xpFinal;
      } else {
        // If NOT using an artifact: win the remaining amount to reach 100% of calculated XP
        xpToAward = Math.max(xpFinal - xpParcial, 0);
        xpGanho = xpFinal;
      }
    }

    // 5. If in an active party, distribute 25% passive XP to other party members
    if (activeRaidParticipant?.raid) {
      const partyId = activeRaidParticipant.raid.id;
      const otherMembers = activeRaidParticipant.raid.participantes.filter(p => p.userId !== userId);
      const memberXp = Math.round(questXp * 0.25);

      for (const member of otherMembers) {
        const targetUserId = member.userId;
        const targetUser = member.user;
        const targetUserName = targetUser?.nickname || targetUser?.nome || 'Membro';

        // Check if they already have a delivery for this quest
        const existingDelivery = await prisma.questDelivery.findUnique({
          where: { questId_userId: { questId, userId: targetUserId } }
        });

        if (existingDelivery) {
          if (existingDelivery.status !== 'COMPLETED') {
            if (existingDelivery.xpParcial === 0) {
              // Update delivery and user XP
              await prisma.questDelivery.update({
                where: { id: existingDelivery.id },
                data: {
                  xpParcial: memberXp,
                  xpGanho: memberXp
                }
              });

              await prisma.user.update({
                where: { id: targetUserId },
                data: { xp: { increment: memberXp } }
              });

              // Send system message in the chat for the passive member
              await prisma.raidMessage.create({
                data: {
                  raidId: partyId,
                  userId: targetUserId,
                  content: `📢 [Mural do Sistema] ${targetUserName} recebeu +${memberXp} XP (25% compartilhado da Party)!`
                }
              });
            }
          }
        } else {
          // Create delivery in DELIVERED status and update user XP
          await prisma.questDelivery.create({
            data: {
              questId,
              userId: targetUserId,
              status: 'DELIVERED',
              scheduledAt: now,
              deliveredAt: now,
              xpParcial: memberXp,
              xpGanho: memberXp
            }
          });

          await prisma.user.update({
            where: { id: targetUserId },
            data: { xp: { increment: memberXp } }
          });

          // Send system message in the chat for the passive member
          await prisma.raidMessage.create({
            data: {
              raidId: partyId,
              userId: targetUserId,
              content: `📢 [Mural do Sistema] ${targetUserName} recebeu +${memberXp} XP (25% compartilhado da Party)!`
            }
          });
        }
      }

      // Send system message in the chat for the active member
      await prisma.raidMessage.create({
        data: {
          raidId: partyId,
          userId,
          content: `📢 [Mural do Sistema] ${userName} superou o desafio da masmorra e conquistou +${xpFinal} XP!`
        }
      });
    }

    return { xpFinal, xpToAward, xpGanho };
  };

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
        let xpFinalBeforeBuffs = isBoss
          ? delivery.quest.xp
          : Math.max(Math.round(delivery.quest.xp * Math.pow(0.75, effectiveErros)), 25);
        
        if (artifactId === 'elixir_dourado') {
          xpFinalBeforeBuffs *= 2;
        }

        if (delivery.helpRequested) {
          xpFinalBeforeBuffs = Math.round(xpFinalBeforeBuffs * 1.5);
        }

        // Process XP adjustment and distribution using our helper
        const result = await processPartyXpAndChat(
          userId,
          delivery.questId,
          delivery.quest.xp,
          xpFinalBeforeBuffs,
          deliveryId,
          artifactId
        );

        await prisma.questDelivery.update({
          where: { id: deliveryId },
          data: { 
            status: 'COMPLETED', 
            answeredAt: new Date(), 
            isCorrect: true,
            helpRequested: false,
            helpResponse: null,
            studentAnswer: answer,
            studentImage: image,
            xpGanho: result.xpGanho
          }
        });
        await prisma.user.update({ where: { id: userId }, data: { xp: { increment: result.xpToAward } } });
        
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

            const candidateSubjects = Object.keys(subjectCounts).filter(discId => subjectCounts[discId] >= 2);
            const targetSubjects = candidateSubjects.slice(0, 3);
            const numBosses = targetSubjects.length;

            if (numBosses >= 2) {
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
                const xpPerBoss = Math.round(600 / numBosses);
                const sharedBatchId = crypto.randomUUID();

                const dndMonsters = [
                  'Beholder', 'Lich', 'Dragão Vermelho', 'Mind Flayer', 
                  'Tarrasque', 'Demogorgon', 'Gorgon', 'Quimera', 
                  'Hidra', 'Cavaleiro da Morte', 'Mímico', 'Urso-Coruja'
                ];

                for (let i = 0; i < targetSubjects.length; i++) {
                  const chosenSubjectId = targetSubjects[i];
                  const discipline = await prisma.disciplina.findUnique({ where: { id: chosenSubjectId } });
                  const subjectName = discipline ? discipline.nome : 'Estudos Gerais';

                  const monsterIndex = Math.floor(Math.random() * dndMonsters.length);
                  const monsterName = dndMonsters.splice(monsterIndex, 1)[0];

                  const miniBossPrompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie uma pergunta desafiadora de nível "MINIBOSS" sobre o assunto "${subjectName}".
Esta pergunta deve ser um pouco mais difícil que as normais para testar o conhecimento do aluno, mas ela deve ser respondível e não insana (ou seja, de nível adequado para alunos do ensino médio/fundamental).
Retorne APENAS um JSON no seguinte formato:
{
  "pergunta": "Texto da pergunta aqui..."
}`;

                  let rawQuestionText = '';
                  try {
                    const rawResponse = await callGemini(miniBossPrompt);
                    let cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                    const firstBraceIndex = cleaned.indexOf('{');
                    const lastBraceIndex = cleaned.lastIndexOf('}');
                    if (firstBraceIndex !== -1 && lastBraceIndex !== -1) {
                      cleaned = cleaned.substring(firstBraceIndex, lastBraceIndex + 1);
                    }
                    const parsed = JSON.parse(cleaned);
                    rawQuestionText = parsed.pergunta || parsed.PERGUNTA || '';
                  } catch (geminiErr) {
                    request.log.warn({ err: geminiErr }, 'Falha na chamada Gemini para Mini Boss. Usando fallback estático.');
                    
                    const subNameLower = subjectName.toLowerCase();
                    if (subNameLower.includes('portug') || subNameLower.includes('gramat') || subNameLower.includes('redac')) {
                      rawQuestionText = "Analise o uso da crase na frase: 'Refiro-me àquelas alunas que estudam à noite'. Justifique a ocorrência do acento grave em ambos os casos.";
                    } else if (subNameLower.includes('ingl') || subNameLower.includes('english')) {
                      rawQuestionText = "Rewrite the following sentence using the present perfect continuous tense: 'She started studying English two hours ago and she is still studying now'.";
                    } else if (subNameLower.includes('matemat') || subNameLower.includes('calcul') || subNameLower.includes('algebra')) {
                      rawQuestionText = "Seja a função f(x) = 3x² - 12x + 9. Determine as coordenadas do vértice da parábola e indique se este ponto representa um valor máximo ou mínimo da função.";
                    } else if (subNameLower.includes('fisic') || subNameLower.includes('mecanic')) {
                      rawQuestionText = "Um objeto é lançado verticalmente para cima com uma velocidade inicial de 20 m/s. Desprezando a resistência do ar e adotando g = 10 m/s², calcule a altura máxima atingida pelo objeto.";
                    } else if (subNameLower.includes('quimic')) {
                      rawQuestionText = "Uma solução aquosa de hidróxido de sódio (NaOH) apresenta concentração de 0,1 mol/L. Calcule o pH dessa solução a 25°C, sabendo que o NaOH é uma base forte completamente dissociada.";
                    } else if (subNameLower.includes('biolog')) {
                      rawQuestionText = "Explique a diferença funcional e estrutural entre as células procariontes e eucariontes, citando pelo menos duas organelas membranasas exclusivas destas últimas.";
                    } else if (subNameLower.includes('histor')) {
                      rawQuestionText = "Discorra sobre as principais características do feudalismo na Europa Ocidental durante a Idade Média, destacando a relação de suserania e vassalagem.";
                    } else if (subNameLower.includes('geograf')) {
                      rawQuestionText = "Explique o fenômeno da 'El Niño' e seus impactos climáticos globais, destacando como ele altera o regime de chuvas e temperaturas na América do Sul.";
                    } else {
                      rawQuestionText = "Resolva o seguinte desafio de raciocínio lógico: Três pessoas (A, B e C) fazem declarações. A diz: 'B mente'. B diz: 'C mente'. C diz: 'A e B mentem'. Quem está dizendo a verdade?";
                    }
                  }

                  if (rawQuestionText) {
                    const finalEnunciado = `O inimigo ${monsterName} surgiu! Desafio de ${subjectName}:\n\n${rawQuestionText}`;

                    const quest = await prisma.quest.create({
                      data: {
                        disciplinaId: chosenSubjectId,
                        enunciado: finalEnunciado,
                        tags: ['MINIBOSS'],
                        xp: xpPerBoss,
                        nivel: 'MINIBOSS',
                        batchId: sharedBatchId,
                        ordem: i + 1,
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

        return reply.send({ ...validation, xpGanho: result.xpToAward, miniBossSpawned });
      } else {
        const hasExtraAttempt = delivery.helpRequested && delivery.helpResponse !== null;
        const novosErros = (artifactId === 'escudo_arcano' || hasExtraAttempt) ? delivery.erros : delivery.erros + 1;
        
        await prisma.questDelivery.update({
          where: { id: deliveryId },
          data: { 
            erros: novosErros,
            studentAnswer: answer,
            studentImage: image,
            ...(hasExtraAttempt ? { helpRequested: false, helpResponse: null } : {})
          }
        });

        if (artifactId !== 'escudo_arcano' && !hasExtraAttempt) {
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

      const wrongAnswersWithDelivery = await Promise.all(
        wrongAnswers.map(async (wa) => {
          const delivery = await prisma.questDelivery.findUnique({
            where: {
              questId_userId: {
                questId: wa.questId,
                userId: wa.userId
              }
            }
          });
          return {
            ...wa,
            delivery
          };
        })
      );
      return reply.send(wrongAnswersWithDelivery);
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

      const delivery = await prisma.questDelivery.findFirst({
        where: { userId, questId: wrongAnswer.questId }
      });

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

        const questXp = wrongAnswer.quest.xp;
        const effectiveErros = artifactId === 'escudo_arcano' ? 0 : wrongAnswer.tentativas;
        const isBoss = wrongAnswer.quest.nivel === 'BOSS' || wrongAnswer.quest.nivel === 'MINIBOSS';

        let xpFinalBeforeBuffs = isBoss 
          ? questXp 
          : Math.max(Math.round(questXp * Math.pow(0.75, effectiveErros)), 25);

        if (artifactId === 'elixir_dourado') {
          xpFinalBeforeBuffs *= 2; // Duplica o XP
        }

        if (delivery?.helpRequested) {
          xpFinalBeforeBuffs = Math.round(xpFinalBeforeBuffs * 1.5); // Bônus de 50% de XP
        }

        // Process XP adjustment and distribution using our helper
        const result = await processPartyXpAndChat(
          userId,
          wrongAnswer.questId,
          questXp,
          xpFinalBeforeBuffs,
          delivery ? delivery.id : '',
          artifactId
        );

        // Atualizar a entrega original para COMPLETED e isCorrect: true
        if (delivery) {
          await prisma.questDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'COMPLETED',
              isCorrect: true,
              answeredAt: new Date(),
              helpRequested: false,
              helpResponse: null,
              studentAnswer: answer === 'Cálculo na imagem' ? null : answer,
              studentImage: image || null,
              xpGanho: result.xpGanho
            }
          }).catch(err => {
            console.error('[QuestDelivery Update Error in Baú Retry]', err);
          });
        }

        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: result.xpToAward } }
        });

        // Se acertou usando escudo arcano, remove a maldição do QuestDelivery no BD resetando erros para 0!
        if (artifactId === 'escudo_arcano') {
          await prisma.questDelivery.updateMany({
            where: { userId, questId: wrongAnswer.questId },
            data: { erros: 0 }
          }).catch(console.error);
        }

        return reply.send({ ...validation, xpGanho: result.xpToAward });
      } else {
        const hasExtraAttempt = delivery?.helpRequested && delivery?.helpResponse !== null;
        const novasTentativas = (artifactId === 'escudo_arcano' || hasExtraAttempt) ? wrongAnswer.tentativas : wrongAnswer.tentativas + 1;
        
        await prisma.wrongAnswer.update({
          where: { id },
          data: { tentativas: novasTentativas }
        });

        if (hasExtraAttempt) {
          await prisma.questDelivery.updateMany({
            where: { userId, questId: wrongAnswer.questId },
            data: {
              helpRequested: false,
              helpResponse: null,
              studentAnswer: answer === 'Cálculo na imagem' ? null : answer,
              studentImage: image || null
            }
          }).catch(console.error);
        } else {
          // Salva a tentativa errada para auditoria mesmo sem mudar status
          await prisma.questDelivery.updateMany({
            where: { userId, questId: wrongAnswer.questId },
            data: {
              studentAnswer: answer === 'Cálculo na imagem' ? null : answer,
              studentImage: image || null
            }
          }).catch(console.error);
        }

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

      if (!activeParticipant.isInvasor) {
        // Verifica se há um invasor na party que entrou há menos de 48 horas
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const hasRecentInvader = activeParticipant.raid.participantes.some(
          (p) => p.isInvasor && new Date(p.joinedAt) > fortyEightHoursAgo
        );

        if (hasRecentInvader) {
          return reply.status(400).send({ 
            error: 'A party está corrompida! Um invasor manipulou a masmorra com uma Chave Mestra. Você não pode sair nas próximas 48 horas após a invasão.',
            isCorrupted: true 
          });
        }
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

        // Y (Disponíveis): Quests ATIVAS no banco daquela disciplina menos as que já foram entregues
        const totalQuestsInClass = await prisma.quest.count({
          where: {
            turmaAlvoId: student.turmaId,
            disciplinaId: disciplina.id,
            status: 'ATIVA',
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

  // ─── GET /quests/subject-stats/:userId ──────────────────────────────────────
  fastify.get<{ Params: { userId: string } }>('/subject-stats/:userId', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.params;
    console.log(`[Backend] GET /quests/subject-stats/${userId} - Caller Role: ${request.user.role}`);
    
    if (request.user.role !== 'ADMIN' && request.user.role !== 'PROFESSOR' && request.user.role !== 'ARQUITETO') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas Mestres ou Arquitetos podem visualizar o desempenho de outros alunos.' });
    }

    try {
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nome: true, turmaId: true }
      });

      console.log(`[Backend] Student found:`, student);

      if (!student || !student.turmaId) {
        console.log(`[Backend] Student has no turmaId or was not found.`);
        return reply.send([]);
      }

      const turmaDisciplinas = await prisma.turmaDisciplina.findMany({
        where: { turmaId: student.turmaId },
        include: { disciplina: true }
      });

      console.log(`[Backend] TurmaDisciplinas count:`, turmaDisciplinas.length);

      const stats = [];

      for (const td of turmaDisciplinas) {
        const disciplina = td.disciplina;

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
      return reply.status(500).send({ error: 'Erro ao buscar estatísticas de matérias para o aluno.', details: error.message });
    }
  });

  // ==========================================
  // FEATURE: PERGUNTA DOURADA (DIRETOR <-> ALUNO)
  // ==========================================

  // 1. Criar Pergunta Dourada (Apenas Diretor/ADMIN/PROFESSOR)
  fastify.post<{ Body: { enunciado: string; turmaId: string } }>('/golden-question', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR' && user.role !== 'ARQUITETO')) {
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
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSOR' && user.role !== 'ARQUITETO')) {
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
  // ==========================================
  // 6. MANEJO DE DISCIPLINAS (Matérias)
  // ==========================================
  fastify.post<{ Body: { nome: string } }>('/disciplinas', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas coordenadores e diretores podem criar matérias.' });
      }
      const { nome } = request.body;
      if (!nome || nome.trim() === '') {
        return reply.status(400).send({ error: 'Nome da matéria é obrigatório.' });
      }

      const instituicao = user.instituicao;
      const institutionId = user.institutionId;

      const exists = await prisma.disciplina.findFirst({
        where: {
          nome: { equals: nome.trim(), mode: 'insensitive' },
          instituicao: instituicao || null
        }
      });
      if (exists) {
        return reply.status(400).send({ error: 'Uma matéria com este nome já existe nesta instituição.' });
      }
      const created = await prisma.disciplina.create({
        data: {
          nome: nome.trim(),
          instituicao: instituicao || null,
          institutionId: institutionId || null
        }
      });
      return reply.status(201).send(created);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao criar matéria.', details: error.message });
    }
  });

  fastify.put<{ Params: { id: string }; Body: { nome: string } }>('/disciplinas/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas coordenadores e diretores podem editar matérias.' });
      }
      const { id } = request.params;
      const { nome } = request.body;
      if (!nome || nome.trim() === '') {
        return reply.status(400).send({ error: 'Nome da matéria é obrigatório.' });
      }
      
      const targetDisciplina = await prisma.disciplina.findUnique({ where: { id } });
      if (!targetDisciplina) {
        return reply.status(404).send({ error: 'Matéria não encontrada.' });
      }
      if (user.role === 'ARQUITETO' && targetDisciplina.instituicao !== user.instituicao) {
        return reply.status(403).send({ error: 'Acesso negado. Esta matéria pertence a outra instituição.' });
      }

      const exists = await prisma.disciplina.findFirst({
        where: {
          nome: { equals: nome.trim(), mode: 'insensitive' },
          instituicao: user.instituicao || null,
          id: { not: id }
        }
      });
      if (exists) {
        return reply.status(400).send({ error: 'Uma matéria com este nome já existe nesta instituição.' });
      }

      const updated = await prisma.disciplina.update({
        where: { id },
        data: { nome: nome.trim() }
      });
      return reply.send(updated);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao editar matéria.', details: error.message });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/disciplinas/:id', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas coordenadores e diretores podem excluir matérias.' });
      }
      const { id } = request.params;

      const targetDisciplina = await prisma.disciplina.findUnique({ where: { id } });
      if (!targetDisciplina) {
        return reply.status(404).send({ error: 'Matéria não encontrada.' });
      }
      if (user.role === 'ARQUITETO' && targetDisciplina.instituicao !== user.instituicao) {
        return reply.status(403).send({ error: 'Acesso negado. Esta matéria pertence a outra instituição.' });
      }

      // 1. Deletar DisciplinaProfessor
      await prisma.disciplinaProfessor.deleteMany({ where: { disciplinaId: id } });

      // 2. Deletar TurmaDisciplina
      await prisma.turmaDisciplina.deleteMany({ where: { disciplinaId: id } });

      // 3. Deletar TimetableSlot
      await prisma.timetableSlot.deleteMany({ where: { disciplinaId: id } });

      // 4. Deletar StudentQuests e Quests associadas
      const questIds = (await prisma.quest.findMany({ where: { disciplinaId: id }, select: { id: true } })).map(q => q.id);
      await prisma.questDelivery.deleteMany({ where: { questId: { in: questIds } } });
      await prisma.quest.deleteMany({ where: { disciplinaId: id } });

      // 5. Deletar a Disciplina
      await prisma.disciplina.delete({ where: { id } });

      return reply.send({ message: 'Matéria excluída com sucesso!' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao excluir matéria.', details: error.message });
    }
  });

  fastify.get('/disciplinas', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      const filter: any = {};
      if (user.role !== 'ADMIN') {
        filter.instituicao = user.instituicao || '';
      }

      const disciplines = await prisma.disciplina.findMany({
        where: filter,
        include: {
          professores: {
            where: {
              professor: {
                instituicao: user.role !== 'ADMIN' ? (user.instituicao || '') : undefined
              }
            },
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
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas o Diretor/ADMIN ou Arquiteto pode vincular professores.' });
      }
      const { professorId, disciplinaId, temp } = request.body;

      if (user.role === 'ARQUITETO') {
        const targetProf = await prisma.user.findFirst({
          where: { id: professorId, role: 'PROFESSOR', instituicao: user.instituicao }
        });
        const targetDisc = await prisma.disciplina.findFirst({
          where: { id: disciplinaId, instituicao: user.instituicao }
        });
        if (!targetProf || !targetDisc) {
          return reply.status(403).send({ error: 'Acesso negado. O professor e a disciplina devem pertencer à sua instituição.' });
        }
      }

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
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas o Diretor/ADMIN ou Arquiteto pode desvincular professores.' });
      }
      const { professorId, disciplinaId } = request.body;

      if (user.role === 'ARQUITETO') {
        const targetProf = await prisma.user.findFirst({
          where: { id: professorId, role: 'PROFESSOR', instituicao: user.instituicao }
        });
        const targetDisc = await prisma.disciplina.findFirst({
          where: { id: disciplinaId, instituicao: user.instituicao }
        });
        if (!targetProf || !targetDisc) {
          return reply.status(403).send({ error: 'Acesso negado. O professor e a disciplina devem pertencer à sua instituição.' });
        }
      }

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
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas diretores e arquitetos podem editar a grade de horários.' });
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

  fastify.delete<{ Params: { turmaId: string }; Body: { diaSemana: string; posicao: number } }>('/turmas/:turmaId/timetable', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.id } });
      if (!user || (user.role !== 'ADMIN' && user.role !== 'ARQUITETO')) {
        return reply.status(403).send({ error: 'Apenas diretores e arquitetos podem editar a grade de horários.' });
      }
      const { turmaId } = request.params;
      const { diaSemana, posicao } = request.body;

      await prisma.timetableSlot.delete({
        where: {
          turmaId_diaSemana_posicao: {
            turmaId,
            diaSemana,
            posicao
          }
        }
      });

      return reply.send({ message: 'Horário removido com sucesso!' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao remover horário.', details: error.message });
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

  // ─── UNIFIED HELPER ARTIFACT USE ROUTE ─────────────────────────────────────
  fastify.post<{ Params: { deliveryId: string }; Body: { artifactId: string; studentDoubt?: string } }>(
    '/:deliveryId/use-helper',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { deliveryId } = request.params;
        const { artifactId, studentDoubt } = request.body;
        const userId = request.user.id;

        let delivery = await prisma.questDelivery.findFirst({
          where: { id: deliveryId, userId },
          include: { quest: true }
        });

        if (!delivery) {
          // Se não encontrar, tenta buscar a WrongAnswer para achar a QuestDelivery vinculada
          const wrongAnswer = await prisma.wrongAnswer.findFirst({
            where: { id: deliveryId, userId }
          });

          if (wrongAnswer) {
            delivery = await prisma.questDelivery.findUnique({
              where: {
                questId_userId: {
                  questId: wrongAnswer.questId,
                  userId
                }
              },
              include: { quest: true }
            });

            if (!delivery) {
              delivery = await prisma.questDelivery.create({
                data: {
                  questId: wrongAnswer.questId,
                  userId,
                  status: "COMPLETED",
                  scheduledAt: new Date(),
                  deliveredAt: new Date(),
                  erros: wrongAnswer.tentativas
                },
                include: { quest: true }
              });
            }
          }
        }

        if (!delivery) {
          return reply.status(404).send({ error: 'Entrega de quest não encontrada.' });
        }

        const enunciado = delivery.quest.enunciado;

        if (artifactId === 'sussurros_sabios') {
          await prisma.questDelivery.update({
            where: { id: delivery.id },
            data: { 
              helpRequested: true, 
              helpResponse: null,
              studentDoubt: studentDoubt || null
            }
          });

          // Fetch student details for the notification
          const student = await prisma.user.findUnique({
            where: { id: userId },
            select: { nome: true, nickname: true, turmaId: true }
          });

          if (student && student.turmaId) {
            // Find professors linked to this class and subject
            const vinculos = await prisma.turmaDisciplina.findMany({
              where: {
                turmaId: student.turmaId,
                disciplinaId: delivery.quest.disciplinaId
              },
              include: {
                professor: {
                  select: {
                    expoPushToken: true
                  }
                }
              }
            });
            const tokens = vinculos
              .map(v => v.professor.expoPushToken)
              .filter((t): t is string => !!t);

            if (tokens.length > 0) {
              const displayName = student.nickname ? `@${student.nickname}` : student.nome;
              const snip = delivery.quest.enunciado.length > 35 ? delivery.quest.enunciado.slice(0, 32) + '...' : delivery.quest.enunciado;
              sendPushNotification(
                tokens,
                '🔮 Pedido de Ajuda Recebido!',
                `O caçador ${displayName} solicitou sussurros sábios em: "${snip}"`,
                { type: 'HELP_REQUESTED' }
              ).catch(console.error);
            }
          }

          return reply.send({ message: 'Chamado de sussurros sábios enviado ao Mestre!' });
        }

        if (artifactId === 'martelo_magico') {
          const prompt = `Você é um professor mentor de RPG educativo.
Questão: "${enunciado}"

Decompõe este problema exclusivamente em 3 ou 4 passos de raciocínio lógico/pedagógico (scaffolding) passo a passo em formato de lista simples que o estudante deve seguir para pensar na solução.
NÃO DÊ A RESPOSTA FINAL. Indique apenas "o que pensar" ou "como fazer" sequencialmente de forma extremamente curta e concisa, ideal para visualização em cards mobile de RPG (máximo de 15 palavras por passo).

Exemplo de retorno esperado:
{
  "steps": [
    "1. Identifique a incógnita e monte a função.",
    "2. Agrupe todos os termos semelhantes de um lado.",
    "3. Divida o termo constante pelo coeficiente."
  ]
}

Retorne APENAS o JSON.`;
          let raw = await callGemini(prompt);
          raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBrace = raw.indexOf('{');
          const lastBrace = raw.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            raw = raw.substring(firstBrace, lastBrace + 1);
          }
          const parsed = JSON.parse(raw);
          return reply.send({ steps: parsed.steps || [] });
        }

        if (artifactId === 'poeira_estelar') {
          const prompt = `Você é um assistente de RPG educativo para alunos de escola pública brasileira.
Dada a questão de múltipla escolha: "${enunciado}"

Identifique as alternativas (geralmente A, B, C, D ou E) contidas nela.
Ache uma única alternativa INCORRETA (que não é o gabarito) que possamos eliminar com segurança para ajudar o aluno.
Retorne APENAS a letra maiúscula correspondente a essa opção incorreta (ex: "B" ou "C") dentro do campo "eliminate" do JSON.

Exemplo de retorno:
{
  "eliminate": "C"
}

Retorne APENAS o JSON.`;
          let raw = await callGemini(prompt);
          raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBrace = raw.indexOf('{');
          const lastBrace = raw.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            raw = raw.substring(firstBrace, lastBrace + 1);
          }
          const parsed = JSON.parse(raw);
          return reply.send({ eliminate: parsed.eliminate || 'C' });
        }

        if (artifactId === 'pergaminho_oraculo') {
          const prompt = `Você é o Oráculo de Solen, um sábio tutor.
Dada a questão: "${enunciado}"

Escreva uma dica clara, prática e educativa (máximo 20 palavras) para ajudar o aluno a chegar na resposta correta, sem dar a resposta de forma alguma.
A dica deve ser direta e útil. NÃO use metáforas poéticas, charadas ou linguagem confusa. Seja direto ao ponto sobre o conceito da matéria.
Exemplo: "Lembre-se da fórmula de Bhaskara para encontrar as raízes da equação!" ou "Pense na camada rochosa sólida mais externa do nosso planeta."

Retorne APENAS um JSON no formato:
{
  "hint": "sua dica aqui"
}`;
          let raw = await callGemini(prompt);
          raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBrace = raw.indexOf('{');
          const lastBrace = raw.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            raw = raw.substring(firstBrace, lastBrace + 1);
          }
          const parsed = JSON.parse(raw);
          return reply.send({ hint: parsed.hint || 'Pense com atenção!' });
        }

        if (artifactId === 'pena_escriba') {
          const prompt = `Você é um avaliador ortográfico e pedagógico de RPG educativo.
Questão: "${enunciado}"

Identifique as 3 palavras-chave ou termos conceituais mais importantes e academicamente relevantes que o validador espera encontrar na resposta escrita de um aluno.
Devem ser termos diretamente ligados ao tema acadêmico da questão (por exemplo: se for sobre ecologia, termos como "Fotossíntese", "Cadeia Alimentar", etc. Se for sobre história, termos históricos apropriados).
Retorne APENAS um JSON no formato:
{
  "keywords": ["Termo 1", "Termo 2", "Termo 3"]
}

Retorne APENAS o JSON.`;
          let raw = await callGemini(prompt);
          raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBrace = raw.indexOf('{');
          const lastBrace = raw.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            raw = raw.substring(firstBrace, lastBrace + 1);
          }
          const parsed = JSON.parse(raw);
          return reply.send({ keywords: parsed.keywords || ["Relevante", "Conceitual", "Tema"] });
        }

        return reply.status(400).send({ error: 'Artefato utilitário inválido ou não suportado para esta rota.' });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao processar efeito do artefato.', details: error.message });
      }
    }
  );

  // ─── POÇÃO DE CURA ROUTE (HEAL CURSE) ──────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/wrong-answers/:id/heal',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user.id;

        const wrongAnswer = await prisma.wrongAnswer.findUnique({
          where: { id },
          include: { quest: true }
        });

        if (!wrongAnswer || wrongAnswer.userId !== userId) {
          return reply.status(404).send({ error: 'Registro do Baú não encontrado.' });
        }

        // Restaura tentativas para 0
        await prisma.wrongAnswer.update({
          where: { id },
          data: { tentativas: 0 }
        });

        // Restaura erros no QuestDelivery correspondente para 0
        await prisma.questDelivery.updateMany({
          where: { userId, questId: wrongAnswer.questId },
          data: { erros: 0 }
        });

        return reply.send({ success: true, message: 'Maldição expurgada! XP da quest restaurado para 100%.' });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao curar maldição da quest.', details: error.message });
      }
    }
  );

  // ─── PROFESSOR GOLDEN HELP REQUESTS LIST ──────────────────────────────────
  fastify.get(
    '/professor/help-requests',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: request.user.id } });
        if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
          return reply.status(403).send({ error: 'Acesso negado.' });
        }

        let turmaIds: string[] = [];
        if (user.role === 'PROFESSOR') {
          const vinculos = await prisma.turmaDisciplina.findMany({
            where: { professorId: user.id }
          });
          turmaIds = vinculos.map(v => v.turmaId);
        } else {
          const turmas = await prisma.turma.findMany();
          turmaIds = turmas.map(t => t.id);
        }

        const helpRequests = await prisma.questDelivery.findMany({
          where: {
            helpRequested: true,
            helpResponse: null,
            user: {
              turmaId: { in: turmaIds }
            }
          },
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                nickname: true,
                turma: { select: { nome: true } }
              }
            },
            quest: {
              include: {
                disciplina: { select: { nome: true } }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        return helpRequests;
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar pedidos de ajuda.', details: error.message });
      }
    }
  );

  // ─── PROFESSOR HELP REQUEST REPLY ──────────────────────────────────────────
  fastify.post<{ Params: { deliveryId: string }; Body: { response?: string; requestAiSuggestion?: boolean } }>(
    '/professor/help-requests/:deliveryId/reply',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { deliveryId } = request.params;
        const { response, requestAiSuggestion } = request.body;
        const user = await prisma.user.findUnique({ where: { id: request.user.id } });

        if (!user || (user.role !== 'PROFESSOR' && user.role !== 'ADMIN')) {
          return reply.status(403).send({ error: 'Acesso negado.' });
        }

        const delivery = await prisma.questDelivery.findUnique({
          where: { id: deliveryId },
          include: { quest: true }
        });

        if (!delivery) {
          return reply.status(404).send({ error: 'Pedido de ajuda não encontrado.' });
        }

        let finalResponse = response;

        if (requestAiSuggestion) {
          const prompt = `Você é um assistente pedagógico de suporte aos Mestres do Solo Learning.
Um estudante está travado na seguinte questão: "${delivery.quest.enunciado}".
${delivery.studentDoubt ? `Dúvida específica do aluno: "${delivery.studentDoubt}"` : ''}

Gere uma dica de scaffolding pedagógico que ajude o aluno a "aprender como fazer" em vez de dar a resposta final.
A dica deve ser amigável, clara e curta (máximo 40 palavras). Não dê o resultado final de forma alguma.

Exemplo de dica: "Para calcular a média, some os 5 valores da tabela e depois divida o resultado total por 5. Dica: observe bem o primeiro número!"
Retorne APENAS o texto da dica pedagógica gerada, sem nenhum outro elemento.`;
          finalResponse = await callGemini(prompt);
          finalResponse = finalResponse.trim();
          return reply.send({ success: true, aiSuggestion: finalResponse });
        }

        if (!finalResponse || !finalResponse.trim()) {
          return reply.status(400).send({ error: 'A resposta não pode ser vazia.' });
        }

        await prisma.questDelivery.update({
          where: { id: deliveryId },
          data: {
            helpResponse: finalResponse
          }
        });

        // Find the student to notify them
        const student = await prisma.user.findUnique({
          where: { id: delivery.userId },
          select: { expoPushToken: true }
        });

        if (student && student.expoPushToken) {
          sendPushNotification(
            student.expoPushToken,
            '💬 Sussurro Respondido!',
            `O Mestre enviou uma dica para desvendar a masmorra!`,
            { type: 'HELP_RESPONDED' }
          ).catch(console.error);
        }

        return reply.send({ success: true, helpResponse: finalResponse });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao registrar resposta do professor.', details: error.message });
      }
    }
  );

  // ─── CONSUME BECKER DO ALQUIMISTA ──────────────────────────────────────────
  fastify.post(
    '/becker/consume',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        
        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: 500 } }
        });
        
        return reply.send({ xpConcedido: 500, message: 'Becker do Alquimista consumido! +500 XP flat concedido com sucesso!' });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao consumir Becker.', details: error.message });
      }
    }
  );

  // ─── CONSUMO DIRETO DE ARTEFATOS DO BAÚ ──────────────────────────────────────
  fastify.post<{ Body: { artifactId: string } }>(
    '/artifacts/consume-direct',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { artifactId } = request.body;
      const userId = request.user.id;
      const now = new Date();

      if (!artifactId) return reply.status(400).send({ error: 'ID do artefato não fornecido.' });

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { turma: true }
        });
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

        if (artifactId === 'becker_alquimista') {
          await prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: 500 } }
          });
          return reply.send({
            success: true,
            xpConcedido: 500,
            message: 'Becker do Alquimista consumido! +500 XP flat concedido com sucesso!'
          });
        }

        if (artifactId === 'olhar_monarca') {
          const bossQuests = await prisma.quest.findMany({
            where: {
              nivel: { in: ['BOSS', 'MINIBOSS'] },
              turmaAlvoId: user.turmaId || undefined
            },
            select: { tema: true, enunciado: true },
            take: 3
          });

          const topics = bossQuests.length > 0
            ? bossQuests.map(q => q.tema || q.enunciado.substring(0, 45) + '...').join(', ')
            : 'Equações Quadráticas, Crase Gramatical, Leis de Newton';

          return reply.send({
            success: true,
            message: `Sua visão brilha com o Olhar do Monarca! As próximas ameaças de elite envolverão os seguintes tópicos: ${topics}. prepare-se!`
          });
        }

        if (artifactId === 'anel_serpente') {
          const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
          await prisma.user.update({
            where: { id: userId },
            data: { anelSerpenteExpires: expiresAt }
          });
          return reply.send({
            success: true,
            message: 'Anel da Serpente ativado! Taxa de drop de artefatos em Mini Bosses aumentada em +35% para toda a sua party nos próximos 7 dias!'
          });
        }

        if (artifactId === 'bolsa_sorte') {
          const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
          await prisma.user.update({
            where: { id: userId },
            data: { bolsaSorteExpires: expiresAt }
          });
          return reply.send({
            success: true,
            message: 'Bolsa da Sorte ativada! Taxa de drop de artefatos em missões diárias comuns aumentada em +15% nos próximos 7 dias!'
          });
        }

        if (artifactId === 'bandeira_guerra') {
          const activeRaidParticipant = await prisma.raidParticipant.findFirst({
            where: { userId, raid: { status: 'OPEN' } },
            include: { raid: true }
          });

          if (!activeRaidParticipant) {
            return reply.status(400).send({
              error: 'Você não está em nenhuma party/raid ativa no momento. Junte-se ou crie um grupo na aba Dungeons para fincar a Bandeira de Guerra!'
            });
          }

          const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
          await prisma.raid.update({
            where: { id: activeRaidParticipant.raidId },
            data: {
              bandeiraGuerraActive: true,
              bandeiraGuerraExpires: expiresAt
            }
          });

          await prisma.raidMessage.create({
            data: {
              raidId: activeRaidParticipant.raidId,
              userId,
              content: `📢 [Mural do Sistema] fincou a Bandeira de Guerra da Guilda! Buff de +20% de ganho de XP ativo para todos da party pelas próximas 24 horas!`
            }
          });

          return reply.send({
            success: true,
            message: 'Bandeira de Guerra fincada com sucesso! Toda a sua party recebeu o buff de +20% XP pelas próximas 24 horas!'
          });
        }

        if (artifactId === 'orbe_perspicacia') {
          const nextDelivery = await prisma.questDelivery.findFirst({
            where: { userId, status: 'SCHEDULED' },
            include: { quest: { include: { disciplina: true } } },
            orderBy: { scheduledAt: 'asc' }
          });

          const topic = nextDelivery?.quest?.tema || nextDelivery?.quest?.disciplina?.nome || 'Estudos Gerais (Mini Boss)';
          return reply.send({
            success: true,
            message: `A Orbe de Perspicácia canaliza energia e revela: seu próximo desafio acadêmico abordará o tópico: "${topic}".`
          });
        }

        if (artifactId === 'chave_mestra') {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          const otherRaid = await prisma.raid.findFirst({
            where: {
              status: 'OPEN',
              NOT: {
                participantes: {
                  some: { userId }
                }
              },
              participantes: {
                some: {
                  user: {
                    turmaId: user?.turmaId
                  }
                }
              }
            }
          });

          if (!otherRaid) {
            return reply.status(400).send({
              error: 'Nenhuma fresta de masmorra paralela (Raid aberta) foi encontrada no momento para invadir!'
            });
          }

          await prisma.raidParticipant.create({
            data: {
              raidId: otherRaid.id,
              userId,
              isInvasor: true
            }
          });

          await prisma.raidMessage.create({
            data: {
              raidId: otherRaid.id,
              userId,
              content: `⚠️ [ALERTA DE SEGURANÇA] detectou uma anomalia espacial! Um INVASOR infiltrou-se na Raid com uma Chave Mestra! Cuidado!`
            }
          });

          return reply.send({
            success: true,
            raidCode: otherRaid.codigo,
            message: `Chave Mestra girada! Você invadiu com sucesso a Raid [${otherRaid.codigo}]. Seu apelido agora brilha em vermelho sangue de invasor!`
          });
        }

        if (artifactId === 'mao_midas') {
          return reply.send({
            success: true,
            message: 'Mão de Midas energizada! Utilize seu transmutador dinâmico na sua bolsa!'
          });
        }

        return reply.status(400).send({ error: 'Artefato não elegível para consumo direto.' });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao processar consumo direto de artefato.', details: error.message });
      }
    }
  );

  // ─── GET /quests/deliveries/:deliveryId ────────────────────────────────────
  fastify.get<{ Params: { deliveryId: string } }>(
    '/deliveries/:deliveryId',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { deliveryId } = request.params;
        const userId = request.user.id;

        // Primeiro, busca em QuestDelivery
        let delivery = await prisma.questDelivery.findFirst({
          where: { id: deliveryId, userId }
        });

        if (!delivery) {
          // Se não encontrar, tenta buscar a WrongAnswer para achar a QuestDelivery vinculada
          const wrongAnswer = await prisma.wrongAnswer.findFirst({
            where: { id: deliveryId, userId }
          });

          if (wrongAnswer) {
            delivery = await prisma.questDelivery.findUnique({
              where: {
                questId_userId: {
                  questId: wrongAnswer.questId,
                  userId
                }
              }
            });

            if (!delivery) {
              delivery = await prisma.questDelivery.create({
                data: {
                  questId: wrongAnswer.questId,
                  userId,
                  status: "COMPLETED",
                  scheduledAt: new Date(),
                  deliveredAt: new Date(),
                  erros: wrongAnswer.tentativas
                }
              });
            }
          }
        }

        if (!delivery) {
          return reply.status(404).send({ error: 'Entrega não encontrada.' });
        }

        return reply.send({
          id: delivery.id,
          helpRequested: delivery.helpRequested,
          helpResponse: delivery.helpResponse,
          studentDoubt: delivery.studentDoubt
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao buscar detalhes da entrega.', details: error.message });
      }
    }
  );
};

