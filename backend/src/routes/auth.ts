// Forçando restart do servidor após gerar prisma client
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // ─── POST /login ──────────────────────────────────────────────────────────
  fastify.post<{ Body: { matricula: string; password?: string; role?: string } }>('/login', async (request, reply) => {
    const { matricula, password, role } = request.body;

    if (!matricula || !password) {
      return reply.status(400).send({ error: 'Matrícula e Senha são obrigatórios.' });
    }

    try {
      const searchKey = matricula.trim();
      const isNickname = searchKey.startsWith('@');
      const cleanKey = isNickname ? searchKey.substring(1) : searchKey;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { matricula: { equals: cleanKey, mode: 'insensitive' } },
            { nickname: { equals: cleanKey, mode: 'insensitive' } }
          ]
        },
        include: { turma: true }
      });

      if (!user) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' });
      }

      if (user.blocked) {
        return reply.status(403).send({ error: 'Sua conta está bloqueada pelo Administrador.' });
      }



      // Se for o PRIMEIRO ACESSO de um ALUNO, a senha é o Código de Invocação da Turma
      if (user.role === 'ALUNO' && user.isFirstAccess) {
        if (!user.turma || !user.turma.codigoInvocacao) {
          return reply.status(500).send({ error: 'Erro na configuração da turma. Contate o mestre.' });
        }

        // No primeiro acesso, comparamos com o código de invocação direto (texto puro ou hash?)
        // O usuário disse "o código de invocação para todos de uma vez", sugerindo algo simples.
        if (password !== user.turma.codigoInvocacao) {
          return reply.status(401).send({ error: 'Código de Invocação inválido.' });
        }
      } else {
        // Acesso normal ou Mestre/Admin: validar hash da senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return reply.status(401).send({ error: 'Credenciais inválidas.' });
        }
      }

      // Gera o token JWT
      const token = fastify.jwt.sign({
        id: user.id,
        nome: user.nome,
        role: user.role,
        instituicao: user.instituicao,
        institutionId: user.institutionId,
        turmaId: user.turmaId,
        isFirstAccess: user.isFirstAccess
      }, { expiresIn: '7d' });

      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          nickname: user.nickname,
          role: user.role,
          instituicao: user.instituicao,
          xp: user.xp,
          level: user.level,
          isFirstAccess: user.isFirstAccess,
          acceptedTermsAt: user.acceptedTermsAt,
          parentConsentName: user.parentConsentName
        }
      });

    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: `Erro interno ao autenticar: ${error.message}` });
    }
  });

  // ─── POST /first-access ────────────────────────────────────────────────────
  fastify.post<{ Body: { nickname: string; newPassword: string } }>(
    '/first-access',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { nickname, newPassword } = request.body;

      if (!nickname || !newPassword) {
        return reply.status(400).send({ error: 'Nickname e Nova Senha são obrigatórios.' });
      }

      if (newPassword.length < 4 || newPassword.length > 12) {
        return reply.status(400).send({ error: 'A senha deve ter entre 4 e 12 caracteres.' });
      }

      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await prisma.user.update({
          where: { id: request.user.id },
          data: {
            nickname,
            password: hashedPassword,
            isFirstAccess: false
          }
        });

        return reply.status(200).send({
          message: 'Perfil atualizado com sucesso!',
          user: {
            id: updatedUser.id,
            nickname: updatedUser.nickname,
            isFirstAccess: false
          }
        });

      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: 'Este nickname já está em uso.' });
        }
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao atualizar primeiro acesso.' });
      }
    }
  );
  
  fastify.get('/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { turma: true }
    });
    return reply.status(200).send({ user });
  });

  fastify.post<{ Body: { expoPushToken: string } }>(
    '/push-token',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { expoPushToken } = request.body;
      if (!expoPushToken) return reply.status(400).send({ error: 'expoPushToken é obrigatório.' });
      try {
        await prisma.user.update({ where: { id: request.user.id }, data: { expoPushToken } });
        return reply.status(200).send({ ok: true });
      } catch (error: any) {
        return reply.status(500).send({ error: 'Erro ao salvar push token.' });
      }
    }
  );

  fastify.post<{ Body: { parentConsentName?: string } }>(
    '/accept-terms',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const { parentConsentName } = request.body;
        const user = await prisma.user.findUnique({ where: { id: request.user.id } });
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

        if (user.role === 'ALUNO' && !parentConsentName?.trim()) {
          return reply.status(400).send({ error: 'O nome do responsável é obrigatório para caçadores menores de idade.' });
        }

        const updatedUser = await prisma.user.update({
          where: { id: request.user.id },
          data: {
            acceptedTermsAt: new Date(),
            parentConsentName: user.role === 'ALUNO' && parentConsentName ? parentConsentName.trim() : null
          }
        });

        return reply.status(200).send({
          message: 'Termos aceitos com sucesso!',
          user: {
            id: updatedUser.id,
            acceptedTermsAt: updatedUser.acceptedTermsAt,
            parentConsentName: updatedUser.parentConsentName
          }
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao aceitar termos de privacidade.' });
      }
    }
  );

  fastify.delete(
    '/delete-account',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

        console.log(`[DELETE ACCOUNT] Iniciando exclusão segura em cascata do usuário: ${user.nome} (${userId})`);

        await prisma.$transaction(async (tx) => {
          await tx.goldenAnswer.deleteMany({ where: { userId } });
          await tx.wrongAnswer.deleteMany({ where: { userId } });
          await tx.questDelivery.deleteMany({ where: { userId } });

          if (user.role === 'PROFESSOR') {
            await tx.disciplinaProfessor.deleteMany({ where: { professorId: userId } });
            await tx.turmaDisciplina.deleteMany({ where: { professorId: userId } });
            await tx.calendarEvent.deleteMany({ where: { professorId: userId } });
          }

          await tx.raidParticipant.deleteMany({ where: { userId } });
          await tx.user.delete({ where: { id: userId } });
        });

        console.log(`[DELETE ACCOUNT] Conta excluída com sucesso!`);
        return reply.status(200).send({ message: 'Conta e todos os dados associados foram completamente apagados do sistema.' });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro de integridade relacional ao apagar conta.', details: error.message });
      }
    }
  );
};
