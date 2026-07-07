require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{
      functionDeclarations: [
        {
          name: 'getSubjectStats',
          description: 'Obtém estatísticas...',
        },
        {
          name: 'setTeacherUnavailability',
          description: 'Define restrição de horário...',
          parameters: {
            type: 'OBJECT',
            properties: {
              professorNome: { type: 'STRING', description: 'Nome do professor' },
              diaSemana: { type: 'STRING', description: 'Dia da semana (ex: SEGUNDA, TERCA)' },
              horarios: { type: 'ARRAY', items: { type: 'NUMBER' }, description: 'Posição do horário, 1 a 6' }
            },
            required: ['professorNome', 'diaSemana', 'horarios']
          }
        }
      ]
    }]
  });
  const chat = model.startChat({});
  const result = await chat.sendMessage("Na turma do primeiro ano, o professor de banco de dados não vai poder dar essa aula nas quintas feiras, reorganize essa grade com essa informação.");
  const call = result.response.functionCalls() && result.response.functionCalls()[0];
  if (call) {
    console.log('Function call:', call);
    const toolResponses = [{ functionResponse: { name: call.name, response: { success: true } } }];
    try {
      const second = await chat.sendMessage(toolResponses);
      console.log('Second result:', second.response.text());
    } catch(e) {
      console.error('Error on second send:', e.message);
    }
  } else {
    console.log('Text:', result.response.text());
  }
}
test().catch(console.error);
