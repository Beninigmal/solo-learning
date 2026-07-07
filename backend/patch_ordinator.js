const fs = require('fs');
const file = 'src/routes/ordinator.ts';
let content = fs.readFileSync(file, 'utf8');

// Insert getClasses, getTimetable, swapTimetableSlots tools
const newTools = `
              {
                name: 'getClasses',
                description: 'Retorna a lista de turmas da instituição e seus IDs, útil para descobrir o turmaId necessário em outras ferramentas.',
                parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
              },
              {
                name: 'getTimetable',
                description: 'Retorna a grade atual de uma turma (dias da semana, posições e matérias).',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { turmaId: { type: SchemaType.STRING } },
                  required: ['turmaId']
                }
              },
              {
                name: 'swapTimetableSlots',
                description: 'Troca as posições (dia e horário) de duas matérias já alocadas na grade de uma turma.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    turmaId: { type: SchemaType.STRING },
                    slot1: { type: SchemaType.OBJECT, properties: { diaSemana: { type: SchemaType.STRING }, posicao: { type: SchemaType.NUMBER } } },
                    slot2: { type: SchemaType.OBJECT, properties: { diaSemana: { type: SchemaType.STRING }, posicao: { type: SchemaType.NUMBER } } }
                  },
                  required: ['turmaId', 'slot1', 'slot2']
                }
              },`;

content = content.replace("name: 'batchRegisterTeachers',", newTools + "\n              {\n                name: 'batchRegisterTeachers',");

// Insert tool implementations
const newToolImpl = `
          } else if (call.name === 'getClasses') {
            const turmas = await prisma.turma.findMany({ where: { instituicao } });
            toolResponses.push({
              functionResponse: { name: 'getClasses', response: { turmas: turmas.map(t => ({ id: t.id, nome: t.nome, shift: t.shift })) } }
            });
          } else if (call.name === 'getTimetable') {
            const { turmaId } = call.args;
            const slots = await prisma.timetableSlot.findMany({ where: { turmaId }, include: { disciplina: true } });
            toolResponses.push({
              functionResponse: { name: 'getTimetable', response: { slots: slots.map(s => ({ id: s.id, dia: s.diaSemana, posicao: s.posicao, materia: s.disciplina.nome })) } }
            });
          } else if (call.name === 'swapTimetableSlots') {
            const { turmaId, slot1, slot2 } = call.args;
            const s1 = await prisma.timetableSlot.findUnique({ where: { turmaId_diaSemana_posicao: { turmaId, diaSemana: slot1.diaSemana, posicao: slot1.posicao } } });
            const s2 = await prisma.timetableSlot.findUnique({ where: { turmaId_diaSemana_posicao: { turmaId, diaSemana: slot2.diaSemana, posicao: slot2.posicao } } });
            if (s1 && s2) {
              await prisma.$transaction([
                prisma.timetableSlot.update({ where: { id: s1.id }, data: { posicao: -1 } }),
                prisma.timetableSlot.update({ where: { id: s2.id }, data: { diaSemana: slot1.diaSemana, posicao: slot1.posicao } }),
                prisma.timetableSlot.update({ where: { id: s1.id }, data: { diaSemana: slot2.diaSemana, posicao: slot2.posicao } })
              ]);
              toolResponses.push({ functionResponse: { name: 'swapTimetableSlots', response: { success: true, message: 'Matérias trocadas com sucesso.' } } });
            } else {
              toolResponses.push({ functionResponse: { name: 'swapTimetableSlots', response: { success: false, error: 'Um ou ambos os slots informados estão vazios ou não foram encontrados.' } } });
            }
          } else if (call.name === 'batchRegisterTeachers') {`;

content = content.replace("} else if (call.name === 'batchRegisterTeachers') {", newToolImpl);

// Insert /upload route
const uploadRoute = `
  fastify.post<{ Body: { filename: string, base64: string } }>('/upload', async (request, reply) => {
    const { filename, base64 } = request.body;
    try {
      const buffer = Buffer.from(base64, 'base64');
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      const parsedText = \`[Conteúdo do arquivo anexado: \${filename}]\\n\` + JSON.stringify(json, null, 2);
      return reply.send({ success: true, text: parsedText });
    } catch (e) {
      return reply.status(500).send({ error: 'Erro ao processar arquivo: ' + e.message });
    }
  });
};`;

content = content.replace("};\n", uploadRoute + "\n");

fs.writeFileSync(file, content);
console.log('patched');
