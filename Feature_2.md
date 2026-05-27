# Solo Learning - Expansão do Sistema (V2)
**Objetivo:** Implementar controle de acesso, perfis distintos, lógica de Raids/Missões Temporais e fluxos de segurança física e jurídica (LGPD/Biometria).

## 1. Perfis e Autenticação (RBAC & Primeiro Acesso)
O sistema distingue quatro níveis de acesso com autenticação robusta (JWT) e segurança biométrica integrada.

### Fluxo de Primeiro Acesso & Biometria
- **Primeiro Acesso:** Alunos, Mestres (Professores) e Arquitetos (Coordenadores) iniciam a jornada com credenciais provisórias (ex: código de invocação da turma ou senha padrão `Solen2026`). No primeiro login, são obrigatoriamente redirecionados à tela de **Primeiro Acesso** para:
  - Definir uma senha pessoal e intransmissível (de 4 a 12 caracteres).
  - Escolher um nickname (apelido). **Regra:** Os nicknames podem se repetir no sistema geral, desde que pertençam a instituições (escolas) diferentes.
- **Associação de Biometria:** Ao concluir o primeiro acesso (ou ao realizar um login manual com uma conta diferente), se o celular possuir sensor de digital/face ativo, o app exibe um prompt interativo: **"Deseja associar seu acesso à digital?"**. Se aceito, o app desafia o sensor biométrico local e vincula de forma segura e encriptada as credenciais localmente, habilitando o **"Despertar com Biometria"**.
- **Segurança e LGPD:** Após a definição de senha, todos os perfis devem assinar eletronicamente o termo de privacidade (LGPD). O painel do caçador bloqueia qualquer carregamento de dados em segundo plano, som de notificação ou polling de quests até que o termo seja aceito. Caso o usuário decida não aceitar, há um botão seguro de **"Recusar e Sair"** que realiza logout imediato.

---

### A. ADMIN (O Superadmin / Arquiteto Global)
- **Funcionalidade:** Dashboard de Gestão Global e Multi-Escolas.
- **Ações:** 
  - Gerenciar e cadastrar as Instituições (Escolas).
  - Cadastrar os **Arquitetos** (Coordenadores) de cada escola, habilitando-os ao fluxo de primeiro acesso por padrão.

### B. ARQUITETO (O Coordenador / Administrador da Escola)
- **Funcionalidade:** Dashboard de Gestão Estratégica da Escola (`['SISTEMA', 'TURMAS', 'MATÉRIAS', 'ARQUITETO', 'RECRUTAR', 'GRADE']`).
- **Ações:** 
  - **Recrutamento Centralizado (Estudantes):** Módulo centralizado para importação de alunos via lote/CSV ou cadastro manual individual.
  - Cadastrar Turmas, Disciplinas (Matérias) e Professores.
  - Vincular Professores a Turmas e Disciplinas da grade curricular.

### C. PROFESSOR (O Mestre da Dungeon)
- **Painel Administrativo:**
  - **Não recebe missões do sistema.**
  - **Forja de Missões & Arsenal de Rascunhos:**
    - Ao gerar quests via inteligência artificial (Gemini) a partir de um tema dado pelo professor, as perguntas **não são emitidas imediatamente**.
    - Elas entram em estado de rascunho (`status: 'PENDENTE'`) em uma área de cockpit chamada **"Arsenal de Rascunhos / Afiar"**.
    - O Mestre pode editar manualmente os enunciados, deletar/re-forjar ou enviar comandos livres para a IA refinar/afiar a pergunta específica.
    - O Mestre aprova e ativa o lote de 3 missões de uma só vez, liberando-as para os alunos simultaneamente.
    - Um indicador dinâmico (badge) com a contagem de rascunhos pendentes é renderizado na aba **FORJA**.
  - **Monitoramento de XP:** Visualização do progresso dos caçadores por Turma através de um filtro interativo. Alunos com XP menor que 600 em um ciclo de 1000 são destacados com alertas de "Risco de Prova Física".
  - **Auditoria de Respostas (Painel):** O Mestre pode revisar as respostas históricas no painel de atividades. O sistema diferencia a exibição de respostas dissertativas curtas, textos descritivos e envios focados exclusivamente em cálculos matemáticos (visualizados via scan de imagem), garantindo persistência total mesmo quando o aluno responde via "Baú de Missões Perdidas".

