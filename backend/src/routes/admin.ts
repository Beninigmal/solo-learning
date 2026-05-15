import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // Middleware de autorização para ADMIN
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Arquiteto tem permissão.' });
    }
  });

  // ─── GESTÃO DE MESTRES ──────────────────────────────────────────────────

  // Criar Mestre
  fastify.post<{ Body: { matricula: string; nome: string; nickname?: string } }>('/masters', async (request, reply) => {
    const { matricula, nome, nickname } = request.body;

    if (!matricula || !nome) {
      return reply.status(400).send({ error: 'Matrícula e Nome são obrigatórios.' });
    }

    try {
      const defaultPassword = await bcrypt.hash('Solen2026', 10);
      const user = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase(),
          nome,
          nickname: nickname || null,
          role: 'PROFESSOR',
          password: defaultPassword,
          isFirstAccess: true
        }
      });

      return reply.status(201).send({ message: 'Mestre cadastrado com sucesso!', user });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Matrícula já cadastrada.' });
      }
      return reply.status(500).send({ error: 'Erro ao cadastrar mestre.' });
    }
  });

  // Listar Mestres
  fastify.get('/masters', async (request, reply) => {
    const masters = await prisma.user.findMany({
      where: { role: 'PROFESSOR' },
      select: { id: true, nome: true, nickname: true, matricula: true, createdAt: true }
    });
    return reply.status(200).send(masters);
  });

  // Editar Mestre
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string } }>('/masters/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname } = request.body;

    try {
      const updated = await prisma.user.update({
        where: { id, role: 'PROFESSOR' },
        data: { nome, nickname }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Mestre não encontrado.' });
    }
  });

  // ─── GESTÃO GLOBAL DE ALUNOS ─────────────────────────────────────────────

  // Listar todos os alunos (opcionalmente filtrado por turma)
  fastify.get<{ Querystring: { turmaId?: string } }>('/students', async (request, reply) => {
    const { turmaId } = request.query;
    const students = await prisma.user.findMany({
      where: { 
        role: 'ALUNO',
        ...(turmaId ? { turmaId } : {})
      },
      include: { turma: true },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(students);
  });

  // Editar Aluno (Arquiteto)
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string } }>('/students/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname } = request.body;

    try {
      const updated = await prisma.user.update({
        where: { id, role: 'ALUNO' },
        data: { nome, nickname }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado.' });
    }
  });
};
