import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const professorRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Primeiro verifica e decodifica o JWT
    await fastify.authenticate(request, reply);

    // Se o authenticate já mandou resposta de erro (401), interrompe aqui
    if (reply.sent) return;

    // Depois checa a role
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Mestre tem permissão.' });
    }
  });

  // Retorna todas as turmas com contagem de alunos
  fastify.get('/turmas', async (request, reply) => {
    try {
      const turmas = await prisma.turma.findMany({
        orderBy: { nome: 'asc' },
        include: {
          _count: { select: { users: true } }
        }
      });
      return reply.send(turmas);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao buscar turmas', details: error.message });
    }
  });

  // Retorna alunos por turma (para o radar de XP)
  fastify.get<{ Querystring: { turmaId: string } }>('/students', async (request, reply) => {
    const { turmaId } = request.query;
    if (!turmaId) return reply.status(400).send({ error: 'turmaId é obrigatório' });

    try {
      const students = await prisma.user.findMany({
        where: { turmaId, role: 'ALUNO' },
        select: { id: true, nome: true, nickname: true, xp: true, level: true, turno: true }
      });
      return reply.send(students);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao buscar alunos', details: error.message });
    }
  });

  // Recrutamento manual de Alunos (cria turma se não existir pelo nome)
  fastify.post<{ Body: { cpf: string; nome: string; nickname: string; turno: string; turmaNome: string } }>('/students', async (request, reply) => {
    const { cpf, nome, nickname, turno, turmaNome } = request.body;

    if (!cpf || !nome || !nickname || !turmaNome) {
      return reply.status(400).send({ error: 'Todos os campos são obrigatórios' });
    }

    try {
      // Cria ou acha a turma
      let turma = await prisma.turma.findUnique({ where: { nome: turmaNome } });
      if (!turma) {
        turma = await prisma.turma.create({ data: { nome: turmaNome } });
      }

      // Cria o aluno
      const user = await prisma.user.create({
        data: {
          cpf,
          nome,
          nickname,
          turno,
          role: 'ALUNO',
          turmaId: turma.id
        }
      });

      return reply.status(201).send(user);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'CPF ou Nickname já está em uso.' });
      }
      return reply.status(500).send({ error: 'Erro ao forjar aluno', details: error.message });
    }
  });
};
