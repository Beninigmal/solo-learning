# 🔮 Solen SaaS — Plano de Negócios, Viabilidade de IA e Estratégia Antitransbordo

Este documento apresenta o plano estratégico detalhado para a transformação do **Solen (Solo Learning)** em um modelo **SaaS (Software as a Service) B2B** voltado para instituições de ensino de rede pública e privada. 

O plano foi estruturado considerando a viabilidade de custos de processamento utilizando modelos de linguagem avançados (Google Gemini 2.0 Flash e 2.5 Flash), infraestrutura web e uma estratégia de Trial anti-abuso focada no **Monarch Engine v3**.

---

## 🏛️ 1. Modelo de Negócios SaaS B2B

O Solen atua em duas frentes de valor para as escolas:
1. **Redução de Gargalos Administrativos (Coordenadores/Arquitetos)**: Geração automatizada de grades horárias otimizadas em conformidade com as leis trabalhistas e educacionais brasileiras via [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md).
2. **Engajamento e Aprendizado Contínuo (Alunos e Professores)**: Gamificação no estilo RPG de Solo Leveling, com quests geradas por IA baseadas em diretrizes curriculares nacionais, lutas de boss, inventários de artefatos e radares de desempenho escolar.

### Tiers de Precificação Sugeridos
A precificação será baseada em uma assinatura mensal ou anual recorrente por **aluno ativo cadastrado**, com faturamento direto para a instituição de ensino (B2B):

*   **Plano Mensal Recorrente**: **R$ 3,50 por aluno / mês**
*   **Plano Anual Fidelizado**: **R$ 30,00 por aluno / ano** (equivalente a R$ 2,50 por aluno / mês - economia de ~28%)
*   **Plano Trial Gratuito (14 dias)**: Acesso livre para testar as mecânicas de gamificação e o painel administrativo, porém com **limitação severa no Monarch Engine** (detalhada na Seção 4).

---

## 🧠 2. Viabilidade Financeira & Custos da API Gemini

A maior fonte de custo dinâmico e variável do Solen SaaS é o processamento de IA para a geração de Quests diárias (Mestres) e correção/análise detalhada das respostas enviadas (Caçadores/Alunos).

Abaixo, detalhamos o consumo de tokens e a comparação financeira entre o **Gemini 2.0 Flash** e o **Gemini 2.5 Flash**, utilizando como base de cálculo uma **Escola de Porte Médio (500 alunos, 15 turmas, 30 professores)**.

### A. Premissas de Uso Mensal (Escola Média)
*   **Quantidade de Alunos**: 500 alunos
*   **Quantidade de Turmas**: 15 turmas
*   **Dias Letivos**: 20 dias por mês (4 semanas)
*   **Quests Geradas (Mestres)**: 1 Quest diária por turma nos 20 dias letivos = **300 Quests geradas por mês**.
*   **Respostas Enviadas (Alunos)**: Cada aluno responde a 1 Quest por dia útil = **10.000 respostas analisadas por mês**.

### B. Consumo de Tokens por Operação

#### 1. Geração de Quests (Teacher Flow)
*   **Prompt (Input)**: ~1.500 tokens (regras curriculares da LDB/MEC para a série, tema da missão, restrições pedagógicas, histórico de quests recentes e instruções de saída em JSON estruturado).
*   **Resposta da IA (Output)**: ~800 tokens (estrutura JSON contendo enunciado imersivo de RPG, 4 alternativas de múltipla escolha com gabarito justificado, dicas para o baú de erros e classificação de dificuldade).
*   **Consumo Mensal**:
    *   *Input*: 300 × 1.500 = **450.000 tokens**
    *   *Output*: 300 × 800 = **240.000 tokens**

#### 2. Análise de Respostas (Player Flow)
*   **Prompt (Input)**: ~1.000 tokens (enunciado da quest resolvida, gabarito esperado, resposta manuscrita do aluno em formato de texto/transcrição de foto e regras de correção formativa).
*   **Resposta da IA (Output)**: ~200 tokens (JSON contendo status de acerto/erro, feedback pedagógico formativo personalizado para guiar o aluno no erro e pontuação de XP).
*   **Consumo Mensal**:
    *   *Input*: 10.000 × 1.000 = **10.000.000 tokens (10M)**
    *   *Output*: 10.000 × 200 = **2.000.000 tokens (2M)**

#### 3. Total de Tokens Mensais (Escola de 500 Alunos)
*   **Tokens de Entrada (Input)**: 10.450.000 tokens (~10,45M)
*   **Tokens de Saída (Output)**: 2.240.000 tokens (~2,24M)

---

### C. Comparação de Custos de API (USD vs BRL)
*Taxa de câmbio estimada: 1 USD = R$ 5,50*

