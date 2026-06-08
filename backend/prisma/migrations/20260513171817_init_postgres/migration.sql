-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nickname" TEXT,
    "cpf" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ALUNO',
    "turno" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "turmaId" TEXT,
    "expoPushToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disciplina" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaProfessor" (
    "professorId" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,

    CONSTRAINT "DisciplinaProfessor_pkey" PRIMARY KEY ("professorId","disciplinaId")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "disciplinaId" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "gabarito" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 200,
    "nivel" TEXT NOT NULL DEFAULT 'FACIL',
    "batchId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "turmaAlvoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "windowEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestDelivery" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "waitingSince" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raid" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "xpBonus" INTEGER NOT NULL DEFAULT 500,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Raid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raidId" TEXT NOT NULL,
    "acertos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RaidParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Turma_nome_key" ON "Turma"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_nome_key" ON "Disciplina"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "QuestDelivery_questId_userId_key" ON "QuestDelivery"("questId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Raid_codigo_key" ON "Raid"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "RaidParticipant_userId_raidId_key" ON "RaidParticipant"("userId", "raidId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaProfessor" ADD CONSTRAINT "DisciplinaProfessor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaProfessor" ADD CONSTRAINT "DisciplinaProfessor_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestDelivery" ADD CONSTRAINT "QuestDelivery_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestDelivery" ADD CONSTRAINT "QuestDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidParticipant" ADD CONSTRAINT "RaidParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidParticipant" ADD CONSTRAINT "RaidParticipant_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
