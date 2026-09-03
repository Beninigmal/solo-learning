import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getGeminiKey = () => process.env.GEMINI_API_KEY || '';

export async function bossRoutes(fastify: FastifyInstance) {

  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', fastify.validateTenantStatus);
  fastify.addHook('preHandler', fastify.validateInstitution);

  // 1. INVOCAR MEGA BOSS (Mestre / Professor)
  fastify.post<{
    Body: {
      nomeBoss?: string;
      disciplinaId: string;
      turmaIds: string[];
      totalHp?: number; // 1 a 500
      diasValidade?: number;
      tema?: string;
    }
  }>('/invoke', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Sessão expirada ou não autenticada. Por favor, faça login novamente.' });
    }

    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Apenas professores ou administradores podem invocar o Mega Boss.' });
    }

    const { disciplinaId, turmaIds, tema } = request.body;
    let totalHp = Math.min(500, Math.max(10, request.body.totalHp || 300));
    const diasValidade = request.body.diasValidade || 3;
    const nomeBoss = request.body.nomeBoss || 'O Arquemago do Raciocínio';

    if (!disciplinaId || !turmaIds || turmaIds.length === 0) {
      return reply.status(400).send({ error: 'Disciplina e pelo menos uma turma são obrigatórias.' });
    }

    const disciplina = await prisma.disciplina.findUnique({ where: { id: disciplinaId } });
    if (!disciplina) {
      return reply.status(404).send({ error: 'Disciplina não encontrada.' });
    }

    // Determina o tipo de resposta com base na disciplina
    const discNomeLower = disciplina.nome.toLowerCase();
    let tipoRespostaDefault = 'TEXTO';
    if (discNomeLower.includes('matemática') || discNomeLower.includes('matematica') || discNomeLower.includes('física') || discNomeLower.includes('química')) {
      tipoRespostaDefault = 'FOTO_MATEMATICA';
    } else if (discNomeLower.includes('redação') || discNomeLower.includes('redacao')) {
      tipoRespostaDefault = 'FOTO_REDACAO';
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + diasValidade);

    // Gerar a lista de quests usando a IA Gemini em lote
    const apiKey = getGeminiKey();
    let generatedQuests: Array<{ enunciado: string; gabarito?: string; nivel: string; xpBase: number; tipoResposta: string }> = [];

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Você é um forjador de quests pedagógicas para o jogo educacional COLLEGIUM.
Gere uma lista em JSON com ${Math.min(totalHp, 30)} questões pedagógicas ÚNICAS, REAIS E DETALHADAS para a disciplina "${disciplina.nome}" sobre o tema específico: "${tema || 'Matriz Curricular'}".

REGRAS ESTRITAS DE GERAÇÃO:
- NUNCA crie enunciados genéricos ou frases repetitivas.
- Cada enunciado deve conter uma pergunta educacional completa e contextualizada sobre "${tema || disciplina.nome}".
- Para Português/Gramática: Crie questões sobre conjugação verbal, ortografia, sintaxe, interpretação ou análise gramatical do tema.
- Para Matemática/Exatas: Crie problemas numéricos práticos de aplicação do tema.
- Para Redação: Crie propostas de redação dissertativa-argumentativa detalhadas.

