#!/usr/bin/env node

/**
 * APIクライアント使用パターン分析スクリプト
 * 
 * 使用方法:
 * node scripts/analyze-api-usage.js
 * 
 * 出力:
 * - 使用パターンの統計
 * - 移行が必要なファイルリスト
 * - 推定作業量
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 統計情報
const stats = {
  totalFiles: 0,
  filesNeedingMigration: 0,
  patterns: {
    defaultImport: 0,        // import apiClient from '@/lib/api'
    namedImport: 0,          // import { apiClient } from '@/lib/api'
    getAuthClient: 0,        // import { getAuthClient } from '@/lib/api'
    submoduleImport: 0,      // import { ... } from '@/lib/api/xxx'
    factoryImport: 0,        // import { createPresetApiClient } from '@/lib/api/factory'
  },
  apiCalls: {
    get: 0,
    post: 0,
    put: 0,
    delete: 0,
    patch: 0,
  },
  presetTypes: {
    auth: 0,
    admin: 0,
    public: 0,
    upload: 0,
    batch: 0,
    realtime: 0,
    default: 0,
  },
  filesByDirectory: {},
  errorPatterns: [],
};

// ファイルリスト
const filesToMigrate = [];
const alreadyMigrated = [];

/**
 * ファイルを分析
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  stats.totalFiles++;
  
  // インポートパターンを検索
  const importPatterns = [
    {
      pattern: /import\s+apiClient\s+from\s+['"]@\/lib\/api['"]/g,
      type: 'defaultImport',
    },
    {
      pattern: /import\s+\{\s*apiClient\s*\}\s+from\s+['"]@\/lib\/api['"]/g,
      type: 'namedImport',
    },
    {
      pattern: /import\s+\{\s*getAuthClient\s*\}\s+from\s+['"]@\/lib\/api['"]/g,
      type: 'getAuthClient',
    },
    {
      pattern: /import\s+.*\s+from\s+['"]@\/lib\/api\/[^'"]+['"]/g,
      type: 'submoduleImport',
    },
    {
      pattern: /import\s+\{\s*createPresetApiClient\s*\}\s+from\s+['"]@\/lib\/api['"]/g,
      type: 'factoryImport',
    },
  ];
  
  let needsMigration = false;
  const foundPatterns = [];
  
  importPatterns.forEach(({ pattern, type }) => {
    const matches = content.match(pattern);
    if (matches) {
      stats.patterns[type] += matches.length;
      if (type !== 'factoryImport') {
        needsMigration = true;
        foundPatterns.push(type);
      } else {
        // すでに新システムを使用
        alreadyMigrated.push(relativePath);
      }
    }
  });
  
  // API呼び出しパターンを検索
  const apiCallPatterns = [
    { pattern: /apiClient\.get\(/g, method: 'get' },
    { pattern: /apiClient\.post\(/g, method: 'post' },
    { pattern: /apiClient\.put\(/g, method: 'put' },
    { pattern: /apiClient\.delete\(/g, method: 'delete' },
    { pattern: /apiClient\.patch\(/g, method: 'patch' },
    { pattern: /getAuthClient\(\)\.get\(/g, method: 'get' },
    { pattern: /getAuthClient\(\)\.post\(/g, method: 'post' },
    { pattern: /getAuthClient\(\)\.put\(/g, method: 'put' },
    { pattern: /getAuthClient\(\)\.delete\(/g, method: 'delete' },
    { pattern: /getAuthClient\(\)\.patch\(/g, method: 'patch' },
  ];
  
  apiCallPatterns.forEach(({ pattern, method }) => {
    const matches = content.match(pattern);
    if (matches) {
      stats.apiCalls[method] += matches.length;
    }
  });
  
  // プリセットタイプを推定
  let estimatedPreset = 'default';
  if (relativePath.includes('/admin/')) {
    estimatedPreset = 'admin';
  } else if (relativePath.includes('/auth/')) {
    estimatedPreset = 'auth';
  } else if (content.includes('multipart/form-data') || content.includes('upload')) {
    estimatedPreset = 'upload';
  } else if (content.includes('/api/v1/admin')) {
    estimatedPreset = 'admin';
  } else if (content.includes('/api/v1/auth')) {
    estimatedPreset = 'auth';
  } else if (content.includes('withCredentials: false')) {
    estimatedPreset = 'public';
  }
  
  stats.presetTypes[estimatedPreset]++;
  
  // ディレクトリ別統計
  const dir = path.dirname(relativePath);
  if (!stats.filesByDirectory[dir]) {
    stats.filesByDirectory[dir] = 0;
  }
  stats.filesByDirectory[dir]++;
  
  // 移行が必要なファイルを記録
  if (needsMigration) {
    stats.filesNeedingMigration++;
    filesToMigrate.push({
      path: relativePath,
      patterns: foundPatterns,
      estimatedPreset,
      apiCalls: Object.entries(stats.apiCalls).filter(([_, count]) => count > 0).map(([method]) => method),
    });
  }
  
  // エラーパターンを検出
  if (content.includes('axios.create')) {
    stats.errorPatterns.push({
      file: relativePath,
      issue: 'Direct axios.create usage',
    });
  }
  
  if (content.includes('apiClient.defaults')) {
    stats.errorPatterns.push({
      file: relativePath,
      issue: 'Direct modification of apiClient.defaults',
    });
  }
}

/**
 * 結果を表示
 */
