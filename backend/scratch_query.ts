import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const deliveries = await prisma.questDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { quest: true, user: true }
    });
    console.log("Last 5 Deliveries:");
    for (const d of deliveries) {
      console.log(`- ID: ${d.id}, Quest Tema: ${d.quest?.tema}, User: ${d.user?.nome}, AnsweredAt: ${d.answeredAt}, Erros: ${d.erros}`);
      if (d.quest?.tema?.toLowerCase().includes('regra') || d.quest?.enunciado?.includes('data:image')) {
        console.log("  => Enunciado:", d.quest?.enunciado?.substring(0, 100) + '...');
        console.log("  => Gabarito:", d.quest?.gabarito?.substring(0, 100) + '...');
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
