# 🔮 Catálogo de Artefatos & Sistema de Itemização - Solen (V2)

Este documento centraliza todas as regras de negócios, mecânicas, raridades e listagem dos **Artefatos** do universo gamificado de **Solen** (Solo Learning).

---

## 🏛️ Raridades e Drop Rates
Os artefatos são obtidos ao derrotar **Mini Bosses** em grupo (Party/Raid) ou em eventos globais convocados pelo Mestre.

| Raridade | Cor Visual | Descrição Geral | Taxa de Drop Base (Mini Boss) |
| :--- | :--- | :--- | :--- |
| **Lendário** | Dourado (`#ffca28`) | Itens únicos com impacto direto na mecânica e contato direto Mestre-Player. | **~1.5%** |
| **Épico** | Roxo (`#a349ff`) | Multiplicadores fortes de progresso, imunidades a prazos e buffs de Party. | **~8.5%** |
| **Mágico** | Azul (`#3b82f6`) | Facilitadores de resolução diária e limpadores de penalidades do Baú. | **~25.0%** |

---

## 🟡 Artefatos Lendários (Dourados)

### 1. 📜 Sussurros Sábios
- **Descrição:** Permite solicitar ajuda pedagógica direta ao professor em uma missão.
- **Funcionamento:**
  - O aluno ativa o card no modal de resposta de uma missão diária difícil ou do Baú.
  - A missão é sinalizada com destaque como **"Pergunta Dourada"** no Painel do Mestre.
  - O Mestre pode redigir uma dica conceitual ou usar o botão **"Sugestão da IA (Gemini)"** para gerar um rascunho de scaffolding pedagógico que explica o *"como"* sem revelar a resposta final.
  - Após aprovação e envio pelo Mestre, o Aluno recebe uma notificação e visualiza a dica em um pergaminho dourado.
  - **Bônus:** Garante uma tentativa extra e **+50% de XP** ao acertar a missão usando a dica.

### 2. 🧪 Becker do Alquimista
- **Descrição:** Um frasco cintilante contendo energia destilada.
- **Efeito:** Ao ser consumido na bolsa, concede instantaneamente **+500 XP flat** ao caçador.
- **Balanceamento:** Rarity cap extrema, não pode ser dropado em missões comuns.

### 3. 👁️ Olhar do Monarca
- **Descrição:** Permite ao caçador decifrar as fraquezas dos inimigos antes do combate.
- **Efeito:** Revela os tópicos conceituais e fórmulas que serão exigidos nas próximas missões do **Mini Boss** ou **Boss Geral**, permitindo que a Party estude de forma direcionada antes de enfrentar o desafio.

---

## 🟣 Artefatos Épicos (Roxos)

### 1. 🏆 Elixir Dourado
- **Descrição:** Um líquido viscoso de pura energia dourada.
- **Efeito:** **Dobra o XP ganho na missão em que é aplicado** (ideal para missões do tipo BOSS ou Mini Boss).
- **Regra:** O efeito é aplicado no momento da resposta. Se a resposta for correta, o XP daquela missão específica é multiplicado por 2.

### 2. 🕰️ Relógio Ganha Tempo
- **Descrição:** Um relógio mecânico cujos ponteiros giram ao contrário.
- **Efeito:** Estende o prazo de expiração de uma missão ativa (diária ou do Baú) por mais **24 horas**, evitando que ela expire e se torne uma *Penalty Quest*.

### 3. 🐍 Anel da Serpente
- **Descrição:** Um anel de prata esculpido na forma de uma serpente com olhos de rubi.
- **Efeito:** Aumenta a taxa de drop de artefatos em Mini Bosses em **+35%** para toda a Party durante **7 dias**. Não acumulativo com outro Anel da Serpente.

### 4. 💧 Lágrima da Fênix
- **Descrição:** Uma gota de fogo condensada que nunca apaga.
- **Efeito:** Se a Party falhar em derrotar um Mini Boss, a Lágrima da Fênix permite "reviver" a missão, resetando as tentativas e o temporizador para permitir uma nova investida imediata sem penalidades.

### 5. 🧪 Poção de Cura
- **Descrição:** Um frasco com líquido azul brilhante que purifica o cansaço do caçador.
- **Efeito:** Restaura o XP base de uma missão acumulada no **Baú de Quests Perdidas** de volta a **100%**, removendo todas as camadas de maldição (penalidades de 25% por erros acumulados) daquela missão específica.

### 6. 🚩 Bandeira de Guerra da Guilda
- **Descrição:** Um estandarte holográfico que exala determinação.
- **Efeito:** Ao ser fincado por um membro da Party, concede um buff passivo que aumenta o XP ganho por **todos os membros do grupo** em **+20%** em qualquer missão respondida corretamente nas próximas 24 horas. Só pode ser usado em uma party.

