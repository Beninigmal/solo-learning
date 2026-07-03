# 🔮 Solen SaaS — Plano de Negócios, Viabilidade de IA e Estratégia Antitransbordo

Este documento apresenta a versão detalhada do plano estratégico para a transformação do **Solen (Solo Learning)** em um modelo **SaaS (Software as a Service) B2B** voltado para instituições de ensino. 

Esta revisão incorpora a nova categoria de venda de alto nível (**Plano Rank S**), que introduz o agente inteligente **"Igris — O Assistente do Sistema"**, e recalcula as projeções financeiras.

---

## 🏛️ 1. Tiers e Planos de Precificação SaaS

O Solen é comercializado como uma assinatura recorrente baseada na quantidade de **alunos ativos cadastrados**, cobrada diretamente da instituição de ensino (B2B):

### 🚫 Plano Trial Gratuito (14 dias)
*   **Valor**: Gratuito (R$ 0,00).
*   **Recursos**: Acesso ao painel administrativo básico e à gamificação (quests, ranks, inventário).
*   **Limitação Anti-Abuso**: O resolvedor do [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) é limitado a gerar grades horárias para no máximo **2 turmas** (para impedir que a escola gere sua grade anual completa e cancele o serviço). Sem acesso ao agente assistente.

### ⚔️ Plano Rank A (Premium)
*   **Valor Mensal**: **R$ 3,50 por aluno / mês**
*   **Valor Anual (Fidelizado)**: **R$ 30,00 por aluno / ano** (equivalente a R$ 2,50 por aluno / mês)
*   **Recursos**: Acesso total e ilimitado ao Monarch Engine (todas as turmas da escola simultaneamente), monitoramento de radar em tempo real, envio ilimitado de quests diárias por IA e todo o ecossistema gamificado de RPG.

### 👑 Plano Rank S (Monarca / Supreme)
*   **Valor Mensal**: **R$ 5,00 por aluno / mês** (R$ 1,50 extra por aluno sobre o plano Rank A)
*   **Valor Anual (Fidelizado)**: **R$ 48,00 por aluno / ano** (equivalente a R$ 4,00 por aluno / mês)
*   **Recursos**: Todos os recursos do Plano Rank A + **Igris: O Assistente do Sistema** (agente de suporte e automação executiva para administradores e coordenadores).

---

## 🤖 2. O Recurso Exclusivo do Plano Rank S: "Igris — O Assistente do Sistema"

Inspirado no mais leal cavaleiro das sombras de *Solo Leveling*, **Igris** é o agente de suporte e automação inteligente integrado ao painel do Arquiteto (administrador escolar). Ele opera como um "estagiário executivo" que entende linguagem natural e realiza operações complexas diretamente no banco de dados e nos motores do sistema.

### A. Casos de Uso do Agente Igris
1.  **Análise e Relatórios de Saúde Acadêmica**:
    *   *Comando*: *"Igris, analise o desempenho geral de Ciências e me dê um relatório das disciplinas com maior taxa de erro."*
    *   *Ação*: O agente roda queries nas tabelas de progresso das quests, correlaciona o XP ganho com o volume de alunos e retorna um relatório formatado destacando matérias com dificuldades conceituais.
