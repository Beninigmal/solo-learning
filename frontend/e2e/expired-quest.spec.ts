import { test, expect } from '@playwright/test';

test.describe('Expired Quest Handling E2E', () => {
  test('aluno148 login and single alert on quest expiration without infinite loop', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Ir para a tela de login
    await page.goto('/login');

    // Configurar API para o backend local (http://127.0.0.1:3333)
    await page.locator('text=Local ·').click();
    await page.fill('input[placeholder*="192.168"]', 'http://127.0.0.1:3333');
    await page.click('text=Aplicar URL');
    await page.waitForTimeout(500);

    // 2. Fazer login com aluno148 / 1234
    await page.fill('input[placeholder="Matrícula"]', 'aluno148');
    await page.fill('input[placeholder="Senha"]', '1234');
    await page.click('text=Despertar');

    // 3. Aguardar redirecionamento ou entrada na aplicação
    await page.waitForTimeout(3000);

    // Verificar se o modal "TEMPO ESGOTADO" aparece no máximo UMA vez e não entra em loop infinito
    // Se o modal de alerta "TEMPO ESGOTADO" estiver visível, fechá-lo
    const alertModal = page.locator('text=TEMPO ESGOTADO');
    if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Playwright Test] Modal "TEMPO ESGOTADO" detectado. Confirmando fecho...');
      await page.getByText('Confirmar', { exact: false }).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 4. Aguardar 8 segundos (múltiplos ciclos de polling) para garantir que o alerta NÃO reaparece em loop
    await page.waitForTimeout(8000);

    // Assert que o modal NÃO está mais presente (loop infinito corrigido com sucesso)
    const alertCount = await page.locator('text=TEMPO ESGOTADO').count();
    expect(alertCount).toBe(0);
  });
});
