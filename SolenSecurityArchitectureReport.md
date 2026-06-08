# 🛡️ Relatório de Análise Arquitetural, Segurança e LGPD: Solen (Solo Learning)

Este relatório apresenta um diagnóstico aprofundado do aplicativo **Solen (Solo Learning)** sob quatro pilares estratégicos: **Propósito do Aplicativo**, **Arquitetura de Dados**, **Conformidade com a LGPD e Segurança**, e **Recomendações de Novas Funcionalidades / Fluxos**.

---

## 🏛️ 1. O Propósito e Diferencial do Solen
O **Solen** não é apenas mais um LMS (Learning Management System). Seu verdadeiro propósito é a **revolução do engajamento estudantil através da gamificação profunda (High-Fidelity Gamification)**. 

Ao traduzir o cotidiano escolar (tarefas, horários, avaliações) na linguagem cultural dos estudantes modernos (Status Windows, Ranks, Quests, Caçadores e Mestres baseados no universo de *Solo Leveling*), o app remove a barreira psicológica do "estudo obrigatório" e a substitui pela dopamina do progresso contínuo e conquistas compartilhadas.

---

## 🔒 2. Avaliação de Segurança e LGPD
Ao lidar com ambientes escolares, a conformidade legal e a proteção de dados são fatores críticos de sobrevivência do produto. No modelo atual, identificamos pontos de atenção importantes sob a **LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018)**:

### ⚠️ A. O Gargalo de Dados de Menores (Artigo 14 da LGPD)
*   **O Risco**: A grande maioria dos alunos (*Caçadores*) em escolas de ensino fundamental e médio são **menores de idade**.
*   **O que diz a LGPD**: O tratamento de dados pessoais de crianças e adolescentes exige o **consentimento específico e em destaque dado por pelo menos um dos pais ou pelo responsável legal**.
*   **Diagnóstico**: Atualmente, o cadastro e o fluxo de login não possuem telas de consentimento para os responsáveis, nem termos de uso aceitos ativamente, o que expõe a plataforma a severas multas e sanções administrativas.

### ⚠️ B. Direito ao Esquecimento e Transparência (Artigo 18 da LGPD)
*   **O Risco**: Usuários (especialmente pais ou alunos que saem da instituição) têm o direito de solicitar a confirmação do tratamento, acesso aos seus dados e, crucialmente, a **exclusão definitiva** de suas informações pessoais.
*   **Diagnóstico**: É necessário expor uma interface ou canal simples no aplicativo (ex: "Excluir minha conta" no perfil do Aluno/Mestre) que execute uma exclusão limpa em cascata dos dados identificáveis no banco de dados.

### ⚠️ C. Segurança e Vulnerabilidades Arquiteturais (IDOR & Multi-tenancy)
*   **Separação por String (`instituicao`)**: 
    *   Usar strings soltas nas tabelas para filtrar dados por instituição (ex: `"Ruben Dario"`) é suscetível a erros de digitação (ex: `"Ruben Dario "` com espaço no final ficaria isolado) e dificulta a manutenção histórica.
*   **Vulnerabilidade IDOR (Insecure Direct Object Reference)**:
    *   No back-end, todas as rotas (ex: buscar alunos, notas, horários) precisam validar de forma intransigente se o `User` que faz a requisição possui a **mesma instituição** que o recurso solicitado. Se um endpoint apenas receber `:id` de um recurso sem validar a instituição cruzada, um aluno ou mestre malicioso de uma escola poderia ler ou modificar dados de outra escola apenas alterando o ID no payload da API.

---

## 🛠️ 3. Onde e Como Podemos Melhorar? (Recomendações Arquiteturais)

### 📈 Abstração da Tabela `Institution` (Multi-tenant Robusto)
Substituir o atributo string `instituicao` por uma relação forte com uma tabela dedicada:
```prisma
model Institution {
  id        String   @id @default(uuid())
  nome      String   @unique
  cnpj      String?  @unique
  usuarios  User[]
  turmas    Turma[]
  disciplinas Disciplina[]
}
```
*   **Impacto**: Elimina erros de digitação, centraliza configurações específicas da escola (como limite de peso de fotos de quest) e cria uma arquitetura B2B pronta para escala nacional.

