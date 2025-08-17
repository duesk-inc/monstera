#!/usr/bin/env node

/**
 * Phase 6 検証スクリプト
 * 旧システムの削除状況を検証
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 検証結果を格納
const results = {
  oldSystemChecks: {
    getAuthClientRemoved: false,
    oldApiClientRemoved: false,
    legacyPatternsRemoved: false
  },
  newSystemChecks: {
    allFilesUsingPreset: false,
    noModuleLevelClients: false,
    noApiV1Prefixes: false
  },
  migrationProgress: {
    totalFiles: 0,
    migratedFiles: 0,
    remainingFiles: 0
  }
};

// 色付きコンソール出力
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}========================================`);
console.log(`Phase 6 検証スクリプト`);
console.log(`旧システムの削除状況を検証`);
console.log(`========================================${colors.reset}\n`);

// 1. getAuthClient関数の削除確認
console.log(`${colors.cyan}1. getAuthClient関数の削除確認${colors.reset}`);
try {
  const grep = execSync('grep -r "export.*getAuthClient" src/lib/api/ 2>/dev/null', { encoding: 'utf8' });
  console.log(`${colors.red}  ✗ getAuthClient関数がまだ存在します${colors.reset}`);
  console.log(`    ${grep.trim()}`);
} catch (error) {
  // grepが見つからない場合はエラーになる（正常）
  console.log(`${colors.green}  ✓ getAuthClient関数は削除されました${colors.reset}`);
  results.oldSystemChecks.getAuthClientRemoved = true;
}

// 2. getAuthClient使用箇所の確認
console.log(`\n${colors.cyan}2. getAuthClient使用箇所の確認${colors.reset}`);
try {
  const grep = execSync('grep -r "getAuthClient()" src/ --include="*.ts" --include="*.tsx" --exclude-dir=__tests__ --exclude-dir=test 2>/dev/null', { encoding: 'utf8' });
  const files = grep.trim().split('\n').filter(Boolean);
  if (files.length > 0) {
    console.log(`${colors.red}  ✗ まだgetAuthClient()を使用しているファイルがあります (${files.length}ファイル)${colors.reset}`);
    files.slice(0, 5).forEach(file => {
      console.log(`    - ${file.split(':')[0]}`);
    });
  }
} catch (error) {
  console.log(`${colors.green}  ✓ getAuthClient()の使用箇所はありません${colors.reset}`);
}

// 3. 旧apiClientパターンの確認
console.log(`\n${colors.cyan}3. 旧apiClientパターンの確認${colors.reset}`);
try {
  const grep = execSync('grep -r "import.*apiClient.*from.*[\'\"]\\./index[\'\"]" src/lib/api/ 2>/dev/null', { encoding: 'utf8' });
  const files = grep.trim().split('\n').filter(Boolean);
  if (files.length > 0) {
    console.log(`${colors.red}  ✗ まだ旧apiClientインポートを使用しているファイルがあります (${files.length}ファイル)${colors.reset}`);
    files.forEach(file => {
      console.log(`    - ${file.split(':')[0]}`);
    });
    results.oldSystemChecks.legacyPatternsRemoved = false;
  }
} catch (error) {
  console.log(`${colors.green}  ✓ 旧apiClientインポートパターンは削除されました${colors.reset}`);
  results.oldSystemChecks.legacyPatternsRemoved = true;
}

// 4. createPresetApiClient使用状況の確認
console.log(`\n${colors.cyan}4. createPresetApiClient使用状況の確認${colors.reset}`);
try {
  const allApiFiles = execSync('find src/lib/api -name "*.ts" -o -name "*.tsx" | wc -l', { encoding: 'utf8' });
  const migratedFiles = execSync('grep -l "createPresetApiClient" src/lib/api/*.ts src/lib/api/**/*.ts 2>/dev/null | wc -l', { encoding: 'utf8' });
  
  const total = parseInt(allApiFiles.trim());
  const migrated = parseInt(migratedFiles.trim());
  
  results.migrationProgress.totalFiles = total;
  results.migrationProgress.migratedFiles = migrated;
  results.migrationProgress.remainingFiles = total - migrated;
  
  console.log(`  APIファイル総数: ${total}`);
  console.log(`  移行済み: ${migrated}`);
  console.log(`  未移行: ${total - migrated}`);
  
  if (total - migrated === 0 || total - migrated <= 5) {
    console.log(`${colors.green}  ✓ ほぼ全てのAPIファイルが新システムに移行されています${colors.reset}`);
    results.newSystemChecks.allFilesUsingPreset = true;
  } else {
    console.log(`${colors.yellow}  ⚠ まだ移行が必要なファイルがあります${colors.reset}`);
  }
} catch (error) {
  console.error(`エラー: 検証中にエラーが発生しました`);
}

