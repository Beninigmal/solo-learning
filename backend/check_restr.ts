import { prisma } from './src/prisma';
async function main() {
  const r = await prisma.professorRestriction.findMany({
    include: { professor: true }
  });
  console.dir(r, {depth: null});
}
main().catch(console.error).finally(()=>prisma.$disconnect());
