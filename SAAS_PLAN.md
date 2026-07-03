# 🔮 Solen SaaS — Plano de Negócios, Viabilidade de IA e Estratégia Antitransbordo

Este documento apresenta a versão atualizada e revisada do plano estratégico para a transformação do **Solen (Solo Learning)** em um modelo **SaaS (Software as a Service) B2B** voltado para instituições de ensino. 

Esta revisão incorpora o controle de **Cooldown de 30 Minutos com Devolutiva Pedagógica (YouTube)**, a mecânica de **Party Dungeon Cooperativa com Rotação de Erros e Cooldown Persistente**, e recalcula a viabilidade financeira desses fluxos.

---

## 🏛️ 1. Modelo de Negócios SaaS B2B

O Solen é comercializado como uma licença anual ou mensal por **aluno ativo cadastrado**, cobrada diretamente da instituição de ensino (B2B):

*   **Plano Mensal Recorrente**: **R$ 3,50 por aluno / mês**
*   **Plano Anual Fidelizado**: **R$ 30,00 por aluno / ano** (equivalente a R$ 2,50 por aluno / mês)
*   **Plano Trial Gratuito (14 dias)**: Acesso total ao sistema de gamificação, mas com o resolvedor do [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) limitado a gerar grades horárias para no máximo **2 turmas** (para evitar que a escola extraia sua grade anual completa e cancele o serviço).

---

## 🧠 2. Viabilidade Financeira & Custos da API Gemini

Ajustamos o plano para refletir a realidade das escolas: cada turma possui em média **8 matérias** ativas, gerando cerca de **80 quests ao mês** (cerca de 4 por dia útil).

### A. Premissas de Uso Mensal (Escola Média)
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

## 🛑 3. Regra de Negócio: Devolutiva de Estudo e Controle de Abuso

Para garantir que o aluno estude e não tente "adivinhar" as alternativas por tentativa e erro rápidos (o que geraria spam de requisições de IA), estabelecemos o fluxo de **Cooldown Pedagógico**:

### A. Cooldown de 30 Minutos para Respostas Erradas
Quando o aluno submete uma resposta e erra:
1.  **Bloqueio de Tentativa**: A quest entra em cooldown por **30 minutos**. O aluno é impedido de realizar novas tentativas durante este período.
2.  **Devolutiva Focada**: A análise de resposta gerada pela IA indica **onde no raciocínio** o erro ocorreu, sem fornecer a resposta final.
    *   *Exemplo*: *"Você configurou corretamente a matriz da equação, mas errou ao realizar a divisão final dos termos. Revise os passos do cálculo."*
3.  **Indicação de Conteúdo (Link do YouTube)**: A resposta inclui um link de redirecionamento para um vídeo do YouTube abordando o assunto daquela quest para que o aluno estude durante os 30 minutos de bloqueio.
    *   *Heurística Técnica de Implementação (Ponytail/Lazy)*: Para evitar custos com a API do YouTube Data, o sistema gerará links estruturados de busca direta com palavras-chave higienizadas:
        `https://www.youtube.com/results?search_query=como+resolver+${assunto_URL_encoded}`.

### B. Impacto Financeiro da Proteção do Cooldown
Como o cooldown impede o envio contínuo de respostas, o volume de retentativas cai drasticamente (média estimada de 1.5 tentativas por resposta errada):

*   **Com Cooldown (Média 1.5x tentativas)**: 60.000 correções/mês = **R$ 64,02 (Gemini 2.0)** ou **R$ 288,25 (Gemini 2.5)**.
*   **Sem Cooldown (Spam de 10x tentativas)**: 400.000 correções/mês = **R$ 426,80 (Gemini 2.0)** ou **R$ 1.921,70 (Gemini 2.5 - Prejuízo)**.

---

## ⚔️ 4. Mecânica de Party Dungeon Cooperativa (RPG)

As Parties (grupos de até 3 alunos) são o principal motor de engajamento social do Solen. O fluxo cooperativo opera com regras compartilhadas e proteção contra abusos de evasão:

