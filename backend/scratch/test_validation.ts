import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const userId = "af6c80b3-f7f3-4870-92e2-770d109a79c7"; // Fabrício (ARQUITETO of Desembargador Pedro Ribeiro)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    console.error("User not found!");
    return;
  }
  
  console.log(`Simulating user: ${user.nome} (${user.role}) from ${user.instituicao}`);
  
  const userInstitutionId = user.institutionId;
  const requestUser = {
    id: user.id,
    role: user.role,
    instituicao: user.instituicao,
    institutionId: user.institutionId
  };

  const ids = ["ef61c016-d9b1-422d-b1ba-460cb7d266d1", "fbef1a6b-f971-4085-b177-9138de4383ea"];
  
  for (const id of ids) {
    console.log(`\n--- TRACE FOR DISCIPLINA ID: ${id} ---`);
    const disciplina = await prisma.disciplina.findUnique({
      where: { id },
      select: { institutionId: true, instituicao: true }
    });
    
    if (!disciplina) {
      console.log("Disciplina not found in database!");
      continue;
    }
    
    console.log("Database record:", JSON.stringify(disciplina));
    
    const isGlobal = !disciplina.institutionId && !disciplina.instituicao;
    console.log(`isGlobal resolved to: ${isGlobal}`);
    
    if (!isGlobal) {
      const hasRelMatch = !!(disciplina.institutionId && userInstitutionId && disciplina.institutionId === userInstitutionId);
      const hasStrMatch = !!(disciplina.instituicao && requestUser.instituicao && disciplina.instituicao === requestUser.instituicao);
      console.log(`hasRelMatch: ${hasRelMatch}, hasStrMatch: ${hasStrMatch}`);
      if (!hasRelMatch && !hasStrMatch) {
        console.log("❌ REJECTED by validateInstitution middleware!");
      } else {
        console.log("✅ ALLOWED by validateInstitution middleware!");
      }
    } else {
      console.log("✅ Bypassed because isGlobal = true!");
    }

    // Now trace delete route inside quests.ts
    console.log("Running DELETE route trace...");
    if (user.role === 'ARQUITETO' && disciplina.instituicao !== null && disciplina.instituicao !== user.instituicao) {
      console.log("❌ REJECTED by DELETE route hardcoded check!");
    } else {
      console.log("✅ ALLOWED by DELETE route hardcoded check!");
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
