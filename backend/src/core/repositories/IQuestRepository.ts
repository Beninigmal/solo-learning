export interface IQuestRepository {
  findById(id: string): Promise<any | null>;
  findDeliveryById(id: string): Promise<any | null>;
  findActiveMiniBossDeliveries(userId: string): Promise<any[]>;
  findDeliveredQuest(userId: string): Promise<any | null>;
  findWaitingQuest(userId: string, now: Date): Promise<any | null>;
  findScheduledQuest(userId: string, now: Date): Promise<any | null>;
  updateDelivery(id: string, data: any): Promise<any>;
  updateManyDeliveriesStatus(userId: string, currentStatus: string[], newStatus: string, filter?: any): Promise<void>;
  createQuest(data: any): Promise<any>;
  createDeliveries(data: any[]): Promise<void>;
  findDisciplinaById(id: string): Promise<any | null>;
  findTurmaById(id: string): Promise<any | null>;
  findProfessorTurmaDisciplina(professorId: string, turmaId: string, disciplinaId: string): Promise<any | null>;
  findDisciplinaByName(nome: string, institutionId: string | null): Promise<any | null>;
  createDisciplina(nome: string, institutionId: string | null): Promise<any>;
  updateQuest(id: string, data: any): Promise<any>;
  findPendingQuests(where: any): Promise<any[]>;
  updateManyQuests(where: any, data: any): Promise<void>;
}
