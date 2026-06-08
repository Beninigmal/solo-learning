const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // Paths
  const appJsonPath = path.join(__dirname, '../app.json');
  const versionJsonPath = path.join(__dirname, '../version.json');
  
  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const baseVersion = appJson.expo.version || '1.0.0';
  
  // Get Git info
  let commitHash = 'N/A';
  let commitCount = '0';
  
  try {
    commitHash = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
    // Count commits + 1 to estimate the upcoming commit count
    const countRaw = execSync('git rev-list --count HEAD', { cwd: __dirname }).toString().trim();
    commitCount = (parseInt(countRaw, 10) + 1).toString();
  } catch (e) {
    console.warn('Git commands failed. Make sure you are in a Git repository.', e.message);
  }
  
  // Date format
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  const versionData = {
    version: baseVersion,
    commit: commitHash,
    build: commitCount,
    date: formattedDate
  };
  
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');
  console.log(`[Version Tracker] Updated version.json to v${baseVersion} (Build ${commitCount}, Commit ${commitHash})`);
} catch (error) {
  console.error('[Version Tracker] Failed to update version:', error);
}
