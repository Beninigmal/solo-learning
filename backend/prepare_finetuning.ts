import { prisma } from './src/prisma';
import * as fs from 'fs';
import * as path from 'path';

// Estrutura do exemplo de Fine-Tuning do Gemini 1.5
interface GeminiFineTuningExample {
  contents: [
    {
      role: 'user';
      parts: [{ text: string }];
    },
    {
      role: 'model';
      parts: [{ text: string }];
    }
  ];
}

const DEFAULT_BATCHES = [
  {
    disciplina: 'Matemática',
    tema: 'Funções de Primeiro Grau',
    semana: '3',
    complexidade: 'MEDIO',
    exigeCalculo: 'Sim',
    q1: 'Um motorista de aplicativo cobra R$ 5,00 fixos mais R$ 2,00 por quilômetro rodado. Escreva a lei da função que representa o valor de uma corrida em função de x quilômetros.',
    q2: 'Dada a função f(x) = 3x - 9, determine o ponto zero (ou raiz) dessa função.',
    q3: 'Um reservatório com 500 litros de água apresenta um vazamento constante de 5 litros por hora. Em quantas horas o reservatório estará completamente vazio? Desenvolva a equação.',
    q4: 'A função f(x) = ax + b passa pelos pontos A(2, 5) e B(4, 9). Encontre os valores de a e b e escreva a função correspondente.',
    q5: 'Uma empresa vende um produto por R$ 50,00 a unidade. O custo fixo de produção é de R$ 1000,00 e o custo variável por unidade é R$ 30,00. Quantas unidades devem ser vendidas para obter lucro zero (ponto de equilíbrio)?',
    q6: 'Um projétil é lançado verticalmente com velocidade inicial linear. A distância percorrida segue a lei linear h(t) = -5t + 80 (para t < 16s). Considerando a aceleração simulada constante, determine o exato instante em que o projétil atinge a metade da altura máxima teórica no plano cartesiano.'
  },
  {
    disciplina: 'Física',
    tema: 'Movimento Uniformemente Variado',
    semana: '5',
    complexidade: 'MEDIO',
    exigeCalculo: 'Sim',
    q1: 'Um carro parte do repouso e atinge uma velocidade de 20 m/s em 5 segundos. Calcule a aceleração média do veículo.',
    q2: 'Um móvel se desloca com velocidade inicial de 5 m/s sob uma aceleração constante de 2 m/s². Qual será sua velocidade após 10 segundos?',
    q3: 'Um objeto é abandonado do alto de um prédio de 45 metros. Desprezando a resistência do ar e adotando g = 10 m/s², calcule o tempo que o objeto leva para atingir o solo.',
    q4: 'Um trem reduz sua velocidade de 30 m/s para 10 m/s enquanto percorre uma distância de 80 metros. Determine a aceleração retardada do trem.',
    q5: 'Um ciclista entra em uma pista com velocidade de 4 m/s e acelera a 0,5 m/s². Escreva a função horária do espaço do ciclista considerando o espaço inicial zero, e determine sua posição em t = 6s.',
    q6: 'Um jato de combate precisa atingir a velocidade de decolagem de 80 m/s em uma pista de porta-aviões de apenas 120 metros. Sabendo que o sistema de catapulta fornece uma aceleração auxiliar constante, calcule a aceleração mínima exigida e analise se a integridade dos pilotos é mantida caso o limite de G-force seja 6G.'
  },
  {
    disciplina: 'Língua Portuguesa',
    tema: 'Concordância Nominal e Verbal',
    semana: '2',
    complexidade: 'MEDIO',
    exigeCalculo: 'Não',
    q1: 'Identifique e corrija o erro de concordância na frase: "Seguem anexo os relatórios solicitados pela diretoria."',
    q2: 'Explique por que o verbo está no plural na frase: "Fomos nós que organizamos a expedição pelas dungeons."',
    q3: 'Dadas as frases: "Fazem dois anos que não estudo latim" e "Houve muitos imprevistos na forja", corrija as inadequações de concordância dos verbos impessoais.',
    q4: 'Explique a regra de concordância da palavra "meio" nas frases: "Ela estava meio cansada" e "Comeu meia maçã".',
    q5: 'Reescreva a frase a seguir substituindo "bastante" pelo plural correspondente, se necessário: "Eles estavam bastante preocupados com as invasões dos monstros."',
    q6: 'Analise sintaticamente e comente sobre a concordância estilística (silepse) na célebre frase: "O povo da cidade, assustados com o estrondo do portal arcano, correram para os templos sagrados em busca de proteção divina."'
  }
];

