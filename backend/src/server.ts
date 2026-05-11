import 'dotenv/config';
import Fastify from 'fastify';
import { questsRoutes } from './routes/quests';

const server = Fastify({
  logger: true,
  bodyLimit: 52428800 // 50MB para garantir que fotos de alta resolução passem
});

// Registrando rotas
server.register(questsRoutes, { prefix: '/quests' });

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
