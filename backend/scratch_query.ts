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
  console.log("Connecting to database...");
  try {
    const deliveries = await prisma.questDelivery.findMany({
      where: {
        NOT: {
          usedHelpers: ""
        }
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log("Recent deliveries with used helpers:");
    console.log(JSON.stringify(deliveries, null, 2));

  } catch (error) {
    console.error("Error connecting to database:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