function displayResults() {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  APIクライアント使用パターン分析結果${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  // サマリー
  console.log(`${colors.bright}📊 サマリー${colors.reset}`);
  console.log(`  総ファイル数: ${colors.yellow}${stats.totalFiles}${colors.reset}`);
  console.log(`  移行が必要: ${colors.red}${stats.filesNeedingMigration}${colors.reset}`);
  console.log(`  移行済み: ${colors.green}${alreadyMigrated.length}${colors.reset}`);
  console.log(`  進捗率: ${colors.blue}${((alreadyMigrated.length / stats.totalFiles) * 100).toFixed(1)}%${colors.reset}\n`);
  
  // インポートパターン
  console.log(`${colors.bright}📦 インポートパターン${colors.reset}`);
  Object.entries(stats.patterns).forEach(([pattern, count]) => {
    if (count > 0) {
      const emoji = pattern === 'factoryImport' ? '✅' : '⚠️';
      console.log(`  ${emoji} ${pattern}: ${count}`);
    }
  });
  console.log();
  
  // API呼び出し統計
  console.log(`${colors.bright}🔄 API呼び出し統計${colors.reset}`);
  Object.entries(stats.apiCalls).forEach(([method, count]) => {
    if (count > 0) {
      console.log(`  ${method.toUpperCase()}: ${count}`);
    }
  });
  console.log();
  
  // 推定プリセットタイプ
  console.log(`${colors.bright}🎯 推定プリセットタイプ${colors.reset}`);
  Object.entries(stats.presetTypes).forEach(([preset, count]) => {
    if (count > 0) {
      console.log(`  ${preset}: ${count}`);
    }
  });
  console.log();
  
  // ディレクトリ別
  console.log(`${colors.bright}📁 ディレクトリ別ファイル数（上位10）${colors.reset}`);
  const sortedDirs = Object.entries(stats.filesByDirectory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  sortedDirs.forEach(([dir, count]) => {
    console.log(`  ${dir}: ${count}`);
  });
  console.log();
  
  // エラーパターン
  if (stats.errorPatterns.length > 0) {
    console.log(`${colors.bright}${colors.red}⚠️  要注意パターン${colors.reset}`);
    stats.errorPatterns.forEach(({ file, issue }) => {
      console.log(`  ${colors.yellow}${file}${colors.reset}: ${issue}`);
    });
    console.log();
  }
  
  // 移行が必要なファイル（上位20）
  console.log(`${colors.bright}📝 移行が必要なファイル（上位20）${colors.reset}`);
  filesToMigrate.slice(0, 20).forEach(({ path: filePath, patterns, estimatedPreset }) => {
    console.log(`  ${colors.yellow}${filePath}${colors.reset}`);
    console.log(`    パターン: ${patterns.join(', ')}`);
    console.log(`    推定プリセット: ${estimatedPreset}`);
  });
  
  if (filesToMigrate.length > 20) {
    console.log(`  ${colors.cyan}... 他 ${filesToMigrate.length - 20} ファイル${colors.reset}`);
  }
  console.log();
  
  // 推定作業量
  console.log(`${colors.bright}⏱️  推定作業量${colors.reset}`);
  const estimatedMinutes = stats.filesNeedingMigration * 2; // 1ファイル2分と仮定
  const estimatedHours = Math.ceil(estimatedMinutes / 60);
  console.log(`  自動移行（スクリプト使用）: ${colors.green}約10分${colors.reset}`);
  console.log(`  手動確認・テスト: ${colors.yellow}約${estimatedHours}時間${colors.reset}`);
  console.log(`  合計: ${colors.blue}約${estimatedHours + 0.5}時間${colors.reset}\n`);
  
  // 推奨事項
  console.log(`${colors.bright}💡 推奨事項${colors.reset}`);
  console.log(`  1. まず ${colors.yellow}scripts/migrate-api-client.js${colors.reset} でドライランを実行`);
  console.log(`  2. 変更内容を確認後、実際に適用`);
  console.log(`  3. 各ディレクトリごとに段階的に移行`);
  console.log(`  4. テストを実行して動作確認`);
  console.log();
  
  // CSVエクスポート
  const csvPath = 'api-migration-files.csv';
  const csv = [
    'File,Patterns,EstimatedPreset,APICalls',
    ...filesToMigrate.map(({ path: p, patterns, estimatedPreset, apiCalls }) => 
      `"${p}","${patterns.join(',')}","${estimatedPreset}","${apiCalls.join(',')}"`
    ),
  ].join('\n');
  
  fs.writeFileSync(csvPath, csv);
  console.log(`${colors.green}✅ 詳細リストを ${csvPath} に出力しました${colors.reset}\n`);
}

/**
 * メイン処理
 */
function main() {
  console.log(`${colors.bright}🔍 APIクライアント使用パターンを分析中...${colors.reset}\n`);
  
  // TypeScriptとTypeScript Reactファイルを検索
  const patterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
  ];
  
  const files = [];
  patterns.forEach(pattern => {
    const matched = glob.sync(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/__tests__/**',
        '**/dist/**',
        '**/build/**',
      ],
    });
    files.push(...matched);
  });
  
  // 各ファイルを分析
  files.forEach(file => {
    try {
      analyzeFile(file);
    } catch (error) {
      console.error(`${colors.red}エラー: ${file} の分析中にエラーが発生しました${colors.reset}`);
      console.error(error.message);
    }
  });
  
  // 結果を表示
  displayResults();
}

// 実行
main();