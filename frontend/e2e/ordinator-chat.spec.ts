import { test, expect } from '@playwright/test';

test.describe('Ordinator Chat E2E', () => {
  test('Complete CRUD Direct Flow', async ({ page }) => {
    test.setTimeout(120000);
    const ts = Date.now();

    // PASSO 1: Configurar Servidor e Autenticação
    await page.goto('/login');
    
    // Configurar API para apontar pro backend local em vez do Render
    await page.locator('text=Local ·').click();
    await page.fill('input[placeholder*="192.168"]', 'http://127.0.0.1:3333');
    await page.click('text=Aplicar URL');

    // Tentar login válido
    await page.fill('input[placeholder="Matrícula"]', 'web01');
    await page.fill('input[placeholder="Senha"]', '1234');
    await page.click('text=Despertar');
    
    // Validar redirecionamento para o dashboard
    await expect(page.locator('text=O Arquiteto')).toBeVisible({ timeout: 30000 });

    // Acessar a aba do Ordinator
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.click('text=ORDINATOR');
    await expect(page.locator('text=Ordinator AI')).toBeVisible();

    // ==========================================
    // MOCK DE REDE (Interceptar o backend do Ordinator)
    // ==========================================
    
    // Mock 1: Criação de Professor (Silencioso)
    await page.route('**/ordinator/chat', async (route, request) => {
      const postData = request.postData();
      console.log('Intercepted postData:', postData);
      if (postData && postData.includes('Crie o professor')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: 'Professor Marcos Delgado criado com sucesso direto no banco.',
            sessionId: 'mock-session-1'
          })
        });
      } else if (postData && postData.includes('Delete o professor')) {
        // Mock 2: Remoção de Professor (Widget GENERIC_CONFIRM)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: 'Exclusão do professor Marcos Delgado pendente de confirmação visual.',
            sessionId: 'mock-session-1',
            widget: {
              type: 'GENERIC_CONFIRM',
              data: {
                action: 'DELETE_USER',
                title: 'Confirmar Exclusão de Professor',
                description: 'Tem certeza que deseja remover permanentemente o professor Marcos Delgado (MAT123)?',
                payload: { id: 999, role: 'Professor' }
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock 3: Interceptar rota de DELETE no backend
    await page.route('**/admin/users/999', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User deleted' })
      });
    });

    // ==========================================
    // TESTE 1: Criação Direta (Sem Widget)
    // ==========================================
    const chatInput = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await chatInput.fill('Crie o professor Marcos delgado com 40 horas semanais');
    await sendButton.click();

    // Validar se a mensagem apareceu na lista
    await expect(page.getByText('Professor Marcos Delgado criado', { exact: false })).toBeVisible();
    // Garantir que nenhum painel lateral abriu
    await expect(page.locator('text=Visualização de Atividade')).toBeHidden();

    // ==========================================
    // TESTE 2: Deleção com Painel de Confirmação
    // ==========================================
    await page.waitForTimeout(1000); // Aguarda a state machine e animações descansarem

    await chatInput.fill('Delete o professor Marcos Delgado');
    await sendButton.click();

    // A resposta deve aparecer
    await expect(page.getByText('Exclusão do professor', { exact: false })).toBeVisible();
    
    // O painel lateral (Inspetor) deve abrir automaticamente
    await expect(page.getByText('Visualização de Atividade', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Confirmar Exclusão de Professor', { exact: false })).toBeVisible();
    await expect(page.getByText('remover permanentemente o professor Marcos Delgado', { exact: false })).toBeVisible();

    // Apertar o botão de confirmar no modal (que tem o texto 'Confirmar')
    const confirmButton = page.locator('text=Confirmar').last();
    await confirmButton.click();

    // Validar que fechou ou exibiu mensagem de sucesso
    await expect(page.getByText('Conta de Professor removida permanentemente', { exact: false })).toBeVisible();
    // Painel lateral deve fechar
    await expect(page.getByText('Visualização de Atividade', { exact: false }).first()).toBeHidden();
  });
});
