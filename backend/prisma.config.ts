import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: {
    kind: 'file',
    filePath: 'prisma/schema.prisma',
  },
  debug: true,
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
