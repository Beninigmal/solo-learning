import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: { cpf: string; nickname: string; role?: string } }>('/login', async (request, reply) => {
    const cpf      = (request.body.cpf      || '').trim();
    const nickname = (request.body.nickname || '').trim();
    const role     = request.body.role;

    if (!cpf || !nickname) {
      return reply.status(400).send({ error: 'CPF e Nickname são obrigatórios.' });
    }

    try {
      // Procura o usuário exigindo Nickname E CPF exatos (após trim)
      let user = await prisma.user.findFirst({
        where: { cpf, nickname }
      });

      // Auto-Signup: cria na hora se não encontrar
      if (!user) {
        user = await prisma.user.create({
          data: {
            cpf,
            nome: nickname,
            nickname,
            role: role || 'ALUNO',
            turno: 'MATUTINO'
          }
        });
      }

      // Gera o token JWT
      const token = fastify.jwt.sign({
        id: user.id,
        nome: user.nome,
        role: user.role,
        turmaId: user.turmaId,
        turno: user.turno
      }, { expiresIn: '7d' });

      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          role: user.role,
          xp: user.xp,
          level: user.level
        }
      });

    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({
          error: 'Este CPF ou Nickname já está cadastrado com credenciais diferentes. Verifique seus dados.'
        });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno ao autenticar.', details: error.message });
    }
  });
  
  fastify.get('/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { turma: true }
    });
    return reply.status(200).send({ user });
  });

  // Registra o Expo Push Token do dispositivo para o usuário autenticado
  fastify.post<{ Body: { expoPushToken: string } }>(
    '/push-token',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const { expoPushToken } = request.body;
      if (!expoPushToken) {
        return reply.status(400).send({ error: 'expoPushToken é obrigatório.' });
      }
      try {
        await prisma.user.update({
          where: { id: request.user.id },
          data: { expoPushToken }
        });
        return reply.status(200).send({ ok: true });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao salvar push token.', details: error.message });
      }
    }
  );
};
