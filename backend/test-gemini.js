require('dotenv').config();

async function run() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Nenhuma chave GEMINI_API_KEY encontrada no .env');
      return;
    }
    
    console.log('Chave encontrada. Tentando fetch REST para ListModels...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      console.error('Erro na requisição REST:', response.status, response.statusText);
      const errorData = await response.json();
      console.error(errorData);
      return;
    }

    const data = await response.json();
    console.log('Modelos disponíveis para esta chave:');
    const modelNames = data.models.map(m => m.name);
    console.log(modelNames);
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

run();