// 5. /api/v1プレフィックスの確認
console.log(`\n${colors.cyan}5. /api/v1プレフィックスの確認${colors.reset}`);
try {
  const grep = execSync('grep -r "[\'\"]\\s*/api/v1/" src/lib/api/ src/components/ src/hooks/ --include="*.ts" --include="*.tsx" 2>/dev/null', { encoding: 'utf8' });
  const files = grep.trim().split('\n').filter(Boolean);
  if (files.length > 0) {
    console.log(`${colors.yellow}  ⚠ まだ/api/v1プレフィックスを使用している箇所があります (${files.length}箇所)${colors.reset}`);
    const uniqueFiles = [...new Set(files.map(f => f.split(':')[0]))];
    uniqueFiles.slice(0, 5).forEach(file => {
      console.log(`    - ${file}`);
    });
  } else {
    console.log(`${colors.green}  ✓ /api/v1プレフィックスは削除されました${colors.reset}`);
    results.newSystemChecks.noApiV1Prefixes = true;
  }
} catch (error) {
  console.log(`${colors.green}  ✓ /api/v1プレフィックスは削除されました${colors.reset}`);
  results.newSystemChecks.noApiV1Prefixes = true;
}

// サマリー表示
console.log(`\n${colors.blue}========================================`);
console.log(`検証結果サマリー`);
console.log(`========================================${colors.reset}`);

console.log(`\n${colors.cyan}旧システムの削除状況:${colors.reset}`);
console.log(`  getAuthClient関数: ${results.oldSystemChecks.getAuthClientRemoved ? '✓ 削除済み' : '✗ 未削除'}`);
console.log(`  旧apiClientパターン: ${results.oldSystemChecks.legacyPatternsRemoved ? '✓ 削除済み' : '✗ 残存'}`);

console.log(`\n${colors.cyan}新システムの導入状況:${colors.reset}`);
console.log(`  createPresetApiClient使用: ${results.newSystemChecks.allFilesUsingPreset ? '✓ 完了' : '⚠ 進行中'}`);
console.log(`  /api/v1プレフィックス削除: ${results.newSystemChecks.noApiV1Prefixes ? '✓ 完了' : '⚠ 残存'}`);

console.log(`\n${colors.cyan}移行進捗:${colors.reset}`);
const migrationRate = results.migrationProgress.totalFiles > 0 
  ? ((results.migrationProgress.migratedFiles / results.migrationProgress.totalFiles) * 100).toFixed(1)
  : 0;
console.log(`  進捗率: ${migrationRate}%`);
console.log(`  移行済み: ${results.migrationProgress.migratedFiles}/${results.migrationProgress.totalFiles}ファイル`);

// 最終評価
const allOldSystemRemoved = Object.values(results.oldSystemChecks).every(v => v);
const allNewSystemReady = Object.values(results.newSystemChecks).filter(v => v).length >= 2;

if (allOldSystemRemoved && allNewSystemReady) {
  console.log(`\n${colors.green}✓ Phase 6が正常に完了しました！${colors.reset}`);
  console.log(`${colors.green}旧システムの削除と新システムへの移行が完了しました。${colors.reset}`);
} else if (allOldSystemRemoved) {
  console.log(`\n${colors.yellow}⚠ Phase 6は部分的に完了しました${colors.reset}`);
  console.log(`${colors.yellow}旧システムは削除されましたが、一部のファイルで調整が必要です。${colors.reset}`);
} else {
  console.log(`\n${colors.red}✗ Phase 6はまだ完了していません${colors.reset}`);
  console.log(`${colors.red}旧システムの削除または新システムへの移行が不完全です。${colors.reset}`);
}

// 終了コード
process.exit(allOldSystemRemoved ? 0 : 1);