### 7. 🔮 Orbe de Perspicácia
- **Descrição:** Uma esfera de cristal que reflete o conhecimento oculto.
- **Efeito:** Permite ver o **próximo tópico** que será abordado no caminho de missões da Party ou da Guilda, dando vantagem estratégica para estudar antes do desafio. Não revela respostas, apenas a área de conhecimento.

### 8. 🔑 Chave Mestra
- **Descrição:** Uma chave antiga que abre fechaduras dimensionais restritas.
- **Efeito:** Permite abrir **qualquer party ativa da sua própria Turma** e entrar nela como invasor, mesmo a contragosto do líder e mesmo que o limite de membros já tenha sido atingido (ex: entrará como quarto membro), além de que integrantes da party não possa sair dela, a não ser com um outro artefato específico para isso. Uma animação na borda e um timer de 48 será adicionado a party indicando o tempo de corrupção que o invasor trouxe.
- **Restrição:** Bloqueado o uso para invadir parties de outras turmas.

## 🔵 Artefatos Mágicos (Azuis)

### 1. 👟 Sapatilhas do Mundo Lento
- **Descrição:** Calçados leves que parecem distorcer o fluxo temporal ao redor.
- **Efeito:** Reduz a dificuldade da missão diária ativa em 1 nível (ex: de Difícil para Médio), gerando um enunciado mais simples via IA.
- **Restrições:**
  - **Não pode** ser usado em Bosses Gerais (invocados pelo Mestre).
  - Em casos de combates contra duplas ou trios de Mini Bosses, **apenas uma das missões** do conjunto poderá receber o efeito de redução.

### 2. 🔨 Martelo Mágico
- **Descrição:** Um martelo rúnico que "quebra" a complexidade de problemas estruturados.
- **Efeito:** Descompõe o enunciado da missão indicando de forma sequencial os passos pedagógicos necessários para a resolução.
- **Exemplo de Scaffolding visual no app:**
  > 1. Monte a função relacionando a velocidade com o tempo.
  > 2. Resolva primeiro as operações dentro dos parênteses.
  > 3. Realize as multiplicações antes das somas e subtrações.

### 3. 🎯 Poeira Estelar
- **Descrição:** Um punhado de pó cintilante que ilumina caminhos ocultos.
- **Efeito:** Projetado para as novas **Quests de Múltipla Escolha** (com radio buttons). Ao ser espalhado sobre a questão, **elimina uma das alternativas incorretas**, facilitando a escolha.

### 4. 📜 Pergaminho do Oráculo
- **Descrição:** Um pergaminho antigo que contém a sabedoria direta de grandes tutores.
- **Efeito:** Concede uma **dica prática, clara e educativa** focada no conceito da matéria (sem metáforas confusas) para guiar o aluno em direção à resposta correta, sem dar a resposta direta. Exibido em um card roxo fixo na tela da missão.

### 5. 🛡️ Bracelete de Cristal
- **Descrição:** Um adorno de quartzo que absorve impactos mágicos.
- **Efeito:** Absorve a maldição (-25% de XP acumulado por erro) de uma tentativa incorreta na missão diária ou do Baú. Possui **2 cargas** de uso antes de quebrar.

### 6. 🎒 Bolsa da Sorte
- **Descrição:** Uma bolsa de couro simples que parece atrair bons ventos.
- **Efeito:** Aumenta a taxa de drop de artefatos em missões diárias comuns em **+15% por 7 dias**. Cumulativo de forma aditiva com o *Anel da Serpente*.

### 7. 🪙 Mão de Midas
- **Descrição:** Uma luva dourada que transmuta matéria.
- **Efeito:** Escolhe outro artefato Mágico do inventário e dá **50% de chance** de transmutá-lo em um artefato Épico aleatório. Se falhar, o item mágico original é destruído e gera 50 XP de consolação.

### 8. 🪶 Pena do Escriba
- **Descrição:** Uma pena que flutua suavemente sobre o papel de resposta.
- **Efeito:** Em perguntas teóricas dissertativas, revela as **3 principais palavras-chave conceituais** que o validador da IA espera encontrar para aprovar a resposta. Exibido na tela da missão através de tags azuis dinâmicas.

---

## 🚀 Próximas Tasks na Fila de Desenvolvimento (V3)
Com base nas discussões de refinamento dos artefatos:
1.  **[x] Módulo de Múltipla Escolha (UI/UX):** Implementar suporte nativo a questões do tipo múltipla escolha com interface em *Radio Buttons* (alternativa ao botão padrão de envio de texto/imagem).
2.  **[x] Integração de Efeitos no Backend:** Desenvolver as rotas de consumo de itens associando seus buffs dinâmicos no cálculo final de XP e dificuldade de quests no `/daily/submit`.
3.  **[x] Painel do Mestre - Aba de Ajuda:** Criar a interface para recebimento das "Perguntas Douradas" geradas pela carta *Sussurros Sábios*, com opção de aprovação de rascunhos pedagógicos da IA.
