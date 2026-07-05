import { prisma } from './src/prisma';
import fs from 'fs';

// Copied subset of logic to test why restriction is bypassed
async function testSolve() {
  const turma = await prisma.turma.findFirst({
    where: { nome: 'TURMA C' },
    include: { turmaDisciplinas: { include: { disciplina: true, professor: true } } }
  });
  
  const allRestrictions = await prisma.professorRestriction.findMany({
    where: { professor: { institution: { nome: 'Teste' } } }
  });
  
  const turmaRestrictions = allRestrictions.filter(r =>
    turma!.turmaDisciplinas.some(td => td.professorId === r.professorId)
  );

  console.log("Turma:", turma?.nome);
  console.log("Turma Restrictions:", turmaRestrictions);
  
  const days = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const pos = 2; // Quinta 2º horario
  
  const td = turma?.turmaDisciplinas.find(x => x.disciplina.nome === 'Ciências');
  console.log("Ciencias TD:", td?.disciplina.nome, td?.professorId);
  
  const professorId = td?.professorId;
  const day = 'QUINTA';
  const shift = 'MATUTINO';
  
  const hasRestriction = turmaRestrictions.some(r => {
    if (r.professorId !== professorId || r.diaSemana !== day || r.shift !== shift) return false;
    if (r.posicao === null || r.posicao === undefined) return true;
    return r.posicao === pos;
  });
  
  console.log("Has Restriction for QUINTA 2º horario?:", hasRestriction);
}

testSolve().catch(console.error).finally(()=>prisma.$disconnect());
