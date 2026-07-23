import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function reset() {
  const defaultPassword = await bcrypt.hash('Solen@18102010', 10);
  await prisma.user.update({
    where: { matricula: 'superadmin' },
    data: { password: defaultPassword }
  });
  console.log('Senha do superadmin resetada para Solen@18102010');
}

reset().finally(() => prisma.$disconnect());