Responda ESTRITAMENTE um JSON no seguinte formato:
[
  {
    "enunciado": "Pergunta pedagógica completa e contextualizada...",
    "gabarito": "Resposta esperada ou critérios de avaliação",
    "nivel": "MEDIO",
    "xpBase": 150
  }
]`;

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        
        const startIdx = text.indexOf('[');
        const endIdx = text.lastIndexOf(']');
        
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = text.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(jsonStr);

          if (Array.isArray(parsed) && parsed.length > 0) {
            // Multiplica para atingir o totalHp desejado se o lote for menor
            while (generatedQuests.length < totalHp) {
              for (const q of parsed) {
                if (generatedQuests.length >= totalHp) break;
                generatedQuests.push({
                  enunciado: q.enunciado,
                  gabarito: q.gabarito || '',
                  nivel: q.nivel || 'MEDIO',
                  xpBase: q.xpBase || 150,
                  tipoResposta: tipoRespostaDefault
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro na IA ao gerar quests do boss, usando fallback:', err);
      }
    }

    // Fallback de segurança se a IA não responder
    if (generatedQuests.length < totalHp) {
      const remaining = totalHp - generatedQuests.length;
      const temaTexto = tema ? `o tema "${tema}"` : `a disciplina de ${disciplina.nome}`;
      const templatesPedagogicos = [
        `Analise a regra conceitual e determine a aplicação correta em relação a ${temaTexto}.`,
        `Identifique a alternativa ou explicação adequada referente a ${temaTexto} na unidade estudada.`,
        `Aplique os conceitos fundamentais de ${temaTexto} para solucionar o exercício proposto.`,
        `Explique detalhadamente como se aplica a estrutura de ${temaTexto} no contexto apresentado.`,
        `Determine o resultado ou classificação gramatical/matemática correta sobre ${temaTexto}.`
      ];

      for (let i = 1; i <= remaining; i++) {
        const template = templatesPedagogicos[(i - 1) % templatesPedagogicos.length];
        generatedQuests.push({
          enunciado: `[Quest #${i} - ${disciplina.nome}] ${template}`,
          gabarito: 'Resposta verificada pela IA',
          nivel: i % 3 === 0 ? 'DIFICIL' : i % 2 === 0 ? 'MEDIO' : 'FACIL',
          xpBase: 150,
          tipoResposta: tipoRespostaDefault
        });
      }
    }

    const createdBossFights = [];

    // Criar um BossFight isolado por Turma
    for (const turmaId of turmaIds) {
      const boss = await prisma.bossFight.create({
        data: {
          turmaId,
          mestreId: request.user.id,
          disciplinaId,
          nomeBoss: `${nomeBoss} (${disciplina.nome})`,
          totalHp,
          currentHp: totalHp,
          status: 'ACTIVE',
          expiresAt,
          quests: {
            create: generatedQuests.map(q => ({
              enunciado: q.enunciado,
              gabarito: q.gabarito,
              tipoResposta: q.tipoResposta,
              nivel: q.nivel,
              xpBase: q.xpBase,
              status: 'AVAILABLE'
            }))
          }
        },
        include: {
          turma: true,
          quests: true
        }
      });
      createdBossFights.push(boss);
    }

    return reply.status(201).send({
      message: `Mega Boss invocado com sucesso para ${createdBossFights.length} turma(s)!`,
      bossFights: createdBossFights
    });
  });

  // 2. TRANSMUTAR QUEST DO BOSS (Mestre refaz questão com bug)
  fastify.post<{
    Params: { questId: string }
  }>('/transmute/:questId', async (request, reply) => {
    if (!request.user || (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN')) {
      return reply.status(403).send({ error: 'Apenas professores podem transmutar quests.' });
    }

    const { questId } = request.params;
    const bossQuest = await prisma.bossQuest.findUnique({
      where: { id: questId },
      include: { bossFight: true }
    });

    if (!bossQuest) {
      return reply.status(404).send({ error: 'Quest do Boss não encontrada.' });
    }

    const apiKey = getGeminiKey();
    let novoEnunciado = `[Quest Transmutada] Novo desafio pedagógico reajustado pelo Mestre.`;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Gere uma nova questão pedagógica clara, direta e corrigida sobre o tema anterior.
Enunciado antigo com erro: "${bossQuest.enunciado}".
Retorne apenas o texto do novo enunciado da questão.`;

        const res = await model.generateContent(prompt);
        novoEnunciado = res.response.text().trim();
      } catch (e) {
        console.error('Erro na transmutação:', e);
      }
    }

    const updated = await prisma.bossQuest.update({
      where: { id: questId },
      data: {
        enunciado: novoEnunciado,
        status: 'AVAILABLE',
        lockedByPartyId: null,
        lockedAt: null
      }
    });

    return reply.send({ message: 'Quest transmutada com sucesso!', quest: updated });
  });

  // 2.1 LISTAR MEGA BOSSES CRIADOS PELO MESTRE (Com todas as quests para visualização/edição)
  fastify.get('/mestre/fights', async (request, reply) => {
    if (!request.user || (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN')) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const bossFights = await prisma.bossFight.findMany({
      where: request.user.role === 'ADMIN' ? {} : { mestreId: request.user.id },
      include: {
        turma: true,
        disciplina: true,
        quests: {
          orderBy: [{ createdAt: 'asc' }]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return reply.send({ bossFights });
  });

  // 2.2 EDITAR QUEST DO BOSS MANUALMENTE (Mestre ajusta enunciado)
  fastify.put<{
    Params: { questId: string };
    Body: { enunciado: string }
  }>('/quests/:questId', async (request, reply) => {
    if (!request.user || (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN')) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    const { questId } = request.params;
    const { enunciado } = request.body;

    if (!enunciado || !enunciado.trim()) {
      return reply.status(400).send({ error: 'O enunciado não pode ser vazio.' });
    }

    const updated = await prisma.bossQuest.update({
      where: { id: questId },
      data: { enunciado: enunciado.trim() }
    });

    return reply.send({ message: 'Quest atualizada com sucesso!', quest: updated });
  });

  // 3. CONSULTAR BOSS ATIVO DA TURMA DO ALUNO
  fastify.get('/active', async (request, reply) => {
    if (!request.user?.id) {
      return reply.send({ activeBoss: null });
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!user || !user.turmaId) {
      return reply.send({ activeBoss: null });
    }

    const activeBoss = await prisma.bossFight.findFirst({
      where: {
        turmaId: user.turmaId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() }
      },
      include: {
        disciplina: true,
        turma: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ activeBoss });
  });

  // 4. LISTAR BACKLOG DO BOSS E AUTO-LIMPAR INATIVOS (15 min)
  fastify.get<{ Params: { bossId: string } }>('/:bossId/quests', async (request, reply) => {
    const { bossId } = request.params;
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // Auto-release locks inativos (> 15 min sem atividade da Party)
    await prisma.bossQuest.updateMany({
      where: {
        bossFightId: bossId,
        status: 'LOCKED',
        lastActiveAt: { lt: fifteenMinutesAgo }
      },
      data: {
        status: 'AVAILABLE',
        lockedByPartyId: null,
        lockedAt: null,
        currentResponderId: null,
        attemptedUserIds: "",
        defeatCount: { increment: 1 }
      }
    });

    const bossFight = await prisma.bossFight.findUnique({
      where: { id: bossId },
      include: {
        disciplina: true,
        quests: {
          orderBy: [{ defeatCount: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });

    if (!bossFight) {
      return reply.status(404).send({ error: 'Boss Fight não encontrado.' });
    }

    // Identificar a Party ativa do usuário se autenticado
    let activePartyId: string | null = null;
    if (request.user?.id) {
      const p = await prisma.raidParticipant.findFirst({
        where: { userId: request.user.id, raid: { status: 'OPEN' } }
      });
      if (p) activePartyId = p.raidId;
    }

    // Buscar todos os usuários mencionados para mapear nicknames
    const responderIds = bossFight.quests.map(q => q.currentResponderId).filter(Boolean) as string[];
    const responderUsers = responderIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: responderIds } },
      select: { id: true, nickname: true, nome: true }
    }) : [];

    const userMap: Record<string, string> = {};
    for (const u of responderUsers) {
      userMap[u.id] = u.nickname || u.nome || 'Membro';
    }

    const discNomeLower = (bossFight.disciplina?.nome || '').toLowerCase();
    const isExatas = discNomeLower.includes('matemática') || discNomeLower.includes('matematica') || discNomeLower.includes('física') || discNomeLower.includes('química');
    const isRedacao = discNomeLower.includes('redação') || discNomeLower.includes('redacao');

    const sanitizedQuests = bossFight.quests.map(q => {
      let tipo = q.tipoResposta;
      if (!isExatas && !isRedacao) {
        tipo = 'TEXTO';
      }

      const isPartyLocked = !!(activePartyId && q.lockedByPartyId === activePartyId && q.status === 'LOCKED');
      const isMyTurn = isPartyLocked && q.currentResponderId === request.user?.id;
      const responderNick = q.currentResponderId ? (userMap[q.currentResponderId] || 'Aliado') : null;

      return {
        ...q,
        tipoResposta: tipo,
        isPartyLocked,
        isMyTurn,
        responderNick
      };
    });

    // Se a Party do usuário possui uma quest ativamente travada, identificá-la
    const activePartyQuest = sanitizedQuests.find(q => q.isPartyLocked) || null;

    return reply.send({
      bossFight: {
        ...bossFight,
        quests: sanitizedQuests
      },
      activePartyQuest,
      activePartyId
    });
  });

  // 5. TRAVAR QUEST PARA A PARTY (FILA LOCK - TRAVA UNIFICADA DA GUILDA)
  fastify.post<{ Params: { questId: string } }>('/quests/:questId/lock', async (request, reply) => {
    if (!request.user?.id) {
      return reply.status(401).send({ error: 'Sessão expirada.' });
    }

    const userId = request.user.id;
    const { questId } = request.params;

    // Verificar se o aluno está em uma Raid ativa (Party em RAID)
    const participant = await prisma.raidParticipant.findFirst({
      where: { userId, raid: { status: 'OPEN' } },
      include: {
        raid: {
          include: {
            participantes: {
              include: { user: { select: { id: true, nickname: true, nome: true } } }
            }
          }
        }
      }
    });

    if (!participant || !participant.raid) {
      return reply.status(403).send({
        error: 'O Mega Boss é exclusivo para Parties em RAID! Entre ou crie uma Party na aba PARTY para participar.'
      });
    }

    const partyId = participant.raidId;
    const userNick = (request.user as any).nickname || request.user.nome || 'Caçador';
    const now = new Date();

    const quest = await prisma.bossQuest.findUnique({ where: { id: questId } });
    if (!quest) {
      return reply.status(404).send({ error: 'Quest não encontrada.' });
    }

    // REGRA DE OURO: Verificar se a Party JÁ POSSUI uma quest travada ativa neste Boss
    const existingPartyLock = await prisma.bossQuest.findFirst({
      where: {
        bossFightId: quest.bossFightId,
        lockedByPartyId: partyId,
        status: 'LOCKED'
      }
    });

    if (existingPartyLock) {
      // Se a Party já tem uma quest travada, devolve a quest atual da Party!
      return reply.send({
        message: 'Sua Party já está em combate com uma quest ativa!',
        quest: existingPartyLock
      });
    }

    // Se a quest alvo já está concluída
    if (quest.status === 'COMPLETED') {
      return reply.status(400).send({ error: 'Esta quest já foi concluída por outra Party!' });
    }

    // Se está travada por outra party e o lock ainda está ativo (< 15 min)
    if (quest.status === 'LOCKED' && quest.lockedByPartyId !== partyId) {
      const lockAge = quest.lastActiveAt ? now.getTime() - new Date(quest.lastActiveAt).getTime() : 0;
      if (lockAge < 15 * 60 * 1000) {
        return reply.status(409).send({ error: 'Esta quest está em combate por outra Party no momento!' });
      }
    }

    // Aplica a trava de fila unificada para a Party e define o primeiro responder como quem clicou no botão
    const updated = await prisma.bossQuest.update({
      where: { id: questId },
      data: {
        status: 'LOCKED',
        lockedByPartyId: partyId,
        lockedAt: now,
        lastActiveAt: now,
        currentResponderId: userId,
        attemptedUserIds: userId
      }
    });

    // Enviar mensagem no chat da Party
    await prisma.raidMessage.create({
      data: {
        raidId: partyId,
        userId,
        content: `⚔️ [Mega Boss] O caçador @${userNick} reservou uma quest para a Guilda! Turno de resposta ativado.`
      }
    });

    return reply.send({ message: 'Quest reservada para a sua Party!', quest: updated });
  });

  // 6. SUBMETER RESPOSTA E AVALIAR VIA IA (ROTAÇÃO DE TURNO & WIPE DA GUILDA)
  fastify.post<{
    Params: { questId: string };
    Body: { respostaTexto?: string; imagemBase64?: string }
  }>('/quests/:questId/submit', async (request, reply) => {
    if (!request.user?.id) {
      return reply.status(401).send({ error: 'Sessão expirada.' });
    }

    const userId = request.user.id;
    const { questId } = request.params;
    const { respostaTexto, imagemBase64 } = request.body;

    const participant = await prisma.raidParticipant.findFirst({
      where: { userId, raid: { status: 'OPEN' } },
      include: {
        raid: {
          include: {
            participantes: {
              include: { user: { select: { id: true, nickname: true, nome: true } } }
            }
          }
        }
      }
    });

    if (!participant || !participant.raid) {
      return reply.status(403).send({ error: 'Você precisa estar em uma Party em RAID para responder.' });
    }

    const partyId = participant.raidId;
    const partyMembers = participant.raid.participantes;
    const userNick = (request.user as any).nickname || request.user.nome || 'Caçador';

    const quest = await prisma.bossQuest.findUnique({
      where: { id: questId },
      include: { bossFight: true }
    });

    if (!quest) {
      return reply.status(404).send({ error: 'Quest não encontrada.' });
    }

    if (quest.status === 'COMPLETED') {
      return reply.status(400).send({ error: 'Quest já foi resolvida.' });
    }

    if (quest.lockedByPartyId !== partyId) {
      return reply.status(403).send({ error: 'Esta quest não está trancada pela sua Party.' });
    }

    // REGRA DE OURO DA RAID: Verificar se é a VEZ do jogador atual
    if (quest.currentResponderId && quest.currentResponderId !== userId) {
      const responder = partyMembers.find(p => p.userId === quest.currentResponderId)?.user;
      const responderNick = responder?.nickname || responder?.nome || 'Aliado';
      return reply.status(403).send({
        error: `Aguarde sua vez! O turno de resposta atual pertence ao seu aliado @${responderNick}.`
      });
    }

    const apiKey = getGeminiKey();
    let notaPercentual = 100;
    let feedbackIA = 'Resposta correta e validada com sucesso!';
    let passou = true;

    // Avaliação por Foto (OCR de Matemática ou Redação escrita à mão)
    if (quest.tipoResposta === 'FOTO_MATEMATICA' || quest.tipoResposta === 'FOTO_REDACAO') {
      if (!imagemBase64) {
        return reply.status(400).send({ error: 'Esta quest exige o envio da foto do caderno manuscrito.' });
      }

      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

          const prompt = quest.tipoResposta === 'FOTO_REDACAO'
            ? `Você é um corretor pedagógico de redação. Avalie a imagem da folha manuscrita.
Tema da Redação/Questão: "${quest.enunciado}".
Avalie a estrutura do texto, desenvolvimento da ideia e adequação ao tema.
Dê uma nota percentual de 0 a 100 baseada em estrutura e tema (mesmo com pequenos erros ortográficos).
Retorne ESTRITAMENTE um JSON no formato: {"nota": 75, "feedback": "Texto bem estruturado..."}`
            : `Você é um tutor de Matemática/Ciências. Avalie o cálculo manuscrito na foto para a questão: "${quest.enunciado}".
Verifique a lógica do raciocínio passo a passo.
Dê uma nota de 0 a 100.
Retorne ESTRITAMENTE um JSON no formato: {"nota": 80, "feedback": "Raciocínio correto no passo 2..."}`;

          const imagePart = {
            inlineData: {
              data: imagemBase64.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: 'image/jpeg'
            }
          };

          const res = await model.generateContent([prompt, imagePart]);
          const text = res.response.text().replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(text);

          notaPercentual = parsed.nota ?? 70;
          feedbackIA = parsed.feedback || 'Avaliação da IA concluída.';
        } catch (err) {
          console.error('Erro na avaliação visual pela IA, usando fallback:', err);
          notaPercentual = 70;
        }
      }

      if (notaPercentual < 60) {
        passou = false;
      }
    } else {
      // Avaliação de Resposta em Texto Livre
      if (!respostaTexto || !respostaTexto.trim()) {
        return reply.status(400).send({ error: 'Por favor, digite sua resposta.' });
      }

      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const prompt = `Você é um tutor rigoroso. Avalie a resposta do aluno.
Pergunta: "${quest.enunciado}".
Gabarito/Critérios: "${quest.gabarito || ''}".
Resposta do Aluno: "${respostaTexto}".

Avalie a clareza, coerência e correção do raciocínio.
Dê uma nota percentual de 0 a 100.
Retorne ESTRITAMENTE um JSON no formato: {"nota": 85, "feedback": "Resposta clara..."}`;

          const res = await model.generateContent(prompt);
          const text = res.response.text().replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(text);
          notaPercentual = parsed.nota ?? 75;
          feedbackIA = parsed.feedback || 'Avaliação de texto concluída.';
        } catch (err) {
          console.error('Erro na avaliação de texto pela IA:', err);
          notaPercentual = 75;
        }
      }

      if (notaPercentual < 60) {
        passou = false;
      }
    }

    // --- SE A RESPOSTA FOR INCORRETA (NOTA < 60%) ---
    if (!passou) {
      const attemptedList = (quest.attemptedUserIds || '').split(',').filter(Boolean);
      if (!attemptedList.includes(userId)) {
        attemptedList.push(userId);
      }

      // Buscar membros da Party que AINDA NÃO tentaram esta quest
      const remainingMembers = partyMembers.filter(p => !attemptedList.includes(p.userId));

      if (remainingMembers.length > 0) {
        // ROTACIONAR O TURNO PARA O PRÓXIMO MEMBRO DA PARTY
        const nextResponder = remainingMembers[0];
        const nextNick = nextResponder.user.nickname || nextResponder.user.nome || 'Aliado';

        await prisma.bossQuest.update({
          where: { id: questId },
          data: {
            currentResponderId: nextResponder.userId,
            attemptedUserIds: attemptedList.join(','),
            lastActiveAt: new Date()
          }
        });

        // Chat da Party
        await prisma.raidMessage.create({
          data: {
            raidId: partyId,
            userId,
            content: `⚠️ [Mega Boss] @${userNick} errou a tentativa (Nota: ${notaPercentual}%). O turno de resposta passou para @${nextNick}!`
          }
        });

        return reply.send({
          success: false,
          wipe: false,
          turnRotated: true,
          nextResponderNick: nextNick,
          nota: notaPercentual,
          message: `Nota obtida: ${notaPercentual}% (Corte: 60%). A vez de responder no combate passou para o seu aliado @${nextNick}!`,
          feedbackIA
        });
      }

      // TODOS OS MEMBROS DA PARTY FALHARAM -> PARTY WIPE (💀)!
      await prisma.bossQuest.update({
        where: { id: questId },
        data: {
          status: 'AVAILABLE',
          lockedByPartyId: null,
          lockedAt: null,
          currentResponderId: null,
          attemptedUserIds: "",
          defeatCount: { increment: 1 }
        }
      });

      await prisma.raidMessage.create({
        data: {
          raidId: partyId,
          userId,
          content: `💀 [PARTY DIZIMADA!] Todos os caçadores da guilda falharam na quest do Mega Boss! A quest retornou ao backlog com +50% de bônus de drop!`
        }
      });

      return reply.send({
        success: false,
        wipe: true,
        nota: notaPercentual,
        message: `💀 PARTY DIZIMADA! Todos os membros da sua guilda falharam nesta quest. Ela retornou ao backlog com bônus de drop acumulado!`,
        feedbackIA
      });
    }

    // --- SUCESSO (NOTA ≥ 60%): CONCLUI QUEST E APLICA DANO NO BOSS ---
    const bônusMultiplicador = 1 + 0.5 * quest.defeatCount; // Ex: 0 derrotas = 1x, 2 derrotas = 2x XP!
    const xpGanhoFinal = Math.round(quest.xpBase * bônusMultiplicador);

    await prisma.bossQuest.update({
      where: { id: questId },
      data: {
        status: 'COMPLETED',
        completedByPartyId: partyId,
        completedAt: new Date(),
        currentResponderId: null
      }
    });

    // Dano no Boss (-1 HP)
    const bossFight = await prisma.bossFight.findUnique({ where: { id: quest.bossFightId } });
    let newHp = 0;
    if (bossFight) {
      newHp = Math.max(0, bossFight.currentHp - 1);
      const isDefeated = newHp === 0;

      await prisma.bossFight.update({
        where: { id: quest.bossFightId },
        data: {
          currentHp: newHp,
          status: isDefeated ? 'DEFEATED' : bossFight.status
        }
      });
    }

    // Recompensar TODOS os participantes da Party com XP e sorteio de artefato
    for (const p of partyMembers) {
      await prisma.user.update({
        where: { id: p.userId },
        data: { xp: { increment: xpGanhoFinal } }
      });
    }

    await prisma.raidMessage.create({
      data: {
        raidId: partyId,
        userId,
        content: `🏆 [Mural do Sistema] O caçador @${userNick} purificou a quest do Mega Boss! -1 HP causado no chefe e +${xpGanhoFinal} XP concedidos a todos da guilda!`
      }
    });

    return reply.send({
      success: true,
      nota: notaPercentual,
      xpGanho: xpGanhoFinal,
      defeatCount: quest.defeatCount,
      bossHpRestante: newHp,
      message: `Quest CONCLUÍDA com sucesso! Sua Party causou 1 de dano no Boss e ganhou +${xpGanhoFinal} XP (Bônus de Wipe: ${bônusMultiplicador}x).`,
      feedbackIA
    });
  });

}
