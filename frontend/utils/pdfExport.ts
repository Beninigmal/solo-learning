import { Platform, Alert } from 'react-native';

export function exportToPDF(title: string, subtitle: string, htmlBody: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    Alert.alert('Exportação em PDF', 'A emissão de relatórios em PDF com visualização vetorial está otimizada para o navegador Web. Acesse via desktop para salvar/imprimir em PDF.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para gerar a visualização de impressão em PDF.');
    return;
  }

  const nowStr = new Date().toLocaleString('pt-BR');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title} — Solen SaaS</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            margin: 0;
            padding: 20px;
            -webkit-print-color-adjust: exact;
          }
          .header {
            border-bottom: 3px solid #00f3ff;
            padding-bottom: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .brand {
            font-size: 22px;
            font-weight: 800;
            color: #0a1128;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .brand span {
            color: #0088cc;
          }
          .subtitle {
            font-size: 13px;
            color: #555555;
            margin-top: 4px;
            font-weight: 600;
          }
          .meta {
            font-size: 10px;
            text-align: right;
            color: #666666;
            font-family: monospace;
          }
          .card-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
          }
          .card {
            flex: 1;
            border: 1px solid #d1d5db;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 6px;
            text-align: center;
          }
          .card-val {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
          }
          .card-lbl {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0f172a;
            margin-top: 20px;
            margin-bottom: 12px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 10px 12px;
            font-size: 11px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            color: #334155;
          }
          .badge-gain {
            background: #dcfce7;
            color: #15803d;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 10px;
          }
          .badge-deficit {
            background: #fee2e2;
            color: #b91c1c;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 10px;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Collegium — <span>Relatório Pedagógico</span></div>
            <div class="subtitle">${title}${subtitle ? ` — ${subtitle}` : ''}</div>
          </div>
          <div class="meta">
            <div>EMISSÃO: ${nowStr}</div>
            <div>AUTENTICIDADE: SISTEMA COLLEGIUM</div>
          </div>
        </div>
        ${htmlBody}
        <div class="footer">
          Relatório Executivo Gerado Automaticamente pelo Solen Academic System — Autenticidade Garantida.
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
