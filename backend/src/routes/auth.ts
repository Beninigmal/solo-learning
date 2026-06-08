import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PrismaUserRepository } from '../infra/database/repositories/PrismaUserRepository';
import { LoginUseCase } from '../core/use-cases/auth/LoginUseCase';
import { FirstAccessUseCase } from '../core/use-cases/auth/FirstAccessUseCase';
import { AuthController } from '../presentation/controllers/AuthController';
import { prisma } from '../prisma';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userRepository = new PrismaUserRepository();
  const loginUseCase = new LoginUseCase(userRepository);
  const firstAccessUseCase = new FirstAccessUseCase(userRepository);
  const authController = new AuthController(loginUseCase, firstAccessUseCase, userRepository);

  fastify.post<{ Body: { matricula: string; password?: string } }>('/login', (req, rep) => authController.login(req, rep));
  
  fastify.post<{ Body: { nickname: string; newPassword: string } }>(
    '/first-access', 
    { preValidation: [fastify.authenticate] }, 
    (req, rep) => authController.firstAccess(req, rep)
  );
  
  fastify.get(
    '/me', 
    { preValidation: [fastify.authenticate] }, 
    (req, rep) => authController.me(req, rep)
  );
  
  fastify.delete(
    '/delete-account', 
    { preValidation: [fastify.authenticate] }, 
    (req, rep) => authController.deleteAccount(req, rep)
  );

  fastify.post<{ Body: { motivo: string; email: string } }>(
    '/request-delete-account',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { motivo, email } = request.body;
      if (!motivo || !email) {
        return reply.status(400).send({ error: 'Motivo e e-mail são obrigatórios.' });
      }
      try {
        const userId = (request.user as any).id;
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
        if (!user) {
          return reply.status(404).send({ error: 'Usuário não encontrado.' });
        }
        const requestDel = await prisma.deleteAccountRequest.create({
          data: {
            userId: user.id,
            nome: user.nome,
            matricula: user.matricula,
            role: user.role,
            motivo: motivo.trim(),
            email: email.trim(),
            instituicao: user.instituicao || ''
          }
        });
        return reply.status(200).send({ message: 'Solicitação de exclusão de conta enviada com sucesso.', request: requestDel });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao solicitar exclusão de conta.' });
      }
    }
  );

  fastify.post<{ Body: { expoPushToken: string } }>(
    '/push-token',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { expoPushToken } = request.body;
      if (!expoPushToken) return reply.status(400).send({ error: 'expoPushToken é obrigatório.' });
      try {
        await userRepository.update((request.user as any).id, { expoPushToken });
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
        const userId = (request.user as any).id;
        const user = await userRepository.findById(userId);
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' });

        if (user.role === 'ALUNO' && !parentConsentName?.trim()) {
          return reply.status(400).send({ error: 'O nome do responsável é obrigatório para caçadores menores de idade.' });
        }

        const updatedUser = await userRepository.update(userId, {
          acceptedTermsAt: new Date(),
          parentConsentName: user.role === 'ALUNO' && parentConsentName ? parentConsentName.trim() : null
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
};
