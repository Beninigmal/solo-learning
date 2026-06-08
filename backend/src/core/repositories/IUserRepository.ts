export interface IUserRepository {
  findById(id: string): Promise<any | null>;
  findByMatriculaOrNickname(key: string): Promise<any | null>;
  findByNicknameInInstitution(nickname: string, institutionId: string, excludeUserId: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findAlunosByTurma(turmaId: string): Promise<any[]>;
}
