import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../prisma';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret_solen_key_123'
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      if (request.user && request.user.id) {
        // Atualiza o timestamp de atividade em background (fire-and-forget)
        prisma.user.update({
          where: { id: request.user.id },
          data: { lastActiveAt: new Date() }
        }).catch(err => console.error('Erro ao atualizar lastActiveAt:', err));
      }
    } catch (err) {
      reply.status(401).send({ error: 'Não autorizado.' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      role: string;
      nome: string;
      instituicao?: string | null;
      turmaId?: string | null;
      turno?: string | null;
    }
  }
}