### 🔐 Criptografia e Políticas de Privacidade "By Design"
1.  **Termo de Consentimento na Primeira Inicialização**: Adicionar uma tela de aceitação de Termos de Uso e Política de Privacidade obrigatória ao primeiro login de cada Caçador e Mestre.
2.  **Segurança de Tráfego**: Garantir que todos os ambientes de teste e produção utilizem estritamente criptografia de ponta a ponta (**HTTPS/WSS**) para impedir interceptação de dados de rede locais em redes escolares (Wi-Fi de escolas costuma ser vulnerável).

---

## ⚔️ 4. Sugestões de Features e Fluxos Premium (O Próximo Nível)

Para potencializar o engajamento e tornar o Solen um produto irresistível no mercado de EdTechs, sugerimos a inclusão das seguintes funcionalidades de gamificação avançada:

### 🎒 A. Inventário e Loja de Itens (Gold & Status)
*   **Como funciona**: Concluir Quests comuns ou "Golden Quests" gera, além de XP, **Gold (Moedas de Ouro)**.
*   **Loja de Itens (Shop)**: Os Caçadores gastam seu Gold para comprar:
    *   *Pergaminho de XP Duplo*: Dobra os ganhos da próxima quest de Matemática.
    *   *Elixir da Cura*: Remove instantaneamente o efeito de uma "Quest de Penalidade" ativa por falha de prazo.
    *   *Artefatos Cosméticos*: Títulos honoríficos para o perfil do Aluno (ex: *"Matador de Equações"*, *"Monarca da Gramática"*).

### 🐉 B. Sistema de Party e Raids (Missões de Cooperação)
*   **O Conceito**: Substituir trabalhos em grupo tradicionais por "Dungeons/Raids" cooperativas.
*   **Como funciona**: 
    *   O Mestre cria uma **Raid** de alta dificuldade.
    *   Os alunos se juntam em uma **Party** (Grupo) de 3 a 5 membros.
    *   A quest é dividida em partes complementares. Por exemplo, cada membro do grupo recebe uma pista lógica que precisa resolver individualmente para descriptografar a resposta final do "Boss" da Raid.
    *   Se todos vencerem, o grupo divide o saque (Itens Raros, Títulos e bônus de XP).

### ⌛ C. Automatização Completa de "Penalty Quests"
*   **Como funciona**: Se o Caçador falhar em concluir suas quests semanais antes do prazo expirar, a "Maldição do Sistema" é ativada.
*   O aplicativo móvel bloqueia o acesso a telas de entretenimento (como fóruns ou inventário) e ativa uma **Penalty Quest** obrigatória contendo perguntas de revisão fundamentais que devem ser resolvidas nas próximas 24 horas para reabilitar o perfil dele.

### 🧠 D. IA Generativa Gemini Inteligente
*   **Dicas Dinâmicas por IA**: Ao invés do Caçador apenas acertar ou errar a Quest, a IA analisa o histórico dele (retornado pela rota `/quests/subject-stats/:userId`). 
*   Se o Caçador estiver travado em uma Quest difícil de Física, ele pode clicar em "Pedir Ajuda à Sombra". A IA Gemini gera uma **Dica Personalizada baseada nas dificuldades anteriores dele**, sem revelar a resposta final, agindo como um tutor inteligente 24/7.

---

### 📝 Resumo das Ações Recomendadas para a Próxima Fase:
| Categoria | Ação Recomendada | Nível de Prioridade |
| :--- | :--- | :--- |
| **Segurança & LGPD** | Criar tela de aceite de Termos de Uso e Consentimento de Responsáveis. | **CRÍTICA** |
| **Arquitetura** | Mapear tabela `Institution` no banco de dados e aplicar validação de instituição em todos os Controllers da API (Prevenção de IDOR). | **ALTA** |
| **Gamificação** | Implementar a Loja de Itens e o Inventário de Caçador (Gasto de Gold de Quests). | **MÉDIA** |
| **Gamificação** | Sistema de Raids/Dungeons (Tarefas em Grupo Gamificadas). | **MÉDIA** |
