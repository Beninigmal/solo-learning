import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import crypto from 'crypto';

const WINDOW_MINUTES = 120;
const WAIT_TTL_MINUTES = 40;

interface GenerateQuestBody {
  semana: string;
  turmaId: string;
  tema: string;
  complexidade: string;
  exigeCalculo: boolean;
}

export const questsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const callGemini = async (prompt: string, image?: { data: string, mimeType: string }) => {
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
          nivel: delivered.quest.nivel,
          tags: delivered.quest.tags
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
          fromQueue: true,
          tags: waiting.quest.tags
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
          nivel: scheduled.quest.nivel,
          tags: scheduled.quest.tags
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

    const { semana, turmaId, tema, complexidade, exigeCalculo } = request.body;
    console.log('GENERATE QUEST BODY:', request.body);
    if (!semana || !turmaId || !tema || !complexidade) {
      return reply.status(400).send({ error: 'Campos obrigatórios: semana, turmaId, tema, complexidade.' });
    }

    try {
      const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turma) return reply.status(404).send({ error: 'Turma não encontrada.' });

      let disciplina = await prisma.disciplina.findUnique({ where: { nome: 'Missões Gerais' } });
      if (!disciplina) {
        disciplina = await prisma.disciplina.create({ data: { nome: 'Missões Gerais' } });
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
- Retorne APENAS um JSON no seguinte formato: {
  "q1": "pergunta fácil",
  "q2": "pergunta média",
  "q3": "pergunta difícil",
  "q4": "pergunta difícil",
  "q5": "pergunta difícil",
  "q6": "pergunta BOSS"
}`;

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
      const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60 * 1000);
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
            windowEnd
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
  fastify.post<{ Body: { turmaId: string; tema: string; semana: string } }>('/mock-boss', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { turmaId, tema, semana } = request.body;
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
Retorne APENAS um JSON no seguinte formato:
{
  "pergunta": "Texto da pergunta aqui..."
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
      const windowEnd = new Date(now.getTime() + 120 * 60 * 1000); // 120 minutes

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
          windowEnd
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
  fastify.post('/request-next', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const now = new Date();
    try {
      // Busca a última quest completada pelo usuário
      const lastCompleted = await prisma.questDelivery.findFirst({
        where: { userId, status: 'COMPLETED' },
        include: { quest: true },
        orderBy: { answeredAt: 'desc' }
      });

      let nextQuest;

      if (lastCompleted) {
        const batchId = lastCompleted.quest.batchId;
        const currentOrdem = lastCompleted.quest.ordem;

        // Busca a próxima quest no mesmo lote
        nextQuest = await prisma.quest.findFirst({
          where: { batchId, ordem: currentOrdem + 1 }
        });
      }

      // Se não houver completadas ou não houver próxima no lote, busca a primeira do último lote da turma do aluno
      if (!nextQuest) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.turmaId) {
          return reply.status(404).send({ error: 'Aluno sem turma associada.' });
        }

        const latestQuest = await prisma.quest.findFirst({
          where: { turmaAlvoId: user.turmaId },
          orderBy: { createdAt: 'desc' }
        });

        if (latestQuest) {
          const batchId = latestQuest.batchId;
          nextQuest = await prisma.quest.findFirst({
            where: { batchId, ordem: 1 }
          });
        }
      }

      if (!nextQuest) {
        return reply.status(404).send({ error: 'Todos os portais foram fechados!' });
      }

      // Verifica se já existe uma entrega para esta quest
      const existingDelivery = await prisma.questDelivery.findFirst({
        where: { userId, questId: nextQuest.id }
      });

      if (existingDelivery) {
        if (existingDelivery.status === 'DELIVERED') {
          return reply.status(200).send({ message: 'Missão já invocada!' });
        }
        // Se estava agendada ou em outro estado, atualiza para entregue
        await prisma.questDelivery.update({
          where: { id: existingDelivery.id },
          data: { status: 'DELIVERED', deliveredAt: now }
        });
      } else {
        // Cria nova entrega
        await prisma.questDelivery.create({
          data: {
            questId: nextQuest.id,
            userId,
            status: 'DELIVERED',
            deliveredAt: now,
            scheduledAt: now
          }
        });
      }

      return reply.status(200).send({ message: 'Missão invocada com sucesso!' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao invocar missão.' });
    }
  });

  // ─── POST /quests/daily/submit ─────────────────────────────────────────────
  fastify.post<{ Body: { deliveryId: string; question: string; answer: string; image?: string } }>('/daily/submit', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId, question, answer, image } = request.body;
    const userId = request.user.id;
    if (!deliveryId || !question || !answer) return reply.status(400).send({ error: 'Campos obrigatórios faltando.' });
    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId }, include: { quest: true } });
      if (!delivery || delivery.userId !== userId) return reply.status(404).send({ error: 'Entrega não encontrada.' });
      
      const prompt = answer === 'Cálculo na imagem'
        ? `Atenção: O aluno NÃO digitou a resposta em texto. A resposta dele e o raciocínio estão EXCLUSIVAMENTE na imagem enviada.
Ignore a mensagem 'Cálculo na imagem'.
Analise a imagem para extrair a resposta final e o raciocínio. Verifique se la resposta encontrada na imagem está correta para a pergunta: "${question}".
Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`
        : `Valide a resposta "${answer}" para a pergunta "${question}". Se uma imagem foi enviada, ela contém o raciocínio matemático do aluno. Analise-o para ver se está correto e se bate com a resposta digitada. Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`;

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
  fastify.post<{ Params: { id: string }; Body: { answer: string; image?: string } }>('/wrong-answers/:id/retry', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const { answer, image } = request.body;
    const userId = request.user.id;

    try {
      const wrongAnswer = await prisma.wrongAnswer.findUnique({
        where: { id },
        include: { quest: true }
      });

      if (!wrongAnswer || wrongAnswer.userId !== userId) {
        return reply.status(404).send({ error: 'Registro não encontrado.' });
      }

      const prompt = answer === 'Cálculo na imagem'
        ? `Atenção: O aluno NÃO digitou a resposta em texto. A resposta dele e o raciocínio estão EXCLUSIVAMENTE na imagem enviada.
Ignore a mensagem 'Cálculo na imagem'.
Analise a imagem para extrair a resposta final e o raciocínio. Verifique se la resposta encontrada na imagem está correta para a pergunta: "${wrongAnswer.quest.enunciado}".
Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`
        : `Valide a resposta "${answer}" para a pergunta "${wrongAnswer.quest.enunciado}". Se uma imagem foi enviada, ela contém o raciocínio matemático do aluno. Analise-o para ver se está correto e se bate com a resposta digitada. Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`;

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

        const xpGanho = 10; // Fixo em 10 XP conforme solicitado
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
