import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../repositories/IUserRepository';

interface FirstAccessRequest {
  userId: string;
  nickname: string;
  newPassword?: string;
}

export class FirstAccessUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(request: FirstAccessRequest): Promise<any> {
    const { userId, nickname, newPassword } = request;

    if (!nickname || !newPassword) {
      throw new Error('Nickname e Nova Senha são obrigatórios.');
    }

    if (newPassword.length < 4 || newPassword.length > 12) {
      throw new Error('A senha deve ter entre 4 e 12 caracteres.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const existingWithNick = await this.userRepository.findByNicknameInInstitution(nickname, user.institutionId, userId);
    if (existingWithNick) {
      throw new Error('Este nickname já está em uso na sua instituição.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.userRepository.update(userId, {
      nickname: nickname.trim(),
      password: hashedPassword,
      isFirstAccess: false
    });

    return updatedUser;
  }
}
