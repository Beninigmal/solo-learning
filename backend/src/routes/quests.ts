import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import crypto from 'crypto';

const WINDOW_MINUTES = 120; // Janela total da quest em minutos
const WAIT_TTL_MINUTES = 40; // TTL da fila de espera (1/3 de 120)

interface GenerateQuestBody {
  semana: string;
  turmaNome: string;
  tema: string;
}

export const questsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // ─── GET /quests/daily ─────────────────────────────────────────────────────
  // Aluno faz polling: retorna a entrega ativa (DELIVERED) ou dispara a próxima SCHEDULED.
  fastify.get('/daily', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const now = new Date();

    try {
      // 1. Expirar automaticamente entregas WAITING cujo TTL estourou
      await prisma.questDelivery.updateMany({
        where: {
          userId,
          status: 'WAITING',
          expiresAt: { lte: now }
        },
        data: { status: 'EXPIRED' }
      });

      // 2. Verificar se já existe uma entrega DELIVERED (aguardando interação)
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

      // 3. Verificar se há missão em espera (WAITING) que ainda não expirou
      //    → Aluno clicou "Aguardar" antes, voltou e deve ver a missão novamente
      const waiting = await prisma.questDelivery.findFirst({
        where: {
          userId,
          status: 'WAITING',
          expiresAt: { gt: now } // ainda dentro do TTL de 40 min
        },
        include: { quest: true },
        orderBy: { waitingSince: 'asc' }
      });

      if (waiting) {
        // Reativar: volta para DELIVERED para o aluno poder responder
        const reactivated = await prisma.questDelivery.update({
          where: { id: waiting.id },
          data: { status: 'DELIVERED', deliveredAt: now }
        });
        return reply.status(200).send({
          deliveryId: reactivated.id,
          question: waiting.quest.enunciado,
          xp: waiting.quest.xp,
          nivel: waiting.quest.nivel,
          fromQueue: true // flag para o frontend saber que veio da fila
        });
      }

      // 4. Verificar se há SCHEDULED com scheduledAt <= now (hora de disparar)
      const scheduled = await prisma.questDelivery.findFirst({
        where: {
          userId,
          status: 'SCHEDULED',
          scheduledAt: { lte: now }
        },
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

      // 5. Nada disponível ainda
      return reply.status(404).send({ error: 'Aguardando novas missões do Mestre.' });

    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar quest.', details: error.message });
    }
  });

  // ─── POST /quests/generate ─────────────────────────────────────────────────
  // Professor gera 3 quests (fácil/médio/difícil) para uma turma.
  // Entrega Q1 imediatamente; Q2 e Q3 são liberadas após a anterior ser respondida.
  fastify.post<{ Body: GenerateQuestBody }>('/generate', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { semana, turmaNome, tema } = request.body;
    if (!semana || !turmaNome || !tema) {
      return reply.status(400).send({ error: 'Campos obrigatórios: semana, turmaNome, tema.' });
    }

    try {
      // 1. Achar ou criar turma
      let turma = await prisma.turma.findUnique({ where: { nome: turmaNome } });
      if (!turma) {
        turma = await prisma.turma.create({ data: { nome: turmaNome } });
      }

      // 2. Achar ou criar disciplina padrão
      let disciplina = await prisma.disciplina.findUnique({ where: { nome: 'Missões Gerais' } });
      if (!disciplina) {
        disciplina = await prisma.disciplina.create({ data: { nome: 'Missões Gerais' } });
      }

      // 3. Gerar 3 perguntas progressivas com Gemini
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie EXATAMENTE 3 perguntas sobre o tema "${tema}" para a Semana ${semana}.

REGRAS IMPORTANTES:
- Linguagem simples, direta e fácil de entender para crianças e adolescentes
- Cada pergunta deve ter resposta numérica (um número inteiro)
- Não dê a resposta
- Aumente o nível de dificuldade progressivamente:
  * Pergunta 1 (FÁCIL): operação direta e simples, ex: "Quanto é 6 x 7?"
  * Pergunta 2 (MÉDIO): um passo a mais, aplica o conceito em situação do dia a dia
  * Pergunta 3 (DIFÍCIL): problema que exige raciocínio e combina o tema com uma situação-problema real
- Tom amigável, como um professor incentivando o aluno
- Sem termos difíceis, sem linguagem de RPG, sem palavras complexas

Retorne APENAS um JSON válido neste formato exato, sem markdown:
{
  "facil": "texto da pergunta fácil aqui",
  "medio": "texto da pergunta média aqui",
  "dificil": "texto da pergunta difícil aqui"
}`;

      const result = await model.generateContent(prompt);
      let raw = result.response.text().trim();
      // Remove markdown se a IA ignorar a instrução
      raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const questions = JSON.parse(raw) as { facil: string; medio: string; dificil: string };

      const now = new Date();
      const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000);
      const batchId = crypto.randomUUID();

      // 4. Criar as 3 Quests com batchId compartilhado e XP progressivo
      const questFacil = await prisma.quest.create({
        data: {
          disciplinaId: disciplina.id,
          enunciado: questions.facil,
          xp: 100,
          nivel: 'FACIL',
          batchId,
          ordem: 1,
          turmaAlvoId: turma.id,
          status: 'ATIVA',
          windowEnd
        }
      });

      const questMedio = await prisma.quest.create({
        data: {
          disciplinaId: disciplina.id,
          enunciado: questions.medio,
          xp: 150,
          nivel: 'MEDIO',
          batchId,
          ordem: 2,
          turmaAlvoId: turma.id,
          status: 'ATIVA',
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
          status: 'ATIVA',
          windowEnd
        }
      });

      // 5. Buscar todos os alunos da turma
      const alunos = await prisma.user.findMany({
        where: { turmaId: turma.id, role: 'ALUNO' }
      });

      // 6. Entregar apenas Q1 (FÁCIL) imediatamente para cada aluno
      //    Q2 e Q3 são liberadas pelo endpoint /submit após a anterior ser respondida
      if (alunos.length > 0) {
        await prisma.questDelivery.createMany({
          data: alunos.map((aluno: any) => ({
            questId: questFacil.id,
            userId: aluno.id,
            status: 'SCHEDULED',
            scheduledAt: now
          }))
        });

        // 7. Enviar push notification para todos os alunos com token registrado
        const tokens = alunos
          .map((a: any) => a.expoPushToken)
          .filter((t: string | null): t is string => !!t && t.startsWith('ExponentPushToken'));

        if (tokens.length > 0) {
          const messages = tokens.map((to: string) => ({
            to,
            sound: 'default',
            title: '⚔️ Nova Missão Disponível!',
            body: questions.facil.length > 80 ? questions.facil.slice(0, 77) + '...' : questions.facil,
            data: { type: 'NEW_QUEST' }
          }));

          // Fire-and-forget: não bloqueia a resposta se falhar
          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
          }).catch(err => request.log.error('Push notification error:', err));
        }
      }

      return reply.status(201).send({
        batch: batchId,
        quests: [
          { nivel: 'FACIL',   xp: 100, enunciado: questions.facil },
          { nivel: 'MEDIO',   xp: 150, enunciado: questions.medio },
          { nivel: 'DIFICIL', xp: 200, enunciado: questions.dificil }
        ],
        alunosNotificados: alunos.length
      });

    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar as quests com Gemini.', details: error.message });
    }
  });

  // ─── POST /quests/wait ─────────────────────────────────────────────────────
  // Aluno clica "Aguardar": coloca a entrega na fila com TTL de 40 min.
  fastify.post<{ Body: { deliveryId: string } }>('/wait', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId } = request.body;
    const userId = request.user.id;
    const now = new Date();

    if (!deliveryId) {
      return reply.status(400).send({ error: 'deliveryId é obrigatório.' });
    }

    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId } });

      if (!delivery || delivery.userId !== userId) {
        return reply.status(404).send({ error: 'Entrega não encontrada.' });
      }
      if (delivery.status !== 'DELIVERED') {
        return reply.status(400).send({ error: 'Apenas entregas DELIVERED podem ser colocadas em espera.' });
      }

      const expiresAt = new Date(now.getTime() + WAIT_TTL_MINUTES * 60 * 1000);

      await prisma.questDelivery.update({
        where: { id: deliveryId },
        data: { status: 'WAITING', waitingSince: now, expiresAt }
      });

      return reply.status(200).send({
        message: `Missão colocada em espera. Expira em ${WAIT_TTL_MINUTES} minutos.`,
        expiresAt
      });

    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao processar espera.', details: error.message });
    }
  });

  // ─── POST /quests/daily/submit ─────────────────────────────────────────────
  // Aluno responde. Valida com IA, credita XP e libera a próxima quest da sequência.
  fastify.post<{ Body: { deliveryId: string; question: string; answer: string } }>('/daily/submit', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId, question, answer } = request.body;
    const userId = request.user.id;

    if (!deliveryId || !question || !answer) {
      return reply.status(400).send({ error: 'Os campos deliveryId, question e answer são obrigatórios.' });
    }

    try {
      const delivery = await prisma.questDelivery.findUnique({
        where: { id: deliveryId },
        include: { quest: true }
      });

      if (!delivery || delivery.userId !== userId) {
        return reply.status(404).send({ error: 'Entrega não encontrada.' });
      }
      if (delivery.status === 'COMPLETED') {
        return reply.status(400).send({ error: 'Esta missão já foi respondida.' });
      }
      if (delivery.status === 'EXPIRED') {
        return reply.status(400).send({ error: 'Esta missão expirou.' });
      }

      // Validar resposta com Gemini
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Você é um corretor de exercícios escolares para crianças e adolescentes.
A pergunta foi: "${question}"
A resposta do aluno foi: "${answer}"

Tarefa:
1. Verifique se a resposta está matematicamente correta.
2. Dê um feedback curto, simples e encorajador, adequado para alunos de escola pública.
3. Retorne APENAS um JSON válido, sem markdown:
{"status": "success", "message": "feedback aqui"} ou {"status": "error", "message": "feedback aqui"}`;

      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const validation = JSON.parse(responseText);

      const now = new Date();

      // Marcar entrega como COMPLETED
      await prisma.questDelivery.update({
        where: { id: deliveryId },
        data: { status: 'COMPLETED', answeredAt: now }
      });

      // Creditar XP se acertou
      if (validation.status === 'success') {
        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: delivery.quest.xp } }
        });
      }

      // ── Liberar a próxima quest da sequência (mesma batchId, ordem + 1) ──
      const currentOrdem = delivery.quest.ordem;
      const batchId = delivery.quest.batchId;
      const questWindowEnd = delivery.quest.windowEnd;

      if (batchId && questWindowEnd && now < questWindowEnd) {
        const proximaQuest = await prisma.quest.findFirst({
          where: {
            batchId,
            ordem: currentOrdem + 1,
            status: 'ATIVA'
          }
        });

        if (proximaQuest) {
          // Intervalo aleatório entre 1 e 30 minutos para a próxima entrega
          const delayMs = Math.floor(Math.random() * 29 * 60 * 1000) + 60 * 1000;
          const nextScheduledAt = new Date(now.getTime() + delayMs);

          // Só agenda se ainda couber dentro da janela
          if (nextScheduledAt < questWindowEnd) {
            try {
              await prisma.questDelivery.create({
                data: {
                  questId: proximaQuest.id,
                  userId,
                  status: 'SCHEDULED',
                  scheduledAt: nextScheduledAt
                }
              });
            } catch (e: any) {
              // P2002 = já existe entrega para este quest+user → ignora
              if (e.code !== 'P2002') throw e;
            }
          }
        }
      }

      return reply.status(200).send(validation);

    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao processar a resposta.', details: error.message });
    }
  });
};
