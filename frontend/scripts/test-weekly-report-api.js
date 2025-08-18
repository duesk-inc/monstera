#!/usr/bin/env node

/**
 * 週報APIクライアントのテストスクリプト
 * APIクライアントの動作確認用
 */

const path = require('path');
const fs = require('fs');

// 週報APIクライアントの実装確認
console.log('=== 週報APIクライアント実装チェック ===\n');

// 1. AbortError インポート確認
const weeklyReportPath = path.join(__dirname, '../src/lib/api/weeklyReport.ts');
const weeklyReportContent = fs.readFileSync(weeklyReportPath, 'utf-8');

console.log('1. AbortError インポート確認:');
if (weeklyReportContent.includes("import { AbortError } from '@/lib/api/error';")) {
  console.log('   ✅ AbortError が正しくインポートされています');
} else {
  console.log('   ❌ AbortError のインポートが見つかりません');
}

console.log('\n2. APIパス確認:');

// calculateWorkHours のパス確認
const calculateWorkHoursMatch = weeklyReportContent.match(/client\.post\(['"`](.*?)['"`]/);
if (calculateWorkHoursMatch) {
  const path = calculateWorkHoursMatch[1];
  if (path === '/calculate-work-hours') {
    console.log('   ✅ calculateWorkHours: 正しいパス (' + path + ')');
  } else if (path.includes('API_VERSION')) {
    console.log('   ❌ calculateWorkHours: 不正なパス (' + path + ') - API_VERSIONを含む');
  } else {
    console.log('   ⚠️  calculateWorkHours: パス (' + path + ')');
  }
}

// getWeeklyReportByDateRange のパス確認
const dateRangeLines = weeklyReportContent.split('\n');
const dateRangeFuncStart = dateRangeLines.findIndex(line => 
  line.includes('export const getWeeklyReportByDateRange'));

if (dateRangeFuncStart !== -1) {
  const funcContent = dateRangeLines.slice(dateRangeFuncStart, dateRangeFuncStart + 50).join('\n');
  
  if (funcContent.includes('WEEKLY_REPORT_API.LIST')) {
    console.log('   ✅ getWeeklyReportByDateRange: 正しいパス (WEEKLY_REPORT_API.LIST)');
  } else if (funcContent.includes('/by-date-range')) {
    console.log('   ❌ getWeeklyReportByDateRange: 不正なパス (/by-date-range)');
  } else {
    console.log('   ⚠️  getWeeklyReportByDateRange: パスを確認してください');
  }
}

console.log('\n3. レスポンス形式処理確認:');

// リスト形式のレスポンス処理確認
if (weeklyReportContent.includes('data && data.reports && data.reports.length > 0')) {
  console.log('   ✅ リスト形式のレスポンス処理が実装されています');
} else {
  console.log('   ❌ リスト形式のレスポンス処理が見つかりません');
}

// 最初のレポート取得処理確認
if (weeklyReportContent.includes('data.reports[0]')) {
  console.log('   ✅ 最初のレポートを取得する処理が実装されています');
} else {
  console.log('   ❌ 最初のレポートを取得する処理が見つかりません');
}

console.log('\n4. createPresetApiClient使用確認:');

const clientCreationCount = (weeklyReportContent.match(/createPresetApiClient\(['"]auth['"]\)/g) || []).length;
console.log(`   ✅ createPresetApiClient('auth') が ${clientCreationCount} 箇所で使用されています`);

// 旧パターンのチェック
if (weeklyReportContent.includes('import apiClient from')) {
  console.log('   ❌ 警告: 旧シングルトンパターンが検出されました');
} else {
  console.log('   ✅ 旧シングルトンパターンは使用されていません');
}

console.log('\n5. エラーハンドリング確認:');

if (weeklyReportContent.includes('handleApiError')) {
  console.log('   ✅ handleApiError が使用されています');
} else {
  console.log('   ❌ handleApiError が使用されていません');
}

if (weeklyReportContent.includes('instanceof AbortError')) {
  console.log('   ✅ AbortError のインスタンスチェックが実装されています');
} else {
  console.log('   ⚠️  AbortError のインスタンスチェックが見つかりません');
}

// API定数ファイルの確認
console.log('\n6. API定数確認:');
const apiConstPath = path.join(__dirname, '../src/constants/api.ts');
const apiConstContent = fs.readFileSync(apiConstPath, 'utf-8');

if (apiConstContent.includes('WEEKLY_REPORT_API')) {
  console.log('   ✅ WEEKLY_REPORT_API 定数が定義されています');
  
  // 各エンドポイントの確認
  const endpoints = ['BASE', 'CREATE', 'UPDATE', 'LIST', 'DETAIL', 'SUBMIT', 'TEMPLATE'];
  endpoints.forEach(endpoint => {
    if (apiConstContent.includes(`${endpoint}:`)) {
      console.log(`   ✅ ${endpoint} エンドポイントが定義されています`);
    }
  });
} else {
  console.log('   ❌ WEEKLY_REPORT_API 定数が見つかりません');
}

console.log('\n=== チェック完了 ===');

// 問題があった場合は終了コード1で終了
const hasErrors = weeklyReportContent.includes('/api/v1/api/v1') || 
                 weeklyReportContent.includes('/by-date-range') ||
                 !weeklyReportContent.includes("import { AbortError }");

if (hasErrors) {
  console.log('\n⚠️  いくつかの問題が検出されました。修正が必要です。');
  process.exit(1);
} else {
  console.log('\n✅ すべてのチェックが正常に完了しました。');
  process.exit(0);
}