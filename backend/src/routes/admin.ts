import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';
import { PrismaUserRepository } from '../infra/database/repositories/PrismaUserRepository';
import { logAction } from '../services/actionLog';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  // Middleware de autorização para ARQUITETO
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', fastify.validateTenantStatus);
  fastify.addHook('preHandler', fastify.validateInstitution);
  
  fastHookUserRoleCheck: fastify.addHook('preHandler', async (request, reply) => {
    if (request.user.role !== 'ARQUITETO') {
      return reply.status(403).send({ error: 'Acesso negado. Apenas o Arquiteto tem permissão.' });
    }
    if (!request.user.instituicao) {
      return reply.status(403).send({ error: 'Acesso negado. Sua conta de Arquiteto não possui instituição associada.' });
    }
  });

  // ─── GESTÃO DE MESTRES ──────────────────────────────────────────────────

  // Criar Mestre
  fastify.post<{ Body: { matricula: string; nome: string; novaMateria?: string; maxAulasSemanais?: number; categoria?: string } }>('/masters', async (request, reply) => {
    const { matricula, nome, novaMateria, maxAulasSemanais, categoria } = request.body;
    const instituicao = request.user.instituicao!;

    if (!matricula || !nome) {
      return reply.status(400).send({ error: 'Matrícula e Nome são obrigatórios.' });
    }

    try {
      const defaultPassword = await bcrypt.hash('1234', 10);
      
      // Se tiver nova matéria, criar ou buscar
      if (novaMateria) {
        // Busca se já existe uma matéria com o mesmo nome na instituição
        const existingDisc = await prisma.disciplina.findFirst({
          where: { nome: novaMateria.trim(), instituicao }
        });
        if (!existingDisc) {
          await prisma.disciplina.create({
            data: {
              nome: novaMateria.trim(),
              instituicao,
              institutionId: request.user.institutionId || null
            }
          });
        }
      }

      let instType = 'MUNICIPAL';
      if (request.user.institutionId) {
        const inst = await prisma.institution.findUnique({
          where: { id: request.user.institutionId }
        });
        if (inst) instType = inst.tipo;
      }
      const isPrivate = instType.startsWith('PRIVADO');
      const finalCategoria = isPrivate ? 'CLT' : (categoria || 'CONCURSADO');

      const user = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase().trim(),
          nome: nome.trim(),
          nickname: null,
          role: 'PROFESSOR',
          password: defaultPassword,
          isFirstAccess: true,
          instituicao,
          institutionId: request.user.institutionId || null,
          maxAulasSemanais: maxAulasSemanais !== undefined ? Math.max(0, maxAulasSemanais) : 16,
          categoria: finalCategoria
        }
      });
      await logAction('Cadastro de Professor', `Professor cadastrado: ${user.nome} (${user.matricula})`, request.user.id, request.user.institutionId);
      return reply.status(201).send({ message: 'Mestre cadastrado com sucesso!', user });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Matrícula já cadastrada.' });
      }
      return reply.status(500).send({ error: 'Erro ao cadastrar mestre.' });
    }
  });

  // Listar Mestres da Instituição
  fastify.get('/masters', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const masters = await prisma.user.findMany({
      where: { role: 'PROFESSOR', instituicao },
      select: { id: true, nome: true, nickname: true, matricula: true, instituicao: true, createdAt: true, maxAulasSemanais: true }
    });
    return reply.status(200).send(masters);
  });

  // Editar Mestre da Instituição
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string; maxAulasSemanais?: number; categoria?: string } }>('/masters/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname, maxAulasSemanais, categoria } = request.body;
    const instituicao = request.user.instituicao!;

    if (nickname && /\s/.test(nickname.trim())) {
      return reply.status(400).send({ error: 'O nickname não pode conter espaços.' });
    }

    try {
      let instType = 'MUNICIPAL';
      if (request.user.institutionId) {
        const inst = await prisma.institution.findUnique({
          where: { id: request.user.institutionId }
        });
        if (inst) instType = inst.tipo;
      }
      const isPrivate = instType.startsWith('PRIVADO');
      const finalCategoria = isPrivate ? 'CLT' : (categoria !== undefined ? categoria : undefined);

      const updated = await prisma.user.update({
        where: { id, role: 'PROFESSOR', instituicao },
        data: { 
          nome: nome ? nome.trim() : undefined, 
          nickname: nickname ? nickname.trim() : undefined,
          maxAulasSemanais: maxAulasSemanais !== undefined ? Math.max(0, maxAulasSemanais) : undefined,
          categoria: finalCategoria
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Mestre não encontrado na sua instituição.' });
    }
  });

  // ─── GESTÃO GLOBAL DE ALUNOS ─────────────────────────────────────────────

  // Listar todos os alunos da Instituição (opcionalmente filtrado por turma)
  fastify.get<{ Querystring: { turmaId?: string } }>('/students', async (request, reply) => {
    const { turmaId } = request.query;
    const instituicao = request.user.instituicao!;
    const students = await prisma.user.findMany({
      where: { 
        role: 'ALUNO',
        instituicao,
        ...(turmaId ? { turmaId } : {})
      },
      include: { turma: true },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(students);
  });

  // Editar Aluno da Instituição
  fastify.put<{ Params: { id: string }; Body: { nome?: string; nickname?: string; turmaId?: string } }>('/students/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, nickname, turmaId } = request.body;
    const instituicao = request.user.instituicao!;

    if (nickname && /\s/.test(nickname.trim())) {
      return reply.status(400).send({ error: 'O nickname não pode conter espaços.' });
    }

    try {
      // Verificar se a turma pertence à instituição se estiver trocando
      if (turmaId) {
        const targetTurma = await prisma.turma.findFirst({
          where: { id: turmaId, instituicao }
        });
        if (!targetTurma) {
          return reply.status(400).send({ error: 'Turma de destino inválida ou pertence a outra instituição.' });
        }
      }

      const updated = await prisma.user.update({
        where: { id, role: 'ALUNO', instituicao },
        data: { 
          nome: nome ? nome.trim() : undefined, 
          nickname: nickname ? nickname.trim() : undefined,
          ...(turmaId !== undefined ? { turmaId: turmaId || null } : {})
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado na sua instituição.' });
    }
  });

  // ─── GESTÃO DE VÍNCULOS ──────────────────────────────────────────────────

  // Criar Turma na Instituição
  fastify.post<{ Body: { nome: string; ano: string; codigoInvocacao?: string; nivel?: string } }>('/turmas', async (request, reply) => {
    const { nome, ano, codigoInvocacao, nivel } = request.body;
    const instituicao = request.user.instituicao!;

    if (!nome || !ano) {
      return reply.status(400).send({ error: 'Nome e Ano são obrigatórios.' });
    }

    try {
      const currentYear = new Date().getFullYear();
      const yearNum = parseInt(ano.trim());
      if (isNaN(yearNum) || yearNum < currentYear) {
        return reply.status(400).send({ error: `O ano não pode ser menor que o ano corrente (${currentYear}).` });
      }

      const formattedNome = nome.toUpperCase().trim();

      // ponytail: no class name uniqueness check is enforced because the same class name (e.g. "3º Ano B") can be created for different shifts (matutino/vespertino) in the same year.

      let finalNivel = nivel;
      if (request.user.institutionId) {
        const inst = await prisma.institution.findUnique({
          where: { id: request.user.institutionId }
        });
        if (inst) {
          if (inst.tipo === 'MUNICIPAL' || inst.tipo === 'PRIVADO_FUNDAMENTAL') {
            finalNivel = 'FUNDAMENTAL';
          } else if (inst.tipo === 'ESTADUAL' || inst.tipo === 'PRIVADO_MEDIO') {
            finalNivel = 'MEDIO';
          } else if (inst.tipo === 'PRIVADO_LIVRE') {
            finalNivel = 'LIVRE';
          }
        }
      }
      if (!finalNivel) {
        finalNivel = 'FUNDAMENTAL';
      }

      const turma = await prisma.turma.create({
        data: {
          nome: formattedNome,
          ano: ano.trim(),
          codigoInvocacao: codigoInvocacao ? codigoInvocacao.trim() : "1234",
          nivel: finalNivel,
          instituicao,
          institutionId: request.user.institutionId || null
        }
      });

      return reply.status(201).send(turma);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao criar turma.' });
    }
  });

  // Listar Turmas da Instituição
  fastify.get('/turmas', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const turmas = await prisma.turma.findMany({
      where: { instituicao },
      include: {
        users: {
          where: { role: 'ALUNO' },
          orderBy: { nome: 'asc' }
        },
        turmaDisciplinas: {
          include: {
            professor: {
              select: {
                id: true,
                nome: true,
                nickname: true,
                matricula: true
              }
            },
            disciplina: true
          }
        }
      },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(turmas);
  });

  // Editar Turma na Instituição
  fastify.put<{ Params: { id: string }; Body: { nome?: string; ano?: string; codigoInvocacao?: string; nivel?: string } }>('/turmas/:id', async (request, reply) => {
    const { id } = request.params;
    const { nome, ano, codigoInvocacao, nivel } = request.body;
    const instituicao = request.user.instituicao!;

    try {
      if (ano) {
        const currentYear = new Date().getFullYear();
        const yearNum = parseInt(ano.trim());
        if (isNaN(yearNum) || yearNum < currentYear) {
          return reply.status(400).send({ error: `O ano não pode ser menor que o ano corrente (${currentYear}).` });
        }
      }

      // ponytail: no class name uniqueness check is enforced because the same class name (e.g. "3º Ano B") can be created for different shifts (matutino/vespertino) in the same year.

      const updated = await prisma.turma.update({
        where: { id, instituicao },
        data: {
          ...(nome ? { nome: nome.toUpperCase().trim() } : {}),
          ...(ano ? { ano: ano.trim() } : {}),
          ...(codigoInvocacao ? { codigoInvocacao: codigoInvocacao.trim() } : {}),
          nivel
        }
      });
      return reply.send(updated);
    } catch (error) {
      return reply.status(404).send({ error: 'Turma não encontrada na sua instituição.' });
    }
  });

  // Gerar Matérias Padrão
  fastify.post<{ Body: { nivel?: string } }>('/disciplinas/default', async (request, reply) => {
    const { nivel } = request.body || {};
    const instituicao = request.user.instituicao!;
    const institutionId = request.user.institutionId || null;
    
    try {
      const isMedio = nivel === 'MEDIO';
      const defaultSubjects = isMedio ? 
        ['Língua Portuguesa', 'Matemática', 'História', 'Geografia', 'Biologia', 'Física', 'Química', 'Sociologia', 'Filosofia', 'Educação Física', 'Artes', 'Língua Inglesa'] :
        ['Língua Portuguesa', 'Matemática', 'História', 'Geografia', 'Ciências', 'Artes', 'Educação Física', 'Ensino Religioso', 'Língua Inglesa'];

      let count = 0;
      for (const subject of defaultSubjects) {
        const existing = await prisma.disciplina.findFirst({
          where: { nome: subject, instituicao }
        });
        if (!existing) {
          await prisma.disciplina.create({
            data: {
              nome: subject,
              instituicao,
              institutionId
            }
          });
          count++;
        }
      }
      return reply.status(201).send({ message: `${count} matérias padrão criadas com sucesso!` });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao gerar matérias padrão.' });
    }
  });

  // Limpar Matérias Órfãs
  fastify.delete('/disciplinas/unlinked', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    try {
      const disciplinas = await prisma.disciplina.findMany({
        where: { instituicao },
        include: { _count: { select: { turmaDisciplinas: true } } }
      });
      const unlinkedIds = disciplinas.filter(d => d._count.turmaDisciplinas === 0).map(d => d.id);
      if (unlinkedIds.length === 0) {
         return reply.status(200).send({ message: 'Nenhuma matéria órfã encontrada.' });
      }
      await prisma.disciplina.deleteMany({
        where: { id: { in: unlinkedIds } }
      });
      return reply.status(200).send({ message: `${unlinkedIds.length} matérias órfãs removidas com sucesso.` });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao limpar matérias órfãs.' });
    }
  });

  // Listar Disciplinas da Instituição
  fastify.get('/disciplinas', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    const disciplinas = await prisma.disciplina.findMany({
      where: { instituicao },
      orderBy: { nome: 'asc' }
    });
    return reply.status(200).send(disciplinas);
  });

  // Criar Vínculo na Instituição (Turma + Disciplina + Professor)
  fastify.post<{ Body: { professorId: string; disciplinaId: string; turmaId: string } }>('/vinculos', async (request, reply) => {
    const { professorId, disciplinaId, turmaId } = request.body;
    const instituicao = request.user.instituicao!;

    if (!professorId || !disciplinaId || !turmaId) {
      return reply.status(400).send({ error: 'Professor, Disciplina e Turma são obrigatórios.' });
    }

    try {
      // Validar que todos os elementos pertencem à instituição do Arquiteto
      const p = await prisma.user.findFirst({ where: { id: professorId, role: 'PROFESSOR', instituicao } });
      const d = await prisma.disciplina.findFirst({ where: { id: disciplinaId, instituicao } });
      const t = await prisma.turma.findFirst({ where: { id: turmaId, instituicao } });

      if (!p || !d || !t) {
        return reply.status(400).send({ error: 'Os elementos selecionados devem pertencer à mesma instituição.' });
      }

      // Calcular a carga atual em outras turmas/matérias
      const existingVinculos = await prisma.turmaDisciplina.findMany({
        where: { professorId },
        include: { disciplina: true, turma: true }
      });

      const cleanNormalize = (name: string): string => {
        return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      };

      const getSubjectDefaultHours = (subjectName: string, turmaNome?: string, turmaNivel?: string): number => {
        const cleanSub = cleanNormalize(subjectName);
        let level: "FUNDAMENTAL" | "MEDIO_REGULAR" | "MEDIO_TECNICO" = "FUNDAMENTAL";
        if (turmaNivel) {
          if (turmaNivel === 'MEDIO') level = 'MEDIO_REGULAR';
          else if (turmaNivel === 'MEDIO_TECNICO') level = 'MEDIO_TECNICO';
          else if (turmaNivel === 'FUNDAMENTAL') level = 'FUNDAMENTAL';
        } else if (turmaNome) {
          const cleanTurma = cleanNormalize(turmaNome);
          if (/tec|tecnico|profes/.test(cleanTurma)) {
            level = "MEDIO_TECNICO";
          } else if (/[56789]/.test(cleanTurma)) {
            level = "FUNDAMENTAL";
          } else if (/[123]/.test(cleanTurma)) {
            level = "MEDIO_REGULAR";
          }
        }
        if (cleanSub.includes("portugues") || cleanSub.includes("lingua portuguesa") || cleanSub.includes("redacao")) {
          return (level === "FUNDAMENTAL") ? 5 : 4;
        }
        if (cleanSub.includes("matematica") || cleanSub.includes("calculo")) {
          if (level === "FUNDAMENTAL") return 5;
          if (level === "MEDIO_REGULAR") return 2;
          return 3;
        }
        if (cleanSub.includes("historia") || cleanSub.includes("geografia")) {
          return (level === "FUNDAMENTAL") ? 3 : 2;
        }
        if (cleanSub.includes("ciencia") && !cleanSub.includes("biologia")) {
          return (level === "FUNDAMENTAL") ? 3 : 0;
        }
        if (cleanSub.includes("biologia")) {
          return (level === "FUNDAMENTAL") ? 0 : 2;
        }
        if (cleanSub.includes("fisica")) {
          return (level === "FUNDAMENTAL") ? 0 : 2;
        }
        if (cleanSub.includes("quimica")) {
          return (level === "FUNDAMENTAL") ? 0 : 2;
        }
        if (cleanSub.includes("ingles") || cleanSub.includes("ed") || cleanSub.includes("esport")) {
          return 2;
        }
        if (cleanSub.includes("arte") || cleanSub.includes("filosofia") || cleanSub.includes("relig") || cleanSub.includes("sociologia")) {
          return 1;
        }
        return 2;
      };

      let otherHours = 0;
      for (const ov of existingVinculos) {
        if (ov.turmaId === turmaId && ov.disciplinaId === disciplinaId) {
          continue;
        }
        otherHours += ov.aulasSemanais > 0 ? ov.aulasSemanais : getSubjectDefaultHours(ov.disciplina.nome, ov.turma?.nome, ov.turma?.nivel);
      }

      const newHours = getSubjectDefaultHours(d.nome, t.nome, t.nivel);
      const limit = p.maxAulasSemanais ?? 32;
      const totalProposed = otherHours + newHours;

      if (totalProposed > limit) {
        return reply.status(400).send({
          error: `Carga horária semanal excedida! O professor já possui ${otherHours} aulas/semana alocadas. Adicionar esta turma demandaria mais ${newHours} aulas, totalizando ${totalProposed} aulas/semana, o que supera o limite dele de ${limit} aulas/semana.`
        });
      }

      const vinculo = await prisma.turmaDisciplina.create({
        data: {
          professorId,
          disciplinaId,
          turmaId
        }
      });

      return reply.status(201).send({ message: 'Vínculo criado com sucesso!', vinculo });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(400).send({ error: 'Este professor já leciona esta disciplina para esta turma.' });
      }
      return reply.status(500).send({ error: 'Erro ao criar vínculo.' });
    }
  });

  // Excluir Vínculo (Turma + Disciplina + Professor)
  fastify.delete<{ Params: { id: string } }>('/vinculos/:id', async (request, reply) => {
    const { id } = request.params;
    const instituicao = request.user.instituicao!;

    try {
      const vinculo = await prisma.turmaDisciplina.findFirst({
        where: { id, turma: { instituicao } }
      });

      if (!vinculo) {
        return reply.status(404).send({ error: 'Vínculo não encontrado.' });
      }

      await prisma.turmaDisciplina.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Vínculo removido com sucesso!' });
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao remover vínculo.' });
    }
  });

  // ─── GESTÃO DE RECRUTAMENTO DE ALUNOS (ARQUITETO) ────────────────────────

  // Criar Aluno (ou associar existente)
  fastify.post<{ Body: { matricula: string; nome: string; turmaId: string; turno: string } }>('/students', async (request, reply) => {
    const { matricula, nome, turmaId, turno } = request.body;
    if (!matricula || !nome || !turmaId) return reply.status(400).send({ error: 'Dados obrigatórios faltando.' });

    try {
      const turma = await prisma.turma.findFirst({
        where: { 
          id: turmaId,
          instituicao: request.user.instituicao
        }
      });
      if (!turma) return reply.status(403).send({ error: 'Turma não encontrada ou sem permissão.' });

      const existingStudent = await prisma.user.findUnique({
        where: { matricula: matricula.toLowerCase().trim() }
      });

      if (existingStudent) {
        // Atualiza a turma e turno do aluno existente
        const updatedStudent = await prisma.user.update({
          where: { id: existingStudent.id },
          data: {
            turmaId,
            turno,
            instituicao: request.user.instituicao,
            institutionId: request.user.institutionId || null
          }
        });
        return reply.status(200).send(updatedStudent);
      }

      const student = await prisma.user.create({
        data: {
          matricula: matricula.toLowerCase().trim(),
          nome: nome.trim(),
          role: 'ALUNO',
          turmaId,
          turno,
          password: 'INITIAL_SUMMONING_CODE_LOGIN', // Placeholder
          isFirstAccess: true,
          instituicao: request.user.instituicao,
          institutionId: request.user.institutionId || null
        }
      });
      await logAction('Cadastro de Aluno', `Aluno cadastrado: ${student.nome} (${student.matricula})`, request.user.id, request.user.institutionId);
      return reply.status(201).send(student);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao processar cadastro de aluno.', details: error.message });
    }
  });

  // Cadastrar Alunos em Lote
  fastify.post<{ Body: { students: { nome: string; matricula: string; turno?: string }[]; turmaId: string } }>('/students/batch', async (request, reply) => {
    const { students, turmaId } = request.body;

    if (!students || !Array.isArray(students) || !turmaId) {
      return reply.status(400).send({ error: 'Lista de estudantes e turmaId são obrigatórios.' });
    }

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(turmaId);
      
      console.log('--- DEBUG BATCH STUDENTS ---');
      console.log('turmaId recebida:', turmaId);
      console.log('isUUID:', isUUID);

      let turma;
      if (isUUID) {
        turma = await prisma.turma.findFirst({
          where: { 
            id: turmaId,
            instituicao: request.user.instituicao
          }
        });
        console.log('Busca por UUID resultou em:', turma ? turma.id : 'NADA');
      } else {
        const turmaName = turmaId.toUpperCase().trim();
        turma = await prisma.turma.findFirst({
          where: {
            nome: turmaName,
            instituicao: request.user.instituicao
          }
        });
        
        if (!turma) {
           let finalNivel = 'FUNDAMENTAL';
           if (request.user.institutionId) {
             const inst = await prisma.institution.findUnique({ where: { id: request.user.institutionId } });
             if (inst && (inst.tipo === 'ESTADUAL' || inst.tipo === 'PRIVADO_MEDIO')) {
                finalNivel = 'MEDIO';
             }
           }
           turma = await prisma.turma.create({
              data: {
                 nome: turmaName,
                 ano: String(new Date().getFullYear()),
                 nivel: finalNivel,
                 codigoInvocacao: '1234',
                 instituicao: request.user.instituicao,
                 institutionId: request.user.institutionId || null
              }
           });
        }
      }

      if (!turma) {
        return reply.status(404).send({ error: 'Turma não encontrada ou sem permissão.' });
      }

      let createdCount = 0;
      let errors: string[] = [];

      for (const s of students) {
        if (!s.nome || !s.matricula) {
          errors.push(`Aluno sem nome ou matrícula ignorado.`);
          continue;
        }

        try {
          await prisma.user.create({
            data: {
              nome: s.nome.trim(),
              matricula: s.matricula.toLowerCase().trim(),
              role: 'ALUNO',
              turno: s.turno || 'MATUTINO',
              turmaId: turma.id,
              password: 'SUMMONING_CODE',
              isFirstAccess: true,
              instituicao: request.user.instituicao,
              institutionId: request.user.institutionId || null
            }
          });
          createdCount++;
        } catch (e: any) {
          if (e.code === 'P2002') {
            errors.push(`Matrícula ${s.matricula} já existe.`);
          } else {
            errors.push(`Erro ao criar ${s.nome}: ${e.message}`);
          }
        }
      }

      await logAction('Cadastro em Lote (Alunos)', `${createdCount} alunos cadastrados em lote`, request.user.id, request.user.institutionId);

      return reply.status(201).send({ 
        message: `${createdCount} alunos cadastrados com sucesso.`,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao processar lote.' });
    }
  });

  // Resetar Aluno (Voltar para primeiro acesso)
  fastify.post<{ Params: { id: string } }>('/students/:id/reset', async (request, reply) => {
    const { id } = request.params;

    try {
      await prisma.user.update({
        where: { 
          id, 
          role: 'ALUNO',
          instituicao: request.user.instituicao
        },
        data: { 
          isFirstAccess: true,
          nickname: null,
          password: 'RESET_TO_SUMMONING_CODE'
        }
      });
      return reply.send({ message: 'Acesso do aluno resetado com sucesso! Ele deve usar o Código de Invocação da Turma.' });
    } catch (error) {
      return reply.status(404).send({ error: 'Aluno não encontrado ou sem permissão.' });
    }
  });

  // Resetar Mestre (Voltar para primeiro acesso)
  fastify.post<{ Params: { id: string } }>('/masters/:id/reset', async (request, reply) => {
    const { id } = request.params;
    const instituicao = request.user.instituicao!;

    try {
      const defaultPassword = await bcrypt.hash('1234', 10);
      await prisma.user.update({
        where: { 
          id, 
          role: 'PROFESSOR',
          instituicao
        },
        data: { 
          isFirstAccess: true,
          nickname: null,
          password: defaultPassword
        }
      });
      return reply.send({ message: 'Acesso do mestre resetado com sucesso! A senha padrão voltou a ser "1234" e ele fará o primeiro acesso novamente.' });
    } catch (error) {
      return reply.status(404).send({ error: 'Mestre não encontrado ou sem permissão.' });
    }
  });

  // ==========================================
  // EXCEL BULK PARSING AND TEMPLATES
  // ==========================================

  // Parser Genérico de Excel em Base64
  fastify.post<{ Body: { base64: string } }>('/upload/excel', async (request, reply) => {
    const { base64 } = request.body;
    if (!base64) {
      return reply.status(400).send({ error: 'O payload base64 é obrigatório.' });
    }

    try {
      const buffer = Buffer.from(base64, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const cleanNormalize = (name: string): string => {
        if (typeof name !== 'string') return '';
        return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
      };

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      let headerRowIndex = -1;
      let headers: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const normalizedCols = row.map(cell => cell !== undefined && cell !== null ? cleanNormalize(String(cell)) : '');
        if (normalizedCols.includes('nome') || normalizedCols.includes('nomedoprofessor') || normalizedCols.includes('matricula')) {
          headerRowIndex = i;
          headers = normalizedCols;
          break;
        }
      }

      if (headerRowIndex === -1) {
        // Fallback: se não achar, tentar parse padrão
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        const parsedRows = jsonData.map((row: any) => {
          const normalizedRow: any = {};
          for (const key of Object.keys(row)) {
            const normKey = cleanNormalize(key);
            normalizedRow[normKey] = row[key];
          }
          return normalizedRow;
        });
        return reply.send(parsedRows);
      }

      const parsedRows = [];
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const obj: any = {};
        let hasData = false;
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            obj[headers[j]] = row[j];
            if (row[j] !== undefined && row[j] !== null && String(row[j]).trim() !== '') hasData = true;
          }
        }
        if (hasData) parsedRows.push(obj);
      }

      console.log('--- DEBUG UPLOAD EXCEL ---');
      console.log('Headers encontrados:', headers);
      console.log('Exemplo primeira linha parseada:', parsedRows[0]);
      console.log('Total de registros:', parsedRows.length);
      console.log('--------------------------');

      return reply.send(parsedRows);
    } catch (err: any) {
      return reply.status(400).send({ error: 'Falha ao ler ou converter o arquivo Excel.', details: err.message });
    }
  });

  // Download do Template Excel
  fastify.get<{ Params: { type: string } }>('/templates/:type', async (request, reply) => {
    const { type } = request.params;

    try {
      const wb = XLSX.utils.book_new();
      let ws;

      if (type === 'alunos') {
        const data = [
          { "Nome": "Arthur Pendragon", "Matricula": "2026101", "Turma": "5A", "Turno": "MATUTINO" },
          { "Nome": "Sung Jinwoo", "Matricula": "2026102", "Turma": "5B", "Turno": "VESPERTINO" }
        ];
        ws = XLSX.utils.json_to_sheet(data);
      } else if (type === 'professores') {
        const data = [
          { "Nome": "Thomas Andre", "Matricula": "M001", "Carga Horaria Contratual (horas)": 40 },
          { "Nome": "Lennart Niermann", "Matricula": "M002", "Carga Horaria Contratual (horas)": 20 }
        ];
        ws = XLSX.utils.json_to_sheet(data);
      } else {
        return reply.status(400).send({ error: 'Tipo de template desconhecido.' });
      }

      XLSX.utils.book_append_sheet(wb, ws, "Template");
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename=template_${type}.xlsx`);
      return reply.send(buffer);
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro ao gerar template.', details: err.message });
    }
  });

  // Cadastro de Professores/Mestres em Lote
  fastify.post<{ Body: { teachers: { nome: string; matricula: string; maxAulasSemanais?: number; cargahoraria?: number; cargahorariacontratual?: number; categoria?: string; disciplina?: string }[] } }>('/masters/batch', async (request, reply) => {
    const { teachers } = request.body;
    const instituicao = request.user.instituicao!;
    const institutionId = request.user.institutionId || null;

    if (!teachers || !Array.isArray(teachers)) {
      return reply.status(400).send({ error: 'Lista de professores é obrigatória.' });
    }

    try {
      let instType = 'MUNICIPAL';
      if (institutionId) {
        const inst = await prisma.institution.findUnique({
          where: { id: institutionId }
        });
        if (inst) instType = inst.tipo;
      }
      const isPrivate = instType.startsWith('PRIVADO');

      const defaultPassword = await bcrypt.hash('1234', 10);
      let createdCount = 0;
      let errors: string[] = [];

      for (const t of teachers) {
        if (!t.nome || !t.matricula) {
          errors.push(`Professor sem nome ou matrícula ignorado.`);
          continue;
        }

        // Mapear carga contratual ou limite de aulas com base no MEC 1/3 (Concursado) ou 80% (REDA) ou 100% (CLT)
        let maxAulas = 16;
        const rawCarga = t.cargahoraria || t.cargahorariacontratual;
        let catClean = isPrivate ? 'CLT' : String(t.categoria || 'CONCURSADO').toUpperCase().trim();

        if (rawCarga) {
          const hours = Number(rawCarga);
          if (catClean === 'CLT') {
            maxAulas = hours;
          } else if (catClean === 'REDA') {
            if (hours === 20) maxAulas = 16;
            else if (hours === 40) maxAulas = 32;
            else maxAulas = Math.floor(hours * 0.80);
          } else {
            if (hours === 20) maxAulas = 13;
            else if (hours === 24) maxAulas = 16;
            else if (hours === 26) maxAulas = 17;
            else if (hours === 30) maxAulas = 20;
            else if (hours === 40) maxAulas = 26;
            else maxAulas = Math.floor(hours * (2 / 3));
          }
        } else if (t.maxAulasSemanais) {
          maxAulas = t.maxAulasSemanais;
        }

        try {
          const user = await prisma.user.create({
            data: {
              nome: t.nome.trim(),
              matricula: t.matricula.toLowerCase().trim(),
              role: 'PROFESSOR',
              password: defaultPassword,
              isFirstAccess: true,
              instituicao,
              institutionId,
              maxAulasSemanais: maxAulas,
              categoria: catClean
            }
          });
          
          if (t.disciplina) {
            const discName = t.disciplina.trim();
            let disc = await prisma.disciplina.findFirst({
              where: { nome: discName, instituicao }
            });
            if (!disc) {
              disc = await prisma.disciplina.create({
                data: { nome: discName, instituicao, institutionId }
              });
            }
            await prisma.disciplinaProfessor.create({
              data: {
                professorId: user.id,
                disciplinaId: disc.id,
                temp: false
              }
            });
          }
          
          createdCount++;
        } catch (e: any) {
          if (e.code === 'P2002') {
            errors.push(`Mestre com matrícula ${t.matricula} já existe.`);
          } else {
            errors.push(`Erro ao criar ${t.nome}: ${e.message}`);
          }
        }
      }

      await logAction('Cadastro em Lote (Professores)', `${createdCount} professores cadastrados em lote`, request.user.id, request.user.institutionId);

      return reply.status(201).send({
        message: `${createdCount} professores cadastrados com sucesso.`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Erro interno ao processar lote.', details: err.message });
    }
  });

  // ─── SOLICITAÇÕES DE EXCLUSÃO DE CONTA ────────────────────────────────────

  fastify.delete<{ Params: { id: string }, Querystring: { ai?: string } }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const { ai } = request.query;
    const instituicao = request.user.instituicao!;

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id }
      });
      
      if (!targetUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }
      
      if (targetUser.instituicao !== instituicao) {
        return reply.status(403).send({ error: 'Acesso negado. Usuário pertence a outra instituição.' });
      }

      const userRepository = new PrismaUserRepository();
      await userRepository.delete(id);

      const logPrefix = ai === 'true' ? 'Exclusão de Usuário (IA)' : 'Exclusão de Usuário';
      await logAction(logPrefix, `Usuário excluído: ${targetUser.nome} (${targetUser.matricula})`, request.user.id, request.user.institutionId);

      return reply.status(200).send({ message: 'Usuário excluído com sucesso.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao excluir usuário.' });
    }
  });

  fastify.get('/delete-requests', async (request, reply) => {
    const instituicao = request.user.instituicao!;
    try {
      const requests = await prisma.deleteAccountRequest.findMany({
        where: { instituicao },
        orderBy: { createdAt: 'desc' }
      });
      return reply.status(200).send(requests);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao listar solicitações de exclusão.' });
    }
  });

  fastify.post<{ Params: { id: string } }>('/delete-requests/:id/confirm', async (request, reply) => {
    const { id } = request.params;
    const instituicao = request.user.instituicao!;
    try {
      const reqDel = await prisma.deleteAccountRequest.findUnique({
        where: { id }
      });
      if (!reqDel) {
        return reply.status(404).send({ error: 'Solicitação de exclusão não encontrada.' });
      }
      if (reqDel.instituicao !== instituicao) {
        return reply.status(403).send({ error: 'Acesso negado.' });
      }

      const userRepository = new PrismaUserRepository();
      const deletedUser = await prisma.user.findUnique({ where: { id: reqDel.userId } });
      const userName = deletedUser ? deletedUser.nome : reqDel.userId;

      await userRepository.delete(reqDel.userId);

      try {
        await prisma.deleteAccountRequest.delete({ where: { id } });
      } catch (err) {}

      await logAction('Exclusão de Conta (Solicitação Confirmada)', `Conta excluída via solicitação: ${userName} (Motivo: ${reqDel.motivo})`, request.user.id, request.user.institutionId);

      return reply.status(200).send({ message: 'Conta excluída com sucesso.' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao confirmar exclusão de conta.' });
    }
  });

  fastify.delete<{ Params: { id: string } }>('/delete-requests/:id/reject', async (request, reply) => {
    const { id } = request.params;
    const instituicao = request.user.instituicao!;
    try {
      const reqDel = await prisma.deleteAccountRequest.findUnique({
        where: { id }
      });
      if (!reqDel) {
        return reply.status(404).send({ error: 'Solicitação de exclusão não encontrada.' });
      }
      if (reqDel.instituicao !== instituicao) {
        return reply.status(403).send({ error: 'Acesso negado.' });
      }

      await prisma.deleteAccountRequest.delete({
        where: { id }
      });

      return reply.status(200).send({ message: 'Solicitação de exclusão rejeitada com sucesso.' });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Erro ao rejeitar exclusão de conta.' });
    }
  });

  // ─── MATRIZ DE AUDITORIA ──────────────────────────────────────────────────
  fastify.get<{ Querystring: { institutionId?: string; instituicao?: string; turmaId?: string; ano?: string; unidade?: string; disciplinaId?: string } }>(
    '/matrix/audit',
    async (request, reply) => {
      const { institutionId, instituicao: targetInstName, turmaId, ano, unidade, disciplinaId } = request.query;

      try {
        let targetInst: any = null;
        if (institutionId) {
          targetInst = await prisma.institution.findUnique({ where: { id: institutionId } });
        } else if (targetInstName) {
          targetInst = await prisma.institution.findUnique({ where: { nome: targetInstName } });
        } else if (request.user.institutionId) {
          targetInst = await prisma.institution.findUnique({ where: { id: request.user.institutionId } });
        } else if (request.user.instituicao) {
          targetInst = await prisma.institution.findUnique({ where: { nome: request.user.instituicao } });
        }

        const instituicaoName = targetInst?.nome || request.user.instituicao || '';
        const targetInstId = targetInst?.id || request.user.institutionId || undefined;

        // Filtro base de turmas
        const turmaWhere: any = {};
        if (instituicaoName) turmaWhere.instituicao = instituicaoName;
        if (turmaId) turmaWhere.id = turmaId;
        if (ano) turmaWhere.ano = ano;
        if (unidade) turmaWhere.unidade = parseInt(unidade, 10);

        const turmas = await prisma.turma.findMany({
          where: turmaWhere,
          select: { id: true, nome: true, ano: true, unidade: true }
        });
        const turmaIds = turmas.map(t => t.id);

        // Filtro de entregas de quests
        const hasTurmaFilter = !!(turmaId || ano || unidade);
        const deliveryWhere: any = {};
        const wrongAnswersWhere: any = {};
        const questWhere: any = {};

        if (instituicaoName) {
          deliveryWhere.user = { instituicao: instituicaoName };
          wrongAnswersWhere.user = { instituicao: instituicaoName };
          questWhere.turmaAlvo = { instituicao: instituicaoName };
        }

        if (hasTurmaFilter && turmaIds.length === 0) {
          deliveryWhere.user = { id: 'impossible-id' };
          wrongAnswersWhere.user = { id: 'impossible-id' };
          questWhere.turmaAlvoId = 'impossible-id';
        } else if (turmaIds.length > 0) {
          deliveryWhere.user = { ...deliveryWhere.user, turmaId: { in: turmaIds } };
          wrongAnswersWhere.user = { ...wrongAnswersWhere.user, turmaId: { in: turmaIds } };
          questWhere.turmaAlvoId = { in: turmaIds };
        }

        if (disciplinaId) {
          deliveryWhere.quest = { disciplinaId };
          wrongAnswersWhere.quest = { disciplinaId };
          questWhere.disciplinaId = disciplinaId;
        }

        const totalQuestsCreated = await prisma.quest.count({ where: questWhere });
        const totalDeliveries = await prisma.questDelivery.count({ where: deliveryWhere });
        const correctDeliveries = await prisma.questDelivery.count({
          where: { ...deliveryWhere, isCorrect: true }
        });
        const wrongDeliveries = await prisma.questDelivery.count({
          where: { ...deliveryWhere, isCorrect: false }
        });

        const totalAnswered = correctDeliveries + wrongDeliveries;
        const hitRate = totalAnswered > 0 
          ? Math.round((correctDeliveries / totalAnswered) * 100) 
          : 0;

        // Baú de Erros
        const totalWrongAnswers = await prisma.wrongAnswer.count({ where: wrongAnswersWhere });
        const resolvedWrongAnswers = await prisma.wrongAnswer.count({
          where: { ...wrongAnswersWhere, resolvido: true }
        });

        // Logs de auditoria recentes
        const logs = await prisma.actionLog.findMany({
          where: targetInstId ? { institutionId: targetInstId } : {},
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { nome: true, role: true } } }
        });

        // Detalhamento por Disciplina
        const disciplinas = await prisma.disciplina.findMany({
          where: instituicaoName ? { instituicao: instituicaoName } : {},
          select: { id: true, nome: true }
        });

        const disciplinaStats = await Promise.all(
          disciplinas.map(async (d) => {
            const totalQuests = await prisma.quest.count({
              where: { ...questWhere, disciplinaId: d.id }
            });
            const totalDeliv = await prisma.questDelivery.count({
              where: { ...deliveryWhere, quest: { disciplinaId: d.id } }
            });
            const correct = await prisma.questDelivery.count({
              where: { ...deliveryWhere, isCorrect: true, quest: { disciplinaId: d.id } }
            });
            const wrong = await prisma.questDelivery.count({
              where: { ...deliveryWhere, isCorrect: false, quest: { disciplinaId: d.id } }
            });
            const answered = correct + wrong;
            const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;

            return {
              disciplinaId: d.id,
              nome: d.nome,
              totalQuests,
              totalDeliveries: totalDeliv,
              totalAnswered: answered,
              correct,
              wrong,
              hitRate: rate
            };
          })
        );

        return reply.status(200).send({
          summary: {
            totalTurmas: turmas.length,
            totalQuestsCreated,
            totalDeliveries,
            totalAnswered,
            correctDeliveries,
            wrongDeliveries,
            hitRate,
            totalWrongAnswers,
            resolvedWrongAnswers,
            bauResolutionRate: totalWrongAnswers > 0 ? Math.round((resolvedWrongAnswers / totalWrongAnswers) * 100) : 0
          },
          turmas,
          disciplinaStats,
          auditLogs: logs
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao gerar dados da matriz de auditoria.' });
      }
    }
  );

  // ─── RELATÓRIO POR UNIDADE (1, 2 ou 3) ────────────────────────────────────
  fastify.get<{ Querystring: { unidade?: string; turmaId?: string; ano?: string; disciplinaId?: string } }>(
    '/reports/unit',
    async (request, reply) => {
      const instituicao = request.user.instituicao!;
      const { unidade = '1', turmaId, ano, disciplinaId } = request.query;

      try {
        const unidadeNum = parseInt(unidade, 10);
        const turmaWhere: any = { instituicao, unidade: unidadeNum };
        if (turmaId) turmaWhere.id = turmaId;
        if (ano) turmaWhere.ano = ano;

        const turmas = await prisma.turma.findMany({ where: turmaWhere, select: { id: true } });
        const turmaIds = turmas.map(t => t.id);

        const deliveryWhere: any = {
          user: { instituicao, turmaId: { in: turmaIds } }
        };
        if (disciplinaId) deliveryWhere.quest = { disciplinaId };

        const deliveries = await prisma.questDelivery.findMany({
          where: deliveryWhere,
          include: {
            quest: { include: { disciplina: true } },
            user: { select: { id: true, nome: true, matricula: true, xp: true } }
          }
        });

        // Agrupar por disciplina/tópico para identificar Ganhos e Déficits
        const bySubject: Record<string, { nome: string; total: number; correct: number; wrong: number; temas: Record<string, { total: number; correct: number }> }> = {};

        deliveries.forEach((d) => {
          const subName = d.quest?.disciplina?.nome || 'Geral';
          const temaName = d.quest?.tema || 'Geral';

          if (!bySubject[subName]) {
            bySubject[subName] = { nome: subName, total: 0, correct: 0, wrong: 0, temas: {} };
          }

          bySubject[subName].total += 1;
          if (d.isCorrect) bySubject[subName].correct += 1;
          if (d.isCorrect === false) bySubject[subName].wrong += 1;

          if (!bySubject[subName].temas[temaName]) {
            bySubject[subName].temas[temaName] = { total: 0, correct: 0 };
          }
          bySubject[subName].temas[temaName].total += 1;
          if (d.isCorrect) bySubject[subName].temas[temaName].correct += 1;
        });

        const ganhos: any[] = [];
        const deficits: any[] = [];

        Object.values(bySubject).forEach((sub) => {
          const rate = sub.total > 0 ? Math.round((sub.correct / sub.total) * 100) : 0;
          const item = {
            materia: sub.nome,
            totalQuests: sub.total,
            taxaAcerto: rate,
            temas: Object.entries(sub.temas).map(([t, stats]) => ({
              tema: t,
              taxaAcerto: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
            }))
          };

          if (rate >= 75) {
            ganhos.push(item);
          } else if (rate < 50 || sub.wrong > sub.correct) {
            deficits.push(item);
          }
        });

        // Rastreamento por Aluno (Alunos Destaque vs. Alunos em Risco)
        const studentStats: Record<string, { id: string; nome: string; matricula: string; total: number; correct: number; wrong: number }> = {};
        deliveries.forEach((d) => {
          if (!d.user) return;
          const sId = d.user.id;
          if (!studentStats[sId]) {
            studentStats[sId] = { id: sId, nome: d.user.nome, matricula: d.user.matricula, total: 0, correct: 0, wrong: 0 };
          }
          studentStats[sId].total += 1;
          if (d.isCorrect) studentStats[sId].correct += 1;
          if (d.isCorrect === false) studentStats[sId].wrong += 1;
        });

        const studentsArray = Object.values(studentStats).map(s => ({
          ...s,
          taxaAcerto: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
        }));

        const destaques = [...studentsArray]
          .filter(s => s.correct > 0 && s.taxaAcerto >= 70)
          .sort((a, b) => b.taxaAcerto - a.taxaAcerto)
          .slice(0, 5);

        const emRisco = [...studentsArray]
          .filter(s => s.total > 0 && (s.taxaAcerto < 50 || s.wrong > s.correct))
          .sort((a, b) => a.taxaAcerto - b.taxaAcerto)
          .slice(0, 5);

        return reply.status(200).send({
          unidade: unidadeNum,
          totalQuests: deliveries.length,
          ganhos,
          deficits,
          destaques,
          emRisco
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao gerar relatório por unidade.' });
      }
    }
  );

  // ─── RELATÓRIO ANUAL DE DESEMPENHO ─────────────────────────────────────────
  fastify.get<{ Querystring: { turmaId?: string; ano?: string; disciplinaId?: string } }>(
    '/reports/annual',
    async (request, reply) => {
      const instituicao = request.user.instituicao!;
      const { turmaId, ano, disciplinaId } = request.query;

      try {
        const turmaWhere: any = { instituicao };
        if (turmaId) turmaWhere.id = turmaId;
        if (ano) turmaWhere.ano = ano;

        const turmas = await prisma.turma.findMany({ where: turmaWhere, select: { id: true, unidade: true } });
        const turmaIds = turmas.map(t => t.id);

        const deliveryWhere: any = {
          user: { instituicao, turmaId: { in: turmaIds } }
        };
        if (disciplinaId) deliveryWhere.quest = { disciplinaId };

        const unitPerformance = await Promise.all([1, 2, 3].map(async (u) => {
          const uTurmas = turmas.filter(t => t.unidade === u).map(t => t.id);
          if (uTurmas.length === 0) return { unidade: u, total: 0, correct: 0, hitRate: 0 };

          const uDeliveries = await prisma.questDelivery.findMany({
            where: { ...deliveryWhere, user: { turmaId: { in: uTurmas } } },
            select: { isCorrect: true }
          });

          const total = uDeliveries.length;
          const correct = uDeliveries.filter(d => d.isCorrect === true).length;
          const hitRate = total > 0 ? Math.round((correct / total) * 100) : 0;

          return { unidade: u, total, correct, hitRate };
        }));

        const totalDeliveries = await prisma.questDelivery.count({ where: deliveryWhere });
        const totalCorrect = await prisma.questDelivery.count({ where: { ...deliveryWhere, isCorrect: true } });

        return reply.status(200).send({
          ano: ano || 'Todos',
          totalDeliveries,
          totalCorrect,
          overallHitRate: totalDeliveries > 0 ? Math.round((totalCorrect / totalDeliveries) * 100) : 0,
          unitPerformance
        });
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Erro ao gerar relatório anual.' });
      }
    }
  );
};

