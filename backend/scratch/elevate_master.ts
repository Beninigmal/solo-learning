import { prisma } from '../src/prisma';

async function elevate() {
  console.log('🔮 ELEVANDO MESTRE E BENINIGMAL PARA ADMIN 🔮');
  console.log('============================================');

  const updatedMestre = await prisma.user.updateMany({
    where: { matricula: 'mestre' },
    data: { role: 'ADMIN' }
  });

  const updatedBeni = await prisma.user.updateMany({
    where: { matricula: 'beninigmal' },
    data: { role: 'ADMIN' }
  });

  console.log(`✅ Contas elevadas com sucesso!`);
  console.log(`🧙‍♂️ mestre: ${updatedMestre.count} conta(s) atualizada(s)`);
  console.log(`🧙‍♂️ beninigmal: ${updatedBeni.count} conta(s) atualizada(s)`);
  console.log('============================================');
}

elevate().catch(console.error);
