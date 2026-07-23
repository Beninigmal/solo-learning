import { FastifyReply, FastifyRequest } from 'fastify';
import { GenerateAIQuestsUseCase } from '../../core/use-cases/quests/GenerateAIQuestsUseCase';
import { ApproveQuestBatchUseCase } from '../../core/use-cases/quests/ApproveQuestBatchUseCase';
import { IQuestRepository } from '../../core/repositories/IQuestRepository';

export class QuestController {
  constructor(
    private generateAIQuestsUseCase: GenerateAIQuestsUseCase,
    private approveQuestBatchUseCase: ApproveQuestBatchUseCase,
    private questRepository: IQuestRepository
  ) {}

  async generate(
    request: FastifyRequest<{
      Body: {
        semana: string;
        turmaIds: string[];
        tema: string;
        complexidade: string;
        exigeCalculo: boolean;
        disciplinaId: string;
        tipoQuest?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { semana, turmaIds, tema, complexidade, exigeCalculo, disciplinaId, tipoQuest } = request.body;
    const userRole = (request.user as any).role;
    const userId = (request.user as any).id;

    try {
      const result = await this.generateAIQuestsUseCase.execute({
        semana,
        turmaIds,
        tema,
        complexidade,
        exigeCalculo,
        disciplinaId,
        tipoQuest,
        userRole,
        userId
      });

      return reply.status(201).send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(error.message.includes('negado') ? 403 : 500).send({ error: error.message });
    }
  }

  async approveBatch(request: FastifyRequest<{ Params: { batchId: string } }>, reply: FastifyReply) {
    const { batchId } = request.params;
    const userRole = (request.user as any).role;

    try {
      const result = await this.approveQuestBatchUseCase.execute(batchId, userRole);
      return reply.status(200).send({ message: 'Lote de missões ativado com sucesso!', ...result });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(error.message.includes('negado') ? 403 : 500).send({ error: error.message });
    }
  }

  async getPending(request: FastifyRequest, reply: FastifyReply) {
    const userRole = (request.user as any).role;
    const userId = (request.user as any).id;

    if (userRole !== 'PROFESSOR' && userRole !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }

    try {
      const whereClause: any = { status: 'PENDENTE' };
      if (userRole === 'PROFESSOR') {
        const vinculos = await this.questRepository.findPendingQuests({ status: 'PENDENTE' }); // filtered below
        // Since we want simple mapping, let's let the repository query pending quests
      }

      // Re-using the same pending quests mapping
      const pendingQuests = await this.questRepository.findPendingQuests({ status: 'PENDENTE' });
      // We can apply professor filters if role is professor
      const filtered = userRole === 'ADMIN' ? pendingQuests : pendingQuests.filter(q => q.turmaAlvo?.turmaDisciplinas?.some((v: any) => v.professorId === userId));

      const groups: { [batchId: string]: any } = {};
      filtered.forEach(q => {
        const bId = q.batchId || 'no-batch';
        if (!groups[bId]) {
          groups[bId] = {
            batchId: bId,
            turmaNome: q.turmaAlvo?.nome || 'Sem Turma',
            turmaId: q.turmaAlvoId,
            disciplinaNome: q.disciplina?.nome || 'Sem Disciplina',
            disciplinaId: q.disciplinaId,
            tema: q.tema || 'Sem Tema',
            semana: q.semana || 'Sem Semana',
            createdAt: q.createdAt,
            quests: []
          };
        }
        groups[bId].quests.push({
          id: q.id,
          enunciado: q.enunciado,
          nivel: q.nivel,
          xp: q.xp,
          ordem: q.ordem,
          tags: q.tags
        });
      });

      const result = Object.values(groups).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar rascunhos.', details: error.message });
    }
  }
}
