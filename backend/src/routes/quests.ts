import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import crypto from 'crypto';

const WINDOW_MINUTES = 120;
const WAIT_TTL_MINUTES = 40;

interface GenerateQuestBody {
  semana: string;
  turmaId: string;
  tema: string;
}

export const questsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // ─── GET /quests/history ──────────────────────────────────────────────────
  // Professor visualiza o histórico de missões geradas
  fastify.get('/history', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    try {
      const history = await prisma.quest.findMany({
        where: {
          turmaAlvo: request.user.role === 'ADMIN' ? {} : { professorId: request.user.id },
          ordem: 1
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
          xp: delivered.quest.xp,
          nivel: delivered.quest.nivel
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
          xp: waiting.quest.xp,
          nivel: waiting.quest.nivel,
          fromQueue: true
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
          xp: scheduled.quest.xp,
          nivel: scheduled.quest.nivel
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

    const { semana, turmaId, tema } = request.body;
    if (!semana || !turmaId || !tema) {
      return reply.status(400).send({ error: 'Campos obrigatórios: semana, turmaId, tema.' });
    }

    try {
      const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turma) return reply.status(404).send({ error: 'Turma não encontrada.' });

      let disciplina = await prisma.disciplina.findUnique({ where: { nome: 'Missões Gerais' } });
      if (!disciplina) {
        disciplina = await prisma.disciplina.create({ data: { nome: 'Missões Gerais' } });
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie EXATAMENTE 3 perguntas sobre o tema "${tema}" para a Semana "${semana}".

REGRAS IMPORTANTES:
- Linguagem simples e direta.
- Cada pergunta deve ter resposta numérica (um número inteiro).
- Não dê a resposta.
- Progressão: FÁCIL, MÉDIO, DIFÍCIL.
- Retorne APENAS um JSON: {"facil": "...", "medio": "...", "dificil": "..."}`;

      const result = await model.generateContent(prompt);
      let raw = result.response.text().trim();
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const questions = JSON.parse(raw);

      const now = new Date();
      const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000);
      const batchId = crypto.randomUUID();

      const q1 = await prisma.quest.create({
        data: {
          disciplinaId: disciplina.id,
          enunciado: questions.facil,
          xp: 100,
          nivel: 'FACIL',
          batchId,
          ordem: 1,
          turmaAlvoId: turma.id,
          semana,
          tema,
          windowEnd
        }
      });

      await prisma.quest.create({
        data: {
          disciplinaId: disciplina.id,
          enunciado: questions.medio,
          xp: 150,
          nivel: 'MEDIO',
          batchId,
          ordem: 2,
          turmaAlvoId: turma.id,
          semana,
          tema,
          windowEnd
        }
      });

      await prisma.quest.create({
        data: {
          disciplinaId: disciplina.id,
          enunciado: questions.dificil,
          xp: 200,
          nivel: 'DIFICIL',
          batchId,
          ordem: 3,
          turmaAlvoId: turma.id,
          semana,
          tema,
          windowEnd
        }
      });

      const alunos = await prisma.user.findMany({ where: { turmaId: turma.id, role: 'ALUNO' } });

      if (alunos.length > 0) {
        await prisma.questDelivery.createMany({
          data: alunos.map((aluno: any) => ({
            questId: q1.id,
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

  // ... (outros endpoints /wait e /submit seguem a mesma lógica anterior)
  // Vou manter o restante do arquivo (wait e submit) para não deletar funcionalidade
  
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

  // ─── POST /quests/daily/submit ─────────────────────────────────────────────
  fastify.post<{ Body: { deliveryId: string; question: string; answer: string } }>('/daily/submit', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId, question, answer } = request.body;
    const userId = request.user.id;
    if (!deliveryId || !question || !answer) return reply.status(400).send({ error: 'Campos obrigatórios faltando.' });
    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId }, include: { quest: true } });
      if (!delivery || delivery.userId !== userId) return reply.status(404).send({ error: 'Entrega não encontrada.' });
      
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Valide a resposta "${answer}" para a pergunta "${question}". Retorne JSON: {"status": "success/error", "message": "..."}`;
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const validation = JSON.parse(responseText);

      const isCorrect = validation.status === 'success';

      await prisma.questDelivery.update({
        where: { id: deliveryId },
        data: { 
          status: 'COMPLETED', 
          answeredAt: new Date(),
          isCorrect
        }
      });

      if (isCorrect) {
        await prisma.user.update({ where: { id: userId }, data: { xp: { increment: delivery.quest.xp } } });
      } else {
        // Criar WrongAnswer para o aluno (Baú)
        await prisma.wrongAnswer.upsert({
          where: { 
            userId_questId: { userId, questId: delivery.questId } 
          },
          update: { tentativas: { increment: 1 } },
          create: { userId, questId: delivery.questId, tentativas: 1 }
        });
      }

      return reply.send(validation);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao submeter resposta.' });
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
  fastify.post<{ Params: { id: string }; Body: { answer: string } }>('/wrong-answers/:id/retry', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { answer } = request.body;
    const userId = request.user.id;

    try {
      const wrongAnswer = await prisma.wrongAnswer.findUnique({
        where: { id },
        include: { quest: true }
      });

      if (!wrongAnswer || wrongAnswer.userId !== userId) {
        return reply.status(404).send({ error: 'Registro não encontrado.' });
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Valide a resposta "${answer}" para a pergunta "${wrongAnswer.quest.enunciado}". Retorne JSON: {"status": "success/error", "message": "..."}`;
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const validation = JSON.parse(responseText);

      if (validation.status === 'success') {
        await prisma.wrongAnswer.update({
          where: { id },
          data: { resolvido: true }
        });

        const xpGanho = Math.round(wrongAnswer.quest.xp * 0.1);
        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: xpGanho } }
        });

        return reply.send({ ...validation, xpGanho });
      } else {
        await prisma.wrongAnswer.update({
          where: { id },
          data: { tentativas: { increment: 1 } }
        });
        return reply.send(validation);
      }
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao processar tentativa.' });
    }
  });
};
