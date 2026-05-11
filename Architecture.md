# Projeto: Solo Learning (MVP)
**Estética:** Inspirada no Manhwa "Solo Leveling" (Status windows, Ranks, Daily Quests).

## 1. Stack Tecnológica (Obrigatória)
- **Frontend:** React Native com Expo (TypeScript).
- **Backend:** Node.js com Fastify ou Express (TypeScript).
- **ORM:** Prisma com PostgreSQL.
- **IA:** OpenAI API (GPT-4o para texto e Vision para correção de fotos).
- **Estilização:** NativeWind (Tailwind CSS para React Native).

## 2. Core Business Logic
- **Personas:** Professor (Admin/Criador de Quests) e Aluno (Player).
- **Sistema de Quest:** - O Professor define o tema (ex: Equações de 1º Grau).
    - A IA gera o conteúdo da Quest (Enunciado + Gabarito lógico).
    - O Aluno responde via texto ou foto de resolução manuscrita.
- **Sistema de Gamificação:** - Conclusão gera XP e aumento de Level.
    - Falha ou expiração de tempo gera "Penalty Quest" (Penalidade).
- **Social:** Sistema de "Party" para missões em grupo.

## 3. Estrutura de Pastas Esperada
/root
  /backend (Node.js API)
  /frontend (React Native App)
  /shared (Interfaces TS e Tipagens comuns)