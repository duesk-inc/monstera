#!/usr/bin/env node

/**
 * APIインポートパス統一テスト
 * 
 * このスクリプトは、インポートパスの統一が正しく動作することを確認します。
 */

const fs = require('fs');
const path = require('path');

console.log('=== APIインポートパス統一テスト ===\n');

// テスト対象のインポートパターン
const importPatterns = [
  { 
    pattern: "import apiClient from '@/lib/api'",
    description: 'デフォルトインポート（推奨）'
  },
  {
    pattern: "import { apiClient } from '@/lib/api'",
    description: '名前付きインポート'
  },
  {
    pattern: "import { getAuthClient } from '@/lib/api'",
    description: 'getAuthClient関数'
  },
  {
    pattern: "import { handleApiError } from '@/lib/api'",
    description: 'エラーハンドリング関数'
  }
];

// テスト用の一時ファイルを作成
function createTestFile(pattern) {
  const testContent = `
${pattern.pattern};

// テスト: APIクライアントが正しくインポートされているか確認
if (typeof apiClient !== 'undefined' || typeof getAuthClient !== 'undefined') {
  console.log('✅ インポート成功: ${pattern.description}');
} else {
  console.log('❌ インポート失敗: ${pattern.description}');
}
`;
  
  const filename = `/tmp/test-import-${Date.now()}.ts`;
  fs.writeFileSync(filename, testContent);
  return filename;
}

// ビルドテスト
function testBuild() {
  console.log('1. ビルドテスト\n');
  
  const testFile = path.join(__dirname, 'src/test-import-validation.ts');
  const testContent = `
// APIインポートパス統一テスト
import apiClient from '@/lib/api';
import { getAuthClient, handleApiError } from '@/lib/api';

export function testApiImport() {
  // APIクライアントの存在確認
  if (!apiClient) {
    throw new Error('apiClient is not defined');
  }
  
  // getAuthClient関数の存在確認
  if (typeof getAuthClient !== 'function') {
    throw new Error('getAuthClient is not a function');
  }
  
  // handleApiError関数の存在確認
  if (typeof handleApiError !== 'function') {
    throw new Error('handleApiError is not a function');
  }
  
  console.log('✅ すべてのインポートが正しく動作しています');
  return true;
}
`;
  
  try {
    fs.writeFileSync(testFile, testContent);
    console.log('✅ テストファイル作成成功:', testFile);
  } catch (error) {
    console.log('❌ テストファイル作成失敗:', error.message);
  }
}

// インポートパスの統計
function analyzeImports() {
  console.log('\n2. インポートパス統計\n');
  
  const srcDir = path.join(__dirname, 'src');
  let stats = {
    '@/lib/axios': 0,
    '@/lib/api': 0,
    '@/lib/api/client': 0,
    '@/lib/api/config': 0,
    total: 0
  };
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes("from '@/lib/axios'")) {
          stats['@/lib/axios']++;
        }
        if (content.includes("from '@/lib/api'") && !content.includes("from '@/lib/api/")) {
          stats['@/lib/api']++;
        }
        if (content.includes("from '@/lib/api/client'")) {
          stats['@/lib/api/client']++;
        }
        if (content.includes("from '@/lib/api/config'")) {
          stats['@/lib/api/config']++;
        }
        
        if (content.includes("from '@/lib/")) {
          stats.total++;
        }
      }
    });
  }
  
  try {
    scanDirectory(srcDir);
    
    console.log('インポートパス使用状況:');
    console.log('------------------------');
    Object.keys(stats).forEach(key => {
      if (key !== 'total') {
        console.log(`${key}: ${stats[key]}ファイル`);
      }
    });
    console.log('------------------------');
    console.log(`合計: ${stats.total}ファイル`);
    
    // 統一前の状態を保存
    fs.writeFileSync(
      path.join(__dirname, 'import-stats-before.json'),
      JSON.stringify(stats, null, 2)
    );
    console.log('\n統計をimport-stats-before.jsonに保存しました');
  } catch (error) {
    console.log('❌ インポート分析失敗:', error.message);
  }
}

// メイン実行
function main() {
  testBuild();
  analyzeImports();
  
  console.log('\n=== テスト完了 ===\n');
  console.log('次のステップ:');
  console.log('1. npm run build でビルドテストを実行');
  console.log('2. 一括置換スクリプトを実行してインポートパスを統一');
}

main();