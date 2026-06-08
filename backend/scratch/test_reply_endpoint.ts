import { prisma } from '../src/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testReply() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const deliveryId = "8b1bd5c2-9eda-46e6-9c66-940ba55afc15";
  try {
    const delivery = await prisma.questDelivery.findUnique({
      where: { id: deliveryId },
      include: { quest: true }
    });

    if (!delivery) {
      console.log("Delivery not found");
      return;
    }

    const prompt = `Você é um assistente pedagógico de suporte aos Mestres do Solo Learning.
Um estudante está travado na seguinte questão: "${delivery.quest.enunciado}".
${delivery.studentDoubt ? `Dúvida específica do aluno: "${delivery.studentDoubt}"` : ''}

Gere uma dica de scaffolding pedagógico que ajude o aluno a "aprender como fazer" em vez de dar a resposta final.
A dica deve ser amigável, clara e curta (máximo 40 palavras). Não dê o resultado final de forma alguma.

Exemplo de dica: "Para calcular a média, some os 5 valores da tabela e depois divida o resultado total por 5. Dica: observe bem o primeiro número!"
Retorne APENAS o texto da dica pedagógica gerada, sem nenhum outro elemento.`;

    console.log("Calling Gemini with string...");
    const resString = await model.generateContent(prompt);
    console.log("Success with string! Response:", resString.response.text());

    console.log("Calling Gemini with array...");
    const resArray = await model.generateContent([prompt]);
    console.log("Success with array! Response:", resArray.response.text());
  } catch (error: any) {
    console.error("FAILED WITH ERROR:", error);
  }
}

testReply();
