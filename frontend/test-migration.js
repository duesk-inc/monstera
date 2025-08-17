#!/usr/bin/env node

/**
 * Phase 2 移行テストスクリプト
 * 移行済みのAPIモジュールが正しくインポート・使用できるか確認
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
console.log(`${colors.bright}  APIクライアント Phase 2 移行テスト${colors.reset}`);
console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// 移行したファイルをチェック
const filesToCheck = [
  'src/lib/api/profile.ts',
  'src/lib/api/user.ts', 
  'src/lib/api/notification.ts'
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
  const hasOldImport = content.includes("getAuthClient") && !content.includes("// Migrated");
  
  // APIクライアントの使用パターンを確認
  const usesNewClient = content.includes("createPresetApiClient('auth')") ||
                        content.includes("createPresetApiClient('admin')") ||
                        content.includes("createPresetApiClient('default')");
  
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
    usesNewClient
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

// Feature Flag設定の確認
console.log(`\n${colors.bright}🚩 Feature Flag設定${colors.reset}`);

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const useNewApi = envContent.includes('NEXT_PUBLIC_USE_NEW_API=true');
  const rolloutPercentage = envContent.match(/NEXT_PUBLIC_API_ROLLOUT_PERCENTAGE=(\d+)/);
  
  console.log(`  新API有効: ${useNewApi ? colors.green + '✅ 有効' : colors.yellow + '⚠️  無効'}${colors.reset}`);
  if (rolloutPercentage) {
    console.log(`  ロールアウト率: ${colors.cyan}${rolloutPercentage[1]}%${colors.reset}`);
  }
} else {
  console.log(`  ${colors.yellow}⚠️  .env.localファイルが見つかりません${colors.reset}`);
  console.log(`  ${colors.yellow}Feature Flagを有効にするには環境変数の設定が必要です${colors.reset}`);
}

// 推奨事項
console.log(`\n${colors.bright}💡 次のステップ${colors.reset}`);

if (successCount === filesToCheck.length) {
  console.log(`  ${colors.green}✅ Phase 2のコアモジュール移行が完了しました！${colors.reset}`);
  console.log(`\n  次の作業:`);
  console.log(`  1. Feature Flagを有効化して段階的ロールアウトを開始`);
  console.log(`     ${colors.cyan}NEXT_PUBLIC_USE_NEW_API=true${colors.reset}`);
  console.log(`     ${colors.cyan}NEXT_PUBLIC_API_ROLLOUT_PERCENTAGE=10${colors.reset}`);
  console.log(`  2. アプリケーションの動作確認`);
  console.log(`  3. Phase 3（管理者機能）の移行を開始`);
} else {
  console.log(`  ${colors.yellow}⚠️  一部のファイルで移行が不完全です${colors.reset}`);
  console.log(`  上記の警告を確認して修正してください`);
}

console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// 終了コード
process.exit(successCount === filesToCheck.length ? 0 : 1);