| Modelo | Preço Input (por 1M) | Preço Output (por 1M) | Custo Mensal (USD) | Custo Mensal (BRL) | Custo por Aluno/Mês (BRL) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Gemini 2.0 Flash** | $0,10 | $0,40 | **$1,94** | **R$ 10,68** | **R$ 0,02** |
| **Gemini 2.5 Flash** | $0,30 | $2,50 | **$8,74** | **R$ 48,04** | **R$ 0,09** |

> [!TIP]
> **Otimização de Custos**: 
> 1. Como os prompts do Mestre e de Correção reutilizam as mesmas regras do MEC e formatação de saída sistematicamente, podemos implementar o **Context Caching** do Gemini. Isso reduz o custo de tokens de input repetidos em até **90%**, trazendo o custo do Gemini 2.0 Flash para menos de R$ 5,00 por escola.
> 2. O Gemini 2.0 Flash se prova o modelo ideal devido ao seu altíssimo custo-benefício, mantendo o custo de IA por aluno em impressionantes **R$ 0,02 por mês**.

---

## 🖥️ 3. Outros Custos de Infraestrutura SaaS

Para além da API de Inteligência Artificial, o Solen SaaS exige servidores e persistência de dados isolados por tenant:

1.  **Banco de Dados PostgreSQL (Ex: Supabase Pro / AWS RDS)**:
    *   R$ 137,50 ($25) por instância de banco compartilhada (suporta com folga até 5 escolas médias através de esquemas multi-tenant seguros).
    *   *Custo proporcional por escola*: **R$ 27,50 / mês**.
2.  **Servidor Backend Fastify (Render Web Service / AWS ECS)**:
    *   R$ 137,50 ($25) por servidor Node.js com Fastify em ambiente clusterizado (suporta 5 a 8 escolas).
    *   *Custo proporcional por escola*: **R$ 20,00 / mês**.
3.  **Hospedagem Frontend Expo Web & Mobile Updates (Vercel + EAS)**:
    *   O build e distribuição de pacotes pelo Expo Application Services (EAS) é praticamente gratuito dentro do plano básico. Alocação preventiva de banda e updates OTA.
    *   *Custo estimado por escola*: **R$ 10,00 / mês**.
4.  **Autenticação e Disparo de Push Notifications/E-mails (Firebase Auth + Resend/SendGrid)**:
    *   Notificações e-mails e transações de login.
    *   *Custo proporcional por escola*: **R$ 15,00 / mês**.

### Custo Operacional Total Consolidado (Por Escola Média - 500 Alunos)
*   **Com Gemini 2.0 Flash**: R$ 10,68 (IA) + R$ 72,50 (Infra) = **R$ 83,18 / mês**
*   **Com Gemini 2.5 Flash**: R$ 48,04 (IA) + R$ 72,50 (Infra) = **R$ 120,54 / mês**

---

## 📈 4. Projeções de Faturamento e Lucro Líquido

Abaixo estão calculados os lucros esperados considerando o preço de venda de **R$ 3,50 por aluno/mês** (Plano Mensal) e o custo baseado no **Gemini 2.0 Flash** (com infraestrutura inclusa).

### A. Tabela de Lucratividade Mensal e Anual por Porte de Escola

| Porte da Escola | Alunos | Faturamento Mensal (BRL) | Faturamento Anual (BRL) | Custo Operacional Mensal (BRL) | Lucro Líquido Mensal (BRL) | Lucro Líquido Anual (BRL) | Margem de Lucro |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pequena** (Ex: 6 turmas) | 200 | R$ 700,00 | R$ 8.400,00 | R$ 54,27 | **R$ 645,73** | **R$ 7.748,76** | **92,2%** |
| **Média** (Ex: 15 turmas) | 500 | R$ 1.750,00 | R$ 21.000,00 | R$ 83,18 | **R$ 1.666,82** | **R$ 20.001,84** | **95,2%** |
| **Grande** (Ex: 45 turmas) | 1.500 | R$ 5.250,00 | R$ 63.000,00 | R$ 152,03 | **R$ 5.097,97** | **R$ 61.175,64** | **97,1%** |

### B. Projeção de Escala de Portfólio (Assinaturas Anuais Recorrentes)
Se a nossa startup SaaS conquistar **30 escolas de porte médio** no primeiro ano letivo ativo:
*   **Base de Usuários**: 15.000 alunos ativos na plataforma.
*   **Faturamento Bruto Anual**: 30 escolas × R$ 21.000,00 = **R$ 630,000.00**
*   **Custo Operacional Total Anual**: 30 escolas × (R$ 83,18 × 12) = **R$ 29.944,80**
*   **Lucro Líquido Anual da Operação**: **R$ 600.055,20 / ano** (antes de impostos e despesas de marketing).
*   **Ponto de Equilíbrio (Break-Even)**: Com apenas **1 escola de 25 alunos pagantes**, os custos fixos mínimos de infraestrutura do SaaS inteiro já são cobertos.

---

## 🛡️ 5. Estratégia Trial Anti-Abuso: Monarch Engine Limit

