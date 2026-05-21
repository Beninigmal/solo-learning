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

  fastify.post<{ Body: { deliveryId: string; question: string; answer: string; image?: string; artifactId?: string } }>('/daily/submit', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { deliveryId, question, answer, image, artifactId } = request.body;
    const userId = request.user.id;
    const now = new Date();
    if (!deliveryId || !question || !answer) return reply.status(400).send({ error: 'Campos obrigatórios faltando.' });
    try {
      const delivery = await prisma.questDelivery.findUnique({ where: { id: deliveryId }, include: { quest: true } });
      if (!delivery || delivery.userId !== userId) return reply.status(404).send({ error: 'Entrega não encontrada.' });
      
      let prompt = answer === 'Cálculo na imagem'
        ? `Você é um tutor educacional que avalia respostas de alunos de escola pública brasileira.
A pergunta foi: "${question}".
O aluno optou por desenvolver o raciocínio na imagem. Analise APENAS a imagem e avalie a resposta.

Se CORRETO: retorne JSON: {"status": "success", "message": "Mensagem motivacional curta de parabenização"}
Se ERRADO: retorne JSON: {"status": "error", "message": "Explique de forma educativa o que errou e dê uma dica sobre o raciocínio correto, MAS NÃO revele a resposta final."}`
        : `Você é um tutor educacional que avalia respostas de alunos de escola pública brasileira.
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
        let xpFinal = isBoss
          ? delivery.quest.xp
          : Math.max(Math.round(delivery.quest.xp * Math.pow(0.75, delivery.erros)), 25);
        
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
        // Incrementar erro e manter DELIVERED para nova tentativa (escudo arcano cancela aumento de erro)
        const novosErros = artifactId === 'escudo_arcano' ? delivery.erros : delivery.erros + 1;
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
        ? `Atenção: O aluno NÃO digitou a resposta em texto. A resposta dele e o raciocínio estão EXCLUSIVAMENTE na imagem enviada.
Ignore a mensagem 'Cálculo na imagem'.
Analise a imagem para extrair a resposta final e o raciocínio. Verifique se la resposta encontrada na imagem está correta para a pergunta: "${wrongAnswer.quest.enunciado}".
Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`
        : `Valide a resposta "${answer}" para a pergunta "${wrongAnswer.quest.enunciado}". Se uma imagem foi enviada, ela contém o raciocínio matemático do aluno. Analise-o para ver se está correto e se bate com a resposta digitada. Retorne JSON: {"status": "success/error", "message": "Explicação curta do erro ou parabéns"}`;

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

        let xpGanho = 10; // Fixo em 10 XP conforme solicitado
        if (artifactId === 'elixir_dourado') {
          xpGanho = 20; // Duplica o XP
        }
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
                    select: { nome: true, nickname: true, xp: true }
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
                select: { nome: true, nickname: true, xp: true }
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
                select: { nome: true, nickname: true, xp: true }
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
};