### A. Funcionamento da Dungeon
*   **Acerto Compartilhado (Vitória Coletiva)**: Quando a Party entra em uma dungeon e o jogador ativo (jogador da vez) responde corretamente, a missão é marcada como concluída para **todos** os integrantes da Party. Todos ganham o XP correspondente.
*   **Erro Rotativo (Derrota Parcial)**: Se o jogador ativo errar a resposta, a tentativa é perdida para o grupo todo. A vez de responder rotaciona imediatamente para o **segundo jogador** da Party. Se este errar, a vez vai para o **terceiro jogador**.
*   **Cooldown Coletivo (Derrota Total)**: Se todos os integrantes da Party falharem em suas respectivas tentativas, a dungeon é bloqueada temporariamente e o grupo inteiro entra em um **cooldown compartilhado de 30 minutos**.

### B. Proteção contra Burlas (Cooldown Individual Persistente)
Para evitar que um aluno cometa um erro, saia da Party atual e se junte a outro grupo (ou tente resolver a quest de forma solo) para burlar o cooldown:
*   **Regra de Persistência**: O timestamp do cooldown da dungeon é gravado de forma persistente no perfil individual de cada jogador (`individual_party_cooldown`).
*   Mesmo se o aluno sair da Party ou se a Party for desfeita, o cooldown individual continua ativo, impedindo que ele responda àquela quest ou participe de outra dungeon cooperativa até que o tempo expire.

### C. Benefício Econômico das Parties
As Parties não são apenas divertidas; elas são **altamente eficientes para o consumo de API**. Como os integrantes compartilham o progresso da dungeon, as respostas corretas encerram a quest para múltiplos alunos com apenas uma única chamada de análise de IA. Isso reduz o total de chamadas de correção em até **30%**, compensando o processamento de retentativas.

---

## 🔔 5. Push Notifications & E-mails: Justificativa e Casos de Uso

A infraestrutura de comunicação do SaaS ativa gatilhos essenciais de engajamento diário e segurança:

### A. Push Notifications (Mobile - Alunos e Professores)
*   **Abertura de Masmorras**: Alerta instantâneo quando uma nova quest é forjada pelo mestre: *"🚨 ALERTA DE PORTAL: Uma nova Quest de História foi aberta! O portal se fecha em 40 minutos."*
*   **Convocação de Guilda**: Quando um membro inicia uma Raid: *"⚔️ CHAMADO DE RAID: Seu parceiro de guilda [Nickname] convocou você para uma batalha em grupo! Entre no app."*
*   **Alerta de Risco (Mestre)**: Notificação instantânea para o professor quando o XP de um aluno cai abaixo da média mínima: *"⚠️ RADAR ATIVO: O aluno [Nome] está em risco de Prova Física."*

### B. E-mails (Web/Institucional - Diretores e Coordenadores)
*   **Comprovação de ROI (Relatório Mensal)**: Envio automático para os diretores contendo estatísticas de grades otimizadas via [Monarch Engine v3](file:///home/beni/Documentos/Estudos/Projetos/Solen/regras_grades_publica_privada.md) e o engajamento de XP dos alunos, justificando a recorrência financeira.
*   **Transacionais**: Recuperação de senhas, link de confirmação do cadastro escolar e notas fiscais.

---

## 📈 6. Projeções de Custos e Faturamento SaaS Atualizados

Considerando a infraestrutura completa, a taxa média de **1.5 tentativas por resposta corrigida** (graças ao Cooldown) e o abatimento das respostas unificadas por Party:

*   **Custo de Infraestrutura Fixa por Escola Média (500 Alunos)**: R$ 72,50 / mês
*   **Custo de API Gemini 2.0 Flash (Com Cooldown e Parties)**: R$ 58,00 / mês
*   **Custo Operacional Total**: **R$ 130,50 / mês**

### Comparativo de Lucratividade por Porte de Escola (Preço de Venda: R$ 3,50/aluno)

| Porte da Escola | Faturamento Mensal | Custo Operacional Mensal | Lucro Líquido Mensal | Lucro Líquido Anual | Margem |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pequena** (200 alunos) | R$ 700,00 | R$ 82,00 | **R$ 618,00** | **R$ 7.416,00** | **88,2%** |
| **Média** (500 alunos) | R$ 1.750,00 | R$ 130,50 | **R$ 1.619,50** | **R$ 19.434,00** | **92,5%** |
| **Grande** (1.500 alunos) | R$ 5.250,00 | R$ 250,00 | **R$ 5.000,00** | **R$ 60.000,00** | **95,2%** |

O modelo com as novas regras cooperativas e de controle de erros se mostra mais robusto, equilibrando o valor pedagógico do erro com altíssimas taxas de lucratividade.
