const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const msg = await prisma.chatMessage.findFirst({
    orderBy: { createdAt: 'desc' },
    where: { sender: 'ordinator' }
  });
  console.log(JSON.stringify(msg, null, 2));
  process.exit(0);
}
run();