### O Problema do Abuso na Rede de Ensino
O [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) é a funcionalidade administrativa de maior impacto imediato e menor esforço recorrente. Ele resolve de forma autônoma em segundos a grade de horários anual de professores e turmas, um problema complexo que costuma tomar semanas de trabalho da coordenação pedagógica.

Se o Solen SaaS oferecer um trial grátis clássico de 14 ou 30 dias sem restrições de motor:
1.  O coordenador da instituição se cadastra no trial.
2.  Importa todos os seus 50 professores e 20 turmas.
3.  Executa o **Monarch Engine** para gerar o quadro de horários coordenado do ano inteiro.
4.  Exporta a planilha gerada ou tira prints das grades de horários.
5.  Cancela a assinatura logo em seguida, usufruindo de toda a inteligência do CSP Solver de graça, sem engajar os alunos no ecossistema e nas missões diárias de RPG (que são o motor de faturamento recorrente do SaaS).

### A Solução: Limitação Criativa a 2 Turmas (Monarch Trial Limit)
No plano Trial Gratuito, a restrição deve impossibilitar o uso do gerador de grades para a escola inteira, mantendo-o apenas como um ambiente de demonstração técnica e prova de valor (*A-ha Moment*).

*   **Restrição Rígida**: O resolvedor de conflitos [monarchSolveTurma](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/src/routes/quests.ts#L3753) só permitirá a execução paralela de lotes e alocação de horários para no máximo **2 turmas (classes)** por instituição.
*   **Justificativa Pedagógica e Prática**: Gerar uma grade para 2 turmas prova para o coordenador que a inteligência artificial e o resolvedor de restrições funcionam perfeitamente. No entanto, o problema real de conflitos de horários em escolas só surge quando cruzamos 10, 20 ou 30 turmas cujos professores dividem as mesmas janelas de aula. A grade de 2 turmas é inútil para a operação real da escola.
*   **Bloqueio Gamificado na UI**: Caso o coordenador adicione uma terceira turma e tente rodar o algoritmo de alocação de horários, a interface exibirá uma janela de sistema no estilo RPG de Solo Leveling:
    
    > **⚠️ ALERTA DO SISTEMA DE MANA**
    > 
    > *Sua reserva de Mana atual é insuficiente para invocar o Monarch Engine em mais de 2 turmas simultâneas.*
    > 
    > *Para expandir os limites da sua Masmorra Escolar e gerenciar todas as suas turmas sem restrições, realize o upgrade para a licença **Premium de Caçador (SaaS Pro)**.*
    
*   **Conversão em Retenção Diária**: Uma vez contratado o plano pago para liberar a grade escolar inteira pelo Monarch Engine, a escola começará a utilizar o fluxo das Quests Diárias. O engajamento contínuo dos alunos (subindo de Rank, montando Parties, comprando artefatos na loja) cria um ecossistema com efeito de rede. Mesmo após a grade de horários estar definida, a escola não cancelará a assinatura para não frustrar os estudantes e não perder o histórico de notas e radares de XP que alimentam o conselho de classe.

---

## 🛠️ 6. Plano de Implementação do SaaS no Backend

Para suportar esse fluxo de forma eficiente e sem overhead técnico, as seguintes alterações precisam ser realizadas na codebase:

### A. Atualização da Tabela de Escolas (Multi-tenant)
No arquivo [schema.prisma](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/prisma/schema.prisma), criaremos um modelo para gerenciar o plano do Tenant:
```prisma
model TenantConfig {
  id              String   @id @default(uuid())
  instituicao     String   @unique
  plano           String   @default("TRIAL") // "TRIAL", "PREMIUM_MENSUAL", "PREMIUM_ANUAL"
  trialExpiration DateTime
  maxTurmasMonarch Int     @default(2) // Limite dinâmico de turmas para o Monarch
  createdAt       DateTime @default(now())
}
```

### B. Validação no UseCase do Monarch Engine
No controlador de rotas de horários do Monarch, por exemplo em [quests.ts](file:///home/beni/Documentos/Estudos/Projetos/Solen/backend/src/routes/quests.ts#L4158), adicionaremos uma barreira de validação que verifica a quantidade de turmas que estão tentando ser processadas na requisição em lote (`Batch Generate`):

```typescript
// ponytail: verificação simplificada de cota de plano no tenant
const tenantConfig = await prisma.tenantConfig.findUnique({
  where: { instituicao: req.user.instituicao }
});

const isTrial = !tenantConfig || tenantConfig.plano === 'TRIAL';
if (isTrial && totalTurmasSolicitadas > 2) {
  return reply.status(403).send({
    error: 'Sua mana é insuficiente. O plano Trial é limitado a no máximo 2 turmas no Monarch Engine. Faça o upgrade para Premium.'
  });
}
```

Com esta barreira de proteção de 2 turmas e a viabilidade incrível de custos da API do Gemini 2.0 Flash, o Solen está 100% pronto para iniciar sua jornada comercial como um SaaS educacional gamificado altamente rentável.
