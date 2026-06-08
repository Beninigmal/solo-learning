import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.findUnique({ where: { matricula: 'admin' } });
    console.log('User found:', user);
  } catch (e: any) {
    console.error('Error connecting to DB:', e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
