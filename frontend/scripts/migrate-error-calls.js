#!/usr/bin/env node

/**
 * DebugLogger.errorメソッドの旧形式を新形式に変換するスクリプト
 * 
 * 変換例:
 * Before: DebugLogger.error('CATEGORY', 'Failed to check limits', error)
 * After:  DebugLogger.error({ category: 'CATEGORY', operation: 'CheckLimits' }, 'Failed to check limits', error)
 */

const fs = require('fs');
const path = require('path');

// 操作名のマッピング（メッセージから操作名を推定）
const operationMapping = {
  // EXPENSE_LIMIT_API
  'Failed to check limits': 'CheckLimits',
  'Real-time check failed': 'RealtimeCheck',
  'Failed to get expense limits': 'GetLimits',
  'Failed to update expense limit': 'UpdateLimit',
  
  // EXPENSE_SUMMARY_API
  'Failed to get summary': 'GetSummary',
  'Failed to get yearly summary': 'GetYearlySummary',
  'Failed to get monthly summary': 'GetMonthlySummary',
  'Failed to get current summary': 'GetCurrentSummary',
  
  // ADMIN_EXPENSE_API
  'Failed to get pending approvals': 'GetPendingApprovals',
  'Failed to get expense detail': 'GetExpenseDetail',
  'Failed to approve expense': 'ApproveExpense',
  'Failed to reject expense': 'RejectExpense',
  'Failed to get approval statistics': 'GetStatistics',
  'Failed to get expense history': 'GetHistory',
  'Failed to bulk approve expenses': 'BulkApprove',
  'Failed to bulk reject expenses': 'BulkReject',
  'Failed to export CSV': 'ExportCSV',
  
  // EXPENSE_APPROVER_SETTING_API
  'Failed to get approver settings': 'GetSettings',
  'Failed to create approver setting': 'CreateSetting',
  'Failed to update approver setting': 'UpdateSetting',
  'Failed to delete approver setting': 'DeleteSetting',
  'Failed to get approver setting histories': 'GetHistories',
  
  // EXPENSE_APPROVER_ADMIN
  'Failed to create setting': 'CreateSetting',
  'Failed to update setting': 'UpdateSetting',
  'Failed to delete setting': 'DeleteSetting',
  
  // TEST
  'Test error': 'TestError'
};

// 操作名を推定する関数
function inferOperation(category, message) {
  // 完全一致を優先
  if (operationMapping[message]) {
    return operationMapping[message];
  }
  
  // キーワードベースの推定
  const lowerMessage = message.toLowerCase();
  const operations = {
    'check': 'Check',
    'get': 'Get',
    'fetch': 'Fetch',
    'create': 'Create',
    'add': 'Add',
    'update': 'Update',
    'edit': 'Edit',
    'delete': 'Delete',
    'remove': 'Remove',
    'approve': 'Approve',
    'reject': 'Reject',
    'export': 'Export',
    'import': 'Import',
    'bulk': 'Bulk',
    'failed': 'Process',
    'error': 'Error'
  };
  
  for (const [key, value] of Object.entries(operations)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }
  
  return 'Process'; // デフォルト
}

// ファイル変換関数
function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let changeCount = 0;
  
  // Pattern: DebugLogger.error('CATEGORY', 'message', error)
  // 引数の中のカンマやクォートも考慮した正規表現
  const regex = /DebugLogger\.error\(\s*(['"])([^'"]+)\1\s*,\s*(['"])([^'"]+)\3\s*(,\s*[^)]+)?\s*\)/g;
  
  content = content.replace(regex, (match, q1, category, q2, message, errorParam) => {
    modified = true;
    changeCount++;
    const operation = inferOperation(category, message);
    
    // エラーパラメータがある場合は、そのまま維持
    const errorPart = errorParam ? errorParam : '';
    
    return `DebugLogger.error({ category: '${category}', operation: '${operation}' }, '${message}'${errorPart})`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${path.basename(filePath)}: ${changeCount} changes`);
    return changeCount;
  }
  
  return 0;
}

// メイン処理
function main() {
  console.log('🔄 Starting DebugLogger.error migration...\n');
  
  // 対象ファイルのリスト
  const targetFiles = [
    'src/lib/api/expenseLimit.ts',
    'src/lib/api/expenseSummary.ts',
    'src/lib/api/adminExpense.ts',
    'src/lib/api/expenseApproverSetting.ts',
    'src/hooks/useExpenseApproverAdmin.ts',
    'src/lib/api/__tests__/debugLogger.test.ts'
  ];
  
  let totalChanges = 0;
  
  for (const file of targetFiles) {
    const fullPath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }
    
    const changes = migrateFile(fullPath);
    totalChanges += changes;
  }
  
  console.log(`\n✨ Migration complete! Total changes: ${totalChanges}`);
  
  if (totalChanges === 26) {
    console.log('✅ All expected changes applied successfully!');
  } else if (totalChanges > 0) {
    console.log(`⚠️  Applied ${totalChanges} changes (expected 26)`);
  } else {
    console.log('❌ No changes were made. Files may already be migrated.');
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { inferOperation, migrateFile };