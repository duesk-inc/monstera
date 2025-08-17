#!/usr/bin/env node

/**
 * Phase 3 移行テストスクリプト
 * 管理者機能の移行が正しく完了したか確認
 */

const fs = require('fs');
const path = require('path');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.bright}  APIクライアント Phase 3 移行テスト${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// 移行したファイルをチェック
const filesToCheck = [
  // 管理者APIモジュール
  'src/lib/api/admin/index.ts',
  // 管理者フック
  'src/hooks/admin/useExportJob.ts',
  'src/hooks/admin/useMonthlySummary.ts',
  'src/hooks/admin/useUnsubmittedReports.ts'
];

const results = [];

filesToCheck.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    results.push({
      file: filePath,
      status: 'ERROR',
      message: 'ファイルが存在しません'
    });
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // 新システムのインポートがあるか確認
  const hasNewImport = content.includes("import { createPresetApiClient") || 
                       content.includes("from '@/lib/api'") && content.includes("createPresetApiClient");
  
  // 旧システムのインポートが残っていないか確認
  const hasOldImport = (content.includes("import axios from") || 
                       content.includes("import apiClient from") ||
                       content.includes("import { apiClient } from")) && 
                       !content.includes("// Migrated");
  
  // APIクライアントの使用パターンを確認
  const usesNewClient = content.includes("createPresetApiClient('admin')") ||
                        content.includes("createPresetApiClient('auth')") ||
                        content.includes("adminClient");
  
  // 移行コメントの有無を確認
  const hasMigrationComment = content.includes("// Migrated to new API client system");
  
  const issues = [];
  
  if (!hasNewImport) {
    issues.push('新APIシステムのインポートが見つかりません');
  }
  
  if (hasOldImport) {
    issues.push('旧システムのインポートが残っています');
  }
  
  if (!usesNewClient) {
    issues.push('新APIクライアントの使用が見つかりません');
  }
  
  results.push({
    file: filePath,
    status: issues.length === 0 ? 'SUCCESS' : 'WARNING',
    message: issues.length === 0 ? '正常に移行されています' : issues.join(', '),
    hasNewImport,
    hasOldImport,
    usesNewClient,
    hasMigrationComment
  });
});

// 結果を表示
console.log(`${colors.bright}📋 移行チェック結果${colors.reset}\n`);

results.forEach(result => {
  const statusColor = result.status === 'SUCCESS' ? colors.green : 
                      result.status === 'WARNING' ? colors.yellow : colors.red;
  const statusIcon = result.status === 'SUCCESS' ? '✅' : 
                     result.status === 'WARNING' ? '⚠️' : '❌';
  
  console.log(`${statusIcon} ${colors.cyan}${result.file}${colors.reset}`);
  console.log(`  状態: ${statusColor}${result.status}${colors.reset}`);
  console.log(`  詳細: ${result.message}`);
  
  if (result.status !== 'ERROR') {
    console.log(`  - 新インポート: ${result.hasNewImport ? '✅' : '❌'}`);
    console.log(`  - 旧インポート残存: ${result.hasOldImport ? '❌' : '✅'}`);
    console.log(`  - 新クライアント使用: ${result.usesNewClient ? '✅' : '❌'}`);
    console.log(`  - 移行コメント: ${result.hasMigrationComment ? '✅' : '❌'}`);
  }
  console.log();
});

// サマリー
const successCount = results.filter(r => r.status === 'SUCCESS').length;
const warningCount = results.filter(r => r.status === 'WARNING').length;
const errorCount = results.filter(r => r.status === 'ERROR').length;

console.log(`${colors.bright}📊 サマリー${colors.reset}`);
console.log(`  成功: ${colors.green}${successCount}/${filesToCheck.length}${colors.reset}`);
console.log(`  警告: ${colors.yellow}${warningCount}/${filesToCheck.length}${colors.reset}`);
console.log(`  エラー: ${colors.red}${errorCount}/${filesToCheck.length}${colors.reset}`);

// 管理者API共通関数の確認
console.log(`\n${colors.bright}🔧 管理者API共通関数の確認${colors.reset}`);

const adminIndexPath = path.join(process.cwd(), 'src/lib/api/admin/index.ts');
if (fs.existsSync(adminIndexPath)) {
  const adminContent = fs.readFileSync(adminIndexPath, 'utf8');
  
  const functions = ['adminGet', 'adminPost', 'adminPut', 'adminDelete', 'adminDownload'];
  const exportedFunctions = functions.filter(fn => adminContent.includes(`export const ${fn}`));
  
  console.log(`  エクスポート関数: ${colors.cyan}${exportedFunctions.length}/${functions.length}${colors.reset}`);
  exportedFunctions.forEach(fn => {
    console.log(`    - ${colors.green}✅ ${fn}${colors.reset}`);
  });
  
  const missingFunctions = functions.filter(fn => !exportedFunctions.includes(fn));
  if (missingFunctions.length > 0) {
    console.log(`  ${colors.yellow}不足している関数:${colors.reset}`);
    missingFunctions.forEach(fn => {
      console.log(`    - ${colors.red}❌ ${fn}${colors.reset}`);
    });
  }
}

// 推奨事項
console.log(`\n${colors.bright}💡 次のステップ${colors.reset}`);

if (successCount === filesToCheck.length) {
  console.log(`  ${colors.green}✅ Phase 3の管理者機能移行が完了しました！${colors.reset}`);
  console.log(`\n  次の作業:`);
  console.log(`  1. ビルドとテストの実行`);
  console.log(`     ${colors.cyan}npm run build${colors.reset}`);
  console.log(`     ${colors.cyan}npm test${colors.reset}`);
  console.log(`  2. 管理者機能の動作確認`);
  console.log(`  3. Phase 4（ビジネスロジックモジュール）の移行を開始`);
} else {
  console.log(`  ${colors.yellow}⚠️  一部のファイルで移行が不完全です${colors.reset}`);
  console.log(`  上記の警告を確認して修正してください`);
}

// 進捗状況
console.log(`\n${colors.bright}📈 全体進捗状況${colors.reset}`);
const totalPhases = 7;
const completedPhases = 2.5; // Phase 1, 2完了、Phase 3進行中
const progress = Math.round((completedPhases / totalPhases) * 100);

console.log(`  完了フェーズ: ${colors.green}Phase 1, 2${colors.reset}`);
console.log(`  現在フェーズ: ${colors.yellow}Phase 3（管理者機能）${colors.reset}`);
console.log(`  進捗率: ${colors.cyan}${progress}%${colors.reset}`);

// プログレスバーの表示
const barLength = 30;
const filledLength = Math.round((progress / 100) * barLength);
const emptyLength = barLength - filledLength;
const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
console.log(`  [${colors.green}${progressBar}${colors.reset}] ${progress}%`);

console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// 終了コード
process.exit(successCount === filesToCheck.length ? 0 : 1);