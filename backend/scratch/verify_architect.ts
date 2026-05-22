import { prisma } from '../src/prisma';

async function verifyArchitect() {
  console.log('🔍 VERIFYING ARCHITECT USER IN ACTIVE DATABASE 🔍');
  console.log('============================================');

  const user = await prisma.user.findFirst({
    where: {
      nickname: 'eliseu'
    }
  });

  if (user) {
    console.log('✅ Found user in the database!');
    console.log(`👤 Nome: ${user.nome}`);
    console.log(`🏷️ Nickname: @${user.nickname}`);
    console.log(`🔑 Matrícula: ${user.matricula}`);
    console.log(`🛡️ Papel (Role): ${user.role}`);
    console.log(`📅 Criado em: ${user.createdAt}`);
  } else {
    console.log('❌ User not found in the database!');
  }
  console.log('============================================');
}

verifyArchitect()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
