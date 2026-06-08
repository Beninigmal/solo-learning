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

    let user = await this.userRepository.findByMatriculaOrNickname(matricula);

    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    if (user.blocked) {
      throw new Error('Sua conta está bloqueada pelo Administrador.');
    }

    // Se for o PRIMEIRO ACESSO de um ALUNO, a senha é o Código de Invocação da Turma
    if (user.role === 'ALUNO' && user.isFirstAccess) {
      if (!user.turma || !user.turma.codigoInvocacao) {
        throw new Error('Erro na configuração da turma. Contate o mestre.');
      }

      if (password !== user.turma.codigoInvocacao) {
        throw new Error('Código de Invocação inválido.');
      }
    } else {
      // Acesso normal ou Mestre/Admin: validar hash da senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Credenciais inválidas.');
      }
    }

    return { user };
  }
}
