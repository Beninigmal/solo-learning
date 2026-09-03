export interface DNDBoss {
  id: string;
  name: string;
  type: 'MEGA' | 'MINI';
  tier: 'MEDIO' | 'EPICO' | 'COLOSSAL';
  recommendedMinHp: number;
  description: string;
  imageKey: string;
}

export const DND_MEGA_BOSSES: DNDBoss[] = [
  // COLOSSAL (HP 300 - 500)
  {
    id: 'tarrasque',
    name: 'Tarrasque Colossal',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'Besta primordial lendária destruidora de continentes.',
    imageKey: 'tarrasque',
  },
  {
    id: 'red_dragon',
    name: 'Dragão Vermelho Ancião',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'Soberano dos vulcões e cuspidor de chamas devastadoras.',
    imageKey: 'dragão vermelho',
  },
  {
    id: 'demogorgon',
    name: 'Demogorgon, Príncipe dos Demônios',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'Lorde abissal de duas cabeças da loucura divina.',
    imageKey: 'demogorgon',
  },
  {
    id: 'balor',
    name: 'Balor do Abismo',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'Demonio supremo de chamas e chicote de fogo.',
    imageKey: 'balor',
  },
  {
    id: 'pit_fiend',
    name: 'Pit Fiend Infernal',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'General dos nove infernos comandando os exércitos caídos.',
    imageKey: 'pit fiend',
  },
  {
    id: 'dracolich',
    name: 'Dracolich Milenar',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'Dragão morto-vivo revivido por artes necromânticas.',
    imageKey: 'dracolich',
  },
  {
    id: 'elder_brain',
    name: 'Elder Brain Supremo',
    type: 'MEGA',
    tier: 'COLOSSAL',
    recommendedMinHp: 300,
    description: 'Cérebro psíquico ancestral mestre dos Illithids.',
    imageKey: 'elder brain',
  },

  // ÉPICO (HP 100 - 299)
  {
    id: 'beholder',
    name: 'Beholder Supremo (Observador)',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Tirano flutuante com olhos transmissores de raios mortais.',
    imageKey: 'beholder',
  },
  {
    id: 'lich',
    name: 'Lich Arquemago Mestre',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Mago supremo que desafiou a morte através da filactéria.',
    imageKey: 'lich',
  },
  {
    id: 'mind_flayer',
    name: 'Mind Flayer (Devorador de Mentes)',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Entidade psíquica devoradora de inteligência.',
    imageKey: 'mind flayer',
  },
  {
    id: 'death_knight',
    name: 'Cavaleiro da Morte',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Paladino caído imortal que vaga buscando vingança.',
    imageKey: 'death knight',
  },
  {
    id: 'vampire',
    name: 'Vampiro Ancião',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Senhor da noite com sede de sangue e magia negra.',
    imageKey: 'vampire',
  },
  {
    id: 'aboleth',
    name: 'Aboleth Abissal',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Monstruosidade telepática pré-histórica dos oceanos.',
    imageKey: 'aboleth',
  },
  {
    id: 'esfinge',
    name: 'Esfinge Alada dos Enigmas',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Guardião dos segredos eternos e charadas mortais.',
    imageKey: 'esfinge',
  },
  {
    id: 'djinn',
    name: 'Djinn Maldito',
    type: 'MEGA',
    tier: 'EPICO',
    recommendedMinHp: 100,
    description: 'Gênio elementar corrompido pelas forças abissais.',
    imageKey: 'djinn',
  },

  // MÉDIO (HP 10 - 99)
  {
    id: 'golem',
    name: 'Golem de Ferro Incandescente',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Construto mecânico indestrutível forjado em lava.',
    imageKey: 'golem',
  },
  {
    id: 'mimic',
    name: 'Mímico Voraz Colossal',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Camaleão monstruoso disfarçado de tesouro.',
    imageKey: 'mimic',
  },
  {
    id: 'medusa',
    name: 'Medusa Górgona',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Rainha das serpentes cujo olhar petrifica os caçadores.',
    imageKey: 'medusa',
  },
  {
    id: 'quimera',
    name: 'Quimera Incendiária',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Besta tripla de leão, bode e dragão.',
    imageKey: 'quimera',
  },
  {
    id: 'hydra',
    name: 'Hidra de Sete Cabeças',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Monstruosidade cujas cabeças se regeneram no combate.',
    imageKey: 'hydra',
  },
  {
    id: 'wyvern',
    name: 'Wyvern das Sombras',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Dragão venenhoso e veloz dos céus sombrios.',
    imageKey: 'wyvern',
  },
  {
    id: 'drow',
    name: 'Drow Arcano Supremo',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Feiticeiro elfo negro mestre das artes sombrias.',
    imageKey: 'drow',
  },
  {
    id: 'yuanti',
    name: 'Yuan-Ti Abominação',
    type: 'MEGA',
    tier: 'MEDIO',
    recommendedMinHp: 10,
    description: 'Sacerdote serpente de cultos sangrentos.',
    imageKey: 'yuanti',
  },
];

export const getRandomMegaBossByHp = (hp: number): DNDBoss => {
  let eligibleBosses: DNDBoss[];
  if (hp >= 300) {
    eligibleBosses = DND_MEGA_BOSSES.filter((b) => b.tier === 'COLOSSAL');
  } else if (hp >= 100) {
    eligibleBosses = DND_MEGA_BOSSES.filter((b) => b.tier === 'EPICO');
  } else {
    eligibleBosses = DND_MEGA_BOSSES.filter((b) => b.tier === 'MEDIO');
  }
  if (!eligibleBosses.length) eligibleBosses = DND_MEGA_BOSSES;
  const randomIndex = Math.floor(Math.random() * eligibleBosses.length);
  return eligibleBosses[randomIndex];
};
