import { prisma } from '../src/prisma';

async function checkSussurros() {
  const deliveries = await prisma.questDelivery.findMany({
    include: { quest: true, user: true }
  });
  console.log(`Found ${deliveries.length} deliveries total.`);
  const helpRequests = deliveries.filter(d => d.helpRequested);
  console.log(`Found ${helpRequests.length} help requests.`);
  for (const h of helpRequests) {
    console.log(`ID: ${h.id}, User: ${h.user.nome}, Quest: ${h.quest.enunciado.substring(0, 30)}, Response: ${h.helpResponse}`);
  }
}

checkSussurros();