### D. ALUNO (O Player / Caçador)
- **Login:** Autenticação padrão por Matrícula/Nickname + Senha ou Biometria ("Despertar com Biometria").
- **Status Screen (UI Solo Leveling):** Radar de XP por matéria, Level atual e Título de Rank.
- **Sistema de Turnos:** As missões só ficam ativas no turno oposto ao cadastrado (Ex: Aluno matutino recebe quests à tarde).

---

## 2. Lógica de Missões e Notificações (Queue)
As missões não são estáticas; elas seguem uma fila de prioridade.
- **Regra de Acúmulo:** Nunca exibir duas missões da mesma matéria simultaneamente na tela ativa.
- **Estados da Missão:** [Aguardar] ou [Responder].
- **Duração Dinâmica e Relógios:** O tempo para expiração (Penalty Quest) é calculado pela IA. Um contador regressivo visual é exibido ativamente nas missões principais, nas missões de Baú e nas batalhas com Chefes.
- **Aguardar:** A notificação fica minimizada na fila de espera e o aluno tem um limite de tolerância para clicar em "Reativar" antes que ela expire e caia no Baú.
- **Baú de Missões Perdidas (Retry):** Missões expiradas ou respondidas incorretamente sofrem uma "maldição" (-25% de XP a cada erro) e ficam no Baú. O aluno pode tentar responder novamente, e suas novas respostas são devidamente salvas no backend para auditoria posterior.
- **Progressão Contínua (Invocação Lógica):** A lógica de solicitar a próxima quest varre as missões daquele lote e matéria. Caso a quest atual já tenha sido resolvida ou esteja no baú, o sistema avança automaticamente de forma robusta e libera a invocação da próxima missão para o aluno.

---

## 3. Sistema de RAID e BOSS (Party de Estudo)
- **Party System:** Alunos podem formar grupos (Party) de no máximo 3 membros da mesma turma para resolver missões em conjunto e cooperar.
- **Mini Boss:**
  - **Invocação:** Invocado ao completar exatamente 6 missões (de forma solo ou em grupo). As 6 missões podem ser combinadas como:
    - 3 missões de uma matéria (máximo diário gerado na forja por matéria) + 3 missões de outra matéria;
    - Ou 2 + 2 + 2 missões de três matérias diferentes.
  - **Enfrentamento:** O combate é feito pela Party de no máximo 3 jogadores.
  - **Dificuldade:** A pergunta do Mini Boss é de nível moderado.
  - **Recompensa:** Concede XP compartilhado e chance (RNG) de dropar artefatos raros diretamente para o inventário.
- **Boss (General):**
  - **Invocação:** Invocado manualmente pelo Mestre através de um evento global na forja.
  - **Dificuldade:** Pergunta de nível altamente complexo/muito difícil sobre o assunto selecionado.
  - **Regras:** Erros não amaldiçoam o Boss (não perdem 25% de XP a cada erro, sempre dando a pontuação máxima).
  - **Duração:** O Mestre define a duração/tempo limite do Boss em **dias** diretamente na forja durante a invocação.
- **Uso de Artefatos:**
  - **Modal de Resposta:** Durante qualquer missão (diária, baú ou boss), um ícone de uso de artefato aparecerá no modal de resposta. Ao clicar, o aluno acessará seus artefatos para facilitar a resolução da missão.
  - **Bolsa e Baú:** Os artefatos são exibidos na bolsa do jogador, mas podem ser consumidos diretamente na bolsa ou no **Baú de Quests Perdidas** para auxiliar a responder as missões acumuladas.

---

## 4. Requisitos Técnicos e de Segurança
- **Segurança de Identidade:** Autenticação biométrica local via chaveiro seguro do Expo (`expo-local-authentication` + `AsyncStorage`) integrada à API sem vazamento ou exposição de dados pessoais.
- **Segurança Jurídica (LGPD):** Controle estrito de consentimento no front-end bloqueando hooks de polling e requisições assíncronas para usuários que ainda não aceitaram os termos legais.
- **Interface e UX:** Layout cyberpunk gamificado responsivo adaptado com `<KeyboardAvoidingView>` inteligente (iOS: `padding` / Android: `nativamente redimensionável`) para evitar oclusão de teclados em caixas de textos longas.