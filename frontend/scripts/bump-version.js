const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');

// Helper to execute git commands safely
function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

// Helper to format local date
function getFormattedDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function bump() {
  console.log('🔮 Iniciando automação do sistema de versão...');

  // 1. Carregar package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '1.1.0';
  
  // Fazer bump do patch (ex: 1.1.1 -> 1.1.2)
  const parts = currentVersion.split('.').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    parts[2] += 1;
  } else {
    parts[0] = 1; parts[1] = 1; parts[2] = 2; // fallback
  }
  const nextVersion = parts.join('.');
  
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ package.json atualizado: ${currentVersion} ➔ ${nextVersion}`);

  // 2. Carregar app.json (Expo)
  const appJsonPath = path.join(rootDir, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      appJson.expo.version = nextVersion;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
      console.log(`✅ app.json (Expo) atualizado para v${nextVersion}`);
    }
  }

  // 3. Carregar e Incrementar version.json
  const verPath = path.join(rootDir, 'version.json');
  let verData = { version: nextVersion, commit: '', build: '1', date: '' };
  
  if (fs.existsSync(verPath)) {
    try {
      verData = JSON.parse(fs.readFileSync(verPath, 'utf8'));
    } catch (e) {
      // Usar defaults
    }
  }
  
  const currentBuild = parseInt(verData.build || '0', 10);
  verData.version = nextVersion;
  verData.commit = getGitCommit();
  verData.build = String(currentBuild + 1);
  verData.date = getFormattedDate();
  
  fs.writeFileSync(verPath, JSON.stringify(verData, null, 2) + '\n');
  console.log(`✅ version.json sincronizado:`);
  console.log(`   - Versão: ${verData.version}`);
  console.log(`   - Commit: ${verData.commit}`);
  console.log(`   - Build Index: ${verData.build}`);
  console.log(`   - Timestamp: ${verData.date}`);
  console.log('\n🌟 Sistema de versão atualizado com sucesso! Pronto para compilação.');
}

bump();
