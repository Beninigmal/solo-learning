import { FastifyInstance, FastifyPluginAsync } from 'fastify';

interface GenerateQuestBody {
  tema: string;
}

export const questsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  fastify.get('/daily', async (request, reply) => {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = "Aja como o 'Sistema' de um jogo estilo RPG (Solo Leveling). Gere uma pergunta matemática simples de SOMA com números de apenas 1 dígito (ex: Quanto é 3 + 4?). Apenas retorne o texto da pergunta, sem respostas, seja direto e autoritário.";
      
      const result = await model.generateContent(prompt);
      const question = result.response.text().trim();

      return reply.status(200).send({
        question
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao gerar a quest com Gemini.', details: error.message });
    }
  });

  fastify.post<{ Body: { question: string, answer: string } }>('/daily/submit', async (request, reply) => {
    const { question, answer } = request.body;

    if (!question || !answer) {
      return reply.status(400).send({ error: 'Os campos question e answer são obrigatórios.' });
    }

    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Aja como o 'Sistema' de um RPG.
A pergunta que você fez ao Jogador foi: "${question}"
A resposta que o Jogador deu foi: "${answer}"

Sua tarefa:
1. Verifique se a resposta está matematicamente correta.
2. Retorne APENAS um JSON no formato {"status": "success", "message": "Feedback aqui"} ou {"status": "error", "message": "Feedback aqui"}.
Sem formatação markdown.`;

      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();
      
      // Cleanup markdown if AI ignores the prompt
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const validation = JSON.parse(responseText);

      return reply.status(200).send(validation);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro ao processar a resposta.', details: error.message });
    }
  });
};
