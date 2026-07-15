import { prisma } from '../prisma';
import { generateEmbedding } from './ragService';

export async function syncInstitutionDatabaseToRag(instituicao: string, institutionId: string | null): Promise<void> {
  try {
    // Ponytail: Clear existing RAG vector cache to prevent data duplication/drift
    await prisma.documentChunk.deleteMany({
      where: { document: { instituicao } }
    });
    await prisma.document.deleteMany({
      where: { instituicao }
    });

    const doc = await prisma.document.create({
      data: {
        filename: `Auto_RAG_Base_${instituicao}`,
        instituicao
      }
    });

    // 1. Serialize Students
    const students = await prisma.user.findMany({
      where: { role: 'ALUNO', instituicao },
      include: {
        turma: true,
        questDeliveries: true
      }
    });

    for (const s of students) {
      const totalQuests = s.questDeliveries.length;
      const correctQuests = s.questDeliveries.filter(d => d.isCorrect === true).length;
      const wrongQuests = s.questDeliveries.filter(d => d.isCorrect === false).length;
      const statusText = `Aluno: ${s.nome}. Nickname: @${s.nickname || 'sem-nickname'}. Matrícula: ${s.matricula}. Turma: ${s.turma?.nome || 'Sem Turma'}. Turno: ${s.turno || 'MATUTINO'}. Level: ${s.level}. XP: ${s.xp}. Combo Máximo: ${s.maxCombo}. Quests Totais: ${totalQuests}, Acertos: ${correctQuests}, Falhas: ${wrongQuests}.`;
      
      const embedding = await generateEmbedding(statusText);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: statusText,
          embedding
        }
      });
    }

    // 2. Serialize Teachers
    const teachers = await prisma.user.findMany({
      where: { role: 'PROFESSOR', instituicao },
      include: {
        disciplinas: { include: { disciplina: true } },
        unavailabilities: true
      }
    });

    for (const t of teachers) {
      const materias = t.disciplinas.map(d => d.disciplina.nome).join(', ');
      const restricoes = t.unavailabilities.map(u => `${u.diaSemana} slot ${u.horarioIndex}`).join(', ');
      const statusText = `Professor: ${t.nome}. Categoria: ${t.categoria || 'CONCURSADO'}. Matrícula: ${t.matricula}. Nickname: @${t.nickname || 'sem-nickname'}. Matérias que leciona: ${materias || 'Nenhuma vinculada'}. Horários bloqueados/indisponíveis: ${restricoes || 'Sem restrições'}. Aulas max semanais contratadas: ${t.maxAulasSemanais || 16}.`;
      
      const embedding = await generateEmbedding(statusText);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: statusText,
          embedding
        }
      });
    }

    // 3. Serialize Classes (Turmas)
    const turmas = await prisma.turma.findMany({
      where: { instituicao },
      include: {
        users: { where: { role: 'ALUNO' } },
        timetableSlots: { include: { disciplina: true } }
      }
    });

    for (const tm of turmas) {
      const timetableStr = tm.timetableSlots.map(s => `${s.diaSemana} aula ${s.posicao} (${s.disciplina.nome})`).join(', ');
      const statusText = `Turma: ${tm.nome}. Ano: ${tm.ano || 'N/A'}. Nível: ${tm.nivel}. Quantidade de alunos matriculados: ${tm.users.length}. Unidade corrente: ${tm.unidade}. Grade de Horários alocados: ${timetableStr || 'Sem aulas alocadas na grade'}.`;
      
      const embedding = await generateEmbedding(statusText);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: statusText,
          embedding
        }
      });
    }

    // 4. Serialize Audit Logs (Last 40 Logs)
    const logs = await prisma.actionLog.findMany({
      where: { institution: { nome: instituicao } },
      take: 40,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });

    for (const log of logs) {
      const logText = `Registro de Ação (Auditoria): Usuário ${log.user?.nome || 'Sistema'} executou '${log.action}' em ${new Date(log.createdAt).toLocaleString()}. Detalhes: ${log.details || 'Sem detalhes adicionais'}.`;
      
      const embedding = await generateEmbedding(logText);
      await prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: logText,
          embedding
        }
      });
    }

    console.log(`[Auto-RAG] Sincronização completa realizada para a instituição: ${instituicao}`);
  } catch (err) {
    console.error('[Auto-RAG] Erro crítico ao sincronizar banco para RAG:', err);
  }
}
