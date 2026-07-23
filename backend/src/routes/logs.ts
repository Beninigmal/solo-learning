import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const logsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const userRole = (request.user as any).role;
    const institutionId = (request.user as any).institutionId;
    const { institutionId: queryInstId, search, page = '1', limit = '20' } = request.query as any;

    if (userRole !== 'ARQUITETO' && userRole !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    try {
      const targetInstitutionId = userRole === 'ADMIN' && queryInstId ? queryInstId : (userRole === 'ARQUITETO' ? institutionId : undefined);

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = {};
      if (targetInstitutionId) {
        whereClause.institutionId = targetInstitutionId;
      }

      if (search && search.trim()) {
        const term = search.trim();
        whereClause.OR = [
          { action: { contains: term, mode: 'insensitive' } },
          { details: { contains: term, mode: 'insensitive' } },
          { user: { is: { nome: { contains: term, mode: 'insensitive' } } } },
          { user: { is: { matricula: { contains: term, mode: 'insensitive' } } } }
        ];
      }

      const total = await prisma.actionLog.count({ where: whereClause });
      const logs = await prisma.actionLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { user: { select: { nome: true, matricula: true, role: true } } }
      });

      return reply.send({
        logs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar logs.', details: error.message });
    }
  });
};
