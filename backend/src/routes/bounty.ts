import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { logAction } from '../services/actionLog';
import { sendPushNotification } from '../utils/push';

const BOUNTY_ARTIFACTS = [
  'sussurros_sabios',
  'becker_alquimista',
  'olhar_monarca',
  'elixir_dourado',
  'pocao_cura',
  'relogio_tempo',
  'anel_serpente',
  'lagrima_fenix',
  'bandeira_guerra',
  'orbe_perspicacia',
  'chave_mestra',
  'cetro_exilio',
  'sapatilhas_veloz',
  'martelo_magico',
  'poeira_estelar',
  'pergaminho_oraculo',
  'escudo_arcano',
  'bracelete_cristal',
  'bolsa_sorte',
  'mao_midas',
  'pena_escriba',
  'varinha_pinheiro',
  'chapeu_arcanista',
  'chronomancia_netheril'
];

async function sendBugEmail(bugDetail: any) {
  const { developerEmail = 'beninigmal@gmail.com', studentName, studentMatricula, turma, institution, description, imageUrl, ticketCode } = bugDetail;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials not fully configured in env variables. Skipping actual email dispatch.');
    return;
  }

  // Resolve hostname to IPv4 beforehand to bypass Nodemailer's internal IPv6 preference
  let resolvedHost = process.env.SMTP_HOST;
  try {
    const ipList = await new Promise<string[]>((resolvePromise) => {
      dns.resolve4(resolvedHost, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          dns.lookup(resolvedHost, { family: 4 }, (err2, address) => {
            if (err2 || !address) resolvePromise([]);
            else resolvePromise([address]);
          });
        } else {
          resolvePromise(addresses);
        }
      });
    });
    if (ipList && ipList.length > 0) {
      resolvedHost = ipList[0];
    }
  } catch (err) {
    console.warn('⚠️ Failed to pre-resolve SMTP host to IPv4, relying on default host:', err);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        servername: process.env.SMTP_HOST,
        rejectUnauthorized: false
      }
    } as any);

    const attachments: any[] = [];
    if (imageUrl && imageUrl.startsWith('data:image')) {
      const parts = imageUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const base64Data = parts[1];
      attachments.push({
        filename: `bug_${ticketCode.replace(/[\[\]]/g, '')}.jpg`,
        content: Buffer.from(base64Data, 'base64'),
        contentType: contentType
      });
    }

    const mailOptions = {
      from: `"Solen Bounty Hunter" <${process.env.SMTP_USER}>`,
      to: developerEmail,
      subject: `${ticketCode} Novo Bug Reportado por ${studentName}`,
      attachments,
      html: `
        <h2>🚨 Caçador de Bugs - Novo Relato (${ticketCode})</h2>
        <p><strong>Caçador (Aluno):</strong> ${studentName} (${studentMatricula})</p>
        <p><strong>Turma:</strong> ${turma}</p>
        <p><strong>Instituição:</strong> ${institution}</p>
        <p><strong>Descrição do Bug:</strong></p>
        <blockquote style="background: #f4f4f4; padding: 15px; border-left: 5px solid #00f3ff;">
          ${description.replace(/\n/g, '<br/>')}
        </blockquote>
        ${imageUrl ? `<p><strong>Anexo:</strong> Screenshot enviado em anexo a este e-mail.</p>` : '<p><em>Nenhuma imagem anexada.</em></p>'}
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully sent to ${developerEmail}`);
  } catch (err) {
    console.error('❌ Failed to send bug email:', err);
  }
}

