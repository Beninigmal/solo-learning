import 'dotenv/config';
import Fastify from 'fastify';
import { questsRoutes } from './routes/quests';
import { adminRoutes } from './routes/admin';
import { professorRoutes } from './routes/professor';

import cors from '@fastify/cors';
import authPlugin from './plugins/auth';
import { authRoutes } from './routes/auth';

const server = Fastify({
  logger: true,
  bodyLimit: 52428800 // 50MB para garantir que fotos de alta resolução passem
});

// Registrando plugins
server.register(cors, { origin: '*' });
server.register(authPlugin);

// Registrando rotas
server.register(authRoutes, { prefix: '/auth' });
server.register(adminRoutes, { prefix: '/admin' });
server.register(questsRoutes, { prefix: '/quests' });
server.register(professorRoutes, { prefix: '/professor' });

const start = async () => {
  try {
    await server.listen({ port: 3333, host: '0.0.0.0' });
    console.log('Servidor rodando em http://localhost:3333');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