async function generateDataset() {
  console.log('🔮 SOLEN DATASET GENERATOR - GEMINI FINE-TUNING 🔮');
  console.log('--------------------------------------------------');

  const examples: GeminiFineTuningExample[] = [];

  // 1. Extração Dinâmica de Quests do Prisma
  console.log('1. Lendo banco de dados local...');
  const quests = await prisma.quest.findMany({
    include: { disciplina: true }
  });

  // Agrupa as quests por batchId para recriar as 6 perguntas geradas juntas
  const batchesMap = new Map<string, any[]>();
  for (const q of quests) {
    if (q.batchId) {
      if (!batchesMap.has(q.batchId)) {
        batchesMap.set(q.batchId, []);
      }
      batchesMap.get(q.batchId)!.push(q);
    }
  }

  console.log(`✓ Encontrados ${batchesMap.size} lotes (batches) de Quests geradas.`);

  // Transforma cada lote em um exemplo de Fine-Tuning
  for (const [batchId, batchQuests] of batchesMap.entries()) {
    if (batchQuests.length === 6) {
      // Ordena de 1 a 6
      batchQuests.sort((a, b) => a.ordem - b.ordem);
      
      const first = batchQuests[0];
      const exigeCalculoText = first.enunciado.includes('cálculos') || first.xp > 200 ? 'Sim' : 'Não';
      
      const promptInput = `Matéria: ${first.disciplina.nome}. Tema: ${first.tema || 'Geral'}. Semana: ${first.semana || '1'}. Nível: ${first.nivel}. Exige Cálculos: ${exigeCalculoText}.`;
      
      const outputJson = {
        q1: batchQuests[0].enunciado,
        q2: batchQuests[1].enunciado,
        q3: batchQuests[2].enunciado,
        q4: batchQuests[3].enunciado,
        q5: batchQuests[4].enunciado,
        q6: batchQuests[5].enunciado
      };

      examples.push({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptInput }]
          },
          {
            role: 'model',
            parts: [{ text: JSON.stringify(outputJson) }]
          }
        ]
      });
    }
  }

  // 2. Mescla com Exemplos Padrão e de Alta Qualidade (Fallback)
  console.log('2. Acoplando exemplos acadêmicos altamente qualificados...');
  for (const d of DEFAULT_BATCHES) {
    const promptInput = `Matéria: ${d.disciplina}. Tema: ${d.tema}. Semana: ${d.semana}. Nível: ${d.complexidade}. Exige Cálculos: ${d.exigeCalculo}.`;
    const outputJson = {
      q1: d.q1,
      q2: d.q2,
      q3: d.q3,
      q4: d.q4,
      q5: d.q5,
      q6: d.q6
    };

    examples.push({
      contents: [
        {
          role: 'user',
          parts: [{ text: promptInput }]
        },
        {
          role: 'model',
          parts: [{ text: JSON.stringify(outputJson) }]
        }
      ]
    });
  }

  // 3. Exporta para arquivo JSONL
  const targetPath = path.join(__dirname, 'dataset_finetuning.jsonl');
  console.log(`3. Escrevendo dataset formatado em: ${targetPath}`);

  const writeStream = fs.createWriteStream(targetPath);
  for (const ex of examples) {
    writeStream.write(JSON.stringify(ex) + '\n');
  }
  writeStream.end();

  console.log('\n🌟 CONCLUÍDO COM SUCESSO! 🌟');
  console.log('--------------------------------------------------');
  console.log(`Total de Exemplos Gerados: ${examples.length}`);
  console.log('\n📚 COMO UTILIZAR NO GOOGLE AI STUDIO:');
  console.log('1. Entre no Google AI Studio (https://aistudio.google.com).');
  console.log('2. Clique em "Create a new tuned model" (Criar novo modelo ajustado).');
  console.log('3. Escolha o modelo base (Ex: "gemini-1.5-flash").');
  console.log('4. Faça o upload do arquivo "dataset_finetuning.jsonl" que geramos.');
  console.log('5. Clique em "Start tuning" e aguarde alguns minutos.');
  console.log('6. Quando concluir, altere o ID do modelo na linha 22 de "quests.ts" para o ID do seu modelo ajustado!');
}

generateDataset().catch(console.error);
