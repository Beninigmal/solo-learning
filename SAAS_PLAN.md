# 🔮 Solen SaaS — Plano de Negócios, Viabilidade de IA e Estratégia Antitransbordo

Este documento apresenta a versão atualizada e revisada do plano estratégico para a transformação do **Solen (Solo Learning)** em um modelo **SaaS (Software as a Service) B2B** voltado para instituições de ensino. 

Esta revisão corrige as premissas de carga horária escolar (matérias), introduz a nova feature de **Devolutiva de Estudo Pedagógica**, modela a restrição de tentativas por **Cooldown Inteligente**, justifica o uso de canais de comunicação (Push/E-mail) e recalcula as projeções financeiras.

---

## 🏛️ 1. Modelo de Negócios SaaS B2B

O Solen é comercializado como uma licença anual ou mensal por **aluno ativo cadastrado**, cobrada diretamente da instituição de ensino (B2B):

*   **Plano Mensal Recorrente**: **R$ 3,50 por aluno / mês**
*   **Plano Anual Fidelizado**: **R$ 30,00 por aluno / ano** (equivalente a R$ 2,50 por aluno / mês)
*   **Plano Trial Gratuito (14 dias)**: Acesso total ao sistema de gamificação, mas com o resolvedor do [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) limitado a gerar grades horárias para no máximo **2 turmas** (para evitar que a escola extraia sua grade anual completa e cancele o serviço).

---

## 🧠 2. Viabilidade Financeira & Custos da API Gemini (CORRIGIDO)

Na análise anterior, consideramos erroneamente 1 quest mensal por turma. Na realidade escolar:
*   Cada turma tem em média **8 matérias** ativas.
*   Matérias principais (Português, Matemática) possuem múltiplas aulas por semana (ex: 2 a 5 aulas).
*   Se cada aula gera 1 quest diária para fixação, cada turma consome em média **4 quests por dia útil** (ou seja, ~20 quests por matéria por mês, totalizando **80 quests por turma ao mês**).

### A. Novas Premissas de Uso Mensal (Escola Média)
*   **Quantidade de Alunos**: 500 alunos (~33 alunos por turma)
*   **Quantidade de Turmas**: 15 turmas
*   **Quests Geradas (Mestres)**: 15 turmas × 80 quests/mês = **1.200 Quests geradas por mês**.
*   **Respostas Enviadas (Alunos)**: 500 alunos × 80 quests/mês = **40.000 respostas normais analisadas por mês** (sem contar erros/tentativas).

### B. Consumo de Tokens por Operação Padrão
1.  **Geração de Quests**: Input de 1.500 tokens, Output de 800 tokens.
    *   *Input Mensal*: 1.200 × 1.500 = **1.800.000 tokens (1,8M)**
    *   *Output Mensal*: 1.200 × 800 = **960.000 tokens (0,96M)**
2.  **Análise de Respostas**: Input de 1.000 tokens, Output de 200 tokens.
    *   *Input Mensal*: 40.000 × 1.000 = **40.000.000 tokens (40M)**
    *   *Output Mensal*: 40.000 × 200 = **8.000.000 tokens (8M)**

### C. Custos de API Mensais Corrigidos (Sem Erros/Tentativas)
*Taxa de câmbio: 1 USD = R$ 5,50*

*   **Gemini 2.0 Flash**:
    *   Input: 41,8M tokens × $0,10/1M = $4,18 (~R$ 22,99)
    *   Output: 8,96M tokens × $0,40/1M = $3,58 (~R$ 19,69)
    *   **Custo Total de API (Gemini 2.0)**: **$7,76 / mês** (~R$ 42,68)
*   **Gemini 2.5 Flash**:
    *   Input: 41,8M tokens × $0,30/1M = $12,54 (~R$ 68,97)
    *   Output: 8,96M tokens × $2,50/1M = $22,40 (~R$ 123,20)
    *   **Custo Total de API (Gemini 2.5)**: **$34,94 / mês** (~R$ 192,17)

---

## 🛑 3. Nova Feature: Devolutiva de Estudo e Controle de Abuso (Spam de Tokens)

