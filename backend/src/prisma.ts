import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';
const isProduction = connectionString.includes('render.com');

const pool = new Pool({ 
  connectionString,
  ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {})
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
