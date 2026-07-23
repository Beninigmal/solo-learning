import { prisma } from '../../../prisma';
import { IUserRepository } from '../../../core/repositories/IUserRepository';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<any | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { turma: true, institution: true },
    });
  }

  async findByMatriculaOrNickname(key: string): Promise<any | null> {
    const searchKey = key.trim();
    const isNickname = searchKey.startsWith('@');
    const cleanKey = isNickname ? searchKey.substring(1) : searchKey;

    return prisma.user.findFirst({
      where: {
        OR: [
          { matricula: { equals: cleanKey, mode: 'insensitive' } },
          { nickname: { equals: cleanKey, mode: 'insensitive' } }
        ]
      },
      include: { turma: true, institution: true }
    });
  }

  async findByNicknameInInstitution(nickname: string, institutionId: string, excludeUserId: string): Promise<any | null> {
    return prisma.user.findFirst({
      where: {
        nickname: { equals: nickname.trim(), mode: 'insensitive' },
        id: { not: excludeUserId },
        OR: [
          { institutionId: institutionId || 'NO_INSTITUTION' }
        ]
      }
    });
  }

  async update(id: string, data: any): Promise<any> {
    return prisma.user.update({
      where: { id },
      data,
      include: { turma: true }
    });
  }

  async delete(id: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return;

    await prisma.$transaction(async (tx) => {
      await tx.goldenAnswer.deleteMany({ where: { userId: id } });
      await tx.wrongAnswer.deleteMany({ where: { userId: id } });
      await tx.questDelivery.deleteMany({ where: { userId: id } });

      if (user.role === 'PROFESSOR') {
        await tx.disciplinaProfessor.deleteMany({ where: { professorId: id } });
        await tx.turmaDisciplina.deleteMany({ where: { professorId: id } });
        await tx.calendarEvent.deleteMany({ where: { professorId: id } });
        await tx.professorRestriction.deleteMany({ where: { professorId: id } });
      }

      await tx.goldenQuestion.updateMany({
        where: { criadorId: id },
        data: { criadorId: null }
      });

      await tx.raidMessage.deleteMany({ where: { userId: id } });
      await tx.raidParticipant.deleteMany({ where: { userId: id } });
      await tx.giftedArtifact.deleteMany({ where: { userId: id } });
      await tx.deleteAccountRequest.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
  }

  async findAlunosByTurma(turmaId: string): Promise<any[]> {
    return prisma.user.findMany({
      where: { turmaId, role: 'ALUNO' }
    });
  }
}
