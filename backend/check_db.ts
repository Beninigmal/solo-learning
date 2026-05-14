import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const users = await prisma.user.findMany({
        select: { nickname: true, cpf: true, role: true }
    });
    console.log('📋 USUÁRIOS NO BANCO RENDER:');
    console.table(users);
  } catch (err) {
    console.error('❌ Erro ao consultar banco:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
