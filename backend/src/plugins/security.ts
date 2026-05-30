import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../prisma';

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('validateInstitution', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Super Admins (ADMIN role) are global and bypass all tenant checks
      if (request.user?.role === 'ADMIN') {
        return;
      }

      let userInstitutionId = request.user?.institutionId;
      if (!userInstitutionId && request.user?.instituicao) {
        const inst = await prisma.institution.findFirst({
          where: { nome: { equals: request.user.instituicao, mode: 'insensitive' } }
        });
        if (inst) {
          userInstitutionId = inst.id;
        }
      }

      if (!userInstitutionId) {
        return reply.status(403).send({ error: 'Acesso negado: Usuário sem instituição vinculada.' });
      }

      const params = (request.params as Record<string, string | undefined>) || {};
      const body = (request.body as Record<string, any> | null) || {};
      const query = (request.query as Record<string, any> | null) || {};

      // Detect IDs from params, body, or query
      const turmaId = params.turmaId || 
                      (params.id && request.url?.includes('/turmas') ? params.id : undefined) || 
                      body.turmaId || 
                      query.turmaId;

      const disciplinaId = params.disciplinaId || 
                            (params.id && request.url?.includes('/disciplinas') ? params.id : undefined) || 
                            body.disciplinaId || 
                            query.disciplinaId;

      const targetUserId = params.userId || 
                           (params.id && (request.url?.includes('/students') || request.url?.includes('/masters')) ? params.id : undefined) || 
                           body.userId || 
                           query.userId;

      // 2. Validate TurmaId
      if (turmaId) {
        const turma = await prisma.turma.findUnique({
          where: { id: turmaId },
          select: { institutionId: true, instituicao: true }
        });
        if (turma) {
          const hasRelMatch = !!(turma.institutionId && userInstitutionId && turma.institutionId === userInstitutionId);
          const hasStrMatch = !!(turma.instituicao && request.user.instituicao && turma.instituicao === request.user.instituicao);
          if (!hasRelMatch && !hasStrMatch) {
            return reply.status(403).send({ error: 'Acesso negado: Esta guilda/turma pertence a outra instituição.' });
          }
        }
      }

      // 3. Validate DisciplinaId
      if (disciplinaId) {
        const disciplina = await prisma.disciplina.findUnique({
          where: { id: disciplinaId },
          select: { institutionId: true, instituicao: true }
        });
        if (disciplina) {
          const isGlobal = !disciplina.institutionId && !disciplina.instituicao;
          if (!isGlobal) {
            const hasRelMatch = !!(disciplina.institutionId && userInstitutionId && disciplina.institutionId === userInstitutionId);
            const hasStrMatch = !!(disciplina.instituicao && request.user.instituicao && 
              disciplina.instituicao.toLowerCase().trim() === request.user.instituicao.toLowerCase().trim());
            if (!hasRelMatch && !hasStrMatch) {
              return reply.status(403).send({ error: 'Acesso negado: Esta matéria pertence a outra instituição.' });
            }
          }
        }
      }

      // 4. Validate targetUserId
      if (targetUserId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { institutionId: true, instituicao: true }
        });
        if (targetUser) {
          const hasRelMatch = !!(targetUser.institutionId && userInstitutionId && targetUser.institutionId === userInstitutionId);
          const hasStrMatch = !!(targetUser.instituicao && request.user.instituicao && targetUser.instituicao === request.user.instituicao);
          if (!hasRelMatch && !hasStrMatch) {
            return reply.status(403).send({ error: 'Acesso negado: Este caçador/usuário pertence a outra instituição.' });
          }
        }
      }
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro de validação de segurança de dados.' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    validateInstitution: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
