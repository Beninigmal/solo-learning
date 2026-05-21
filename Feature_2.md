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

## 3. Sistema de RAID e BOSS (Party de Estudo)
- **Party System:** Alunos podem formar grupos (Party) de no máximo 3 membros da mesma turma para resolver missões em conjunto e cooperar.
- **Mini Boss:**
  - **Invocação:** Invocado ao completar exatamente 6 missões (de forma solo ou em grupo). As 6 missões podem ser combinadas como:
    - 3 missões de uma matéria (máximo diário gerado na forja por matéria) + 3 missões de outra matéria;
    - Ou 2 + 2 + 2 missões de três matérias diferentes.
  - **Enfrentamento:** O combate é feito pela Party de no máximo 3 jogadores.
  - **Dificuldade:** A pergunta do Mini Boss é de nível moderado (mais difícil que as comuns, porém perfeitamente respondível para os alunos, sem ser insana).
  - **Recompensa:** Concede XP compartilhado e chance (RNG) de dropar artefatos raros diretamente para o inventário.
- **Boss (General):**
  - **Invocação:** Invocado manualmente pelo Mestre através de um evento global na forja.
  - **Dificuldade:** Pergunta de nível altamente complexo/muito difícil sobre o assunto selecionado.
  - **Regras:** Erros não amaldiçoam o Boss (não perdem 25% de XP a cada erro, sempre dando a pontuação máxima).
  - **Duração:** O Mestre define a duração/tempo limite do Boss em **dias** diretamente na forja durante a invocação.
- **Uso de Artefatos:**
  - **Modal de Resposta:** Durante qualquer missão (diária, baú ou boss), um ícone de uso de artefato aparecerá no modal de resposta. Ao clicar, o aluno acessará seus artefatos para facilitar a resolução da missão.
  - **Bolsa e Baú:** Os artefatos são exibidos na bolsa do jogador, mas podem ser consumidos diretamente na bolsa ou no **Baú de Quests Perdidas** para auxiliar a responder as missões acumuladas.

## 4. Requisitos Técnicos para o Agente
- **Backend:** - Implementar JWT (JSON Web Token) para diferenciar os perfis.
  - Criar lógica de cron/jobs para disparar missões conforme o turno do aluno.
- **Frontend:**
  - Criar a tela de "Select Role" (Admin/Professor/Player).
  - Implementar a "Status Screen" baseada na estética de Solo Leveling (usando as referências visuais fornecidas).