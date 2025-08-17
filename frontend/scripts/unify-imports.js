#!/usr/bin/env node

/**
 * APIインポートパス統一スクリプト
 * 
 * すべてのAPIクライアント関連のインポートを @/lib/api に統一します。
 * 
 * 使用方法:
 * - ドライラン: node scripts/unify-imports.js --dry-run
 * - 実行: node scripts/unify-imports.js --execute
 * - バックアップ付き実行: node scripts/unify-imports.js --execute --backup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');
const createBackup = args.includes('--backup');

if (!isDryRun && !isExecute) {
  console.log('使用方法:');
  console.log('  ドライラン: node scripts/unify-imports.js --dry-run');
  console.log('  実行: node scripts/unify-imports.js --execute');
  console.log('  バックアップ付き実行: node scripts/unify-imports.js --execute --backup');
  process.exit(1);
}

// 置換ルール
const replacementRules = [
  // Pattern 1: @/lib/axios のデフォルトインポート
  {
    pattern: /import\s+apiClient\s+from\s+['"]@\/lib\/axios['"]/g,
    replacement: "import apiClient from '@/lib/api'",
    description: '@/lib/axios → @/lib/api (default)'
  },
  // Pattern 2: @/lib/axios の名前付きインポート
  {
    pattern: /import\s*\{\s*apiClient\s*\}\s*from\s+['"]@\/lib\/axios['"]/g,
    replacement: "import { apiClient } from '@/lib/api'",
    description: '@/lib/axios → @/lib/api (named)'
  },
  // Pattern 3: @/lib/api/client からのインポート
  {
    pattern: /import\s*\{([^}]+)\}\s*from\s+['"]@\/lib\/api\/client['"]/g,
    replacement: "import {$1} from '@/lib/api'",
    description: '@/lib/api/client → @/lib/api'
  },
  // Pattern 4: @/lib/api/config からのインポート
  {
    pattern: /import\s*\{([^}]+)\}\s*from\s+['"]@\/lib\/api\/config['"]/g,
    replacement: "import {$1} from '@/lib/api'",
    description: '@/lib/api/config → @/lib/api'
  },
  // Pattern 5: apiClient as alias
  {
    pattern: /import\s*\{\s*apiClient\s+as\s+(\w+)\s*\}\s*from\s+['"]@\/lib\/axios['"]/g,
    replacement: "import { apiClient as $1 } from '@/lib/api'",
    description: '@/lib/axios (alias) → @/lib/api'
  },
  // Pattern 6: 複数のインポート from @/lib/api/config
  {
    pattern: /import\s*\{\s*apiClient\s*,\s*([^}]+)\}\s*from\s+['"]@\/lib\/api\/config['"]/g,
    replacement: "import { apiClient, $1} from '@/lib/api'",
    description: '@/lib/api/config (multiple) → @/lib/api'
  }
];

// 統計情報
let stats = {
  filesScanned: 0,
  filesModified: 0,
  replacements: 0,
  errors: [],
  modifiedFiles: []
};

// バックアップディレクトリの作成
function createBackupDir() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', `backup-${timestamp}`);
  
  if (createBackup && isExecute) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`✅ バックアップディレクトリ作成: ${backupDir}`);
    return backupDir;
  }
  return null;
}

// ファイルの処理
function processFile(filePath, backupDir) {
  stats.filesScanned++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileModified = false;
    let fileReplacements = [];
    
    // 各置換ルールを適用
    replacementRules.forEach(rule => {
      const matches = content.match(rule.pattern);
      if (matches) {
        content = content.replace(rule.pattern, rule.replacement);
        fileModified = true;
        fileReplacements.push({
          rule: rule.description,
          count: matches.length
        });
        stats.replacements += matches.length;
      }
    });
    
    if (fileModified) {
      stats.filesModified++;
      stats.modifiedFiles.push({
        path: filePath,
        replacements: fileReplacements
      });
      
      if (isDryRun) {
        console.log(`\n📝 ${filePath}`);
        fileReplacements.forEach(r => {
          console.log(`   - ${r.rule} (${r.count}件)`);
        });
      } else if (isExecute) {
        // バックアップの作成
        if (backupDir) {
          const relativePath = path.relative(path.join(__dirname, '..'), filePath);
          const backupPath = path.join(backupDir, relativePath);
          const backupFileDir = path.dirname(backupPath);
          
          fs.mkdirSync(backupFileDir, { recursive: true });
          fs.writeFileSync(backupPath, originalContent);
        }
        
        // ファイルの更新
        fs.writeFileSync(filePath, content);
        console.log(`✅ 更新: ${filePath}`);
      }
    }
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
  }
}

// ディレクトリの再帰的スキャン
function scanDirectory(dir, backupDir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // 除外するディレクトリ
    const excludeDirs = ['.next', 'node_modules', '.git', 'coverage', 'dist', 'build'];
    
    if (stat.isDirectory() && !excludeDirs.includes(file)) {
      scanDirectory(filePath, backupDir);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      // /lib/api/index.ts 自体は除外
      if (!filePath.endsWith('lib/api/index.ts')) {
        processFile(filePath, backupDir);
      }
    }
  });
}

// メイン処理
function main() {
  console.log('=== APIインポートパス統一スクリプト ===\n');
  console.log(`モード: ${isDryRun ? 'ドライラン' : '実行'}`);
  if (createBackup && isExecute) {
    console.log('バックアップ: 有効');
  }
  console.log('');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const backupDir = createBackupDir();
  
  // 処理開始
  const startTime = Date.now();
  scanDirectory(srcDir, backupDir);
  const endTime = Date.now();
  
  // 結果の表示
  console.log('\n=== 処理結果 ===\n');
  console.log(`スキャンしたファイル: ${stats.filesScanned}`);
  console.log(`変更されたファイル: ${stats.filesModified}`);
  console.log(`置換件数: ${stats.replacements}`);
  console.log(`処理時間: ${(endTime - startTime) / 1000}秒`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  エラー:');
    stats.errors.forEach(e => {
      console.log(`  - ${e.file}: ${e.error}`);
    });
  }
  
  // 統計の保存
  if (isExecute) {
    const statsFile = path.join(__dirname, '..', 'import-unification-report.json');
    fs.writeFileSync(statsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      mode: 'execute',
      stats: stats
    }, null, 2));
    console.log(`\n📊 詳細レポート: ${statsFile}`);
  }
  
  // 次のステップの案内
  if (isDryRun) {
    console.log('\n次のステップ:');
    console.log('1. 変更内容を確認');
    console.log('2. 問題なければ: node scripts/unify-imports.js --execute');
    console.log('3. バックアップが必要な場合: node scripts/unify-imports.js --execute --backup');
  } else if (isExecute) {
    console.log('\n次のステップ:');
    console.log('1. npm run build でビルドテスト');
    console.log('2. npm run dev で動作確認');
    console.log('3. git diff で変更確認');
    console.log('4. 問題があればバックアップから復元');
  }
}

// 実行
main();