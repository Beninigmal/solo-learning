# 🔮 Solen — Manual de Regras de Negócio e Sistemas Gamificados (Single Source of Truth)

Este documento é a **fonte única de verdade (Single Source of Truth)** do **Solen (Solo Learning)**. Ele unifica e organiza todas as regras de negócio, mecânicas de RPG, especificações técnicas, regras de distribuição do Monarch Engine, o catálogo de artefatos e a estrutura SaaS.

---

## 🏛️ 1. Perfis de Acesso e Autenticação (RBAC & Segurança)

O Solen é um sistema **multi-tenant** isolado por instituição acadêmica. O controle de acesso é baseado em perfis (Role-Based Access Control) acoplado a tokens JWT:

### A. Perfis de Usuário (Roles)
*   **👑 SUPERADMIN (Admin Geral)**: Gestão de escolas/tenants e cadastro inicial dos Arquitetos.
*   **🏛️ ARQUITETO (Coordenação Escolar)**: Importação de alunos (CSV/lote ou individual), cadastro de turmas, matérias, professores, alocação de vínculos e execução do gerador de grades horárias.
*   **⚔️ MESTRE (Professor)**: Forja de rascunhos de quests por IA, monitoramento acadêmico e relatórios de risco.
*   **🧑‍🚀 CAÇADOR (Aluno/Player)**: Resolução de quests diárias comuns, lutas de boss, inventário e parties.

### B. Fluxo de Primeiro Acesso & Biometria
*   **Acesso Provisório**: Novos usuários logam usando suas credenciais padrão (Senha provisória/Código de Invocação).
*   **Configuração Inicial**: São imediatamente forçados a cadastrar uma senha definitiva de 4 a 12 caracteres e escolher um Nickname (único dentro de sua instituição).
*   **Associação de Biometria**: O app ativa o prompt de biometria local (`expo-local-authentication`). Se aceito, o app vincula as credenciais criptografadas localmente para permitir o login rápido ("Despertar com Biometria").
*   **Jurídico e LGPD**: O usuário deve assinar eletronicamente os Termos de Consentimento (LGPD). O app bloqueia requisições e sons de notificação até que o termo seja aceito. Caso seja recusado, o logout é imediato.

---

## 📜 2. O Sistema de Quests e Notificações (Fila e Turnos)

As quests são o núcleo de engajamento diário dos alunos. O fluxo segue regras estritas de distribuição e limite de tempo:

### A. Turnos e Carga Curricular
*   **Turnos Inversos**: Para não atrapalhar as aulas físicas, as quests diárias só ficam disponíveis no turno oposto ao cadastrado para o aluno (ex: aluno matutino recebe quests à tarde).
*   **Evitação de Acúmulo**: O sistema nunca renderiza duas quests ativas da mesma matéria simultaneamente.

### B. Fila de Espera (Wait Mode) e TTL
*   Ao receber uma quest diária, o aluno pode clicar em **Aguardar**.
*   A quest entra em uma fila de tolerância (TTL) com duração máxima de **40 minutos**. O aluno deve reabrir e responder dentro deste limite, ou a quest expira e cai no Baú como falha.

### C. Cooldown de 30 Minutos para Erros
*   Quando o aluno erra uma questão, a quest entra em **cooldown de 30 minutos** antes de permitir uma nova tentativa.
*   **Devolutiva Direcionada (Nova Feature)**: Durante o cooldown, a IA indica onde o raciocínio falhou (ex: *"Você montou a equação certa, mas errou a simplificação"*), sem entregar a resposta correta.
*   **Link do YouTube**: O modal renderiza um link de redirecionamento de busca estruturado para o aluno estudar o assunto no YouTube:
    `https://www.youtube.com/results?search_query=como+resolver+${assunto_URL_encoded}`.

---

## 🎒 3. O Baú de Quests Perdidas (Retentativas)

*   **Destino de Falhas**: Quests expiradas no Wait Mode ou erradas 3 vezes seguidas são enviadas ao **Baú de Quests Perdidas**.
*   **Maldição de XP (Decaimento)**: Cada erro ou expiração impõe uma maldição de **-25% de XP acumulado por erro** sobre aquela quest específica.
*   **Recuperação**: O aluno pode tentar responder a questão novamente no Baú a qualquer momento (respeitando o cooldown). Se acertar, ele limpa a quest e recupera apenas **10% do XP original** da questão (a menos que use um artefato purificador).

