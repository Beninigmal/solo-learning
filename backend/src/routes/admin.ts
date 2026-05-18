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
  fastify.post<{ Body: { matricula: string; nome: string; nickname?: string; instituicao?: string; novaMateria?: string } }>('/masters', async (request, reply) => {
    const { matricula, nome, nickname, instituicao, novaMateria } = request.body;

    if (!matricula || !nome) {
      return reply.status(400).send({ error: 'Matrícula e Nome são obrigatórios.' });
    }

    try {
      const defaultPassword = await bcrypt.hash('Solen2026', 10);
      
      // Se tiver nova matéria, criar ou buscar
      if (novaMateria) {
        await prisma.disciplina.upsert({
          where: { nome: novaMateria },
          update: {},
          create: { nome: novaMateria }
        });
      }

      const user = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase(),
          nome,
          nickname: nickname || null,
          role: 'PROFESSOR',
          password: defaultPassword,
          isFirstAccess: true,
          instituicao: instituicao || null
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
      select: { id: true, nome: true, nickname: true, matricula: true, instituicao: true, createdAt: true }
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

  // ─── GESTÃO DE VÍNCULOS ──────────────────────────────────────────────────

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
        }
      });

      return reply.status(201).send(turma);
    } catch (error: any) {
      if (error.code === 'P2002') return reply.status(400).send({ error: 'Já existe uma turma com este nome.' });
      return reply.status(500).send({ error: 'Erro ao criar turma.' });
    }
  });

  // Listar Turmas
  fastify.get('/turmas', async (request, reply) => {
    const turmas = await prisma.turma.findMany({
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(turmas);
  });

  // Listar Disciplinas
  fastify.get('/disciplinas', async (request, reply) => {
    const disciplinas = await prisma.disciplina.findMany({
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(disciplinas);
  });

  // Criar Vínculo (Turma + Disciplina + Professor)
  fastify.post<{ Body: { professorId: string; disciplinaId: string; turmaId: string } }>('/vinculos', async (request, reply) => {
    const { professorId, disciplinaId, turmaId } = request.body;

    if (!professorId || !disciplinaId || !turmaId) {
      return reply.status(400).send({ error: 'Professor, Disciplina e Turma são obrigatórios.' });
    }

    try {
      const vinculo = await prisma.turmaDisciplina.create({
        data: {
          professorId,
          disciplinaId,
          turmaId
        }
      });

      return reply.status(201).send({ message: 'Vínculo criado com sucesso!', vinculo });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Este professor já leciona esta disciplina para esta turma.' });
      }
      return reply.status(500).send({ error: 'Erro ao criar vínculo.' });
    }
  });
};
