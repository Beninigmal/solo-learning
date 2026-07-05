import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const logs = await prisma.actionLog.findMany();
    console.log("ActionLog table exists. Count:", logs.length);
  } catch (e) {
    console.error("ActionLog query failed:", e);
  }
}
main().finally(() => prisma.$disconnect());
