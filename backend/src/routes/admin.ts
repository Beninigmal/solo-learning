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
  fastify.post<{ Body: { matricula: string; nome: string; nickname?: string; novaMateria?: string; maxAulasSemanais?: number } }>('/masters', async (request, reply) => {
    const { matricula, nome, nickname, novaMateria, maxAulasSemanais } = request.body;
    const instituicao = request.user.instituicao!;

    if (!matricula || !nome) {
      return reply.status(400).send({ error: 'Matrícula e Nome são obrigatórios.' });
    }

    try {
      if (nickname) {
        const existingWithNick = await prisma.user.findFirst({
          where: {
            nickname: { equals: nickname.trim(), mode: 'insensitive' },
            OR: [
              { institutionId: request.user.institutionId || 'NO_INSTITUTION' },
              { instituicao: request.user.instituicao || 'NO_INSTITUTION' }
            ]
          }
        });
        if (existingWithNick) {
          return reply.status(400).send({ error: 'Este nickname já está em uso na sua instituição.' });
        }
      }

      const defaultPassword = await bcrypt.hash('Solen2026', 10);
      
      // Se tiver nova matéria, criar ou buscar
      if (novaMateria) {
        // Busca se já existe uma matéria com o mesmo nome na instituição
        const existingDisc = await prisma.disciplina.findFirst({
          where: { nome: novaMateria.trim(), instituicao }
        });
        if (!existingDisc) {
          await prisma.disciplina.create({
            data: {
              nome: novaMateria.trim(),
              instituicao,
              institutionId: request.user.institutionId || null
            }
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
          instituicao,
          institutionId: request.user.institutionId || null,
          maxAulasSemanais: maxAulasSemanais !== undefined ? Math.max(0, maxAulasSemanais) : 16
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
      select: { id: true, nome: true, nickname: true, matricula: true, instituicao: true, createdAt: true, maxAulasSemanais: true }
    });
    return reply.status(200).send(masters);
  });

  // Editar Mestre da Instituição
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string; maxAulasSemanais?: number } }>('/masters/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname, maxAulasSemanais } = request.body;
    const instituicao = request.user.instituicao!;

    try {
      const updated = await prisma.user.update({
        where: { id, role: 'PROFESSOR', instituicao },
        data: { 
          nome: nome ? nome.trim() : undefined, 
          nickname: nickname ? nickname.trim() : undefined,
          maxAulasSemanais: maxAulasSemanais !== undefined ? Math.max(0, maxAulasSemanais) : undefined
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
          instituicao,
          institutionId: request.user.institutionId || null
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

  // ─── GESTÃO DE RECRUTAMENTO DE ALUNOS (ARQUITETO) ────────────────────────

  // Criar Aluno (ou associar existente)
  fastify.post<{ Body: { matricula: string; nome: string; turmaId: string; turno: string } }>('/students', async (request, reply) => {
    const { matricula, nome, turmaId, turno } = request.body;
    if (!matricula || !nome || !turmaId) return reply.status(400).send({ error: 'Dados obrigatórios faltando.' });

    try {
      const turma = await prisma.turma.findFirst({
        where: { 
          id: turmaId,
          instituicao: request.user.instituicao
        }
      });
      if (!turma) return reply.status(403).send({ error: 'Turma não encontrada ou sem permissão.' });

      const existingStudent = await prisma.user.findUnique({
        where: { matricula: matricula.toLowerCase().trim() }
      });

      if (existingStudent) {
        // Atualiza a turma e turno do aluno existente
        const updatedStudent = await prisma.user.update({
          where: { id: existingStudent.id },
          data: {
            turmaId,
            turno,
            instituicao: request.user.instituicao,
            institutionId: request.user.institutionId || null
          }
        });
        return reply.status(200).send(updatedStudent);
      }

      const student = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase().trim(),
          nome: nome.trim(),
          role: 'ALUNO',
          turmaId,
          turno,
          password: 'INITIAL_SUMMONING_CODE_LOGIN', // Placeholder
          isFirstAccess: true,
          instituicao: request.user.instituicao,
          institutionId: request.user.institutionId || null
        }
      });
      return reply.status(201).send(student);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao processar cadastro de aluno.', details: error.message });
    }
  });

  // Cadastrar Alunos em Lote
  fastify.post<{ Body: { students: { nome: string; matricula: string; turno?: string }[]; turmaId: string } }>('/students/batch', async (request, reply) => {
    const { students, turmaId } = request.body;

    if (!students || !Array.isArray(students) || !turmaId) {
      return reply.status(400).send({ error: 'Lista de estudantes e turmaId são obrigatórios.' });
    }

    try {
      const turma = await prisma.turma.findFirst({
        where: { 
          id: turmaId,
          instituicao: request.user.instituicao
        }
      });

      if (!turma) {
        return reply.status(404).send({ error: 'Turma não encontrada ou sem permissão.' });
      }

      let createdCount = 0;
      let errors: string[] = [];

      for (const s of students) {
        if (!s.nome || !s.matricula) {
          errors.push(`Aluno sem nome ou matrícula ignorado.`);
          continue;
        }

        try {
          await prisma.user.create({
            data: {
              nome: s.nome.trim(),
              matricula: s.matricula.toLowerCase().trim(),
              role: 'ALUNO',
              turno: s.turno || 'MATUTINO',
              turmaId: turma.id,
              password: 'SUMMONING_CODE',
              isFirstAccess: true,
              instituicao: request.user.instituicao,
              institutionId: request.user.institutionId || null
            }
          });
          createdCount++;
        } catch (e: any) {
          if (e.code === 'P2002') {
            errors.push(`Matrícula ${s.matricula} já existe.`);
          } else {
            errors.push(`Erro ao criar ${s.nome}: ${e.message}`);
          }
        }
      }

      return reply.status(201).send({ 
        message: `${createdCount} alunos cadastrados com sucesso.`,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao processar lote.' });
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
          instituicao: request.user.instituicao
        },
        data: { 
          isFirstAccess: true,
          nickname: null,
          password: 'RESET_TO_SUMMONING_CODE'
        }
      });
      return reply.send({ message: 'Acesso do aluno resetado com sucesso! Ele deve usar o Código de Invocação da Turma.' });
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado ou sem permissão.' });
    }
  });
};
