import { test, expect } from '@playwright/test';

test.describe('Admin Flow E2E', () => {
  test('Complete MVP Flow', async ({ page }) => {
    test.setTimeout(120000);
    const ts = Date.now();

    // PASSO 1: Configurar Servidor e Autenticação
    await page.goto('/login');
    
    // Configurar API para apontar pro backend local em vez do Render
    await page.locator('text=Local ·').click();
    await page.fill('input[placeholder*="192.168"]', 'http://127.0.0.1:3333');
    await page.click('text=Aplicar URL');

    // Tentar login inválido
    await page.fill('input[placeholder="Matrícula"]', 'web01');
    await page.fill('input[placeholder="Senha"]', 'wrongpassword');
    await page.click('text=Despertar');
    
    // Espera feedback de erro no SystemAlert
    await expect(page.locator('text=ERRO DO SISTEMA')).toBeVisible();
    await page.getByText('Confirmar', { exact: false }).last().click({ force: true }); // Fechar modal de alerta se houver botão fechar
    
    // Aguarda o modal desaparecer por completo (animação de fade-out)
    await page.waitForTimeout(1000);

    // Tentar login válido
    await page.fill('input[placeholder="Senha"]', '1234');
    await page.click('text=Despertar');
    
    // Validar redirecionamento para o dashboard
    await expect(page.locator('text=O Arquiteto')).toBeVisible({ timeout: 10000 });

    // PASSO 2: Aba Recrutar > Mestre
    await page.click('text=Recrutar');
    await page.click('text=Mestre');

    // Submeter vazio para checar erro
    await page.click('text=Criar Registro'); 
    await expect(page.locator('text=Preencha os campos obrigatórios')).toBeVisible();
    await page.click('text=OK');
    await page.waitForTimeout(500);
    
    // Criar Professor de Português
    await page.fill('input[placeholder="Nome Completo"]', `Prof Português 1 ${ts}`);
    await page.fill('input[placeholder="Matrícula"]', `prof.pt1.${ts}`);
    await page.fill('input[placeholder*="Carga Horária"]', '40');
    await page.click('text=Criar Registro');
    await expect(page.locator('text=Mestre forjado com sucesso!')).toBeVisible();
    await page.click('text=OK');
    await page.waitForTimeout(500);
    
    // Criar Professor de Matemática
    await page.fill('input[placeholder="Nome Completo"]', `Prof Matemática 1 ${ts}`);
    await page.fill('input[placeholder="Matrícula"]', `prof.mat1.${ts}`);
    await page.fill('input[placeholder*="Carga Horária"]', '40');
    await page.click('text=Criar Registro');
    await expect(page.locator('text=Mestre forjado com sucesso!')).toBeVisible();
    await page.click('text=OK');
    await page.waitForTimeout(500);

    // PASSO 3: Aba Turmas
    await page.click('text=Turmas');
    for (let i = 1; i <= 5; i++) {
      await page.fill('input[placeholder="Nome da Turma (Ex: 3º Ano A)"]', `TURMA ${i} ${ts}`);
      await page.fill('input[placeholder="Ano (Ex: 2026)"]', '2026');
      await page.click('text=Criar Turma');
      await expect(page.locator('text=Turma criada com sucesso!')).toBeVisible();
      await page.click('text=OK');
      await page.waitForTimeout(500);
    }

    // PASSO 4: Aba Matérias
    await page.click('text=Matérias');
    await page.locator('text=/Gerar Matérias/i').first().click();
    await page.click('text=OK');
    await page.waitForTimeout(500);

    // PASSO 5: Aba Grade (Monarch Engine)
    await page.click('text=GRADE');
    // Selecionar Turma 1
    await page.click(`text=TURMA 1 ${ts}`);
    // Selecionar Turno Matutino
    await page.click('text=MATUTINO');
    // Clicar em Gerar Grade (Turma)
    await page.click('text=⚡ Gerar Grade (Turma)');
    // Confirmar modal do Monarch Engine
    await page.getByText('⚡ Gerar Grade', { exact: true }).click();
    // Fechar modal de sucesso "Grades geradas com sucesso"
    await page.click('text=OK');
    await page.waitForTimeout(500);

    // PASSO 6: Aba Arquiteto (Perguntas Douradas)
    await page.click('text=ARQUITETO');
    // Preencher a pergunta dourada
    await page.fill('textarea', 'Qual conteúdo você achou mais difícil nesta semana?');
    // Selecionar a Turma 1
    await page.click(`text=TURMA 1 ${ts}`);
    // Disparar
    await page.click('text=Disparar Pergunta Dourada');
    // Fechar modal de sucesso
    await page.click('text=OK');
    await page.waitForTimeout(500);

    // PASSO 8: Aba Visão Geral e Edição (Simplificado)
    await page.click('text=LOGS');
    await expect(page.locator('text=O Arquiteto')).toBeVisible();
  });
});
