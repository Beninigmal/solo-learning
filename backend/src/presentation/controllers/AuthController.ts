import { FastifyReply, FastifyRequest } from 'fastify';
import { LoginUseCase } from '../../core/use-cases/auth/LoginUseCase';
import { FirstAccessUseCase } from '../../core/use-cases/auth/FirstAccessUseCase';
import { IUserRepository } from '../../core/repositories/IUserRepository';

export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private firstAccessUseCase: FirstAccessUseCase,
    private userRepository: IUserRepository
  ) {}

  async login(request: FastifyRequest<{ Body: { matricula: string; password?: string } }>, reply: FastifyReply) {
    const { matricula, password } = request.body;

    try {
      const { user } = await this.loginUseCase.execute({ matricula, password });

      // Gera o token JWT
      const token = (request.server as any).jwt.sign({
        id: user.id,
        nome: user.nome,
        role: user.role,
        instituicao: user.instituicao,
        institutionId: user.institutionId,
        turmaId: user.turmaId,
        isFirstAccess: user.isFirstAccess
      }, { expiresIn: '7d' });

      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          nickname: user.nickname,
          role: user.role,
          instituicao: user.instituicao,
          xp: user.xp,
          level: user.level,
          isFirstAccess: user.isFirstAccess,
          acceptedTermsAt: user.acceptedTermsAt,
          parentConsentName: user.parentConsentName
        }
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(error.message.includes('Credenciais') || error.message.includes('Invocação') ? 401 : 500).send({ error: error.message });
    }
  }

  async firstAccess(request: FastifyRequest<{ Body: { nickname: string; newPassword: string } }>, reply: FastifyReply) {
    const { nickname, newPassword } = request.body;
    const userId = (request.user as any).id;

    try {
      const updatedUser = await this.firstAccessUseCase.execute({
        userId,
        nickname,
        newPassword
      });

      return reply.status(200).send({
        message: 'Perfil atualizado com sucesso!',
        user: {
          id: updatedUser.id,
          nickname: updatedUser.nickname,
          isFirstAccess: false
        }
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({ error: error.message });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as any).id;
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }
      return reply.status(200).send({ user });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as any).id;
    try {
      await this.userRepository.delete(userId);
      return reply.status(200).send({ message: 'Conta e todos os dados associados foram completamente apagados do sistema.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro de integridade relacional ao apagar conta.', details: error.message });
    }
  }
}