---

## ⚔️ 4. Sistema de Party e Masmorras (Cooperação)

Alunos da mesma turma podem formar grupos (Party) de até 3 membros para enfrentar desafios conjuntos:

### A. Funcionamento da Dungeon Cooperativa
*   **Acerto Compartilhado**: Se o jogador ativo da vez responder corretamente, a quest é marcada como resolvida para **todos** na Party, distribuindo o XP equivalente.
*   **Erro Rotativo**: Se o jogador ativo errar, a vez de responder passa para o **próximo jogador** da Party.
*   **Cooldown Coletivo**: Se todos os 3 integrantes errarem suas respectivas chances, a dungeon falha e o grupo entra em um **cooldown compartilhado de 30 minutos**.

### B. Cooldown Individual Persistente (Anti-Burlas)
*   Para evitar que um aluno cometa um erro, saia da Party e entre em outra para resetar suas chances, o timestamp do cooldown é gravado de forma persistente em seu perfil (`individual_party_cooldown`). Ele fica bloqueado de responder a essa quest (em grupo ou solo) até que o tempo do cooldown expire.

---

## 🐉 5. Mini Bosses, Bosses Gerais e Efeitos Visuais/Sonoros

Os combates especiais oferecem grandes quantidades de XP e drop de artefatos mágicos:

### A. Invocação de Mini Bosses (Triggers D&D)
Os Mini Bosses são gerados automaticamente ao completar quests diárias com sucesso em múltiplas disciplinas no mesmo dia:
*   **Regra 3+3**: ≥ 3 acertos em 2 matérias diferentes gera **2 Mini Bosses** (300 XP cada).
*   **Regra 2+2+2**: ≥ 2 acertos em 3 matérias diferentes gera **3 Mini Bosses** (200 XP cada).
*   *Fórmula*: `600 / quantidade_de_bosses`. Sorteados a partir de uma pool de 50 monstros de D&D (Beholder, Lich, Tarrasque).

### B. Bosses Gerais
*   Invocados manualmente pelo Mestre (Professor) para toda a turma por um período determinado de dias.
*   Perguntas altamente complexas da disciplina do Mestre. Erros não aplicam maldição de decaimento de XP.

### C. Shaders de Queima (Skia) e Áudio
*   **Música de Batalha**: Abertura do modal de Boss/Mini Boss inicia o loop de áudio `boss_arena.mp3` (controlado por `useSolenSounds`), respeitando a opção de mute salva no `AsyncStorage`.
*   **Queima de Cartas**: O consumo de artefatos ativa uma animação física de combustão acelerada por GPU (`CardBurnEffect` via Skia e fragment shaders), exibindo cinzas e chamas incandescentes durante 1.1s.

---

## 💎 6. Catálogo de Artefatos & Drop Rates

Os artefatos são itens consumíveis que concedem bônus pedagógicos ou estratégicos.

### A. Raridades e Drop Rates
*   **Lendários (0.5% em Bosses / Ganho por Rank Up B, A, S)**:
    1.  `📜 Sussurros Sábios`: Sinaliza a quest como **"Pergunta Dourada"** para o Mestre. O professor gera um rascunho de dica pedagógica (scaffolding) via IA ou manual. Concede +50% de XP ao acertar.
    2.  `🧪 Becker do Alquimista`: Concede instantaneamente **+500 XP** ao jogador.
    3.  `👁️ Olhar do Monarca`: Revela fórmulas e tópicos das próximas quests do Boss/Mini Boss para a Party estudar.
*   **Épicos (5% em Bosses)**:
    1.  `🏆 Elixir Dourado`: Dobra o XP ganho na Quest atual.
    2.  `🕰️ Relógio Ganha Tempo`: Estende o prazo de expiração da quest ativa por 24 horas.
    3.  `🧪 Poção de Cura`: Remove todas as penalidades de XP de uma quest amaldiçoada do Baú.
    4.  `💧 Lágrima da Fênix`: Reseta as tentativas e timer de uma Raid/Mini Boss que falhou.
    5.  `🔑 Chave Mestra`: Permite invadir qualquer Party ativa da sua turma, mesmo que cheia, trancando os membros por 48 horas de corrupção.
    6.  `🚩 Cetro do Exílio`: Bane um invasor da Party e reverte o XP roubado.
    7.  `🐍 Anel da Serpente`: Aumenta a taxa de drop de itens em combates em +35% por 7 dias.
    8.  `🚩 Bandeira de Guerra`: Buff passivo de +20% de XP nas próximas 24h para toda a Party.
    9.  `🔮 Orbe de Perspicácia`: Revela o próximo tópico de estudo na rota da Party.
