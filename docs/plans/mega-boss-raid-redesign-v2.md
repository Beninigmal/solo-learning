# ⚔️ Plano de Implementação: Sistema de Mega Boss (v2 Atualizado)

Este documento reflete todas as diretrizes e regras de negócio alinhadas para o novo **Sistema de Mega Boss** do **COLLEGIUM**.

---

## 📌 1. Regras de Negócio & Decisões Alinhadas

### 🎯 Exclusividade & Formação de Party
- **Exclusivo para Parties em RAID:** Alunos jogando Solo **NÃO** podem participar nem reservar quests do Mega Boss.
- **Party Completa Obrigatória:** Apenas grupos com **todos os membros conectados e prontos** podem pegar uma quest do backlog do Boss.

### 🔒 Trava de Fila & Tempo de Inatividade
- **Lock de Quest:** Ao selecionar uma quest do backlog do Boss, ela fica travada para aquela Party.
- **Inatividade de 15 Minutos:** Se **todos os membros da Party ficarem inativos por 15 minutos**, o lock expira automaticamente, devolvendo a quest ao backlog com +1 no contador de derrotas.

### 💀 Derrotas Anônimas & Recompensa Incremental (Wipe Bonus)
- **Status Anônimo:** Ao voltar para o backlog por erro, desistência ou inatividade, a quest ganha o badge anônimo (ex: `💀 1 Party foi dizimada nesta Quest!`).
- **Drop de Artefatos & Bônus de XP Incremental:** Quanto maior o número de derrotas acumuladas de uma quest (`defeatCount`), **MAIOR é a recompensa em XP e a taxa de drop de artefatos lendários** para o grupo corajoso que finalmente conseguir resolvê-la!

### 🧙‍♂️ Gestão pelo Mestre & Transmutação de Quests
- **HP do Boss Personalizável:** O Professor define o HP ao criar o evento (1 HP = 1 Quest), até o **máximo de 500 HP**.
- **Transmutação de Quests por IA (Bug Fix):** Se uma quest gerada por IA contiver erros ou enunciado confuso, o Professor possui um botão **"Transmutar Quest"** no seu painel para regenerar ou substituir a questão individualmente.
- **Isolamento por Turma:** Se o Mestre selecionar múltiplas turmas da mesma série, cada turma recebe a mesma lista de quests, porém **cada Turma possui sua própria barra de vida isolada do Boss**.

### 📝 Formato de Resposta & Avaliação da IA Tutora
- **Matemática:** Resposta obrigatoriamente no **Modo Foto (OCR de cálculos manuscritos)**.
- **Redação / Português:** **Redação livre escrita à mão por Foto**. A IA analisa estrutura do texto, desenvolvimento e adequação ao tema.
- **Critério de Falha da IA (< 60%):** Mesmo com pequenos erros ortográficos, a pontuação geral da IA de estrutura/tema deve atingir no mínimo **60% de acerto**. Caso fique abaixo de 60%, a tentativa é considerada **FALHA (Wipe da Party)**.
- **Outras Disciplinas:** Campos de texto livre / digitação.

### 🔔 Notificação Visual & Ícone Animado no Aluno
- Um **ícone animado em destaque** surge na tela principal do Aluno assim que existir um evento de Boss ativo para a sua turma, convocando os jogadores para formar a Party.

---

## 📐 2. Modelagem de Dados (Prisma Schema)

```prisma
model BossFight {
  id              String         @id @default(uuid())
  turmaId         String
  turma           Turma          @relation(fields: [turmaId], references: [id])
  mestreId        String
  mestre          User           @relation("MestreBossFights", fields: [mestreId], references: [id])
  disciplinaId    String
  disciplina      Disciplina     @relation(fields: [disciplinaId], references: [id])
  
  nomeBoss        String         // Ex: "O Arquemago do Raciocínio (Matemática)"
  totalHp         Int            @default(300)
  currentHp       Int            @default(300)
  status          String         @default("ACTIVE") // ACTIVE, DEFEATED, EXPIRED
  expiresAt       DateTime       // Data limite (ex: 3 dias)
  createdAt       DateTime       @default(now())

  quests          BossQuest[]
}

model BossQuest {
  id              String         @id @default(uuid())
  bossFightId     String
  bossFight       BossFight      @relation(fields: [bossFightId], references: [id], onDelete: Cascade)
  
  enunciado       String
  gabarito        String?
  tipoResposta    String         @default("TEXTO") // FOTO_MATEMATICA, FOTO_REDACAO, TEXTO
  nivel           String         @default("MEDIO")
  xpBase          Int            @default(150)
  
  status          String         @default("AVAILABLE") // AVAILABLE, LOCKED, COMPLETED
  
  // Controle de Fila / Party
  lockedByPartyId String?
  lockedAt        DateTime?
  lastActiveAt    DateTime?
  
  // Contador Anônimo de Derrotas e Multiplicador de Drop
  defeatCount     Int            @default(0)
  
  completedByPartyId String?
  completedAt        DateTime?

  createdAt       DateTime       @default(now())
}
```

---

## 🛠️ 3. Componentes & Roteiro de Desenvolvimento

### Backend (Node.js / Fastify / Prisma):
1. **Migrations Prisma:** Atualização dos modelos `BossFight` e `BossQuest`.
2. **Rotas do Mestre (`POST /professor/boss`):**
   - Invocação com HP customizado (máx 500), geração por IA em lote, isolamento por turma.
   - Rota `POST /professor/boss/quests/:id/transmute` para refazer questão individual.
3. **Rotas da Raid/Aluno (`/boss/*`):**
   - Listar Backlog do Boss (apenas quests ativas/disponíveis).
   - Travar Quest (`POST /boss/quests/:id/lock`) — Valida Party completa.
   - Enviar Resposta (`POST /boss/quests/:id/submit`) — Integração IA OCR/Redação com nota de corte 60%.
   - Inatividade Cron & Auto-Release (liberação após 15 min inativo).

### Frontend (Expo / React Native):
1. **Dashboard do Aluno:** Ícone animado em neon alertando sobre a convocação do Boss.
2. **Tela da Boss Fight (Mural de Quests & Fila):**
   - Barra de Vida Épica do Boss.
   - Cards de Quests no Backlog com distintivos de derrotas anônimas (ex: `💀 Dizimou 2 Parties (+100% Bônus de Drop)`).
   - Indicador de trava para quests ocupadas por outros grupos.
3. **Modal de Resposta por Foto / Redação:**
   - Câmera para upload da foto do caderno com feedback da IA e verificação de nota >= 60%.
4. **Painel do Mestre:** Interface para invocar o Boss e botão de **Transmuta Quest** em caso de bug.

---

## 🧪 4. Plano de Verificação e Testes

1. **Testes de Backend:**
   - Invocação de Boss com 50 a 500 quests por turma.
   - Trava de fila concorrente (garantir que 2 parties não peguem a mesma quest).
   - Expiração por 15 min de inatividade.
   - Verificação de nota da IA (< 60% acarreta derrota e incremento de bônus).
   - Transmutação de quest pelo professor.
2. **Testes de Compilação:**
   - Executar `npm run build` no backend e `npx tsc --noEmit` no frontend.
