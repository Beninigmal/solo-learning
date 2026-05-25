import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // Middleware de autorização para ARQUITETO
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', fastify.validateInstitution);
  
  fastHookUserRoleCheck: fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Arquiteto tem permissão.' });
    }
    if (!request.user.instituicao) {
      return reply.status(403).send({ error: 'Acesso negado. Sua conta de Arquiteto não possui instituição associada.' });
    }
  });

  // ─── GESTÃO DE MESTRES ──────────────────────────────────────────────────

  // Criar Mestre
  fastify.post<{ Body: { matricula: string; nome: string; nickname?: string; novaMateria?: string } }>('/masters', async (request, reply) => {
    const { matricula, nome, nickname, novaMateria } = request.body;
    const instituicao = request.user.instituicao!;

    if (!matricula || !nome) {
      return reply.status(400).send({ error: 'Matrícula e Nome são obrigatórios.' });
    }

    try {
      const defaultPassword = await bcrypt.hash('Solen2026', 10);
      
      // Se tiver nova matéria, criar ou buscar
      if (novaMateria) {
        // Busca se já existe uma matéria com o mesmo nome na instituição
        const existingDisc = await prisma.disciplina.findFirst({
          where: { nome: novaMateria.trim(), instituicao }
        });
        if (!existingDisc) {
          await prisma.disciplina.create({
            data: { nome: novaMateria.trim(), instituicao }
          });
        }
      }

      const user = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase().trim(),
          nome: nome.trim(),
          nickname: nickname ? nickname.trim() : null,
          role: 'PROFESSOR',
          password: defaultPassword,
          isFirstAccess: true,
          instituicao
        }
      });

      return reply.status(201).send({ message: 'Mestre cadastrado com sucesso!', user });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Matrícula ou Nickname já cadastrada.' });
      }
      return reply.status(500).send({ error: 'Erro ao cadastrar mestre.' });
    }
  });

  // Listar Mestres da Instituição
  fastify.get('/masters', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const masters = await prisma.user.findMany({
      where: { role: 'PROFESSOR', instituicao },
      select: { id: true, nome: true, nickname: true, matricula: true, instituicao: true, createdAt: true }
    });
    return reply.status(200).send(masters);
  });

  // Editar Mestre da Instituição
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string } }>('/masters/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname } = request.body;
    const instituicao = request.user.instituicao!;

    try {
      const updated = await prisma.user.update({
        where: { id, role: 'PROFESSOR', instituicao },
        data: { 
          nome: nome ? nome.trim() : undefined, 
          nickname: nickname ? nickname.trim() : undefined 
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Mestre não encontrado na sua instituição.' });
    }
  });

  // ─── GESTÃO GLOBAL DE ALUNOS ─────────────────────────────────────────────

  // Listar todos os alunos da Instituição (opcionalmente filtrado por turma)
  fastify.get<{ Querystring: { turmaId?: string } }>('/students', async (request, reply) => {
    const { turmaId } = request.query;
    const instituicao = request.user.instituicao!;
    const students = await prisma.user.findMany({
      where: { 
        role: 'ALUNO',
        instituicao,
        ...(turmaId ? { turmaId } : {})
      },
      include: { turma: true },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(students);
  });

  // Editar Aluno da Instituição
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string; turmaId?: string } }>('/students/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname, turmaId } = request.body;
    const instituicao = request.user.instituicao!;

    try {
      // Verificar se a turma pertence à instituição se estiver trocando
      if (turmaId) {
        const targetTurma = await prisma.turma.findFirst({
          where: { id: turmaId, instituicao }
        });
        if (!targetTurma) {
          return reply.status(400).send({ error: 'Turma de destino inválida ou pertence a outra instituição.' });
        }
      }

      const updated = await prisma.user.update({
        where: { id, role: 'ALUNO', instituicao },
        data: { 
          nome: nome ? nome.trim() : undefined, 
          nickname: nickname ? nickname.trim() : undefined,
          ...(turmaId !== undefined ? { turmaId: turmaId || null } : {})
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado na sua instituição.' });
    }
  });

  // ─── GESTÃO DE VÍNCULOS ──────────────────────────────────────────────────

  // Criar Turma na Instituição
  fastify.post<{ Body: { nome: string; ano: string; codigoInvocacao?: string } }>('/turmas', async (request, reply) => {
    const { nome, ano, codigoInvocacao } = request.body;
    const instituicao = request.user.instituicao!;

    if (!nome || !ano) {
      return reply.status(400).send({ error: 'Nome e Ano são obrigatórios.' });
    }

    try {
      const formattedNome = nome.toUpperCase().trim();

      // Garantir unicidade de nome dentro da mesma instituição
      const exists = await prisma.turma.findFirst({
        where: { nome: formattedNome, instituicao }
      });
      if (exists) {
        return reply.status(400).send({ error: 'Já existe uma turma com este nome na sua escola.' });
      }

      const turma = await prisma.turma.create({
        data: {
          nome: formattedNome,
          ano: ano.trim(),
          codigoInvocacao: codigoInvocacao ? codigoInvocacao.trim() : "1234",
          instituicao
        }
      });

      return reply.status(201).send(turma);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao criar turma.' });
    }
  });

  // Listar Turmas da Instituição
  fastify.get('/turmas', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const turmas = await prisma.turma.findMany({
      where: { instituicao },
      include: {
        users: {
          where: { role: 'ALUNO' },
          orderBy: { nome: 'asc' }
        },
        turmaDisciplinas: {
          include: {
            professor: {
              select: {
                id: true,
                nome: true,
                nickname: true,
                matricula: true
              }
            },
            disciplina: true
          }
        }
      },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(turmas);
  });

  // Listar Disciplinas da Instituição
  fastify.get('/disciplinas', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const disciplinas = await prisma.disciplina.findMany({
      where: { instituicao },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(disciplinas);
  });

  // Criar Vínculo na Instituição (Turma + Disciplina + Professor)
  fastify.post<{ Body: { professorId: string; disciplinaId: string; turmaId: string } }>('/vinculos', async (request, reply) => {
    const { professorId, disciplinaId, turmaId } = request.body;
    const instituicao = request.user.instituicao!;

    if (!professorId || !disciplinaId || !turmaId) {
      return reply.status(400).send({ error: 'Professor, Disciplina e Turma são obrigatórios.' });
    }

    try {
      // Validar que todos os elementos pertencem à instituição do Arquiteto
      const p = await prisma.user.findFirst({ where: { id: professorId, role: 'PROFESSOR', instituicao } });
      const d = await prisma.disciplina.findFirst({ where: { id: disciplinaId, instituicao } });
      const t = await prisma.turma.findFirst({ where: { id: turmaId, instituicao } });

      if (!p || !d || !t) {
        return reply.status(400).send({ error: 'Os elementos selecionados devem pertencer à mesma instituição.' });
      }

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

  // Excluir Vínculo (Turma + Disciplina + Professor)
  fastify.delete<{ Params: { id: string } }>('/vinculos/:id', async (request, reply) => {
    const { id } = request.params;
    const instituicao = request.user.instituicao!;

    try {
      const vinculo = await prisma.turmaDisciplina.findFirst({
        where: { id, turma: { instituicao } }
      });

      if (!vinculo) {
        return reply.status(404).send({ error: 'Vínculo não encontrado.' });
      }

      await prisma.turmaDisciplina.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Vínculo removido com sucesso!' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao remover vínculo.' });
    }
  });
};