*   **Mágicos (37% de drop em Quests Diárias Comuns)**:
    1.  `👟 Sapatilhas do Mundo Lento`: Reduz a complexidade da quest em 1 nível (ex: Difícil para Médio).
    2.  `🔨 Martelo Mágico`: Quebra a questão exibindo os passos lógicos de resolução.
    3.  `🎯 Poeira Estelar`: Elimina uma das alternativas incorretas de múltipla escolha.
    4.  `📜 Pergaminho do Oráculo`: Concede uma dica teórica clara sobre o conceito.
    5.  `🛡️ Bracelete de Cristal`: Absorve a maldição de XP de um erro (possui 2 cargas).
    6.  `🛡️ Escudo Arcano`: Cancela a perda de 25% de XP na próxima tentativa incorreta.
    7.  `🪶 Pena do Escriba`: Em dissertativas, revela as 3 principais palavras-chave que a IA busca na resposta.
    8.  `🪄 Varinha de Pinheiro`: Transmuta uma questão de cálculo discursiva em múltipla escolha.
    9.  `🪙 Mão de Midas`: Concede 50% de chance de transmutar um item mágico em épico (destrói se falhar).
    10. `🎒 Bolsa da Sorte`: Buff de +15% de drop por 7 dias em missões normais.

---

## 🧠 7. O Monarch Engine v3 (CSP Timetable Solver)

O resolvedor automático de grades horárias [monarchSolveTurma](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/src/routes/quests.ts#L3753) aplica restrições baseadas na legislação de ensino brasileira:

### A. Matriz Curricular Basal por Nível (Ensino Fundamental, Regular e Técnico)
*   Distribuição automática de aulas por matéria (Português, Matemática, História, Física, etc.).
*   Carga horária diária e heurística de detecção automática por regex baseada no nome das turmas.

### B. Restrições e Limitações Regulatórias
*   **Piso do Magistério (Lei 11.738/2008)**: Limite de no máximo 2/3 da carga horária de concursados em sala de aula (Ex: limite de 26 aulas para 40h de contrato).
*   **Regime REDA**: Limite de 80% em sala de aula (Ex: limite de 32 aulas para 40h).
*   **Regime CLT (Rede Privada)**: Permite até 100% da carga horária contratual alocada em sala de aula.
*   **CLT Artigo 318**: Professores de rede privada não podem ministrar mais de 4 aulas consecutivas ou 6 intercaladas no mesmo dia na mesma escola.

---

## 🤖 8. Ordinator — O Assistente do Sistema

O **Ordinator** é o assistente inteligente em linguagem natural exclusivo do Plano Rank S para auxílio do Arquiteto (Coordenador):

### A. Capacidades Técnicas
*   **Auditoria e Relatórios**: Analisa a taxa de erros e progresso de XP por matéria, gerando diagnósticos rápidos de dificuldade acadêmica.
*   **Gestão de Restrições**: Permite adicionar exceções de agenda para professores e reordenar a grade horária automaticamente acionando o resolvedor do Monarch Engine.
*   **Planejamento Anual**: Criação, remoção e reajustes contratuais de professores de forma simplificada por comando de chat.

---

## 📈 9. Tiers e Planos de Assinatura SaaS

| Plano | Valor por Aluno / Mês | Valor por Aluno / Ano | Monarch Engine | Quests & Gamificação | Ordinator (IA) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Trial** (14 dias) | Gratuito | - | Limitado (2 turmas) | Ativo | Bloqueado |
| **Rank B** (Gamificação) | R$ 2,50 | R$ 22,00 | Bloqueado | Ativo | Bloqueado |
| **Rank A** (Premium) | R$ 3,50 | R$ 30,00 | Ilimitado | Ativo | Bloqueado |
| **Rank S** (Supreme) | R$ 5,00 | R$ 48,00 | Ilimitado | Ativo | **Ativo** |
