import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const logsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const userRole = (request.user as any).role;
    const instituicao = (request.user as any).instituicao;

    if (userRole !== 'ARQUITETO') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    try {
      const logs = await prisma.actionLog.findMany({
        where: { institutionId: instituicao },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { nome: true, matricula: true, role: true } } }
      });
      return reply.send(logs);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar logs.', details: error.message });
    }
  });
};
