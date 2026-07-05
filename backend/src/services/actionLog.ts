import { prisma } from '../prisma';

export async function logAction(
  action: string,
  details?: string | null,
  userId?: string | null,
  institutionId?: string | null
) {
  try {
    await prisma.actionLog.create({
      data: {
        action,
        details,
        userId,
        institutionId,
      },
    });
  } catch (error) {
    console.error('[ActionLog] Erro ao salvar log de ação:', error);
  }
}
