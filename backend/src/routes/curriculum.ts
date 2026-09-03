import { FastifyInstance } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export async function curriculumRoutes(fastify: FastifyInstance) {
  const prisma = fastify.prisma;

  fastify.addHook('preHandler', fastify.authenticate);

  // 1. GET /curriculum/:disciplinaId - Listar tópicos da disciplina
  fastify.get<{ Params: { disciplinaId: string } }>('/:disciplinaId', async (request, reply) => {
    const { disciplinaId } = request.params;
    const topicos = await prisma.topicoCurricular.findMany({
      where: { disciplinaId },
      orderBy: { ordem: 'asc' },
    });
    return reply.send({ topicos });
  });

  // 2. POST /curriculum/batch - Importar/salvar ementa por lote (texto por linha ou array)
  fastify.post<{
    Body: {
      disciplinaId: string;
      rawText?: string;
      topicos?: Array<{ nome: string; ordem?: number; descricao?: string; dicasEstudo?: string }>;
    }
  }>('/batch', async (request, reply) => {
    const { disciplinaId, rawText, topicos } = request.body;

    if (!disciplinaId) {
      return reply.status(400).send({ error: 'disciplinaId é obrigatório.' });
    }

    let itemsToCreate: Array<{ nome: string; ordem: number; descricao?: string; dicasEstudo?: string }> = [];

    if (rawText && rawText.trim()) {
      const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      itemsToCreate = lines.map((line, index) => {
        const cleanName = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
        return {
          nome: cleanName,
          ordem: index + 1,
        };
      });
    } else if (topicos && topicos.length > 0) {
      itemsToCreate = topicos.map((t, idx) => ({
        nome: t.nome,
        ordem: t.ordem || idx + 1,
        descricao: t.descricao,
        dicasEstudo: t.dicasEstudo,
      }));
    } else {
      return reply.status(400).send({ error: 'Envie rawText ou um array de tópicos.' });
    }

    await prisma.$transaction([
      prisma.topicoCurricular.deleteMany({ where: { disciplinaId } }),
      prisma.topicoCurricular.createMany({
        data: itemsToCreate.map((item) => ({
          disciplinaId,
          nome: item.nome,
          ordem: item.ordem,
          descricao: item.descricao || null,
          dicasEstudo: item.dicasEstudo || null,
        })),
      }),
    ]);

    const updatedTopicos = await prisma.topicoCurricular.findMany({
      where: { disciplinaId },
      orderBy: { ordem: 'asc' },
    });

    return reply.send({ message: 'Ementa curricular salva com sucesso!', topicos: updatedTopicos });
  });

  // 3. POST /curriculum/generate-ai - Gerar ementa via IA ou recuperar Template do Banco
  fastify.post<{
    Body: {
      disciplinaId: string;
      ano: string;
      nivel?: string;
      institutionType?: 'PUBLICA' | 'PARTICULAR';
    }
  }>('/generate-ai', async (request, reply) => {
    const { disciplinaId, ano, nivel = 'MEDIO', institutionType = 'PARTICULAR' } = request.body;

    const disciplina = await prisma.disciplina.findUnique({ where: { id: disciplinaId } });
    if (!disciplina) {
      return reply.status(404).send({ error: 'Disciplina não encontrada.' });
    }

    const cleanDisciplinaNome = disciplina.nome.trim();

    // A) Verificar se já existe um CurriculumTemplate salvo no banco
    const existingTemplate = await prisma.curriculumTemplate.findUnique({
      where: {
        institutionType_nivel_ano_disciplinaNome: {
          institutionType,
          nivel,
          ano,
          disciplinaNome: cleanDisciplinaNome,
        },
      },
    });

    let topicosList: Array<{ nome: string; ordem: number; descricao?: string; dicasEstudo?: string }> = [];

    if (existingTemplate) {
      try {
        topicosList = JSON.parse(existingTemplate.topicosJson);
      } catch (e) {
        topicosList = [];
      }
    }

    if (!topicosList || topicosList.length === 0) {
      if (!genAI) {
        return reply.status(500).send({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Você é um especialista em coordenação pedagógica alinhado à BNCC e às diretrizes do MEC para o Brasil.
Gere a ementa curricular de tópicos ordenados para o ano letivo completo na disciplina "${cleanDisciplinaNome}".
Contexto da Instituição:
- Tipo de Escola: ${institutionType === 'PUBLICA' ? 'Pública (Matriz Curricular Unificada Padrão MEC)' : 'Particular (Matriz com Desmembramento de Disciplinas Específicas)'}
- Nível de Ensino: ${nivel}
- Ano Escolar: ${ano}

Regras:
1. Retorne APENAS um array JSON de objetos no seguinte formato exato, sem marcações markdown em volta:
[
  { "nome": "Título do Tópico 1", "ordem": 1, "descricao": "Breve resumo do conteúdo", "dicasEstudo": "Fórmula ou conceito-chave a revisar" },
  { "nome": "Título do Tópico 2", "ordem": 2, "descricao": "Breve resumo do conteúdo", "dicasEstudo": "Fórmula ou conceito-chave a revisar" }
]
2. Crie de 8 a 14 tópicos em sequência lógica para o ano letivo.
3. Se for escola particular e a matéria for Português/Matemática, considere subdivisões adequadas.`;

      try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

        topicosList = JSON.parse(text);

        await prisma.curriculumTemplate.upsert({
          where: {
            institutionType_nivel_ano_disciplinaNome: {
              institutionType,
              nivel,
              ano,
              disciplinaNome: cleanDisciplinaNome,
            },
          },
          update: {
            topicosJson: JSON.stringify(topicosList),
          },
          create: {
            institutionType,
            nivel,
            ano,
            disciplinaNome: cleanDisciplinaNome,
            topicosJson: JSON.stringify(topicosList),
          },
        });
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Erro ao gerar ementa com IA.', details: err.message });
      }
    }

    await prisma.$transaction([
      prisma.topicoCurricular.deleteMany({ where: { disciplinaId } }),
      prisma.topicoCurricular.createMany({
        data: topicosList.map((t, idx) => ({
          disciplinaId,
          nome: t.nome,
          ordem: t.ordem || idx + 1,
          descricao: t.descricao || null,
          dicasEstudo: t.dicasEstudo || null,
        })),
      }),
    ]);

    const savedTopicos = await prisma.topicoCurricular.findMany({
      where: { disciplinaId },
      orderBy: { ordem: 'asc' },
    });

    return reply.send({
      message: existingTemplate ? 'Ementa recuperada do banco de templates com sucesso!' : 'Ementa gerada por IA e salva no banco!',
      fromCache: !!existingTemplate,
      topicos: savedTopicos,
    });
  });

  // 4. PUT /curriculum/topic/:id - Editar tópico individual
  fastify.put<{ Params: { id: string }; Body: { nome?: string; ordem?: number; descricao?: string; dicasEstudo?: string } }>(
    '/topic/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { nome, ordem, descricao, dicasEstudo } = request.body;

      const topico = await prisma.topicoCurricular.update({
        where: { id },
        data: { nome, ordem, descricao, dicasEstudo },
      });

      return reply.send({ topico });
    }
  );

  // 5. DELETE /curriculum/topic/:id - Excluir tópico individual
  fastify.delete<{ Params: { id: string } }>('/topic/:id', async (request, reply) => {
    const { id } = request.params;
    await prisma.topicoCurricular.delete({ where: { id } });
    return reply.send({ message: 'Tópico removido com sucesso.' });
  });
}
