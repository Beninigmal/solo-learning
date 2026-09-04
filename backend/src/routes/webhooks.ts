import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

export const webhookRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Webhook para lidar com pagamentos Stripe / Asaas / Gateway Genérico
  fastify.post<{ Body: { type: string, data: any } }>('/billing/webhook', async (request, reply) => {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const incomingSecret = (request.headers['x-webhook-secret'] || request.headers['asaas-access-token'] || request.headers['stripe-signature']) as string | undefined;

    if (webhookSecret && incomingSecret !== webhookSecret) {
      request.log.warn('Tentativa de acesso não autorizada ao webhook de billing (Secret inválido/ausente).');
      return reply.status(401).send({ error: 'Não autorizado: Segredo de webhook inválido ou ausente.' });
    }

    const { type, data } = request.body;
    
    try {
      // Exemplo genérico de payload esperado:
      // data.institutionId ou data.metadata.institutionId
      const institutionId = data?.institutionId || data?.metadata?.institutionId;
      
      if (!institutionId) {
        return reply.status(400).send({ error: 'Institution ID não fornecido no payload.' });
      }

      const inst = await prisma.institution.findUnique({ where: { id: institutionId } });
      if (!inst) {
        return reply.status(404).send({ error: 'Instituição não encontrada.' });
      }

      if (type === 'invoice.paid' || type === 'payment.confirmed') {
        // Renova o status para ATIVO
        await prisma.institution.update({
          where: { id: institutionId },
          data: { status: 'ATIVO' }
        });
      } else if (type === 'invoice.payment_failed' || type === 'subscription.canceled') {
        // Bloqueia a conta (INADIMPLENTE ou CANCELADO)
        const newStatus = type === 'subscription.canceled' ? 'CANCELADO' : 'INADIMPLENTE';
        await prisma.institution.update({
          where: { id: institutionId },
          data: { status: newStatus }
        });
      }

      return reply.send({ received: true });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Erro ao processar webhook.' });
    }
  });
};