### ⚠️ Sincera Discordância: O Risco Pedagógico e Financeiro de 10 Tentativas Livres
Embora o erro seja fundamental para a aprendizagem, permitir que o aluno tente responder **10 vezes no mesmo dia** traz problemas sérios:

1.  **Do ponto de vista Pedagógico (Chute por Tentativa e Erro)**: Em questões de múltipla escolha (4 opções), permitir 10 tentativas livres faz com que o aluno consiga acertar por pura eliminação rápida (brute-force), sem ler o conteúdo ou de fato estudar a devolutiva.
2.  **Do ponto de vista Financeiro (Spam de Tokens)**: Se permitirmos 10 tentativas diárias sem controle, um aluno persistente ou um script malicioso pode gerar picos de custos inviáveis.

#### O Impacto Financeiro de 10 Tentativas (Simulação Extrema)
Se o aluno errar e tentar de novo 10 vezes em cada uma das 80 quests do mês:
*   Total de requisições de correção de respostas saltaria de 40.000 para **400.000 por mês** (por escola).
*   **Custo da API Gemini 2.0 Flash**: Saltaria para **$77,60 / mês** (~R$ 426,80). O negócio continua lucrativo, mas a margem de lucro cai.
*   **Custo da API Gemini 2.5 Flash**: Saltaria para **$349,40 / mês** (~R$ 1.921,70). **Isso excede o faturamento bruto da assinatura da escola (R$ 1.750,00), gerando prejuízo direto.**

---

### 💡 A Solução: Cooldown Inteligente + Devolutiva de Conteúdo
Para balancear o aprendizado (direito de errar) com o controle financeiro de tokens, propomos o **Sistema de Cooldown Inteligente** integrado à nova feature de **Devolutiva Direcionada**.

#### Fluxo de Tentativas e Cooldowns:
1.  **1ª Tentativa (Erro)**:
    *   *Devolutiva da IA*: Indica precisamente o tópico que o aluno deve estudar antes de tentar novamente.
        *Exemplo: "Sua resposta está incorreta. Você errou na aplicação do sinal da equação. **Estude o tópico: 'Regra de Sinais em Multiplicações'**."*
    *   *Bloqueio (Cooldown)*: **15 minutos**. O aluno não pode responder àquela quest imediatamente. O tempo é necessário para que ele realmente leia o tópico sugerido.
2.  **2ª Tentativa (Erro)**:
    *   *Devolutiva da IA*: Fornece uma dica direta de raciocínio (scaffolding).
        *Exemplo: "Ainda não foi dessa vez. Lembre-se que menos com menos resulta em mais. **Estude: 'Equações de 1º Grau com Parênteses'**."*
    *   *Bloqueio (Cooldown)*: **1 hora**. 
