import crypto from 'crypto';
import { IQuestRepository } from '../../repositories/IQuestRepository';
import { IUserRepository } from '../../repositories/IUserRepository';
import { IAIProvider } from '../../providers/IAIProvider';

interface GenerateQuestRequest {
  semana: string;
  turmaId: string;
  tema: string;
  complexidade: string;
  exigeCalculo: boolean;
  disciplinaId: string;
  tipoQuest?: string;
  userRole: string;
  userId: string;
}

export class GenerateAIQuestsUseCase {
  constructor(
    private questRepository: IQuestRepository,
    private userRepository: IUserRepository,
    private aiProvider: IAIProvider
  ) {}

  async execute(request: GenerateQuestRequest): Promise<{ batch: string; count: number }> {
    const { semana, turmaId, tema, complexidade, exigeCalculo, disciplinaId, tipoQuest, userRole, userId } = request;

    if (userRole !== 'PROFESSOR' && userRole !== 'ADMIN') {
      throw new Error('Acesso negado.');
    }

    if (!turmaId || !tema || !complexidade || !disciplinaId) {
      throw new Error('Campos obrigatórios: turmaId, tema, complexidade, disciplinaId.');
    }

    const finalTipo = tipoQuest || (exigeCalculo ? 'CALCULO' : 'TEORICA');

    const turma = await this.questRepository.findTurmaById(turmaId);
    if (!turma) throw new Error('Turma não encontrada.');

    const disciplina = await this.questRepository.findDisciplinaById(disciplinaId);
    if (!disciplina) throw new Error('Disciplina não encontrada.');

    // Verificar vínculo se não for Admin
    if (userRole !== 'ADMIN') {
      const vinculo = await this.questRepository.findProfessorTurmaDisciplina(userId, turmaId, disciplinaId);
      if (!vinculo) {
        throw new Error('Você não tem permissão para criar quests desta disciplina para esta turma.');
      }
    }

    let tipoRule = '';
    if (finalTipo === 'CALCULO') {
      tipoRule = '- TODAS as 3 perguntas geradas DEVEM obrigatoriamente exigir que o aluno desenvolva cálculos matemáticos ou físicos no papel para chegar à resposta. EVITE perguntas puramente teóricas ou de identificação de conceitos. Foque em problemas numéricos ou de equações que exijam contas para todas as 3.';
    } else if (finalTipo === 'MULTIPLA') {
      tipoRule = `- TODAS as 3 perguntas geradas DEVEM obrigatoriamente ser de Múltipla Escolha com 5 alternativas (A, B, C, D, E).
- Formate cada pergunta contendo o enunciado da questão e, em seguida, as opções identificadas por letras maiúsculas em novas linhas imediatamente após o enunciado. Exemplo:
  Qual a capital do Brasil?
  A) Rio de Janeiro
  B) Brasília
  C) São Paulo
  D) Belo Horizonte
  E) Salvador`;
    } else {
      tipoRule = '- As perguntas devem ser teóricas ou de resposta direta, sem necessidade de desenvolvimento de cálculos complexos.';
    }

    const prompt = `Você é um assistente educacional para alunos de escola pública brasileira.
Crie EXATAMENTE 3 perguntas sobre o tema "${tema}" para a Semana "${semana}".
Nível de ensino/Complexidade alvo: ${complexidade} (FUNDAMENTAL, MEDIO ou LIVRE).

REGRAS IMPORTANTES:
- Linguagem simples e direta.
- As respostas devem ser curtas (uma palavra, número ou frase bem curta), dependendo do que for mais adequado para a pergunta.
- Não dê a resposta no enunciado.
- Progressão de dificuldade de 1 a 3.
- Adeque a complexidade das perguntas ao nível "${complexidade}".
${tipoRule}
- Retorne APENAS um JSON no formato especificado abaixo. Não inclua texto explicativo adicional.
Exemplo de formato esperado:
{
  "q1": {
    "enunciado": "Qual a capital do Brasil?\\n\\nA) Rio de Janeiro\\nB) Brasília\\nC) São Paulo\\nD) Belo Horizonte\\nE) Salvador",
    "gabarito": "B"
  },
  "q2": {
    "enunciado": "Dada a função f(x) = 3x - 9, determine f(4).",
    "gabarito": "3"
  },
  "q3": {
    "enunciado": "Um reservatório com 500 litros de água apresenta...",
    "gabarito": "250"
  }
}
`;

    let raw = await this.aiProvider.generateContent(prompt);
    
    // Extrai apenas o JSON entre as chaves
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.substring(firstBrace, lastBrace + 1);
    }

    const questions = JSON.parse(raw);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    const batchId = crypto.randomUUID();

    const questConfig = [
      { level: 'FACIL', xp: 100 },
      { level: 'MEDIO', xp: 150 },
      { level: 'DIFICIL', xp: 200 }
    ];

    for (let i = 1; i <= 3; i++) {
      const key = `q${i}`;
      const questData = questions[key] || questions[key.toUpperCase()];
      
      if (!questData) {
        throw new Error(`Formato de resposta da IA inválido. Esperado chave ${key}.`);
      }

      let enunciado = '';
      let gabarito = '';

      if (typeof questData === 'string') {
        enunciado = questData;
      } else if (typeof questData === 'object') {
        enunciado = questData.enunciado || '';
        gabarito = questData.gabarito || '';
      }

      if (!enunciado) {
        throw new Error(`Formato de resposta da IA inválido para a chave ${key}: enunciado vazio.`);
      }

      const config = questConfig[i - 1];

      await this.questRepository.createQuest({
        disciplinaId: disciplina.id,
        enunciado,
        gabarito: gabarito ? String(gabarito).trim() : null,
        tags: exigeCalculo ? ['CALCULO'] : [],
        xp: config.xp,
        nivel: config.level,
        batchId,
        ordem: i,
        turmaAlvoId: turma.id,
        semana,
        tema,
        status: 'PENDENTE',
        expiresAt
      });
    }

    return { batch: batchId, count: 3 };
  }
}
