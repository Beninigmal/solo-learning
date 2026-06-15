
# 🔮 Solen — Solo Learning (Sistema de Gestão Educacional Gamificado)

> *"Apenas os caçadores mais dedicados conseguirão alcançar o Rank S do conhecimento."*

Solen é um **sistema de gestão educacional gamificado** que une administração escolar completa com mecânicas de RPG inspiradas no Manhwa **"Solo Leveling"**. O projeto nasceu como uma plataforma de engajamento estudantil e evoluiu para uma ferramenta completa que atende desde a coordenação pedagógica até o aluno, passando por gestão de instituições, grade curricular inteligente e conformidade legal.

---

## 🏛️ Visão Geral

O Solen resolve dois problemas simultaneamente:

1. **Gestão escolar**: Cadastro de instituições (multi-tenant), turmas, professores, alunos, disciplinas e alocação inteligente de grade horária respeitando a legislação (LDB, Piso do Magistério, CLT, REDA)
2. **Engajamento estudantil**: Gamificação profunda com Ranks (E a S), Quests diárias geradas por IA, Raids em grupo, Baú de revisão e artefatos mágicos

---

## ⚔️ Perfis de Acesso (RBAC)

### 👑 ADMIN (Superadmin)
- Gestão global multi-escolas
- Cadastro de instituições e Arquitetos

### 🏛️ ARQUITETO (Coordenação)
- Cadastro de turmas, professores e disciplinas
- Importação de alunos em lote (CSV)
- Configuração da grade curricular

### ⚔️ MESTRE (Professor)
- Forja de missões via IA (Gemini) com rascunho e aprovação
- Radar de XP da turma com alerta de risco
- Agenda e histórico de missões

### 🧑‍🚀 CAÇADOR (Aluno)
- Quests diárias com progressão de dificuldade
- Sistema de Ranks (E → S) e acúmulo de XP
- Party e Raids cooperativas
- Baú de missões perdidas com recuperação de XP
- Inventário de artefatos mágicos

---

## 🧠 Monarch Engine v3

Algoritmo de **Constraint Satisfaction Problem (CSP)** para alocação automática de grade horária que respeita:

- **Lei de Diretrizes e Bases (LDB)** — matriz curricular por nível de ensino
- **Piso do Magistério (Lei 11.738/2008)** — limite de 2/3 em sala de aula para concursados
- **Regime REDA** — 80% regência / 20% hora-atividade
- **CLT (Art. 318)** — limite de aulas consecutivas/intercaladas
- **Diferenciação Pública vs. Privada** — regras distintas de alocação por rede

---

## 🎒 Gamificação (Solen Systems)

### 📜 Status Window & Ranks
Rank E (iniciante) → Rank S (lendário). XP acumulado por quests concluídas, com barra de progresso visual.

### 🐉 Raids & Parties
Grupos de até 3 alunos para missões cooperativas em tempo real, com invasores, Chave Mestra e Cetro do Exílio.

### 🎒 Inventário de Artefatos
- **Escudo Arcano & Bracelete de Cristal:** Bloqueiam penalidades de XP
- **Relógio Ganha Tempo & Lágrima da Fênix:** Estendem prazos ou revivem missões
- **Martelo Mágico & Pergaminho do Oráculo:** Scaffolding e dicas pedagógicas
- **Poeira Estelar & Varinha de Pinheiro:** Eliminam alternativas ou transmutam questões

### 🧠 IA Generativa (Gemini)
Geração de missões contextualizadas por série/ano, com complexidade cognitiva progressiva (5º ano Fundamental → 3º ano Ensino Médio).

---

## 🔒 Conformidade e Segurança

- **Multi-tenant** por instituição com isolamento de dados
- **LGPD** — fluxo de consentimento, termos de uso e direito ao esquecimento
- **Autenticação JWT** com diferenciação por role
- **Biometria** (expo-local-authentication) para login seguro
- **Prevenção IDOR** — validação cruzada de instituição em todas as rotas

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React Native Web & Mobile via **Expo** (TypeScript + NativeWind/TailwindCSS) |
| **Backend** | Node.js com **Fastify** (TypeScript) — Clean Architecture & SOLID |
| **Banco de Dados & ORM** | **PostgreSQL** com **Prisma ORM** |
| **Motor de IA** | **Google Generative AI (Gemini API)** — geração de enunciados, dicas e bosses |
| **Hospedagem** | **Vercel** (Frontend) + **Render** (Backend) |

---

## 📁 Estrutura do Projeto

```bash
/root
  ├── frontend/          # Aplicativo mobile/web em Expo / React Native
  │   ├── app/           # Rotas (Expo Router) por perfil: player, mestre, admin
  │   ├── components/    # Presenters (player/, mestre/, admin/) + CyberUI Kit
  │   └── hooks/         # usePlayerState, useMestreState, useAdminState
  ├── backend/           # API REST Fastify + Prisma
  │   └── src/
  │       ├── core/      # Use cases, interfaces de repositórios/providers
  │       └── infra/     # Prisma repositories, Gemini provider, notificações
  └── regras_grades/     # Diretrizes curriculares e regras do Monarch Engine
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js v18+
- PostgreSQL ativo

### 1. Backend
```bash
cd backend
npm install
```
Configure `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/solen_db"
JWT_SECRET="sua_chave_jwt_secreta"
GEMINI_API_KEY="sua_gemini_api_key"
```
```bash
npx prisma migrate dev
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npx expo start --web
```

---

## 🎯 Autores

Desenvolvido por educadores e entusiastas de RPG para modernizar a gestão e o ensino no Brasil.

**Lucas Araújo (Beni)** — beninigmal@gmail.com

