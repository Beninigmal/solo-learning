# 🔮 Solen SaaS — Plano de Negócios, Viabilidade de IA e Estratégia Antitransbordo

Este documento apresenta a versão atualizada e revisada do plano estratégico para a transformação do **Solen (Solo Learning)** em um modelo **SaaS (Software as a Service) B2B** voltado para instituições de ensino. 

Esta revisão detalha a modelagem de consumo de tokens com base na matriz curricular, a análise legal de direitos autorais, e a substituição do assistente administrativo para **Ordinator**, além do novo plano de entrada (**Plano Rank B — Gamificação Pura**).

---

## 🏛️ 1. Tiers e Planos de Precificação SaaS

O Solen é comercializado como uma assinatura recorrente baseada na quantidade de **alunos ativos cadastrados**, cobrada diretamente da instituição de ensino (B2B):

### 🚫 Plano Trial Gratuito (14 dias)
*   **Valor**: Gratuito (R$ 0,00).
*   **Recursos**: Acesso ao painel administrativo básico e à gamificação (quests, ranks, inventário).
*   **Limitação Anti-Abuso**: O resolvedor do [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) é limitado a gerar grades horárias para no máximo **2 turmas** (para impedir que a escola gere sua grade anual completa e cancele o serviço). Sem acesso ao agente assistente.

### 🛡️ Plano Rank B (Gamificação Pura — Idiomas, Cursos Livres e Preparatórios)
*   **Valor Mensal**: **R$ 2,50 por aluno / mês**
*   **Valor Anual (Fidelizado)**: **R$ 22,00 por aluno / ano** (equivalente a R$ 1,83 por aluno / mês)
*   **Recursos**: Todo o ecossistema gamificado de RPG ativo (quests diárias por IA, baú de erros com cooldown, parties/dungeons cooperativas, radares e inventário).
*   **Restrição**: **Monarch Engine v3 100% bloqueado** (0 turmas/grades geradas). Ideal para cursos que não precisam de gestão de grade horária acadêmica.

### ⚔️ Plano Rank A (Premium)
*   **Valor Mensal**: **R$ 3,50 por aluno / mês**
*   **Valor Anual (Fidelizado)**: **R$ 30,00 por aluno / ano** (equivalente a R$ 2,50 por aluno / mês)
*   **Recursos**: Acesso total e ilimitado ao Monarch Engine (todas as turmas da escola simultaneamente), monitoramento de radar em tempo real, envio ilimitado de quests diárias por IA e todo o ecossistema gamificado de RPG.

### 👑 Plano Rank S (Monarca / Supreme)
*   **Valor Mensal**: **R$ 5,00 por aluno / mês** (R$ 1,50 extra por aluno sobre o plano Rank A)
*   **Valor Anual (Fidelizado)**: **R$ 48,00 por aluno / ano** (equivalente a R$ 4,00 por aluno / mês)
*   **Recursos**: Todos os recursos do Plano Rank A + **Ordinator: O Assistente do Sistema** (agente de suporte e automação executiva para administradores e coordenadores).

---

## 🤖 2. O Recurso Exclusivo do Plano Rank S: "Ordinator — O Assistente do Sistema"

**Ordinator** (do latim para *organizador, aquele que agenda e ordena*) é o agente de suporte e automação inteligente integrado ao painel do Arquiteto (administrador escolar). Ele opera como um "estagiário executivo" que entende linguagem natural e realiza operações complexas diretamente no banco de dados e nos motores do sistema.

### A. Casos de Uso do Agente Ordinator
1.  **Análise e Relatórios de Saúde Acadêmica**:
    *   *Comando*: *"Ordinator, analise o desempenho geral de Ciências e me dê um relatório das disciplinas com maior taxa de erro."*
    *   *Ação*: O agente roda queries nas tabelas de progresso das quests, correlaciona o XP ganho com o volume de alunos e retorna um relatório formatado destacando matérias com dificuldades conceituais.
