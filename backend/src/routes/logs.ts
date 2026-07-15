import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const logsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const userRole = (request.user as any).role;
    const institutionId = (request.user as any).institutionId;
    const queryInstId = (request.query as any).institutionId;

    if (userRole !== 'ARQUITETO' && userRole !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    try {
      const targetInstitutionId = userRole === 'ADMIN' && queryInstId ? queryInstId : institutionId;
      
      const logs = await prisma.actionLog.findMany({
        where: targetInstitutionId ? { institutionId: targetInstitutionId } : {},
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
