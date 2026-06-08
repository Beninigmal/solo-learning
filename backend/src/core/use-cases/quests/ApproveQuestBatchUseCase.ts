import { IQuestRepository } from '../../repositories/IQuestRepository';
import { IUserRepository } from '../../repositories/IUserRepository';
import { INotificationProvider } from '../../providers/INotificationProvider';

export class ApproveQuestBatchUseCase {
  constructor(
    private questRepository: IQuestRepository,
    private userRepository: IUserRepository,
    private notificationProvider: INotificationProvider
  ) {}

  async execute(batchId: string, userRole: string): Promise<{ count: number }> {
    if (userRole !== 'PROFESSOR' && userRole !== 'ADMIN') {
      throw new Error('Acesso negado.');
    }

    const quests = await this.questRepository.findPendingQuests({ batchId, status: 'PENDENTE' });

    if (quests.length === 0) {
      throw new Error('Lote de rascunhos não encontrado ou já aprovado.');
    }

    await this.questRepository.updateManyQuests({ batchId }, { status: 'ATIVA' });

    const firstQuest = quests.find(q => q.ordem === 1) || quests[0];
    const now = new Date();

    if (firstQuest.turmaAlvoId) {
      const alunos = await this.userRepository.findAlunosByTurma(firstQuest.turmaAlvoId);

      if (alunos.length > 0) {
        await this.questRepository.createDeliveries(
          alunos.map(aluno => ({
            questId: firstQuest.id,
            userId: aluno.id,
            status: 'SCHEDULED',
            scheduledAt: now
          }))
        );

        const disciplina = await this.questRepository.findDisciplinaById(firstQuest.disciplinaId);
        const tokens = alunos.map(a => a.expoPushToken).filter((t): t is string => !!t);
        if (tokens.length > 0) {
          this.notificationProvider.sendPushNotification(
            tokens,
            '⚔️ Nova Missão Disponível!',
            `Uma nova masmorra de ${disciplina?.nome || 'Masmorra'} foi aberta na sua guilda!`,
            { type: 'NEW_QUEST' }
          ).catch(console.error);
        }
      }
    }

    return { count: quests.length };
  }
}
