import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const superadminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Hook de autenticação e verificação de role ADMIN (Super Admin)
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await fastify.authenticate(request, reply);
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Acesso restrito ao Super Administrador.' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
  });

  // ─── POST /institutions ───────────────────────────────────────────────────
  fastify.post<{ Body: { nome: string } }>('/institutions', async (request, reply) => {
    const { nome } = request.body;
    if (!nome || !nome.trim()) {
      return reply.status(400).send({ error: 'O nome da instituição é obrigatório.' });
    }

    try {
      const institution = await prisma.institution.create({
        data: { nome: nome.trim() }
      });
      return reply.status(201).send(institution);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Uma instituição com este nome já existe.' });
      }
      return reply.status(500).send({ error: 'Erro ao criar instituição.' });
    }
  });

  // ─── GET /institutions ────────────────────────────────────────────────────
  fastify.get('/institutions', async (request, reply) => {
    try {
      const institutions = await prisma.institution.findMany({
        orderBy: { nome: 'asc' }
      });
      return reply.status(200).send(institutions);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar instituições.' });
    }
  });

  // ─── POST /architects ─────────────────────────────────────────────────────
  fastify.post<{ Body: { matricula: string; nome: string; nickname?: string; password?: string; instituicao: string } }>(
    '/architects',
    async (request, reply) => {
      const { matricula, nome, nickname, password, instituicao } = request.body;

      if (!matricula || !nome || !instituicao) {
        return reply.status(400).send({ error: 'Campos obrigatórios: matrícula, nome e instituição.' });
      }

      try {
        // Verificar se a instituição existe
        const inst = await prisma.institution.findUnique({
          where: { nome: instituicao }
        });
        if (!inst) {
          return reply.status(404).send({ error: 'Instituição não encontrada.' });
        }

        const rawPassword = password || 'Solen2026';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const architect = await prisma.user.create({
          data: {
            matricula: matricula.trim(),
            nome: nome.trim(),
            nickname: nickname ? nickname.trim() : null,
            password: hashedPassword,
            role: 'ARQUITETO',
            instituicao,
            isFirstAccess: false
          }
        });

        return reply.status(201).send({
          id: architect.id,
          matricula: architect.matricula,
          nome: architect.nome,
          nickname: architect.nickname,
          role: architect.role,
          instituicao: architect.instituicao
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: 'Matrícula ou Nickname já está em uso.' });
        }
        return reply.status(500).send({ error: 'Erro ao cadastrar arquiteto.' });
      }
    }
  );

  // ─── GET /architects ──────────────────────────────────────────────────────
  fastify.get('/architects', async (request, reply) => {
    try {
      const architects = await prisma.user.findMany({
        where: { role: 'ARQUITETO' },
        select: {
          id: true,
          matricula: true,
          nome: true,
          nickname: true,
          role: true,
          instituicao: true,
          blocked: true,
          createdAt: true
        },
        orderBy: { nome: 'asc' }
      });
      return reply.status(200).send(architects);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao carregar arquitetos.' });
    }
  });

  // ─── PUT /institutions/:id ────────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: { nome: string } }>('/institutions/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome } = request.body;

    if (!nome || !nome.trim()) {
      return reply.status(400).send({ error: 'O nome da instituição é obrigatório.' });
    }

    try {
      const oldInst = await prisma.institution.findUnique({ where: { id } });
      if (!oldInst) {
        return reply.status(404).send({ error: 'Instituição não encontrada.' });
      }

      const newNomeClean = nome.trim();

      const updated = await prisma.$transaction(async (tx) => {
        const inst = await tx.institution.update({
          where: { id },
          data: { nome: newNomeClean }
        });

        // Cascata nas turmas
        await tx.turma.updateMany({
          where: { instituicao: oldInst.nome },
          data: { instituicao: newNomeClean }
        });

        // Cascata nos usuários
        await tx.user.updateMany({
          where: { instituicao: oldInst.nome },
          data: { instituicao: newNomeClean }
        });

        // Cascata nas disciplinas
        await tx.disciplina.updateMany({
          where: { instituicao: oldInst.nome },
          data: { instituicao: newNomeClean }
        });

        return inst;
      });

      return reply.status(200).send(updated);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Uma instituição com este nome já existe.' });
      }
      return reply.status(500).send({ error: 'Erro ao atualizar instituição.' });
    }
  });

  // ─── PUT /architects/:id ──────────────────────────────────────────────────
  fastify.put<{ Params: { id: string }; Body: { matricula?: string; nome?: string; nickname?: string; password?: string; instituicao?: string } }>(
    '/architects/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { matricula, nome, nickname, password, instituicao } = request.body;

      try {
        const architect = await prisma.user.findFirst({
          where: { id, role: 'ARQUITETO' }
        });
        if (!architect) {
          return reply.status(404).send({ error: 'Arquiteto não encontrado.' });
        }

        const updateData: any = {};
        if (matricula && matricula.trim()) updateData.matricula = matricula.trim();
        if (nome && nome.trim()) updateData.nome = nome.trim();
        if (nickname !== undefined) updateData.nickname = nickname ? nickname.trim() : null;
        if (instituicao && instituicao.trim()) {
          const inst = await prisma.institution.findUnique({
            where: { nome: instituicao }
          });
          if (!inst) {
            return reply.status(404).send({ error: 'Instituição não encontrada.' });
          }
          updateData.instituicao = instituicao;
        }

        if (password && password.trim()) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.user.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            matricula: true,
            nome: true,
            nickname: true,
            role: true,
            instituicao: true,
            blocked: true
          }
        });

        return reply.status(200).send(updated);
      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: 'Matrícula ou Nickname já está em uso.' });
        }
        return reply.status(500).send({ error: 'Erro ao atualizar arquiteto.' });
      }
    }
  );

  // ─── PATCH /architects/:id/block ──────────────────────────────────────────
  fastify.patch<{ Params: { id: string }; Body: { blocked: boolean } }>('/architects/:id/block', async (request, reply) => {
    const { id } = request.params;
    const { blocked } = request.body;

    try {
      const architect = await prisma.user.findFirst({
        where: { id, role: 'ARQUITETO' }
      });
      if (!architect) {
        return reply.status(404).send({ error: 'Arquiteto não encontrado.' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { blocked },
        select: {
          id: true,
          matricula: true,
          nome: true,
          blocked: true
        }
      });

      return reply.status(200).send(updated);
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao atualizar status do arquiteto.' });
    }
  });

  // ─── DELETE /architects/:id ───────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/architects/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const architect = await prisma.user.findFirst({
        where: { id, role: 'ARQUITETO' }
      });
      if (!architect) {
        return reply.status(404).send({ error: 'Arquiteto não encontrado.' });
      }

      await prisma.user.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Arquiteto excluído com sucesso.' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao excluir arquiteto.' });
    }
  });
};
