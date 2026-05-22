import { prisma } from '../src/prisma';
import bcrypt from 'bcryptjs';

async function createArchitect() {
  console.log('🔮 CREATING ARCHITECT USER: ELISEU 🔮');
  console.log('============================================');

  const nome = 'Eliseu';
  const nickname = 'eliseu';
  const rawPassword = 'solutis';
  
  // Hash the password with bcrypt (10 salt rounds)
  const password = await bcrypt.hash(rawPassword, 10);
  
  // Find a unique matricula (enrollment code)
  let matricula = '9000';
  let isUnique = false;
  
  while (!isUnique) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { matricula },
          { nickname }
        ]
      }
    });
    
    if (!existing) {
      isUnique = true;
    } else {
      // If matricula or nickname is taken, mutate slightly to stay unique
      matricula = String(Math.floor(1000 + Math.random() * 9000));
    }
  }

  // Create the new Architect user
  const newUser = await prisma.user.create({
    data: {
      nome,
      nickname,
      matricula,
      password,
      role: 'ADMIN', // ADMIN corresponds to the Architect role
      isFirstAccess: false,
    }
  });

  console.log('🎉 Architect User Created Successfully!');
  console.log('============================================');
  console.log(`👤 Nome: ${newUser.nome}`);
  console.log(`🏷️ Nickname: @${newUser.nickname}`);
  console.log(`🔑 Matrícula (User Code): ${newUser.matricula}`);
  console.log(`🛡️ Papel (Role): ${newUser.role}`);
  console.log(`🔐 Senha original: ${rawPassword}`);
  console.log('============================================');
}

createArchitect()
  .catch((err) => {
    console.error('❌ Error creating architect user:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