2.  **Remanejamento e Ajuste de Restrições (Monarch Engine)**:
    *   *Comando*: *"O professor Marcos de Português não poderá mais dar aulas nos dois últimos horários das quintas-feiras. Reajuste a grade e rode o Monarch novamente."*
    *   *Ação*: O agente adiciona a restrição na tabela `TeacherUnavailability` correspondente ao professor Marcos, executa a função de agendamento [monarchSolveTurma](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/src/routes/quests.ts#L3753) em lote, valida a consistência da nova grade e exibe a alteração pronta para aprovação do administrador.
3.  **Planejamento Acadêmico Futuro (Anos Letivos)**:
    *   *Comando*: *"Prepare o planejamento para o ano que vem. Remova o professor Fulano, adicione o professor Cícero com carga horária de 40h concursado, e aumente as aulas semanais de Matemática do 9º ano para 6 aulas."*
    *   *Ação*: O agente atualiza as cargas contratuais e vínculos das disciplinas nas tabelas do Prisma, deixando a matriz pronta para a simulação do Monarch do novo ano letivo.

---

## 🧠 3. Viabilidade Financeira & Custos da API Gemini (Análise Curricular Precisa)

### A. Carga Horária e Geração de Quests (Por Turma)
*   **Matérias geradoras de Quests**: Português (2 dias/semana), Matemática (2 dias/semana), Geografia (2 dias/semana), História (2 dias/semana), Ciências (2 dias/semana) e Inglês (1 dia/semana).
*   **Total de Dias com Quests na Semana**: **11 dias de aula por semana / turma**.
*   **Quests por Dia de Aula**: **3 quests** (uma trilha de 3 perguntas geradas para fixação daquela aula).
*   **Quests Mensais por Turma**: 11 dias × 3 quests × 4 semanas = **132 quests / mês**.

### B. Projeção de Consumo Mensal (Escola Média - 500 Alunos, 15 Turmas, 30 Professores)
*   **Total de Quests Geradas (Mestres)**: 15 turmas × 132 quests = **1.980 Quests geradas/mês**.
*   **Total de Respostas Individuais Padrão (Alunos)**: 500 alunos × 132 quests = **66.000 respostas bases/mês**.
*   **Ajuste por Cooldown e Party**: Média de 1.3x tentativas após erros (bloqueadas pelo Cooldown de 30 min) e redução de 20% no processamento de respostas devido ao acerto compartilhado em Party (Dungeons).
*   **Total de Análises de Resposta**: **68.640 análises de resposta / mês**.

### C. Consumo Adicional do Agente Ordinator (Plano Rank S)
*   **Chamadas estimadas para o Ordinator**: 100 chats/mês por escola.
*   **Tamanho do Prompt (Input)**: ~4.000 tokens (inclui esquema do banco de dados, histórico de conversação do administrador e instruções de persona).
*   **Tamanho da Resposta (Output)**: ~500 tokens (JSON de comandos + retorno em texto).
*   *Consumo mensal do Ordinator*: Input = 0,4M tokens; Output = 0,05M tokens.
*   *Custo da API Gemini 2.0 Flash p/ o Ordinator*: **R$ 0,33 / mês** por escola.

---

### D. Custos de API Consolidados (Por Escola/Mês - Gemini 2.0 Flash)
*Taxa de câmbio: 1 USD = R$ 5,50*

*   **Custos de API do Plano Rank B** (Ex: Escola Pequena - 100 alunos, 4 turmas):
    *   Quests geradas: 528 quests/mês.
    *   Análises de resposta (com cooldown e party): 13.728 análises/mês.
    *   *Tokens Totais*: 14,21M Input / 3,01M Output.
    *   **Custo Total de API Gemini 2.0 (Rank B)**: **R$ 14,43 / mês**.
*   **Custos de API do Plano Rank A**: **R$ 73,07 / mês**.
*   **Custos de API do Plano Rank S**: R$ 73,07 + R$ 0,33 = **R$ 73,40 / mês**.

---

## 🖥️ 4. Outros Custos de Infraestrutura SaaS

Os custos fixos de banco de dados, servidores, autenticação e notificações por escola de 500 alunos:
*   **Banco de Dados PostgreSQL (Supabase Pro)**: R$ 27,50 / mês
*   **Servidor Backend (Fastify no Render)**: R$ 20,00 / mês
*   **Notificações & E-mails (EAS + Resend)**: R$ 15,00 / mês
*   **Updates do App & CDN (Vercel)**: R$ 10,00 / mês
*   **Total de Infraestrutura**: **R$ 72,50 / mês** *(Para o Plano Rank B, por ter menor demanda computacional, a infraestrutura proporcional alocada é de apenas **R$ 20,00 / mês**).*

---

## 📈 5. Custos Totais e Projeção de Margem de Lucro por Plano (Escola Média / Proporcional)

### 🛡️ Projeção do Plano Rank B (Gamificação Pura - Exemplo: Escola de 100 Alunos)
*   Faturamento Mensal: 100 alunos × R$ 2,50 = **R$ 250,00 / mês**
*   Custo Operacional: R$ 14,43 (API) + R$ 20,00 (Infra) = **R$ 34,43 / mês**
*   **Lucro Líquido**: **R$ 215,57 / mês** (Anual: R$ 2.586,84) — Margem: **86,2%**

### ⚔️ Projeção do Plano Rank A (Premium - Escola de 500 Alunos)
*   Faturamento Mensal: 500 alunos × R$ 3,50 = **R$ 1.750,00 / mês**
*   Custo Operacional: R$ 73,07 (API) + R$ 72,50 (Infra) = **R$ 145,57 / mês**
*   **Lucro Líquido**: **R$ 1.604,43 / mês** (Anual: R$ 19.253,16) — Margem: **91,7%**

### 👑 Projeção do Plano Rank S (Supreme - Escola de 500 Alunos)
*   Faturamento Mensal: 500 alunos × R$ 5,00 = **R$ 2.500,00 / mês**
*   Custo Operacional: R$ 73,40 (API) + R$ 72,50 (Infra) = **R$ 145,90 / mês**
*   **Lucro Líquido**: **R$ 2.354,10 / mês** (Anual: R$ 28.249,20) — Margem: **94,1%**

---

## 🔒 6. Prevenção contra Infrações de Direitos Autorais (Copyright)

À medida que o Solen transiciona para uma marca definitiva de mercado, é fundamental eliminar passivos legais de Propriedade Intelectual (PI).

### A. Análise Legal sobre o nome "Igris"
*   **A Origem**: "Igris" é um personagem fictício de criação original da Light Novel e Webtoon *Solo Leveling*, de autoria de Chugong, publicada e licenciada comercialmente pela Kakao Entertainment e D&C Media.
*   **Risco Judicial**: O uso do nome exato de um personagem licenciado em um produto comercial (SaaS B2B) de software sem autorização explícita constitui **infração de direitos autorais (copyright)** e pode ser caracterizado como **concorrência desleal / aproveitamento parasita**. A editora Kakao Entertainment tem um histórico ativo de proteção de sua propriedade intelectual, podendo enviar notificações de *Cease & Desist* ou processar civilmente por perdas e danos.
*   **Decisão Estratégica**: Substituir "Igris" no código e na comunicação por um nome livre de PI.

### B. O Nome "Ordinator" como Alternativa Legal
*   **A Origem**: **Ordinator** é uma palavra do dicionário latino que significa "organizador", "coordenador" ou "aquele que coloca em ordem".
*   **Viabilidade Legal**: Por ser um termo de dicionário de língua clássica, é de domínio público e não pode sofrer apropriação exclusiva de marca como palavra isolada. É foneticamente robusto, mantém a seriedade e o mistério cibernético dos sistemas de RPG mas é **100% blindado contra processos de direitos autorais**.
*   **Outros Termos**: O uso de jargões comuns de RPG/D&D (como *Party*, *Dungeon*, *Quest*, *Mestre*) é totalmente livre, pois fazem parte do domínio público da ficção de fantasia medieval, estando inclusive protegidos sob a licença Creative Commons CC-BY 4.0 das regras SRD 5.1 da Wizards of the Coast.
