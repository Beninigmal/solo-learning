# Solo Learning - Expansão do Sistema (V2)
**Objetivo:** Implementar controle de acesso, perfis distintos e lógica de Raids/Missões Temporais.

## 1. Perfis e Autenticação (RBAC)
O sistema deve distinguir três níveis de acesso. A senha padrão para alunos é o CPF.

### A. ADMIN (O Arquiteto do Sistema)
- **Funcionalidade:** Dashboard de Gestão Global.
- **Ações:** - Cadastrar Professores.
  - Cadastrar Disciplinas (Matérias).
  - Vincular Professor a uma Disciplina.

### B. PROFESSOR (O Mestre da Dungeon)
- **Painel Administrativo:**
    **Não recebe missões**
  - **Gerar Quest por IA:** Formulário com [Semana], [Turma], [Tema]. O backend envia ao Gemini para gerar o "deck" de missões da semana.
  - **Gestão de Alunos:** Cadastro manual (Nome, Nickname, CPF, Turno, Turma).
  - **Monitoramento de XP:** Visualização por Turma. A turma deverá ser listada num select, e ao fazer essa seleção deverá mostrar uma lista dos Alunos com XP, XP < 600 em um ciclo de 1000 são marcados como "Risco de Prova Física".

### C. ALUNO (O Player)
- **Login:** Seleção de Turma -> Input Nome -> Senha (CPF).
- **Status Screen (UI Solo Leveling):** Radar de XP por matéria, Level atual e Título de Rank.
- **Sistema de Turnos:** As missões só ficam ativas no turno OPOSTO ao cadastrado (Ex: Aluno matutino recebe quests à tarde).

## 2. Lógica de Missões e Notificações (Queue)
As missões não são estáticas; elas seguem uma fila de prioridade.
- **Regra de Acúmulo:** Nunca exibir duas missões da mesma matéria simultaneamente.
- **Estados da Missão:** [Aguardar] ou [Responder].
- **Duração Dinâmica:** O tempo para expiração (Penalty Quest) deve ser calculado pela IA com base na complexidade da questão e perfil socioeconômico (Escola Pública).
- **Aguardar:** A notificação fica minimizada no "Quest Log" da tela principal.

## 3. Sistema de RAID (Party de Estudo)
- **Mecânica:** Alunos criam grupos para resolver um set de questões mais complexas.
- **Vitória:** XP compartilhado + bônus individual.
- **Condição de Sucesso:** Cada membro deve atingir um mínimo de acertos (Checkpoint Individual) para que a Raid seja considerada "CLEARED".

## 4. Requisitos Técnicos para o Agente
- **Backend:** - Implementar JWT (JSON Web Token) para diferenciar os perfis.
  - Criar lógica de cron/jobs para disparar missões conforme o turno do aluno.
- **Frontend:**
  - Criar a tela de "Select Role" (Admin/Professor/Player).
  - Implementar a "Status Screen" baseada na estética de Solo Leveling (usando as referências visuais fornecidas).