3.  **3ª Tentativa (Erro)**:
    *   *Bloqueio Definitivo*: A quest é travada para o dia e enviada ao [Baú de Quests Perdidas](file:///home/beni/Documentos/Estudos/Projetos/Solen/FEATURES.md#L50). Ele só poderá tentar respondê-la no dia seguinte.
    *   *Redução de XP*: O XP máximo recuperável no Baú cai para 10% do original (incentiva a atenção nas primeiras tentativas).

#### Tabela de Gastos por Aluno (Spam vs. Cooldown)
Se considerarmos um cenário realista onde, graças ao cooldown, a média de tentativas por quest com erro é de 2 tentativas (e no máximo 3):

| Cenário (Para 500 Alunos) | Total de Correções | Custo Gemini 2.0 Flash | Custo Gemini 2.5 Flash | Margem de Lucro (Gemini 2.0) |
| :--- | :---: | :---: | :---: | :---: |
| **Cenário Sem Erros** (1x por quest) | 40.000 | R$ 42,68 | R$ 192,17 | 95,2% |
| **Cenário Realista c/ Cooldown** (Média 1.5x) | 60.000 | **R$ 64,02** | **R$ 288,25** | **94,0%** |
| **Cenário Spam Total** (Sem limite - Média 10x) | 400.000 | **R$ 426,80** | **R$ 1.921,70** | **73,3% (Prejuízo no 2.5)** |

> **Conclusão Sincera**: O **Gemini 2.0 Flash é obrigatório** para a viabilidade do negócio. O Gemini 2.5 Flash é perigoso para o modelo de precificação atual se os alunos utilizarem as tentativas repetidas. Além disso, o limite de **3 tentativas diárias por quest** é uma barreira pedagógica e econômica indispensável.

---

## 🔔 4. Push Notifications & E-mails: Por que usar e em quais situações?

O valor de R$ 15,00/mês alocado para notificações e e-mails cobre a infraestrutura de gateways de envio (Expo EAS Push + Resend/SendGrid). No Solen, esses canais são usados de forma estratégica em momentos específicos:

### A. Push Notifications (Mobile - Foco no Aluno/Caçador e Mestre)
*Para que serve*: Gerar gatilhos de engajamento diários (Loops de Hábito) e manter o app vivo no celular.
*   **Novas Quests Forjadas**: Quando o professor aprova um lote, os alunos recebem: 
    *   *"🚨 ALERTA DE PORTAL: Uma nova Quest de Matemática foi aberta! Você tem 40 minutos para entrar na masmorra."* (Usa o TTL de 40 minutos do Wait Mode).
*   **Interações Sociais (Parties/Raids)**: O Solen possui mecânicas cooperativas em tempo real.
    *   *"⚔️ CHAMADO DE RAID: Seu parceiro de guilda [Nickname] convocou você para uma batalha em grupo! Entre no app."*
*   **Avisos de Expiração**: 
    *   *"⏳ TEMPO ESGOTANDO: Sua quest diária expira em 10 minutos. Evite a Penalty Quest!"*
*   **Alertas de Risco Acadêmico (Para o Mestre)**:
    *   *"⚠️ RADAR ATIVO: O aluno [Nome] caiu para o patamar de Risco de Prova Física (XP abaixo de 600)."*

### B. E-mails (Foco em Diretores, Coordenadores/Arquitetos e Responsáveis)
*Para que serve*: Comprovação de valor administrativo (ROI do software) e segurança de acesso.
*   **Relatório Executivo Mensal (Para Coordenadores/Arquitetos)**:
    *   Enviado automaticamente no final do mês contendo estatísticas de uso do [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md), adesão dos professores e evolução geral de XP dos alunos. Isso justifica a renovação da assinatura.
*   **Segurança e Primeiro Acesso**:
    *   Link de confirmação de cadastro da instituição, recuperação de senha e e-mails de boas-vindas com instruções de integração (importação de alunos via CSV).

---

## 📈 5. Custos Totais e Lucro Líquido Atualizados (Cenário Realista c/ Cooldown)

Considerando a infraestrutura completa, a geração de quests por matéria e a taxa média de **1.5 tentativas por resposta corrigida** (graças ao Cooldown Inteligente):

*   **Custo de Infraestrutura Fixa por Escola Média (500 Alunos)**: R$ 72,50 / mês
*   **Custo de API Gemini 2.0 Flash (Com Erros Controlados)**: R$ 64,02 / mês
*   **Custo Operacional Total**: **R$ 136,52 / mês**

### Comparativo de Lucro por Porte de Escola (Preço de Venda: R$ 3,50/aluno)

| Porte da Escola | Faturamento Mensal | Custo Operacional Mensal | Lucro Líquido Mensal | Lucro Líquido Anual | Margem |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pequena** (200 alunos) | R$ 700,00 | R$ 85,00 | **R$ 615,00** | **R$ 7.380,00** | **87,8%** |
| **Média** (500 alunos) | R$ 1.750,00 | R$ 136,52 | **R$ 1.613,48** | **R$ 19.361,76** | **92,2%** |
| **Grande** (1.500 alunos) | R$ 5.250,00 | R$ 260,00 | **R$ 4.990,00** | **R$ 59.880,00** | **95,0%** |

O modelo continua altamente sustentável e lucrativo, desde que blindado contra abusos através do cooldown pedagógico e utilizando a eficiência de custo do **Gemini 2.0 Flash**.
