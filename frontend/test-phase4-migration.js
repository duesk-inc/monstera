#!/usr/bin/env node

/**
 * Phase 4 移行検証スクリプト
 * ビジネスロジックモジュールの移行状態を検証
 */

const fs = require('fs');
const path = require('path');

// テスト対象のビジネスロジックモジュール
const businessModules = [
  'src/lib/api/leave.ts',
  'src/lib/api/skillSheet.ts', 
  'src/lib/api/weeklyReport.ts',
  'src/lib/api/sales/index.ts'
];

// 検証結果を格納
const results = {
  total: 0,
  migrated: 0,
  failed: 0,
  details: []
};

// 色付きコンソール出力
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}========================================`);
console.log(`Phase 4 移行検証スクリプト`);
console.log(`ビジネスロジックモジュールの検証`);
console.log(`========================================${colors.reset}\n`);

// 各モジュールを検証
businessModules.forEach(modulePath => {
  const fullPath = path.join(process.cwd(), modulePath);
  const fileName = path.basename(modulePath);
  
  console.log(`\n${colors.yellow}検証中: ${modulePath}${colors.reset}`);
  results.total++;
  
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.red}  ✗ ファイルが存在しません${colors.reset}`);
    results.failed++;
    results.details.push({
      file: modulePath,
      status: 'FILE_NOT_FOUND',
      error: 'ファイルが存在しません'
    });
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const checks = {
    hasPresetImport: false,
    hasOldImport: false,
    hasGetAuthClient: false,
    hasApiClientImport: false,
    hasCreatePresetCalls: false,
    hasApiV1Prefix: false,
    hasMigrationComment: false
  };
  
  // 新しいパターンのチェック
  checks.hasPresetImport = /import\s+{[^}]*createPresetApiClient[^}]*}\s+from\s+['"]@\/lib\/api['"]/.test(content);
  checks.hasCreatePresetCalls = /createPresetApiClient\(['"](?:auth|admin|upload|batch|public|default)['"]\)/.test(content);
  checks.hasMigrationComment = /\/\/\s*Migrated to new API client system/.test(content);
  
  // 古いパターンのチェック（存在しないことを確認）
  checks.hasOldImport = /import\s+apiClient\s+from\s+['"]@\/lib\/api['"]/.test(content);
  checks.hasGetAuthClient = /getAuthClient\(\)/.test(content);
  checks.hasApiClientImport = /import\s+{[^}]*apiClient[^}]*}\s+from\s+['"]@\/lib\/api['"]/.test(content);
  
  // /api/v1 プレフィックスのチェック（APIパスの文字列内）
  checks.hasApiV1Prefix = /['"`]\/api\/v1\//.test(content);
  
  // 移行状態を判定
  const isMigrated = 
    checks.hasPresetImport && 
    checks.hasCreatePresetCalls &&
    !checks.hasOldImport && 
    !checks.hasGetAuthClient &&
    !checks.hasApiClientImport &&
    !checks.hasApiV1Prefix;
  
  // 結果を記録
  if (isMigrated) {
    console.log(`${colors.green}  ✓ 正常に移行されています${colors.reset}`);
    results.migrated++;
    results.details.push({
      file: modulePath,
      status: 'MIGRATED',
      checks: checks
    });
  } else {
    console.log(`${colors.red}  ✗ 移行が不完全です${colors.reset}`);
    results.failed++;
    
    // 問題の詳細を表示
    if (!checks.hasPresetImport) {
      console.log(`    - createPresetApiClient のインポートがありません`);
    }
    if (!checks.hasCreatePresetCalls) {
      console.log(`    - createPresetApiClient の呼び出しがありません`);
    }
    if (checks.hasOldImport) {
      console.log(`    - 古い apiClient デフォルトインポートが残っています`);
    }
    if (checks.hasGetAuthClient) {
      console.log(`    - getAuthClient() の呼び出しが残っています`);
    }
    if (checks.hasApiClientImport) {
      console.log(`    - 古い apiClient 名前付きインポートが残っています`);
    }
    if (checks.hasApiV1Prefix) {
      console.log(`    - /api/v1 プレフィックスが残っています`);
    }
    
    results.details.push({
      file: modulePath,
      status: 'INCOMPLETE',
      checks: checks
    });
  }
  
  // 詳細チェック結果を表示
  console.log(`  詳細:`);
  console.log(`    - 新APIインポート: ${checks.hasPresetImport ? '✓' : '✗'}`);
  console.log(`    - Preset呼び出し: ${checks.hasCreatePresetCalls ? '✓' : '✗'}`);
  console.log(`    - 移行コメント: ${checks.hasMigrationComment ? '✓' : '✗'}`);
  console.log(`    - 旧パターン除去: ${!checks.hasOldImport && !checks.hasGetAuthClient ? '✓' : '✗'}`);
  console.log(`    - APIパス最適化: ${!checks.hasApiV1Prefix ? '✓' : '✗'}`);
});

// サマリーを表示
console.log(`\n${colors.blue}========================================`);
console.log(`検証結果サマリー`);
console.log(`========================================${colors.reset}`);
console.log(`総ファイル数: ${results.total}`);
console.log(`${colors.green}移行完了: ${results.migrated}${colors.reset}`);
console.log(`${colors.red}移行不完全: ${results.failed}${colors.reset}`);

// 成功率を計算
const successRate = results.total > 0 ? (results.migrated / results.total * 100).toFixed(1) : 0;
console.log(`\n成功率: ${successRate}%`);

// 最終評価
if (results.failed === 0) {
  console.log(`\n${colors.green}✓ Phase 4の移行が正常に完了しました！${colors.reset}`);
  console.log(`${colors.green}全てのビジネスロジックモジュールが新しいAPIクライアントシステムに移行されました。${colors.reset}`);
} else {
  console.log(`\n${colors.red}✗ 一部のファイルで移行が不完全です${colors.reset}`);
  console.log(`${colors.yellow}移行が不完全なファイル:${colors.reset}`);
  results.details
    .filter(d => d.status !== 'MIGRATED')
    .forEach(d => console.log(`  - ${d.file}`));
}

// CSV形式でエクスポート
const csvPath = 'phase4-migration-report.csv';
const csvHeader = 'File,Status,PresetImport,PresetCalls,MigrationComment,NoOldImport,NoGetAuthClient,NoApiV1Prefix\n';
const csvRows = results.details.map(d => {
  if (d.checks) {
    return `${d.file},${d.status},${d.checks.hasPresetImport},${d.checks.hasCreatePresetCalls},${d.checks.hasMigrationComment},${!d.checks.hasOldImport},${!d.checks.hasGetAuthClient},${!d.checks.hasApiV1Prefix}`;
  }
  return `${d.file},${d.status},,,,,,,`;
}).join('\n');

fs.writeFileSync(csvPath, csvHeader + csvRows);
console.log(`\n詳細レポートを ${csvPath} に保存しました`);

// 終了コード
process.exit(results.failed > 0 ? 1 : 0);