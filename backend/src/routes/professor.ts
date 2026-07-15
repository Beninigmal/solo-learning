import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const professorRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', fastify.validateTenantStatus);
  fastify.addHook('preHandler', fastify.validateInstitution);
  
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'PROFESSOR' && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Mestre tem permissão.' });
    }
  });

  // ─── GESTÃO DE TURMAS ──────────────────────────────────────────────────



  // Listar Turmas do Mestre
  fastify.get('/turmas', async (request, reply) => {
    const turmas = await prisma.turma.findMany({
      where: request.user.role === 'ADMIN' ? {} : {
        turmaDisciplinas: {
          some: {
            professorId: request.user.id
          }
        }
      },
      include: { 
        _count: { select: { users: true } },
        turmaDisciplinas: {
          where: request.user.role === 'ADMIN' ? {} : {
            professorId: request.user.id
          },
          include: { disciplina: true }
        }
      },
      orderBy: { nome: 'asc' }
    });
    return reply.send(turmas);
  });

  // Editar Turma
  fastify.put<{ Params: { id: string }; Body: { nome?: string; ano?: string; codigoInvocacao?: string; nivel?: string } }>('/turmas/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, ano, codigoInvocacao, nivel } = request.body;

    try {
      const updated = await prisma.turma.update({
        where: { 
          id,
          ...(request.user.role !== 'ADMIN' ? {
            turmaDisciplinas: {
              some: {
                professorId: request.user.id
              }
            }
          } : {})
        },
        data: { 
          ...(nome ? { nome: nome.toUpperCase() } : {}),
          ano,
          codigoInvocacao,
          nivel
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Turma não encontrada ou sem permissão.' });
    }
  });

  // ─── GESTÃO DE ALUNOS (PLAYERS) ─────────────────────────────────────────

  // Listar Alunos
  fastify.get<{ Querystring: { turmaId?: string; unassigned?: string } }>('/students', async (request, reply) => {
    const { turmaId, unassigned } = request.query;
    
    const where: any = { role: 'ALUNO' };
    
    if (unassigned === 'true') {
      where.turmaId = null;
    } else if (turmaId) {
      where.turmaId = turmaId;
      if (request.user.role !== 'ADMIN') {
        where.turma = {
          turmaDisciplinas: {
            some: {
              professorId: request.user.id
            }
          }
        };
      }
    } else {
      if (request.user.role !== 'ADMIN') {
        where.turma = {
          turmaDisciplinas: {
            some: {
              professorId: request.user.id
            }
          }
        };
      }
    }

    const students = await prisma.user.findMany({
      where,
      include: { turma: true },
      orderBy: { nome: 'asc' }
    });

    if (request.user.role === 'PROFESSOR') {
      const vinculos = await prisma.turmaDisciplina.findMany({
        where: { professorId: request.user.id },
        include: { disciplina: true }
      });
      const professorDisciplinas = Array.from(new Map(vinculos.map(v => [v.disciplina.id, v.disciplina])).values());
      const disciplinaIds = professorDisciplinas.map(d => d.id);

      const deliveries = await prisma.questDelivery.findMany({
        where: {
          userId: { in: students.map(s => s.id) },
          quest: { disciplinaId: { in: disciplinaIds } },
          OR: [
            { status: 'COMPLETED' },
            { xpGanho: { gt: 0 } }
          ]
        },
        include: { quest: true }
      });

      const studentsWithXp = students.map(student => {
        const studentDeliveries = deliveries.filter(d => d.userId === student.id);
        const subjectXp: Record<string, number> = {};
        
        professorDisciplinas.forEach(d => {
          const ds = studentDeliveries.filter(del => del.quest.disciplinaId === d.id);
          subjectXp[d.nome] = ds.reduce((acc, curr) => acc + curr.xpGanho, 0);
        });

        return { ...student, subjectXp };
      });
      return reply.send(studentsWithXp);
    }

    return reply.send(students);
  });

  // Editar Aluno
  fastify.put<{ Params: { id: string }; Body: { nome?: string; matricula?: string; nickname?: string; turno?: string } }>('/students/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, matricula, nickname, turno } = request.body;
    try {
      const updated = await prisma.user.update({
        where: { 
          id, 
          role: 'ALUNO',
          turma: request.user.role === 'ADMIN' ? {} : {
            turmaDisciplinas: {
              some: {
                professorId: request.user.id
              }
            }
          }
        },
        data: { nome, matricula, nickname, turno }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado ou sem permissão.' });
    }
  });

  // Listar Disciplinas do Mestre
  fastify.get('/disciplinas', async (request, reply) => {
    const vinculos = await prisma.turmaDisciplina.findMany({
      where: { professorId: request.user.id },
      include: { disciplina: true }
    });
    
    // Remove duplicatas
    const disciplinas = Array.from(new Map(vinculos.map(v => [v.disciplina.id, v.disciplina])).values());
    
    console.log("RETURNING DISCIPLINAS:", disciplinas); return reply.send(disciplinas);
  });
};
