import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // Rota restrita para ADMINs
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Arquiteto tem permissão.' });
    }
  });

  // Cadastro manual de usuários (Professores ou Alunos)
  fastify.post<{ Body: { cpf: string; nome: string; nickname?: string; role: string; turmaId?: string } }>('/users', async (request, reply) => {
    const { cpf, nome, nickname, role, turmaId } = request.body;

    if (!cpf || !nome || !role) {
      return reply.status(400).send({ error: 'CPF, Nome e Role são obrigatórios.' });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { cpf } });
      if (existing) {
        return reply.status(400).send({ error: 'CPF já cadastrado no Sistema.' });
      }

      const user = await prisma.user.create({
        data: {
          cpf,
          nome,
          nickname,
          role,
          turmaId: turmaId || null
        }
      });

      return reply.status(201).send({ message: 'Usuário cadastrado com sucesso!', user });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao cadastrar usuário.' });
    }
  });

  // Listar usuários
  fastify.get('/users', async (request, reply) => {
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, cpf: true, role: true, level: true }
    });
    return reply.status(200).send(users);
  });
};