export const bountyRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Require authentication for all bounty endpoints
  fastify.addHook('preValidation', fastify.authenticate);

  // Submit bug report (Student/Player)
  fastify.post<{ Body: { description: string; imageUrl?: string } }>('/report', async (request, reply) => {
    const { description, imageUrl } = request.body;
    if (!description || description.trim().length < 5) {
      return reply.status(400).send({ error: 'Por favor, descreva o bug detalhadamente (mínimo 5 caracteres).' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        include: { turma: true }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      const turmaNome = user.turma?.nome || 'Sem Turma';
      const instituicao = user.instituicao || 'Solen';

      // Sorteia a recompensa no momento da criação para manter a coerência
      const BOUNTY_PREMIUM_ARTIFACTS = [
        'sussurros_sabios',
        'becker_alquimista',
        'olhar_monarca',
        'elixir_dourado',
        'pocao_cura',
        'relogio_tempo',
        'anel_serpente',
        'lagrima_fenix',
        'bandeira_guerra',
        'orbe_perspicacia',
        'chave_mestra',
        'cetro_exilio',
        'chapeu_arcanista',
        'chronomancia_netheril'
      ];
      const randomArtifactId = BOUNTY_PREMIUM_ARTIFACTS[Math.floor(Math.random() * BOUNTY_PREMIUM_ARTIFACTS.length)];

      const bug = await prisma.bountyBug.create({
        data: {
          userId: user.id,
          description: description.trim(),
          turmaNome,
          instituicao,
          imageUrl: imageUrl || null,
          artifactAwarded: randomArtifactId,
          status: 'PENDING'
        }
      });

      const ticketCode = `[BUG-${bug.id.slice(0, 8).toUpperCase()}]`;

      // Fire and forget email notify
      sendBugEmail({
        studentName: user.nome,
        studentMatricula: user.matricula,
        turma: turmaNome,
        institution: instituicao,
        description: description.trim(),
        imageUrl: imageUrl || null,
        ticketCode
      }).catch(err => console.error('Error sending bug email async:', err));

      return reply.status(201).send({ message: 'Bug reportado com sucesso! Aguarde a análise da Matrix.', bug });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao processar reporte de bug.' });
    }
  });

  // Get active wanted bugs (wanted posters for students/all roles)
  fastify.get('/active', async (request, reply) => {
    try {
      const bugs = await prisma.bountyBug.findMany({
        include: {
          user: {
            select: {
              nome: true,
              matricula: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.status(200).send(bugs);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao listar mural de procurados.' });
    }
  });

  // Get pending bug reports for Admin/Moderation view
  fastify.get('/pending', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito ao Administrador/Arquiteto.' });
    }

    try {
      const bugs = await prisma.bountyBug.findMany({
        include: {
          user: {
            select: {
              nome: true,
              matricula: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.status(200).send(bugs);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar relatos pendentes.' });
    }
  });

  // Approve bug report & award random artifact
  fastify.post<{ Params: { id: string } }>('/:id/approve', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito ao Administrador/Arquiteto.' });
    }

    const { id } = request.params;

    try {
      const bug = await prisma.bountyBug.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!bug) {
        return reply.status(404).send({ error: 'Relato de bug não encontrado.' });
      }

      if (bug.status !== 'PENDING') {
        return reply.status(400).send({ error: `Este relato já possui o status: ${bug.status}` });
      }

      // Sorteia um artefato aleatório dentre Lendários e Épicos
      const BOUNTY_PREMIUM_ARTIFACTS = [
        'sussurros_sabios',
        'becker_alquimista',
        'olhar_monarca',
        'elixir_dourado',
        'pocao_cura',
        'relogio_tempo',
        'anel_serpente',
        'lagrima_fenix',
        'bandeira_guerra',
        'orbe_perspicacia',
        'chave_mestra',
        'cetro_exilio',
        'chapeu_arcanista',
        'chronomancia_netheril'
      ];
      const ARTIFACT_FRIENDLY_NAMES: Record<string, string> = {
        sussurros_sabios: '📜 Sussurros Sábios',
        becker_alquimista: '🧪 Becker do Alquimista',
        olhar_monarca: '👁️ Olhar do Monarca',
        elixir_dourado: '🏆 Elixir Dourado',
        pocao_cura: '🧪 Poção de Cura',
        relogio_tempo: '🕰️ Relógio Ganha Tempo',
        anel_serpente: '🐍 Anel da Serpente',
        lagrima_fenix: '💧 Lágrima da Fênix',
        bandeira_guerra: '🚩 Bandeira de Guerra',
        orbe_perspicacia: '🔮 Orbe de Perspicácia',
        chave_mestra: '🔑 Chave Mestra',
        cetro_exilio: '🚩 Cetro do Exílio',
        chapeu_arcanista: '🎩 Chapéu do Arcanista',
        chronomancia_netheril: 'Pedra de Chronomancia de Netheril',
      };

      const randomArtifactId = bug.artifactAwarded || BOUNTY_PREMIUM_ARTIFACTS[Math.floor(Math.random() * BOUNTY_PREMIUM_ARTIFACTS.length)];
      const friendlyName = ARTIFACT_FRIENDLY_NAMES[randomArtifactId] || randomArtifactId;

      // Executa alterações em transação
      const [updatedBug, giftedArtifact] = await prisma.$transaction([
        prisma.bountyBug.update({
          where: { id },
          data: { 
            status: 'APPROVED',
            artifactAwarded: randomArtifactId
          }
        }),
        prisma.giftedArtifact.create({
          data: {
            userId: bug.userId,
            artifactId: randomArtifactId
          }
        })
      ]);

      // Envia notificação push se houver token
      if (bug.user.expoPushToken) {
        sendPushNotification(
          bug.user.expoPushToken,
          '👾 Recompensa Bounty Hunter!',
          `Sua recompensa foi transferida! Você recebeu: ${friendlyName}`,
          { type: 'BOUNTY_AWARDED' }
        ).catch(console.error);
      }

      await logAction(
        'Aprovação de Bug (Bounty Hunter)',
        `Bug de ${bug.user.nome} aprovado. Artefato concedido: ${randomArtifactId}`,
        request.user.id,
        request.user.institutionId
      );

      return reply.status(200).send({
        message: 'Bug aprovado com sucesso! Artefato adicionado ao inventário do caçador.',
        bug: updatedBug,
        artifactAwarded: randomArtifactId
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao aprovar bug.' });
    }
  });

  // Reject bug report
  fastify.post<{ Params: { id: string } }>('/:id/reject', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito ao Administrador/Arquiteto.' });
    }

    const { id } = request.params;

    try {
      const bug = await prisma.bountyBug.findUnique({ where: { id } });

      if (!bug) {
        return reply.status(404).send({ error: 'Relato de bug não encontrado.' });
      }

      if (bug.status !== 'PENDING') {
        return reply.status(400).send({ error: `Este relato já possui o status: ${bug.status}` });
      }

      const updatedBug = await prisma.bountyBug.update({
        where: { id },
        data: { status: 'REJECTED' }
      });

      return reply.status(200).send({ message: 'Bug reprovado.', bug: updatedBug });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao rejeitar bug.' });
    }
  });

  // Mark bug report resolution as seen by reporter (Student)
  fastify.post<{ Params: { id: string } }>('/:id/seen', async (request, reply) => {
    const { id } = request.params;
    try {
      const bug = await prisma.bountyBug.findUnique({ where: { id } });
      if (!bug) {
        return reply.status(404).send({ error: 'Relato de bug não encontrado.' });
      }
      if (bug.userId !== request.user.id) {
        return reply.status(403).send({ error: 'Você só pode marcar seus próprios relatos como vistos.' });
      }
      const updatedBug = await prisma.bountyBug.update({
        where: { id },
        data: { seenByReporter: true }
      });
      return reply.status(200).send({ success: true, bug: updatedBug });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao marcar relato como visto.' });
    }
  });

  // Submit developer question/feedback about a bug (Apenas Admin/Arquiteto/Superadmin)
  fastify.post<{ Params: { id: string }; Body: { question: string } }>('/:id/question', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito ao Administrador.' });
    }

    const { id } = request.params;
    const { question } = request.body;

    if (!question || question.trim().length === 0) {
      return reply.status(400).send({ error: 'A pergunta não pode ser vazia.' });
    }

    try {
      const bug = await prisma.bountyBug.findUnique({ where: { id } });
      if (!bug) {
        return reply.status(404).send({ error: 'Relato de bug não encontrado.' });
      }

      const updatedBug = await prisma.bountyBug.update({
        where: { id },
        data: {
          devQuestion: question.trim(),
          seenByReporter: false
        }
      });

      // Dispara push notification para o aluno
      try {
        await sendPushNotification(
          bug.userId,
          'Dúvida sobre seu Bug Report',
          `O desenvolvedor enviou uma dúvida sobre seu relato [BUG-${id.slice(0, 8).toUpperCase()}].`
        );
      } catch (pushErr) {
        console.warn('Erro ao disparar notificação push da dúvida:', pushErr);
      }

      return reply.status(200).send({ message: 'Dúvida enviada com sucesso.', bug: updatedBug });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao registrar dúvida do desenvolvedor.' });
    }
  });

  // Submit student response/clarification to developer question (Apenas Aluno criador)
  fastify.post<{ Params: { id: string }; Body: { response: string } }>('/:id/response', async (request, reply) => {
    const { id } = request.params;
    const { response } = request.body;

    if (!response || response.trim().length === 0) {
      return reply.status(400).send({ error: 'A resposta não pode ser vazia.' });
    }

    try {
      const bug = await prisma.bountyBug.findUnique({ where: { id } });
      if (!bug) {
        return reply.status(404).send({ error: 'Relato de bug não encontrado.' });
      }

      if (bug.userId !== request.user.id) {
        return reply.status(403).send({ error: 'Você só pode responder a dúvidas dos seus próprios relatos.' });
      }

      const updatedBug = await prisma.bountyBug.update({
        where: { id },
        data: {
          studentResponse: response.trim()
        }
      });

      return reply.status(200).send({ message: 'Resposta registrada com sucesso.', bug: updatedBug });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao registrar resposta do aluno.' });
    }
  });
};
