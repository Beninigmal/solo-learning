#!/usr/bin/env node
/**
 * Script de Túnel para Desenvolvimento
 * 
 * Abre um túnel público para o backend local (porta 3333)
 * e atualiza automaticamente o config.ts com a nova URL.
 * 
 * Uso: npm run tunnel
 * Para encerrar e restaurar URL local: Ctrl+C
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.ts');
const LOCAL_URL  = 'http://192.168.1.20:3333';
const PORT       = 3333;

function writeConfig(url) {
  const content = `/**
 * Configuração da URL do Backend
 * 
 * Para desenvolvimento local (Expo Go na mesma rede Wi-Fi):
 *   baseURL: 'http://SEU_IP_LOCAL:3333'
 * 
 * Para APK instalado em celular externo (amigo em outra rede):
 *   Rode: npm run tunnel
 *   Copie a URL gerada e cole aqui antes do build
 *   baseURL: 'https://XXXXX.loca.lt'
 * 
 * Para produção:
 *   baseURL: 'https://seu-backend.com'
 */

// ⬇️ TROQUE AQUI A URL DO BACKEND
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || '${url}';
`;
  fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
}

function startTunnel() {
  console.log('\n🌀 Iniciando túnel para o backend Solen...\n');

  const lt = spawn('npx', ['localtunnel', '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let tunnelUrl = null;

  lt.stdout.on('data', (data) => {
    const text = data.toString().trim();
    const match = text.match(/https:\/\/[a-z0-9-]+\.loca\.lt/);

    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      writeConfig(tunnelUrl);

      console.log(`✅ Túnel ativo!\n`);
      console.log(`   URL pública: ${tunnelUrl}\n`);
      console.log(`📋 config.ts atualizado automaticamente.`);
      console.log(`\n🔨 Próximos passos:`);
      console.log(`   1. Mantenha este terminal aberto (túnel ativo)`);
      console.log(`   2. Faça o build: eas build -p android --profile preview`);
      console.log(`   3. Instale o APK gerado no celular do amigo\n`);
      console.log(`⚠️  O túnel fecha quando você apertar Ctrl+C.`);
      console.log(`   O config.ts será restaurado para o IP local automaticamente.\n`);
      console.log(`─────────────────────────────────────────────`);
      console.log(`Aguardando conexões... (Ctrl+C para encerrar)`);
      console.log(`─────────────────────────────────────────────\n`);
    }
  });

  lt.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text && !text.includes('your url is')) {
      console.log('[tunnel]', text);
    }
  });

  lt.on('close', (code) => {
    console.log(`\n🔴 Túnel encerrado.`);
    if (tunnelUrl) {
      writeConfig(LOCAL_URL);
      console.log(`↩️  config.ts restaurado para: ${LOCAL_URL}\n`);
    }
    // Reinicia automaticamente se encerrou sem Ctrl+C (código 0 inesperado)
    if (code === 0 && !shuttingDown) {
      console.log('🔄 Reiniciando túnel automaticamente...\n');
      setTimeout(startTunnel, 2000);
    }
  });

  lt.on('error', (err) => {
    console.error('❌ Erro no túnel:', err.message);
    setTimeout(startTunnel, 3000);
  });

  return lt;
}

let shuttingDown = false;
let tunnel = startTunnel();

// Ctrl+C → encerra tudo e restaura config
process.on('SIGINT', () => {
  shuttingDown = true;
  console.log('\n\n🛑 Encerrando túnel...');
  if (tunnel) tunnel.kill();
  writeConfig(LOCAL_URL);
  console.log(`↩️  config.ts restaurado para: ${LOCAL_URL}\n`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  if (tunnel) tunnel.kill();
  writeConfig(LOCAL_URL);
  process.exit(0);
});
