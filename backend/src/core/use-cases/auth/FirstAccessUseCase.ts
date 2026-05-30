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

    const getSchoolNick = (inst: string): string => {
      if (!inst) return '';
      return inst
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .split(/\s+/)
        .map((word, idx, arr) => {
          if (arr.length === 1) return word;
          if (idx === 0) return word[0];
          return word;
        })
        .join('.');
    };

    const cleanInputNick = nickname.includes('@') ? nickname.split('@').pop()! : nickname;
    const schoolPrefix = getSchoolNick(user.instituicao || '');
    const fullNickname = schoolPrefix ? `${schoolPrefix}@${cleanInputNick.trim()}` : cleanInputNick.trim();

    const existingWithNick = await this.userRepository.findByNicknameInInstitution(fullNickname, user.institutionId, userId);
    if (existingWithNick) {
      throw new Error('Este nickname já está em uso na sua instituição.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.userRepository.update(userId, {
      nickname: fullNickname,
      password: hashedPassword,
      isFirstAccess: false
    });

    return updatedUser;
  }
}
