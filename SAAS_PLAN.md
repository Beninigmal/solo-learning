# 🔮 Solen SaaS — Plano de Negócios, Viabilidade de IA e Estratégia Antitransbordo

Este documento apresenta a versão atualizada e revisada do plano estratégico para a transformação do **Solen (Solo Learning)** em um modelo **SaaS (Software as a Service) B2B** voltado para instituições de ensino. 

Esta revisão detalha a modelagem de consumo de tokens com base na matriz curricular exata de matérias e dias de aula geradores de quests, recalcula o impacto financeiro do **Cooldown de 30 Minutos** e da mecânica de **Party**, e redefine as projeções de custos e lucros.

---

## 🏛️ 1. Modelo de Negócios SaaS B2B

O Solen é comercializado como uma licença anual ou mensal por **aluno ativo cadastrado**, cobrada diretamente da instituição de ensino (B2B):

*   **Plano Mensal Recorrente**: **R$ 3,50 por aluno / mês**
*   **Plano Anual Fidelizado**: **R$ 30,00 por aluno / ano** (equivalente a R$ 2,50 por aluno / mês)
*   **Plano Trial Gratuito (14 dias)**: Acesso total ao sistema de gamificação, mas com o resolvedor do [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) limitado a gerar grades horárias para no máximo **2 turmas** (para evitar que a escola extraia sua grade anual completa e cancele o serviço).

---

## 🧠 2. Viabilidade Financeira & Custos da API Gemini (Análise Curricular Precisa)

Para garantir máxima segurança orçamentária, realizamos um raciocínio conjunto baseado no quadro semanal real de uma turma padrão:

### A. Estrutura Semanal de Matérias e Geração de Quests (Por Turma)
*   **Português**: 2 dias de aula/semana (Gera quests 2 dias/semana)
*   **Matemática**: 2 dias de aula/semana (Gera quests 2 dias/semana)
*   **Geografia**: 2 dias de aula/semana (Gera quests 2 dias/semana)
*   **História**: 2 dias de aula/semana (Gera quests 2 dias/semana)
*   **Ciências**: 2 dias de aula/semana (Gera quests 2 dias/semana)
*   **Inglês**: 1 dia de aula/semana (Gera quests 1 dia/semana)
*   *Matérias sem Quests (Artes / Ed. Física)*: 2 dias/semana (0 quests)
*   **Total de Dias com Quests na Semana**: **11 dias de aula por semana / turma**.
*   **Quests por Dia de Aula**: **3 quests** (uma trilha de 3 perguntas geradas para fixação daquela aula).

### B. Projeção de Consumo Mensal (Escola Média - 500 Alunos, 15 Turmas, 30 Professores)
*   **Quests Semanais por Turma**: 11 dias × 3 quests = **33 quests / semana**.
*   **Quests Mensais por Turma**: 33 quests × 4 semanas = **132 quests / mês**.
*   **Total de Quests Geradas na Escola (Mestres)**: 15 turmas × 132 quests = **1.980 Quests geradas por mês**.
*   **Total de Respostas Individuais Padrão (Alunos)**: 500 alunos × 132 quests = **66.000 respostas analisadas por mês** (sem contar erros/tentativas).
    *   *Nota*: Isso equivale a uma média de 6,6 quests resolvidas por aluno por dia letivo (aproximadamente 10 a 15 minutos diários de estudo, engajamento realista e sustentável).

### C. Consumo de Tokens por Operação Padrão
1.  **Geração de Quests (1.980 operações/mês)**: Input de 1.500 tokens, Output de 800 tokens.
    *   *Input Mensal*: 1.980 × 1.500 = **2.970.000 tokens (2,97M)**
    *   *Output Mensal*: 1.980 × 800 = **1.584.000 tokens (1,58M)**
2.  **Análise de Respostas (66.000 operações/mês)**: Input de 1.000 tokens, Output de 200 tokens.
    *   *Input Mensal*: 66.000 × 1.000 = **66.000.000 tokens (66M)**
    *   *Output Mensal*: 66.000 × 200 = **13.200.000 tokens (13,2M)**

---

### D. Custos de API Mensais Basais (Sem Erros e Sem Party)
*Taxa de câmbio: 1 USD = R$ 5,50*

*   **Gemini 2.0 Flash (Base)**:
    *   Input: 68,97M tokens × $0,10/1M = $6,897 (~R$ 37,93)
    *   Output: 14,78M tokens × $0,40/1M = $5,912 (~R$ 32,52)
    *   **Custo Total de API Gemini 2.0**: **$12,81 / mês** (~R$ 70,45)
