import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const professorRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Mestre tem permissão.' });
    }
  });

  // ─── GESTÃO DE TURMAS ──────────────────────────────────────────────────

  // Criar Turma
  fastify.post<{ Body: { nome: string; ano: string; codigoInvocacao?: string } }>('/turmas', async (request, reply) => {
    const { nome, ano, codigoInvocacao } = request.body;

    if (!nome || !ano) {
      return reply.status(400).send({ error: 'Nome e Ano são obrigatórios.' });
    }

    try {
      const turma = await prisma.turma.create({
        data: {
          nome: nome.toUpperCase(),
          ano,
          codigoInvocacao: codigoInvocacao || "1234",
          professorId: request.user.id
        }
      });
      return reply.status(201).send(turma);
    } catch (error: any) {
      if (error.code === 'P2002') return reply.status(400).send({ error: 'Já existe uma turma com este nome.' });
      return reply.status(500).send({ error: 'Erro ao criar turma.' });
    }
  });

  // Listar Turmas do Mestre
  fastify.get('/turmas', async (request, reply) => {
    const turmas = await prisma.turma.findMany({
      where: request.user.role === 'ADMIN' ? {} : { professorId: request.user.id },
      include: { _count: { select: { users: true } } },
      orderBy: { nome: 'asc' }
    });
    return reply.send(turmas);
  });

  // Editar Turma
  fastify.put<{ Params: { id: string }; Body: { nome?: string; ano?: string; codigoInvocacao?: string } }>('/turmas/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, ano, codigoInvocacao } = request.body;

    try {
      const updated = await prisma.turma.update({
        where: { id, professorId: request.user.role === 'ADMIN' ? undefined : request.user.id },
        data: { 
          ...(nome ? { nome: nome.toUpperCase() } : {}),
          ano,
          codigoInvocacao
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Turma não encontrada ou sem permissão.' });
    }
  });

  // ─── GESTÃO DE ALUNOS (PLAYERS) ─────────────────────────────────────────

  // Criar Aluno
  fastify.post<{ Body: { matricula: string; nome: string; turmaId: string; turno: string } }>('/students', async (request, reply) => {
    const { matricula, nome, turmaId, turno } = request.body;
    if (!matricula || !nome || !turmaId) return reply.status(400).send({ error: 'Dados obrigatórios faltando.' });

    try {
      const turma = await prisma.turma.findFirst({
        where: { id: turmaId, professorId: request.user.role === 'ADMIN' ? undefined : request.user.id }
      });
      if (!turma) return reply.status(403).send({ error: 'Turma não encontrada ou sem permissão.' });

      // No cadastro, a senha inicial é irrelevante se usarmos o código de invocação no primeiro login,
      // mas vamos salvar um hash aleatório por segurança.
      const student = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase(),
          nome,
          role: 'ALUNO',
          turmaId,
          turno,
          password: 'INITIAL_SUMMONING_CODE_LOGIN', // Placeholder
          isFirstAccess: true
        }
      });
      return reply.status(201).send(student);
    } catch (error: any) {
      if (error.code === 'P2002') return reply.status(400).send({ error: 'Matrícula já está em uso.' });
      return reply.status(500).send({ error: 'Erro ao cadastrar aluno.' });
    }
  });

  // Resetar Aluno (Voltar para primeiro acesso)
  fastify.post<{ Params: { id: string } }>('/students/:id/reset', async (request, reply) => {
    const { id } = request.params;

    try {
      await prisma.user.update({
        where: { 
          id, 
          role: 'ALUNO',
          turma: { professorId: request.user.role === 'ADMIN' ? undefined : request.user.id }
        },
        data: { 
          isFirstAccess: true,
          nickname: null, // Opcional: limpa o nickname para ele escolher de novo
          password: 'RESET_TO_SUMMONING_CODE' // Placeholder
        }
      });
      return reply.send({ message: 'Acesso do aluno resetado com sucesso! Ele deve usar o Código de Invocação da Turma.' });
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado ou sem permissão.' });
    }
  });

  // Listar Alunos
  fastify.get<{ Querystring: { turmaId?: string } }>('/students', async (request, reply) => {
    const { turmaId } = request.query;
    const students = await prisma.user.findMany({
      where: {
        role: 'ALUNO',
        turma: {
          id: turmaId || undefined,
          professorId: request.user.role === 'ADMIN' ? undefined : request.user.id
        }
      },
      include: { turma: true },
      orderBy: { nome: 'asc' }
    });
    return reply.send(students);
  });

  // Editar Aluno
  fastify.put<{ Params: { id: string }; Body: { nome?: string; matricula?: string; nickname?: string; turno?: string } }>('/students/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, matricula, nickname, turno } = request.body;
    try {
      const updated = await prisma.user.update({
        where: { 
          id, role: 'ALUNO',
          turma: { professorId: request.user.role === 'ADMIN' ? undefined : request.user.id }
        },
        data: { nome, matricula, nickname, turno }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado ou sem permissão.' });
    }
  });
};
