import 'dotenv/config';
import Fastify from 'fastify';
import { questsRoutes } from './routes/quests';
import { adminRoutes } from './routes/admin';
import { professorRoutes } from './routes/professor';
import { superadminRoutes } from './routes/superadmin';
import { ordinatorRoutes } from './routes/ordinator';
import { webhookRoutes } from './routes/webhooks';
import { logsRoutes } from './routes/logs';

import cors from '@fastify/cors';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import { authRoutes } from './routes/auth';

const server = Fastify({
  logger: true,
  bodyLimit: 52428800 // 50MB para garantir que fotos de alta resolução passem
});

// Registrando plugins
server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
});
server.register(authPlugin);
server.register(securityPlugin);

// Registrando rotas
server.register(authRoutes, { prefix: '/auth' });
server.register(adminRoutes, { prefix: '/admin' });
server.register(questsRoutes, { prefix: '/quests' });
server.register(professorRoutes, { prefix: '/professor' });
server.register(ordinatorRoutes, { prefix: '/ordinator' });
server.register(superadminRoutes, { prefix: '/superadmin' });
server.register(webhookRoutes, { prefix: '/webhooks' });
server.register(logsRoutes, { prefix: '/logs' });

import { autoMigrateInstitutions } from './utils/autoMigrate';

const start = async () => {
  try {
    // Executa a migração automática relacional de instituições no startup (auto-healing)
    await autoMigrateInstitutions();

    const port = Number(process.env.PORT) || 3333;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Servidor rodando na porta ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