*   **Gemini 2.5 Flash (Base)**:
    *   Input: 68,97M tokens × $0,30/1M = $20,691 (~R$ 113,80)
    *   Output: 14,78M tokens × $2,50/1M = $36,950 (~R$ 203,23)
    *   **Custo Total de API Gemini 2.5**: **$57,64 / mês** (~R$ 317,03)

---

## 🛑 3. Impacto dos Erros (Cooldown) e Economia das Parties (Dungeons)

No cenário real do aplicativo, consideramos o comportamento de tentativas e a otimização de guilda:

1.  **Fator de Erro (Cooldown de 30 min + YouTube)**: Estimamos que, com a devolutiva indicando o erro e o tempo de bloqueio para estudo, a taxa média de tentativas por quest seja de **1.3x** (70% acertam de primeira, 30% erram uma vez e buscam o vídeo indicado).
2.  **Fator Party (Dungeons Cooperativas)**: Estimamos que **30% dos alunos** joguem em grupos de 3 (Party). Como o acerto de um conclui a quest para todos, isso reduz as chamadas de correção de respostas estudantis em **20%** no total geral da escola.

### Projeção Consolidada de Correções/Mês (Média de 1.3x tentativas + 20% redução Party):
*   66.000 bases × 0,8 (Party) × 1.3 (Tentativas com erro) = **68.640 análises de resposta / mês**.

### E. Custos Ajustados de API (Com Cooldown e Party ativos)

| Modelo | Input Mensal (Gen + Corr) | Output Mensal (Gen + Corr) | Custo Mensal (USD) | Custo Mensal (BRL) | Custo / Aluno (BRL) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Gemini 2.0 Flash** | 71,61M tokens | 15,31M tokens | **$13,28** | **R$ 73,07** | **R$ 0,14** |
| **Gemini 2.5 Flash** | 71,61M tokens | 15,31M tokens | **$59,76** | **R$ 328,67** | **R$ 0,65** |

---

## 🖥️ 4. Outros Custos de Infraestrutura SaaS

Os custos fixos de banco de dados, servidores, autenticação e notificações por escola de 500 alunos:
*   **Banco de Dados PostgreSQL (Supabase Pro)**: R$ 27,50 / mês
*   **Servidor Backend (Fastify no Render)**: R$ 20,00 / mês
*   **Notificações & E-mails (EAS + Resend)**: R$ 15,00 / mês
*   **Updates do App & CDN (Vercel)**: R$ 10,00 / mês
*   **Total Infraestrutura**: **R$ 72,50 / mês**

---

## 📈 5. Custos Totais e Projeção de Margem de Lucro Realizada

Faturamento Bruto Mensal da Escola Média: **R$ 1.750,00 / mês** (500 alunos × R$ 3,50).

### A. Projeção Financeira com Gemini 2.0 Flash
*   Custo Operacional Total: R$ 73,07 (API) + R$ 72,50 (Infra) = **R$ 145,57 / mês**
*   **Lucro Líquido Mensal**: **R$ 1.604,43 / mês**
*   **Lucro Líquido Anual**: **R$ 19.253,16 / ano**
*   **Margem de Lucro**: **91,7%**

### B. Projeção Financeira com Gemini 2.5 Flash
*   Custo Operacional Total: R$ 328,67 (API) + R$ 72,50 (Infra) = **R$ 401,17 / mês**
*   **Lucro Líquido Mensal**: **R$ 1.348,83 / mês**
*   **Lucro Líquido Anual**: **R$ 16.185,96 / ano**
*   **Margem de Lucro**: **77,1%**

---

## 🛡️ 6. Estratégia Trial Anti-Abuso: Monarch Engine Limit

*   **Restrição Rígida**: O resolvedor de conflitos [monarchSolveTurma](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/src/routes/quests.ts#L3753) só permitirá a execução e alocação de horários para no máximo **2 turmas (classes)** no plano Trial.
*   **Bloqueio Gamificado na UI**: Caso o coordenador adicione uma terceira turma e tente rodar o algoritmo de alocação de horários, a interface exibirá uma janela de sistema no estilo RPG de Solo Leveling:
    
    > **⚠️ ALERTA DO SISTEMA DE MANA**
    > 
    > *Sua reserva de Mana atual é insuficiente para invocar o Monarch Engine em mais de 2 turmas simultâneas.*
    > 
    > *Para expandir os limites da sua Masmorra Escolar e gerenciar todas as suas turmas sem restrições, realize o upgrade para a licença **Premium de Caçador (SaaS Pro)**.*
