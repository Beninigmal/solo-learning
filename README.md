# 🔮 Solen — Solo Learning (O RPG da Educação)

> *"Apenas os caçadores mais dedicados conseguirão alcançar o Rank S do conhecimento."*

Solen (Solo Learning) é uma plataforma educacional gamificada projetada para transformar o aprendizado escolar tradicional em um verdadeiro RPG de exploração e masmorras. Inspirado na estética do aclamado Manhwa **"Solo Leveling"**, o projeto aplica dinâmicas de engajamento baseadas em Ranks, Status Windows, Daily Quests, Itens Mágicos e Batalhas de Bosses para motivar alunos no desenvolvimento de suas habilidades acadêmicas.

---

## 🏛️ A Origem da Ideia

O projeto nasceu de um questionamento pedagógico: **"Como trazer o engajamento obsessivo e a sensação de evolução contínua dos jogos e manhwas para a rotina de estudos escolar?"**

No manhwa *Solo Leveling*, o protagonista recebe um sistema misterioso que o impõe **Missões Diárias** (Daily Quests), **Janelas de Status** (Status Windows) detalhadas de seus atributos físicos, e duras **Penalidades** caso falhe. 

Solen transpõe esse mesmo ecossistema para a educação básica e média:
- Em vez de exercícios de fixação chatos, o aluno enfrenta **Quests Diárias** de Matemática ou Português.
- Em vez de notas frias de boletim, o aluno visualiza seus atributos de **Força, Inteligência e Agilidade Pedagógica** crescendo na sua **Janela de Status**.
- Em vez de prazos perdidos sem impacto visível, missões não resolvidas expiram e são seladas no **Baú**, gerando acúmulo de penalidades de XP.

---

## ⚔️ Mecânicas de Gamificação (Solen Systems)

### 1. 📜 Status Window & Ranks
Os alunos começam como caçadores de **Rank E** e evoluem até o cobiçado **Rank S**. A cada quest concluída com sucesso, o aluno acumula **XP**, sobe de nível e distribui pontos de atributos baseados no seu desempenho pedagógico (velocidade, acertos e precisão).

### 2. 🐉 Masmorras de Grupo (Raids & Parties)
Os alunos podem se unir em **Parties** de até 3 caçadores para enfrentar **Raids** acadêmicas cooperativas em tempo real. As respostas são alternadas por turnos compartilhados entre os participantes e a party conta com chat dinâmico. Cuidado: invasores inimigos podem corromper sua party com a **Chave Mestra**, e você precisará do **Cetro do Exílio** para limpá-la!

### 3. 🎒 Inventário de Artefatos Mágicos
Os alunos acumulam e utilizam artefatos dropados para facilitar sua jornada de estudos:
- **🛡️ Escudo Arcano & Bracelete de Cristal:** Bloqueiam penalidades de XP por tentativas erradas.
- **🕰️ Relógio Ganha Tempo & 💧 Lágrima da Fênix:** Distorcem o tempo para estender prazos ou reativar missões expiradas no Baú.
- **🔨 Martelo Mágico & 📜 Pergaminho do Oráculo:** Descompõem problemas complexos em passos educativos (*scaffolding*) e dicas pedagógicas da IA.
- **🎯 Poeira Estelar & 🪄 Varinha de Pinheiro:** Eliminam alternativas incorretas e transmutam missões de cálculo em múltipla escolha.

### 4. 🧠 Inteligência Artificial Generativa (Gemini)
Integrado de forma nativa ao modelo **Google Gemini**, o sistema gera missões contextualizadas sob medida para a turma do aluno, respeitando estritamente a complexidade cognitiva ideal para o seu ano escolar (diferenciando os currículos de 5º, 6º, 7º, 8º ou 9º ano do Fundamental e do Ensino Médio). 

---

## 🛠️ Stack Tecnológica

- **Frontend:** React Native Web & Mobile via **Expo** (TypeScript + NativeWind/TailwindCSS).
- **Backend:** Node.js com **Fastify** (TypeScript).
- **Banco de Dados & ORM:** **PostgreSQL** com **Prisma ORM**.
- **Motor de IA:** **Google Generative AI (Gemini API)** para geração dinâmica de enunciados, dicas e contextualização de bosses.
- **Hospedagem:** **Vercel** (Frontend) + **Render** (Backend).

---

## 📁 Estrutura do Projeto

O projeto é mantido em uma estrutura de monorepositório para facilitar o desenvolvimento integrado:

```bash
/root
  ├── frontend/          # Aplicativo móvel e aplicação Web em Expo / React Native
  ├── backend/           # API REST em Node.js com Fastify e Prisma ORM
  └── regras_grades/     # Matrizes de regras e diretrizes curriculares (Monarch Engine)
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- PostgreSQL ativo localmente

### 1. Configurando o Backend
Entre no diretório do backend, instale as dependências e configure as variáveis de ambiente:
```bash
cd backend
npm install
```
Crie um arquivo `.env` baseado no arquivo de exemplo e insira suas credenciais do banco e da **API Key do Gemini**:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/solen_db"
JWT_SECRET="sua_chave_jwt_secreta"
GEMINI_API_KEY="sua_gemini_api_key"
```
Execute as migrações do banco de dados e inicie o servidor de desenvolvimento:
```bash
npx prisma migrate dev
npm run dev
```

### 2. Configurando o Frontend
Abra um novo terminal, entre no diretório do frontend, instale as dependências e inicie o Metro Bundler:
```bash
cd frontend
npm install
npx expo start --web
```

---

## 🎯 Autores e Origem
Desenvolvido por educadores e entusiastas de jogos de RPG para modernizar a aprendizagem e gamificar o ensino no Brasil.
