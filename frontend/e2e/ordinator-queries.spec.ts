import { test, expect } from '@playwright/test';

test.describe('Ordinator Queries E2E', () => {
  test('Validar renderização do Dynamic Data Grid para diferentes listagens', async ({ page }) => {
    test.setTimeout(120000);

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
    await page.click('text=ORDINATOR');
    await expect(page.locator('text=Ordinator AI')).toBeVisible();

    // ==========================================
    // MOCK DE REDE (Interceptar o backend do Ordinator)
    // ==========================================
    await page.route('**/ordinator/chat', async (route, request) => {
      const postData = request.postData();
      if (!postData) {
        return route.continue();
      }

      const body = JSON.parse(postData);
      const text = body.message.toLowerCase();

      let mockResponse = {};

      if (text.includes('alunos da turma 1 e turma 3')) {
        mockResponse = {
          reply: 'Confirme a ação na seção de atividade!',
          sessionId: 'mock-session-queries',
          widget: {
            type: 'DYNAMIC_DATA_GRID',
            data: {
              entity: 'user',
              items: [
                { nome: 'Aluno T1 A', matricula: 'ALU1', turno: 'MATUTINO', xp: 100, level: 2 },
                { nome: 'Aluno T3 B', matricula: 'ALU3', turno: 'VESPERTINO', xp: 50, level: 1 }
              ]
            }
          }
        };
      } else if (text.includes('clt e tem menos de 30h')) {
        mockResponse = {
          reply: 'Confirme a ação na seção de atividade!',
          sessionId: 'mock-session-queries',
          widget: {
            type: 'DYNAMIC_DATA_GRID',
            data: {
              entity: 'user',
              items: [
                { nome: 'Prof Meio Período', matricula: 'PROF30', categoria: 'CLT', maxAulasSemanais: 20 }
              ]
            }
          }
        };
      } else if (text.includes('clt')) {
        mockResponse = {
          reply: 'Confirme a ação na seção de atividade!',
          sessionId: 'mock-session-queries',
          widget: {
            type: 'DYNAMIC_DATA_GRID',
            data: {
              entity: 'user',
              items: [
                { nome: 'Prof CLT 1', matricula: 'CLT1', categoria: 'CLT', maxAulasSemanais: 40 }
              ]
            }
          }
        };
      } else if (text.includes('reda')) {
        mockResponse = {
          reply: 'Confirme a ação na seção de atividade!',
          sessionId: 'mock-session-queries',
          widget: {
            type: 'DYNAMIC_DATA_GRID',
            data: {
              entity: 'user',
              items: [
                { nome: 'Prof REDA 1', matricula: 'REDA1', categoria: 'REDA', maxAulasSemanais: 20 }
              ]
            }
          }
        };
      } else if (text.includes('mestres') || text.includes('professores')) {
        mockResponse = {
          reply: 'Confirme a ação na seção de atividade!',
          sessionId: 'mock-session-queries',
          widget: {
            type: 'DYNAMIC_DATA_GRID',
            data: {
              entity: 'user',
              items: [
                { nome: 'Prof Geral 1', matricula: 'GERAL1', categoria: 'CONCURSADO', maxAulasSemanais: 40 },
                { nome: 'Prof Geral 2', matricula: 'GERAL2', categoria: 'CLT', maxAulasSemanais: 20 }
              ]
            }
          }
        };
      } else {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    const chatInput = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    // Helper para rodar uma query e validar o Dynamic Data Grid
    const testQuery = async (query: string, expectedText: string, expectedColumns: string[]) => {
      await chatInput.fill(query);
      await sendButton.click();
      
      // O modal/painel lateral é aberto automaticamente ao receber um widget em muitos casos,
      // mas no Ordinator atual requer clique no botão de visualizar detalhes.
      await expect(page.getByText('Confirme a ação na seção de atividade!', { exact: false }).last()).toBeVisible();
      
      const inspectButton = page.locator('div[role="button"]').filter({ hasText: /VISUALIZAR DETALHES|INSPECIONANDO NO PAINEL/i }).last();
      try {
        await inspectButton.click({ timeout: 2000 });
      } catch (e) {
        // Ignora se não conseguir clicar, talvez já esteja aberto
      }

      // Verifica se o painel abriu
      const inspector = page.getByText('VISUALIZAÇÃO DE ATIVIDADE', { exact: false }).first();
      await expect(inspector).toBeVisible();

      // Verifica dados na tabela
      try {
        await expect(page.getByText(expectedText)).toBeVisible({ timeout: 5000 });
      } catch (e) {
        console.error(`Falhou ao encontrar o texto: ${expectedText}`);
        const html = await page.content();
        require('fs').writeFileSync('/tmp/playwright-debug.html', html);
        throw e;
      }

      // Verifica se as colunas corretas estão renderizadas
      for (const col of expectedColumns) {
        await expect(page.getByText(col).first()).toBeVisible();
      }
    };

    // Executa as queries
    await testQuery('Listar todos os alunos da turma 1 e turma 3', 'Aluno T1 A', ['NOME', 'MATRICULA', 'TURNO', 'XP']);
    await testQuery('Listar todos os mestres', 'Prof Geral 1', ['NOME', 'MATRICULA', 'CATEGORIA', 'MAXAULASSEMANAIS']);
    await testQuery('Listar todos os mestres que são CLT', 'Prof CLT 1', ['NOME', 'MATRICULA', 'CATEGORIA', 'MAXAULASSEMANAIS']);
    await testQuery('Listar todos os mestres que são REDA', 'Prof REDA 1', ['NOME', 'MATRICULA', 'CATEGORIA', 'MAXAULASSEMANAIS']);
    await testQuery('Listar todos os mestres que são CLT e tem menos de 30h semanais', 'Prof Meio Período', ['NOME', 'MATRICULA', 'CATEGORIA', 'MAXAULASSEMANAIS']);
  });
});
