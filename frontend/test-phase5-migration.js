#!/usr/bin/env node

/**
 * Phase 5 移行検証スクリプト
 * UIコンポーネントとhooksの移行状態を検証
 */

const fs = require('fs');
const path = require('path');

// テスト対象のUIコンポーネントとhooks
const uiFiles = [
  // admin hooksの修正
  'src/hooks/admin/useExportJob.ts',
  'src/hooks/admin/useMonthlySummary.ts',
  'src/hooks/admin/useUnsubmittedReports.ts',
  // componentsディレクトリ
  'src/components/admin/leave/LeaveRequestList.tsx',
  'src/components/admin/leave/LeaveStatistics.tsx',
  'src/components/features/notification/NotificationBadge.tsx',
  'src/components/features/notification/NotificationPanel.tsx',
  'src/components/features/notification/UnsubmittedAlert.tsx',
  'src/components/features/weeklyReport/dialogs/CommentDialog.tsx',
  // hooks/commonディレクトリ
  'src/hooks/common/useCachePreloader.ts',
  'src/hooks/common/useNotifications.ts'
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
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}========================================`);
console.log(`Phase 5 移行検証スクリプト`);
console.log(`UIコンポーネントとhooksの検証`);
console.log(`========================================${colors.reset}\n`);

// 各ファイルを検証
uiFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  const fileName = path.basename(filePath);
  const category = filePath.includes('hooks/admin') ? 'Admin Hooks' :
                   filePath.includes('hooks/common') ? 'Common Hooks' :
                   filePath.includes('components/admin') ? 'Admin Components' :
                   filePath.includes('components/features') ? 'Feature Components' : 'Other';
  
  console.log(`\n${colors.yellow}[${category}] 検証中: ${fileName}${colors.reset}`);
  results.total++;
  
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.red}  ✗ ファイルが存在しません${colors.reset}`);
    results.failed++;
    results.details.push({
      file: filePath,
      category: category,
      status: 'FILE_NOT_FOUND',
      error: 'ファイルが存在しません'
    });
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const checks = {
    hasPresetImport: false,
    hasOldImport: false,
    hasModuleLevelClient: false,
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
  
  // モジュールレベルでapiClientが定義されていないかチェック
  // ただし、関数内での定義は許可
  const moduleLevelClientPattern = /^const\s+apiClient\s*=\s*createPresetApiClient/m;
  checks.hasModuleLevelClient = moduleLevelClientPattern.test(content);
  
  // /api/v1 プレフィックスのチェック
  checks.hasApiV1Prefix = /['"`]\/api\/v1\//.test(content);
  
  // 移行状態を判定
  const isMigrated = 
    checks.hasPresetImport && 
    checks.hasCreatePresetCalls &&
    !checks.hasOldImport && 
    !checks.hasModuleLevelClient &&
    !checks.hasApiV1Prefix;
  
  // 結果を記録
  if (isMigrated) {
    console.log(`${colors.green}  ✓ 正常に移行されています${colors.reset}`);
    results.migrated++;
    results.details.push({
      file: filePath,
      category: category,
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
      console.log(`    - 古い apiClient インポートが残っています`);
    }
    if (checks.hasModuleLevelClient) {
      console.log(`    - モジュールレベルでapiClientが定義されています（関数内で定義すべき）`);
    }
    if (checks.hasApiV1Prefix) {
      console.log(`    - /api/v1 プレフィックスが残っています`);
    }
    
    results.details.push({
      file: filePath,
      category: category,
      status: 'INCOMPLETE',
      checks: checks
    });
  }
  
  // 詳細チェック結果を表示
  console.log(`  ${colors.cyan}詳細:${colors.reset}`);
  console.log(`    - 新APIインポート: ${checks.hasPresetImport ? '✓' : '✗'}`);
  console.log(`    - Preset呼び出し: ${checks.hasCreatePresetCalls ? '✓' : '✗'}`);
  console.log(`    - 移行コメント: ${checks.hasMigrationComment ? '✓' : '✗'}`);
  console.log(`    - モジュールレベル定義なし: ${!checks.hasModuleLevelClient ? '✓' : '✗'}`);
  console.log(`    - 旧パターン除去: ${!checks.hasOldImport ? '✓' : '✗'}`);
  console.log(`    - APIパス最適化: ${!checks.hasApiV1Prefix ? '✓' : '✗'}`);
});

// カテゴリ別サマリー
const categorySummary = {};
results.details.forEach(detail => {
  if (!categorySummary[detail.category]) {
    categorySummary[detail.category] = { total: 0, migrated: 0, failed: 0 };
  }
  categorySummary[detail.category].total++;
  if (detail.status === 'MIGRATED') {
    categorySummary[detail.category].migrated++;
  } else {
    categorySummary[detail.category].failed++;
  }
});

// サマリーを表示
console.log(`\n${colors.blue}========================================`);
console.log(`検証結果サマリー`);
console.log(`========================================${colors.reset}`);

console.log(`\n${colors.cyan}カテゴリ別結果:${colors.reset}`);
Object.entries(categorySummary).forEach(([category, stats]) => {
  const successRate = (stats.migrated / stats.total * 100).toFixed(0);
  const statusColor = stats.failed === 0 ? colors.green : colors.red;
  console.log(`  ${category}: ${statusColor}${stats.migrated}/${stats.total} (${successRate}%)${colors.reset}`);
});

console.log(`\n${colors.cyan}全体結果:${colors.reset}`);
console.log(`  総ファイル数: ${results.total}`);
console.log(`  ${colors.green}移行完了: ${results.migrated}${colors.reset}`);
console.log(`  ${colors.red}移行不完全: ${results.failed}${colors.reset}`);

// 成功率を計算
const successRate = results.total > 0 ? (results.migrated / results.total * 100).toFixed(1) : 0;
console.log(`\n成功率: ${successRate}%`);

// 最終評価
if (results.failed === 0) {
  console.log(`\n${colors.green}✓ Phase 5の移行が正常に完了しました！${colors.reset}`);
  console.log(`${colors.green}全てのUIコンポーネントとhooksが新しいAPIクライアントシステムに移行されました。${colors.reset}`);
} else {
  console.log(`\n${colors.red}✗ 一部のファイルで移行が不完全です${colors.reset}`);
  console.log(`${colors.yellow}移行が不完全なファイル:${colors.reset}`);
  results.details
    .filter(d => d.status !== 'MIGRATED')
    .forEach(d => console.log(`  - ${d.file} (${d.category})`));
}

// CSV形式でエクスポート
const csvPath = 'phase5-migration-report.csv';
const csvHeader = 'File,Category,Status,PresetImport,PresetCalls,MigrationComment,NoModuleClient,NoOldImport,NoApiV1Prefix\n';
const csvRows = results.details.map(d => {
  if (d.checks) {
    return `${d.file},${d.category},${d.status},${d.checks.hasPresetImport},${d.checks.hasCreatePresetCalls},${d.checks.hasMigrationComment},${!d.checks.hasModuleLevelClient},${!d.checks.hasOldImport},${!d.checks.hasApiV1Prefix}`;
  }
  return `${d.file},${d.category},${d.status},,,,,,,`;
}).join('\n');

fs.writeFileSync(csvPath, csvHeader + csvRows);
console.log(`\n詳細レポートを ${csvPath} に保存しました`);

// 終了コード
process.exit(results.failed > 0 ? 1 : 0);