2.  **Remanejamento e Ajuste de Restrições (Integração com o Monarch Engine)**:
    *   *Comando*: *"O professor Marcos de Português não poderá mais dar aulas nos dois últimos horários das quintas-feiras. Reajuste a grade e rode o Monarch novamente."*
    *   *Ação*: O agente adiciona de forma autônoma a restrição na tabela `TeacherUnavailability` correspondente ao professor Marcos, executa a função de agendamento [monarchSolveTurma](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/src/routes/quests.ts#L3753) em lote, valida a consistência da nova grade e exibe a alteração pronta para aprovação do administrador.
3.  **Planejamento Acadêmico Futuro (Antecipação de Anos Letivos)**:
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

### C. Consumo Adicional do Agente Igris (Plano Rank S)
*   **Chamadas estimadas para o Igris**: 100 chats/mês por escola (uso de planejamento e suporte).
*   **Tamanho do Prompt (Input)**: ~4.000 tokens (inclui esquema de tabelas do banco de dados, histórico de conversação do administrador e instruções de persona).
*   **Tamanho da Resposta (Output)**: ~500 tokens (inclui JSON de chamada de funções de banco de dados/Monarch e retorno em texto).
*   *Consumo mensal do Igris*: Input = 400.000 tokens (0,4M); Output = 50.000 tokens (0,05M).
*   *Custo da API Gemini 2.0 Flash p/ o Igris*: **R$ 0,33 / mês** por escola. (O custo é insignificante, tornando a margem de upselling do plano Rank S espetacular).

---

### D. Custos de API Consolidados (Por Escola/Mês)
*Taxa de câmbio: 1 USD = R$ 5,50*

#### Custo no Plano Rank A (Sem Igris):
*   **Gemini 2.0 Flash**: **R$ 73,07 / mês** (71,61M input / 15,31M output)
*   **Gemini 2.5 Flash**: **R$ 328,67 / mês** (71,61M input / 15,31M output)

#### Custo no Plano Rank S (Com Igris incluso):
*   **Gemini 2.0 Flash**: R$ 73,07 + R$ 0,33 = **R$ 73,40 / mês**
*   **Gemini 2.5 Flash**: R$ 328,67 + R$ 1,51 = **R$ 330,18 / mês**

---

## 🖥️ 4. Outros Custos de Infraestrutura SaaS

Os custos fixos de banco de dados, servidores, autenticação e notificações por escola de 500 alunos:
*   **Banco de Dados PostgreSQL (Supabase Pro)**: R$ 27,50 / mês
*   **Servidor Backend (Fastify no Render)**: R$ 20,00 / mês
*   **Notificações & E-mails (EAS + Resend)**: R$ 15,00 / mês
*   **Updates do App & CDN (Vercel)**: R$ 10,00 / mês
*   **Total de Infraestrutura**: **R$ 72,50 / mês**

---

## 📈 5. Custos Totais e Projeção de Margem de Lucro por Plano

Considerando a infraestrutura completa, a taxa média de **1.3x tentativas por resposta corrigida** e a economia das Parties:

### ⚔️ Projeção do Plano Rank A (Premium - Faturamento: R$ 1.750,00 / mês)
*   **Com Gemini 2.0 Flash**:
    *   Custo Operacional: R$ 73,07 (API) + R$ 72,50 (Infra) = **R$ 145,57 / mês**
    *   **Lucro Líquido**: **R$ 1.604,43 / mês** (Anual: R$ 19.253,16) — Margem: **91,7%**
*   **Com Gemini 2.5 Flash**:
    *   Custo Operacional: R$ 328,67 (API) + R$ 72,50 (Infra) = **R$ 401,17 / mês**
    *   **Lucro Líquido**: **R$ 1.348,83 / mês** (Anual: R$ 16.185,96) — Margem: **77,1%**

### 👑 Projeção do Plano Rank S / Monarca (Supreme - Faturamento: R$ 2.500,00 / mês)
*   **Com Gemini 2.0 Flash**:
    *   Custo Operacional: R$ 73,40 (API) + R$ 72,50 (Infra) = **R$ 145,90 / mês**
    *   **Lucro Líquido**: **R$ 2.354,10 / mês** (Anual: R$ 28.249,20) — Margem: **94,1%**
*   **Com Gemini 2.5 Flash**:
    *   Custo Operacional: R$ 330,18 (API) + R$ 72,50 (Infra) = **R$ 402,68 / mês**
    *   **Lucro Líquido**: **R$ 2.097,32 / mês** (Anual: R$ 25.167,84) — Margem: **83,9%**

> **Conclusão de Mercado**: O Plano Rank S oferece um aumento de faturamento de **42,8%** por escola com um incremento de custo operacional de apenas **0,2%** em relação ao plano Rank A. A funcionalidade do assistente Igris funciona como uma alavanca extraordinária de lucro e conversão.
