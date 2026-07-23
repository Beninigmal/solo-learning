import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { logAction } from '../services/actionLog';

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
  fastify.post<{ Body: { nome: string; codigo?: string; tipo?: string; plano?: string; status?: string; trialExpiration?: string; maxTurmasMonarch?: number } }>('/institutions', async (request, reply) => {
    const { nome, codigo, tipo, plano, status, trialExpiration, maxTurmasMonarch } = request.body;
    if (!nome || !nome.trim()) {
      return reply.status(400).send({ error: 'O nome da instituição é obrigatório.' });
    }

    try {
      let finalCodigo = codigo ? codigo.trim() : '';
      if (!finalCodigo) {
        // Autogerar código numérico sequencial
        const institutions = await prisma.institution.findMany({
          where: { codigo: { not: null } },
          select: { codigo: true }
        });
        let nextCode = 101;
        const numericCodes = institutions
          .map(i => parseInt(i.codigo || '', 10))
          .filter(n => !isNaN(n));
        if (numericCodes.length > 0) {
          nextCode = Math.max(...numericCodes) + 1;
        }
        finalCodigo = String(nextCode).padStart(4, '0');
      }

      const institution = await prisma.institution.create({
        data: { 
          nome: nome.trim(),
          codigo: finalCodigo,
          tipo: tipo || 'MUNICIPAL',
          plano: plano || 'TRIAL',
          status: status || 'ATIVO',
          trialExpiration: trialExpiration ? new Date(trialExpiration) : null,
          maxTurmasMonarch: maxTurmasMonarch ?? 2
        }
      });
      return reply.status(201).send(institution);
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('codigo')) {
          return reply.status(400).send({ error: 'Este código de instituição já está em uso.' });
        }
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
            institutionId: inst.id,
            isFirstAccess: true
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
  fastify.put<{ Params: { id: string }; Body: { nome: string; codigo?: string; tipo?: string; plano?: string; status?: string; trialExpiration?: string; maxTurmasMonarch?: number } }>('/institutions/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, codigo, tipo, plano, status, trialExpiration, maxTurmasMonarch } = request.body;

    console.log('[PUT /institutions/:id] BODY RECEIVED:', { id, nome, codigo, tipo });

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
          data: { 
            nome: newNomeClean,
            codigo: codigo ? codigo.trim() : undefined,
            tipo: tipo !== undefined ? tipo : undefined,
            plano: plano !== undefined ? plano : undefined,
            status: status !== undefined ? status : undefined,
            trialExpiration: trialExpiration !== undefined ? (trialExpiration ? new Date(trialExpiration) : null) : undefined,
            maxTurmasMonarch: maxTurmasMonarch !== undefined ? maxTurmasMonarch : undefined
          }
        });
        console.log('[PUT /institutions/:id] DATABASE UPDATED RESULT:', inst);

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
      console.error('[PUT /institutions/:id] ERROR:', error);
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('codigo')) {
          return reply.status(400).send({ error: 'Este código de instituição já está em uso.' });
        }
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
          updateData.institutionId = inst.id;
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

      await logAction('Exclusão de Arquiteto (Root)', `Arquiteto excluído: ${architect.nome} (Matrícula: ${architect.matricula})`, request.user.id, architect.institutionId);

      return reply.status(200).send({ message: 'Arquiteto excluído com sucesso.' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao excluir arquiteto.' });
    }
  });

  // ─── POST /architects/:id/reset ───────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/architects/:id/reset', async (request, reply) => {
    const { id } = request.params;

    try {
      const architect = await prisma.user.findFirst({
        where: { id, role: 'ARQUITETO' }
      });
      if (!architect) {
        return reply.status(404).send({ error: 'Arquiteto não encontrado.' });
      }

      const defaultPassword = await bcrypt.hash('Solen2026', 10);
      await prisma.user.update({
        where: { id },
        data: { 
          isFirstAccess: true,
          nickname: null,
          password: defaultPassword
        }
      });

      return reply.send({ message: 'Acesso do arquiteto resetado com sucesso! A senha padrão voltou a ser "Solen2026" e ele fará o primeiro acesso novamente.' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao resetar arquiteto.' });
    }
  });

  // ─── GET /matrix/saas-financials ──────────────────────────────────────────
  fastify.get('/matrix/saas-financials', async (request, reply) => {
    try {
      const institutions = await prisma.institution.findMany({
        include: {
          _count: {
            select: {
              turmas: true,
              users: true
            }
          }
        }
      });

      const PLAN_VALUES: Record<string, number> = {
        TRIAL: 0,
        RANK_B: 499,
        RANK_A: 1299,
        RANK_S: 2999
      };

      let totalMrr = 0;
      let activeCount = 0;
      let trialCount = 0;
      let delinquentCount = 0;

      const planBreakdown: Record<string, number> = { TRIAL: 0, RANK_B: 0, RANK_A: 0, RANK_S: 0 };
      const statusBreakdown: Record<string, number> = { ATIVO: 0, INADIMPLENTE: 0, CANCELADO: 0 };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringTrials: any[] = [];

      institutions.forEach((inst) => {
        const plan = inst.plano || 'TRIAL';
        const status = inst.status || 'ATIVO';

        planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

        if (status === 'ATIVO') {
          totalMrr += PLAN_VALUES[plan] || 0;
          activeCount++;
        } else if (status === 'INADIMPLENTE') {
          delinquentCount++;
        }

        if (plan === 'TRIAL') {
          trialCount++;
          if (inst.trialExpiration && inst.trialExpiration <= thirtyDaysFromNow && inst.trialExpiration >= now) {
            expiringTrials.push({
              id: inst.id,
              nome: inst.nome,
              trialExpiration: inst.trialExpiration
            });
          }
        }
      });

      const totalTurmasAllocated = institutions.reduce((acc, i) => acc + i._count.turmas, 0);
      const totalTurmasCapacity = institutions.reduce((acc, i) => acc + (i.maxTurmasMonarch || 2), 0);
      const totalActiveUsers = institutions.reduce((acc, i) => acc + i._count.users, 0);

      return reply.status(200).send({
        summary: {
          totalInstitutions: institutions.length,
          activeCount,
          trialCount,
          delinquentCount,
          totalMrr,
          totalTurmasAllocated,
          totalTurmasCapacity,
          totalActiveUsers
        },
        planBreakdown,
        statusBreakdown,
        expiringTrials
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar relatórios financeiros SaaS.' });
    }
  });
};
