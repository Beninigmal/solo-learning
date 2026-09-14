import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../repositories/IUserRepository';

interface LoginRequest {
  matricula: string;
  password?: string;
}

interface LoginResponse {
  user: any;
}

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    const { matricula, password } = request;

    if (!matricula || !password) {
      throw new Error('Matrícula e Senha são obrigatórios.');
    }

    const candidates = await this.userRepository.findAllByMatriculaOrNickname(matricula);

    if (!candidates || candidates.length === 0) {
      throw new Error('Credenciais inválidas.');
    }

    let matchedUser: any = null;
    for (const candidate of candidates) {
      if (candidate.blocked) continue;

      if (candidate.role === 'ALUNO' && candidate.isFirstAccess) {
        if (candidate.turma?.codigoInvocacao && password === candidate.turma.codigoInvocacao) {
          matchedUser = candidate;
          break;
        }
      } else {
        const isPasswordValid = await bcrypt.compare(password, candidate.password);
        if (isPasswordValid) {
          matchedUser = candidate;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new Error('Credenciais inválidas.');
    }

    return { user: matchedUser };
  }
}
