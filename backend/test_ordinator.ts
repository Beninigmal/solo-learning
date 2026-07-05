const payload = {
  message: "Ordinator, importe os alunos a partir da planilha importada já adaptando para a realidade do sistema\n[Conteúdo do arquivo anexado: teste_sistema_customizado.xlsx]\n" + JSON.stringify([
  {
    "Nome": "Arthur Pendragon",
    "Matricula": "A001",
    "Turma": "TURMA A",
    "Turno": "MATUTINO",
    "Nivel": 15,
    "XP_Atual": 4500,
    "Classe_RPG": "Paladino",
    "Party_Guilda": "Távola Redonda",
    "Presenca_Porc": 0.95,
    "Missoes_Concluidas": 24,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Sung Jinwoo",
    "Matricula": "A002",
    "Turma": "TURMA A",
    "Turno": "MATUTINO",
    "Nivel": 99,
    "XP_Atual": 99999,
    "Classe_RPG": "Monarca das Sombras",
    "Party_Guilda": "Solo Clan",
    "Presenca_Porc": 1,
    "Missoes_Concluidas": 150,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Cha Hae-In",
    "Matricula": "A003",
    "Turma": "TURMA A",
    "Turno": "MATUTINO",
    "Nivel": 42,
    "XP_Atual": 12800,
    "Classe_RPG": "Espadachim",
    "Party_Guilda": "Hunter Guild",
    "Presenca_Porc": 0.92,
    "Missoes_Concluidas": 64,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Thomas Andre",
    "Matricula": "A004",
    "Turma": "TURMA A",
    "Turno": "MATUTINO",
    "Nivel": 65,
    "XP_Atual": 32000,
    "Classe_RPG": "Tanque",
    "Party_Guilda": "Scavenger",
    "Presenca_Porc": 0.88,
    "Missoes_Concluidas": 88,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Christopher Reed",
    "Matricula": "A005",
    "Turma": "TURMA A",
    "Turno": "MATUTINO",
    "Nivel": 58,
    "XP_Atual": 24500,
    "Classe_RPG": "Mago de Fogo",
    "Party_Guilda": "Estados Unidos",
    "Presenca_Porc": 0.85,
    "Missoes_Concluidas": 70,
    "Status_Raid": "Em Combate"
  },
  {
    "Nome": "Geralt de Rivia",
    "Matricula": "A011",
    "Turma": "TURMA B",
    "Turno": "VESPERTINO",
    "Nivel": 30,
    "XP_Atual": 8900,
    "Classe_RPG": "Bruxo",
    "Party_Guilda": "Lobo Corrompido",
    "Presenca_Porc": 0.9,
    "Missoes_Concluidas": 45,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Yennefer Vengerberg",
    "Matricula": "A012",
    "Turma": "TURMA B",
    "Turno": "VESPERTINO",
    "Nivel": 45,
    "XP_Atual": 15000,
    "Classe_RPG": "Feiticeira",
    "Party_Guilda": "Loja de Magia",
    "Presenca_Porc": 0.94,
    "Missoes_Concluidas": 55,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Ciri Fiona",
    "Matricula": "A014",
    "Turma": "TURMA B",
    "Turno": "VESPERTINO",
    "Nivel": 38,
    "XP_Atual": 11200,
    "Classe_RPG": "Viajante Temporal",
    "Party_Guilda": "Lobo Corrompido",
    "Presenca_Porc": 0.78,
    "Missoes_Concluidas": 32,
    "Status_Raid": "Esgotado"
  },
  {
    "Nome": "Dandelion Pankratz",
    "Matricula": "A015",
    "Turma": "TURMA B",
    "Turno": "VESPERTINO",
    "Nivel": 12,
    "XP_Atual": 2100,
    "Classe_RPG": "Bardo",
    "Party_Guilda": "Lobo Corrompido",
    "Presenca_Porc": 0.65,
    "Missoes_Concluidas": 10,
    "Status_Raid": "Esgotado"
  },
  {
    "Nome": "Kim Dokja",
    "Matricula": "A021",
    "Turma": "TURMA C",
    "Turno": "MATUTINO",
    "Nivel": 50,
    "XP_Atual": 21000,
    "Classe_RPG": "Constelação",
    "Party_Guilda": "Aliança Suprema",
    "Presenca_Porc": 0.98,
    "Missoes_Concluidas": 75,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Han Sooyoung",
    "Matricula": "A022",
    "Turma": "TURMA C",
    "Turno": "MATUTINO",
    "Nivel": 48,
    "XP_Atual": 19500,
    "Classe_RPG": "Escritora/Maga",
    "Party_Guilda": "Aliança Suprema",
    "Presenca_Porc": 0.91,
    "Missoes_Concluidas": 72,
    "Status_Raid": "Pronto"
  },
  {
    "Nome": "Yoo Sangah",
    "Matricula": "A023",
    "Turma": "TURMA C",
    "Turno": "MATUTINO",
    "Nivel": 35,
    "XP_Atual": 9800,
    "Classe_RPG": "Estrategista",
    "Party_Guilda": "Aliança Suprema",
    "Presenca_Porc": 0.99,
    "Missoes_Concluidas": 50,
    "Status_Raid": "Pronto"
  }
]),
  history: []
};

async function test() {
  try {
    const res = await fetch('http://127.0.0.1:3333/ordinator/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0ZjIyNGUwLTZlNjEtNGU5YS04NDNlLTQ2MmU2ODUyYTNjNSIsIm5vbWUiOiJ0ZXN0ZSIsInJvbGUiOiJBUlFVSVRFVE8iLCJpbnN0aXR1aWNhbyI6IlRlc3RlIiwiaW5zdGl0dXRpb25JZCI6ImJiYTA4M2U5LWQ4YjUtNGU5YS05Y2I4LWQwODY2ZGM4NTZjMiIsInR1cm1hSWQiOm51bGwsImlzRmlyc3RBY2Nlc3MiOmZhbHNlLCJpYXQiOjE3ODMxMDMwNjYsImV4cCI6MTc4MzcwNzg2Nn0.fDpHNwCB8KOEn3-KMNfeLYMKiIBJPtNPl9iAMBtQqeE'
      },
      body: JSON.stringify(payload)
    });
    console.log("STATUS:", res.status);
    const data = await res.json();
    console.log("REPLY:", data.reply);
    console.log("ACTION:", data.action);
    console.log("ERROR:", data.error);
    console.log("STACK:", data.stack);
  } catch (e: any) {
    console.error("ERROR:", e.message);
  }
}
test();
