import { prisma } from '../../../prisma';
import { IQuestRepository } from '../../../core/repositories/IQuestRepository';

export class PrismaQuestRepository implements IQuestRepository {
  async findById(id: string): Promise<any | null> {
    return prisma.quest.findUnique({ where: { id } });
  }

  async findDeliveryById(id: string): Promise<any | null> {
    return prisma.questDelivery.findUnique({ 
      where: { id },
      include: { quest: true }
    });
  }

  async findActiveMiniBossDeliveries(userId: string): Promise<any[]> {
    return prisma.questDelivery.findMany({
      where: {
        userId,
        status: 'DELIVERED',
        quest: { nivel: 'MINIBOSS' }
      },
      include: { quest: { include: { disciplina: true } } },
      orderBy: { quest: { createdAt: 'desc' } }
    });
  }

  async findDeliveredQuest(userId: string): Promise<any | null> {
    return prisma.questDelivery.findFirst({
      where: { userId, status: 'DELIVERED' },
      include: { quest: true },
      orderBy: { deliveredAt: 'desc' }
    });
  }

  async findWaitingQuest(userId: string, now: Date): Promise<any | null> {
    return prisma.questDelivery.findFirst({
      where: { userId, status: 'WAITING', expiresAt: { gt: now } },
      include: { quest: true },
      orderBy: { waitingSince: 'asc' }
    });
  }

  async findScheduledQuest(userId: string, now: Date): Promise<any | null> {
    return prisma.questDelivery.findFirst({
      where: { userId, status: 'SCHEDULED', scheduledAt: { lte: now } },
      include: { quest: true },
      orderBy: { scheduledAt: 'asc' }
    });
  }

  async updateDelivery(id: string, data: any): Promise<any> {
    return prisma.questDelivery.update({
      where: { id },
      data
    });
  }

  async updateManyDeliveriesStatus(userId: string, currentStatus: string[], newStatus: string, filter?: any): Promise<void> {
    await prisma.questDelivery.updateMany({
      where: {
        userId,
        status: { in: currentStatus },
        ...filter
      },
      data: { status: newStatus }
    });
  }

  async createQuest(data: any): Promise<any> {
    return prisma.quest.create({ data });
  }

  async createDeliveries(data: any[]): Promise<void> {
    await prisma.questDelivery.createMany({ data });
  }

  async findDisciplinaById(id: string): Promise<any | null> {
    return prisma.disciplina.findUnique({ where: { id } });
  }

  async findTurmaById(id: string): Promise<any | null> {
    return prisma.turma.findUnique({ where: { id } });
  }

  async findProfessorTurmaDisciplina(professorId: string, turmaId: string, disciplinaId: string): Promise<any | null> {
    return prisma.turmaDisciplina.findFirst({
      where: { professorId, turmaId, disciplinaId }
    });
  }

  async findDisciplinaByName(nome: string, institutionId: string | null): Promise<any | null> {
    return prisma.disciplina.findFirst({
      where: { nome, institutionId }
    });
  }

  async createDisciplina(nome: string, institutionId: string | null): Promise<any> {
    return prisma.disciplina.create({
      data: { nome, institutionId }
    });
  }

  async updateQuest(id: string, data: any): Promise<any> {
    return prisma.quest.update({
      where: { id },
      data
    });
  }

  async findPendingQuests(where: any): Promise<any[]> {
    return prisma.quest.findMany({
      where,
      include: {
        turmaAlvo: { select: { nome: true } },
        disciplina: { select: { nome: true } }
      },
      orderBy: [
        { createdAt: 'desc' },
        { ordem: 'asc' }
      ]
    });
  }

  async updateManyQuests(where: any, data: any): Promise<void> {
    await prisma.quest.updateMany({
      where,
      data
    });
  }
}
