# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-flow.spec.ts >> Admin Flow E2E >> Complete MVP Flow
- Location: e2e/admin-flow.spec.ts:4:7

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('text=⚡ Gerar Grade')
    - locator resolved to 2 elements. Proceeding with the first one: <div dir="auto" class="css-text-146c3p1 text-neonBlue text-[11px] font-extrabold font-mono uppercase tracking-wider">⚡ Gerar Grade (Turma)</div>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div dir="auto" class="css-text-146c3p1 font-bold uppercase tracking-wider text-sm">⚡ Gerar Grade</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="css-view-g5y9jx flex-1 bg-black/80 justify-center items-center p-6 relative">…</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div dir="auto" class="css-text-146c3p1 font-bold uppercase tracking-wider text-sm">⚡ Gerar Grade</div> from <div>…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="css-view-g5y9jx flex-1 bg-black/80 justify-center items-center p-6 relative">…</div> from <div>…</div> subtree intercepts pointer events
  50 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="css-view-g5y9jx flex-1 bg-black/80 justify-center items-center p-6 relative">…</div> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div dir="auto" class="css-text-146c3p1 font-bold uppercase tracking-wider text-sm">⚡ Gerar Grade</div> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="css-view-g5y9jx flex-1 bg-black/80 justify-center items-center p-6 relative">…</div> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="css-view-g5y9jx flex-1 bg-black/80 justify-center items-center p-6 relative">…</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="css-view-g5y9jx flex-1 bg-black/80 justify-center items-center p-6 relative">…</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div dir="auto" class="css-text-146c3p1 font-bold uppercase tracking-wider text-sm">⚡ Gerar Grade</div> from <div>…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e29]:
    - generic [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]: O Arquiteto
        - generic [ref=e33]: "🏛️ Web (CÓD: 0101) • PLANO: RANK_S"
        - generic [ref=e34]: Painel de Criação
      - generic [ref=e35]:
        - generic [ref=e37] [cursor=pointer]: 
        - generic [ref=e39] [cursor=pointer]: 
    - generic [ref=e40]:
      - generic [ref=e43]:
        - generic [ref=e45] [cursor=pointer]: RECRUTAR
        - generic [ref=e47] [cursor=pointer]: TURMAS
        - generic [ref=e49] [cursor=pointer]: MATÉRIAS
        - generic [ref=e51] [cursor=pointer]: ARQUITETO
        - generic [ref=e53] [cursor=pointer]: GRADE
        - generic [ref=e55] [cursor=pointer]: ORDINATOR
        - generic [ref=e57] [cursor=pointer]: LOGS
      - generic [ref=e59] [cursor=pointer]: 
    - generic [ref=e63]:
      - generic [ref=e64]: Grade de Horários
      - generic [ref=e65]: "Selecionar Turma para Visualizar/Editar:"
      - generic [ref=e68]:
        - generic [ref=e69] [cursor=pointer]:
          - generic [ref=e70]: 
          - generic [ref=e71]: Geral & Lote
        - generic [ref=e73] [cursor=pointer]: TURMA 1 1783973726856
        - generic [ref=e75] [cursor=pointer]: TURMA 1 1783973879031
        - generic [ref=e77] [cursor=pointer]: TURMA 1 1783974025749
        - generic [ref=e79] [cursor=pointer]: TURMA 1 1783974454400
        - generic [ref=e81] [cursor=pointer]: TURMA 2 1783973726856
        - generic [ref=e83] [cursor=pointer]: TURMA 2 1783973879031
        - generic [ref=e85] [cursor=pointer]: TURMA 2 1783974025749
        - generic [ref=e87] [cursor=pointer]: TURMA 2 1783974454400
        - generic [ref=e89] [cursor=pointer]: TURMA 3 1783973726856
        - generic [ref=e91] [cursor=pointer]: TURMA 3 1783973879031
        - generic [ref=e93] [cursor=pointer]: TURMA 3 1783974025749
        - generic [ref=e95] [cursor=pointer]: TURMA 3 1783974454400
        - generic [ref=e97] [cursor=pointer]: TURMA 4 1783973726856
        - generic [ref=e99] [cursor=pointer]: TURMA 4 1783973879031
        - generic [ref=e101] [cursor=pointer]: TURMA 4 1783974025749
        - generic [ref=e103] [cursor=pointer]: TURMA 4 1783974454400
        - generic [ref=e105] [cursor=pointer]: TURMA 5 1783973726856
        - generic [ref=e107] [cursor=pointer]: TURMA 5 1783973879031
        - generic [ref=e109] [cursor=pointer]: TURMA 5 1783974025749
        - generic [ref=e111] [cursor=pointer]: TURMA 5 1783974454400
      - generic [ref=e112]: "1. Selecione o Turno da Aula:"
      - generic [ref=e113]:
        - generic [ref=e115] [cursor=pointer]: MATUTINO
        - generic [ref=e117] [cursor=pointer]: VESPERTINO
        - generic [ref=e119] [cursor=pointer]: NOTURNO
      - generic [ref=e120]:
        - generic [ref=e121]: 🛠️ Parâmetros do Turno MATUTINO
        - generic [ref=e122]:
          - generic [ref=e123]:
            - generic [ref=e124]: "Aulas por Turno:"
            - generic [ref=e125]:
              - generic [ref=e127] [cursor=pointer]: "-"
              - generic [ref=e128]: "5"
              - generic [ref=e130] [cursor=pointer]: +
          - generic [ref=e131]:
            - generic [ref=e132]: "Intervalo após a Aula:"
            - generic [ref=e133]:
              - generic [ref=e135] [cursor=pointer]: "-"
              - generic [ref=e136]: 3ª
              - generic [ref=e138] [cursor=pointer]: +
          - generic [ref=e140] [cursor=pointer]: Aplicar Config
      - generic [ref=e142]:
        - generic [ref=e143]: ⚠️ Restrições de Agenda de Professores
        - generic [ref=e144]: Ative para configurar quais dias e turnos os professores não podem ministrar aulas na instituição.
      - generic [ref=e148] [cursor=pointer]:
        - generic [ref=e149]:
          - generic [ref=e150]: 🎯 2. Matriz Curricular & Carga
          - generic [ref=e152]: MONARCH v3.0
        - generic [ref=e153]: 
      - generic [ref=e154]:
        - generic [ref=e155]:
          - generic [ref=e156]: ⚡ Monarch Engine v3.0
          - generic [ref=e158]: CSP SOLVER
        - generic [ref=e159]: Gere a grade horária completa do turno MATUTINO. O motor respeita automaticamente a LDB brasileira, o intervalo do recreio, os bloqueios e o limite cross-turma semanal de carga de cada professor!
        - generic [ref=e160]:
          - generic [ref=e162] [cursor=pointer]: ⚡ Gerar Grade (Turma)
          - generic [ref=e165] [cursor=pointer]: 🔥 Gerar Lote (Turno)
      - generic [ref=e166]: "2. Escolha a Matéria para Inserir:"
      - generic [ref=e169]:
        - generic [ref=e171] [cursor=pointer]: Arte
        - generic [ref=e173] [cursor=pointer]: Ciências
        - generic [ref=e175] [cursor=pointer]: Educação Física
        - generic [ref=e177] [cursor=pointer]: Ensino Religioso
        - generic [ref=e179] [cursor=pointer]: Geografia
        - generic [ref=e181] [cursor=pointer]: História
        - generic [ref=e183] [cursor=pointer]: Inglês
        - generic [ref=e185] [cursor=pointer]: Língua Portuguesa
        - generic [ref=e187] [cursor=pointer]: Matemática
      - generic [ref=e188]: "3. Toque no Horário desejado na Grade para salvar:"
      - generic [ref=e191]:
        - generic [ref=e192]:
          - generic [ref=e194]: HORÁRIO
          - generic [ref=e196]: SEGUNDA
          - generic [ref=e198]: TERCA
          - generic [ref=e200]: QUARTA
          - generic [ref=e202]: QUINTA
          - generic [ref=e204]: SEXTA
        - generic [ref=e205]:
          - generic [ref=e207]: 1º Horário
          - generic [ref=e209] [cursor=pointer]: + Adicionar
          - generic [ref=e211] [cursor=pointer]: + Adicionar
          - generic [ref=e213] [cursor=pointer]: + Adicionar
          - generic [ref=e215] [cursor=pointer]: + Adicionar
          - generic [ref=e217] [cursor=pointer]: + Adicionar
        - generic [ref=e218]:
          - generic [ref=e220]: 2º Horário
          - generic [ref=e222] [cursor=pointer]: + Adicionar
          - generic [ref=e224] [cursor=pointer]: + Adicionar
          - generic [ref=e226] [cursor=pointer]: + Adicionar
          - generic [ref=e228] [cursor=pointer]: + Adicionar
          - generic [ref=e230] [cursor=pointer]: + Adicionar
        - generic [ref=e231]:
          - generic [ref=e233]: 3º Horário
          - generic [ref=e235] [cursor=pointer]: + Adicionar
          - generic [ref=e237] [cursor=pointer]: + Adicionar
          - generic [ref=e239] [cursor=pointer]: + Adicionar
          - generic [ref=e241] [cursor=pointer]: + Adicionar
          - generic [ref=e243] [cursor=pointer]: + Adicionar
        - generic [ref=e244]:
          - generic [ref=e245]: 
          - generic [ref=e246]: ☕ INTERVALO PEDAGÓGICO DE RECREIO
        - generic [ref=e247]:
          - generic [ref=e249]: 4º Horário
          - generic [ref=e251] [cursor=pointer]: + Adicionar
          - generic [ref=e253] [cursor=pointer]: + Adicionar
          - generic [ref=e255] [cursor=pointer]: + Adicionar
          - generic [ref=e257] [cursor=pointer]: + Adicionar
          - generic [ref=e259] [cursor=pointer]: + Adicionar
        - generic [ref=e260]:
          - generic [ref=e262]: 5º Horário
          - generic [ref=e264] [cursor=pointer]: + Adicionar
          - generic [ref=e266] [cursor=pointer]: + Adicionar
          - generic [ref=e268] [cursor=pointer]: + Adicionar
          - generic [ref=e270] [cursor=pointer]: + Adicionar
          - generic [ref=e272] [cursor=pointer]: + Adicionar
  - dialog [ref=e274]:
    - generic [ref=e277]:
      - generic [ref=e278]:
        - generic [ref=e279]: 
        - generic [ref=e280]: Confirmar Monarch Engine
      - generic [ref=e281]: Deseja gerar a grade horária completa e automática para esta turma no turno MATUTINO? Todos os horários antigos deste turno nesta turma serão substituídos.
      - generic [ref=e285]:
        - generic [ref=e287] [cursor=pointer]: Cancelar
        - generic [ref=e289] [cursor=pointer]: ⚡ Gerar Grade
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Admin Flow E2E', () => {
  4   |   test('Complete MVP Flow', async ({ page }) => {
  5   |     test.setTimeout(120000);
  6   |     const ts = Date.now();
  7   | 
  8   |     // PASSO 1: Configurar Servidor e Autenticação
  9   |     await page.goto('/login');
  10  |     
  11  |     // Configurar API para apontar pro backend local em vez do Render
  12  |     await page.locator('text=Local ·').click();
  13  |     await page.fill('input[placeholder*="192.168"]', 'http://127.0.0.1:3333');
  14  |     await page.click('text=Aplicar URL');
  15  | 
  16  |     // Tentar login inválido
  17  |     await page.fill('input[placeholder="Matrícula"]', 'web01');
  18  |     await page.fill('input[placeholder="Senha"]', 'wrongpassword');
  19  |     await page.click('text=Despertar');
  20  |     
  21  |     // Espera feedback de erro no SystemAlert
  22  |     await expect(page.locator('text=ERRO DO SISTEMA')).toBeVisible();
  23  |     await page.getByText('Confirmar', { exact: false }).last().click({ force: true }); // Fechar modal de alerta se houver botão fechar
  24  |     
  25  |     // Aguarda o modal desaparecer por completo (animação de fade-out)
  26  |     await page.waitForTimeout(1000);
  27  | 
  28  |     // Tentar login válido
  29  |     await page.fill('input[placeholder="Senha"]', '1234');
  30  |     await page.click('text=Despertar');
  31  |     
  32  |     // Validar redirecionamento para o dashboard
  33  |     await expect(page.locator('text=O Arquiteto')).toBeVisible({ timeout: 10000 });
  34  | 
  35  |     // PASSO 2: Aba Recrutar > Mestre
  36  |     await page.click('text=Recrutar');
  37  |     await page.click('text=Mestre');
  38  | 
  39  |     // Submeter vazio para checar erro
  40  |     await page.click('text=Criar Registro'); 
  41  |     await expect(page.locator('text=Preencha os campos obrigatórios')).toBeVisible();
  42  |     await page.click('text=OK');
  43  |     await page.waitForTimeout(500);
  44  |     
  45  |     // Criar Professor de Português
  46  |     await page.fill('input[placeholder="Nome Completo"]', `Prof Português 1 ${ts}`);
  47  |     await page.fill('input[placeholder="Matrícula"]', `prof.pt1.${ts}`);
  48  |     await page.fill('input[placeholder*="Carga Horária"]', '40');
  49  |     await page.click('text=Criar Registro');
  50  |     await expect(page.locator('text=Mestre forjado com sucesso!')).toBeVisible();
  51  |     await page.click('text=OK');
  52  |     await page.waitForTimeout(500);
  53  |     
  54  |     // Criar Professor de Matemática
  55  |     await page.fill('input[placeholder="Nome Completo"]', `Prof Matemática 1 ${ts}`);
  56  |     await page.fill('input[placeholder="Matrícula"]', `prof.mat1.${ts}`);
  57  |     await page.fill('input[placeholder*="Carga Horária"]', '40');
  58  |     await page.click('text=Criar Registro');
  59  |     await expect(page.locator('text=Mestre forjado com sucesso!')).toBeVisible();
  60  |     await page.click('text=OK');
  61  |     await page.waitForTimeout(500);
  62  | 
  63  |     // PASSO 3: Aba Turmas
  64  |     await page.click('text=Turmas');
  65  |     for (let i = 1; i <= 5; i++) {
  66  |       await page.fill('input[placeholder="Nome da Turma (Ex: 3º Ano A)"]', `TURMA ${i} ${ts}`);
  67  |       await page.fill('input[placeholder="Ano (Ex: 2026)"]', '2026');
  68  |       await page.click('text=Criar Turma');
  69  |       await expect(page.locator('text=Turma criada com sucesso!')).toBeVisible();
  70  |       await page.click('text=OK');
  71  |       await page.waitForTimeout(500);
  72  |     }
  73  | 
  74  |     // PASSO 4: Aba Matérias
  75  |     await page.click('text=Matérias');
  76  |     await page.locator('text=/Gerar Matérias/i').first().click();
  77  |     await page.click('text=OK');
  78  |     await page.waitForTimeout(500);
  79  | 
  80  |     // PASSO 5: Aba Grade (Monarch Engine)
  81  |     await page.click('text=GRADE');
  82  |     // Selecionar Turma 1
  83  |     await page.click(`text=TURMA 1 ${ts}`);
  84  |     // Selecionar Turno Matutino
  85  |     await page.click('text=MATUTINO');
  86  |     // Clicar em Gerar Grade (Turma)
  87  |     await page.click('text=⚡ Gerar Grade (Turma)');
  88  |     // Confirmar modal do Monarch Engine
> 89  |     await page.click('text=⚡ Gerar Grade');
      |                ^ Error: page.click: Test timeout of 120000ms exceeded.
  90  |     // Fechar modal de sucesso "Grades geradas com sucesso"
  91  |     await page.click('text=OK');
  92  |     await page.waitForTimeout(500);
  93  | 
  94  |     // PASSO 6: Aba Arquiteto (Perguntas Douradas)
  95  |     await page.click('text=ARQUITETO');
  96  |     // Preencher a pergunta dourada
  97  |     await page.fill('textarea', 'Qual conteúdo você achou mais difícil nesta semana?');
  98  |     // Selecionar a Turma 1
  99  |     await page.click(`text=TURMA 1 ${ts}`);
  100 |     // Disparar
  101 |     await page.click('text=Disparar Pergunta Dourada');
  102 |     // Fechar modal de sucesso
  103 |     await page.click('text=OK');
  104 |     await page.waitForTimeout(500);
  105 | 
  106 |     // PASSO 8: Aba Visão Geral e Edição (Simplificado)
  107 |     await page.click('text=LOGS');
  108 |     await expect(page.locator('text=O Arquiteto')).toBeVisible();
  109 |   });
  110 | });
  111 | 
```