import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { prisma } from '../src/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { nickname: 'Val' }
  });

  if (!user) {
    console.error('User Val not found');
    return;
  }

  // Create a temporary fastify instance to sign the token
  const app = Fastify();
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'supersecret_solen_key_123'
  });

  await app.ready();

  const token = app.jwt.sign({
    id: user.id,
    nome: user.nome,
    role: user.role,
    instituicao: user.instituicao,
    institutionId: user.institutionId,
    turmaId: user.turmaId,
    isFirstAccess: user.isFirstAccess
  });

  console.log('JWT Token signed successfully.');

  // Now, make HTTP requests to the running backend on port 3333
  const port = process.env.PORT || 3333;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Testing endpoints on ${baseUrl}...`);

  const headers = {
    Authorization: `Bearer ${token}`
  };

  try {
    console.log('\n--- GET /auth/me ---');
    const responseMe = await fetch(`${baseUrl}/auth/me`, { headers });
    console.log('Status:', responseMe.status);
    const bodyMe = await responseMe.json();
    console.log('Response body:', JSON.stringify(bodyMe, null, 2));
  } catch (err: any) {
    console.error('Error fetching /auth/me:', err.message);
  }

  try {
    console.log('\n--- GET /quests/wrong-answers ---');
    const responseWa = await fetch(`${baseUrl}/quests/wrong-answers`, { headers });
    console.log('Status:', responseWa.status);
    const bodyWa = await responseWa.json();
    console.log('Response body:', JSON.stringify(bodyWa, null, 2));
  } catch (err: any) {
    console.error('Error fetching /quests/wrong-answers:', err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
