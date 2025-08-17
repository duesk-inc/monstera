#!/usr/bin/env node

/**
 * APIクライアント移行前のベースラインメトリクス測定
 * 
 * 使用方法:
 * npm test -- --coverage
 * npm run build
 * node scripts/measure-baseline.js
 * 
 * 出力:
 * - docs/migration/baseline-metrics.json
 * - docs/migration/baseline-report.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// メトリクス格納用
const metrics = {
  timestamp: new Date().toISOString(),
  codeMetrics: {},
  testMetrics: {},
  buildMetrics: {},
  performanceMetrics: {},
  dependencies: {},
};

/**
 * コマンドを実行して結果を取得
 */
function runCommand(command, silent = false) {
  try {
    if (!silent) {
      console.log(`${colors.cyan}実行中: ${command}${colors.reset}`);
    }
    const output = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return output;
  } catch (error) {
    console.error(`${colors.red}エラー: ${command} の実行に失敗しました${colors.reset}`);
    return null;
  }
}

/**
 * ファイルサイズを取得
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * ディレクトリサイズを取得
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        if (!item.startsWith('.') && item !== 'node_modules') {
          calculateSize(path.join(currentPath, item));
        }
      });
    }
  }
  
  try {
    calculateSize(dirPath);
    return totalSize;
  } catch {
    return 0;
  }
}

/**
 * コードメトリクスを測定
 */
function measureCodeMetrics() {
  console.log(`\n${colors.bright}📊 コードメトリクスを測定中...${colors.reset}`);
  
  // ファイル数をカウント
  const tsFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | wc -l', { encoding: 'utf8' }).trim();
  const apiFiles = execSync('find src -path "*/api/*" -name "*.ts" -o -name "*.tsx" | wc -l', { encoding: 'utf8' }).trim();
  
  // 行数をカウント
  const totalLines = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1', { encoding: 'utf8' })
    .trim()
    .split(/\s+/)[0];
  
  // APIクライアント使用箇所をカウント
  const apiImports = execSync('grep -r "from.*@/lib/api" src --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' }).trim();
  
  metrics.codeMetrics = {
    totalFiles: parseInt(tsFiles),
    apiFiles: parseInt(apiFiles),
    totalLines: parseInt(totalLines),
    apiImports: parseInt(apiImports),
    srcSize: getDirectorySize('src'),
  };
  
  console.log(`  ファイル数: ${colors.yellow}${metrics.codeMetrics.totalFiles}${colors.reset}`);
  console.log(`  APIファイル数: ${colors.yellow}${metrics.codeMetrics.apiFiles}${colors.reset}`);
  console.log(`  総行数: ${colors.yellow}${metrics.codeMetrics.totalLines}${colors.reset}`);
  console.log(`  APIインポート数: ${colors.yellow}${metrics.codeMetrics.apiImports}${colors.reset}`);
}

/**
 * テストメトリクスを測定
 */
function measureTestMetrics() {
  console.log(`\n${colors.bright}🧪 テストメトリクスを測定中...${colors.reset}`);
  
  // テストカバレッジを取得
  console.log('  テストを実行中...');
  const coverageOutput = runCommand('npm test -- --coverage --silent 2>&1', true);
  
  if (coverageOutput) {
    // カバレッジ情報を抽出
    const coverageMatch = coverageOutput.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|/);
    if (coverageMatch) {
      const coverageParts = coverageMatch[0].split('|').map(s => s.trim());
      if (coverageParts.length >= 5) {
        metrics.testMetrics = {
          statements: parseFloat(coverageParts[1]) || 0,
          branches: parseFloat(coverageParts[2]) || 0,
          functions: parseFloat(coverageParts[3]) || 0,
          lines: parseFloat(coverageParts[4]) || 0,
        };
      }
    }
    
    // テスト数を取得
    const testMatch = coverageOutput.match(/(\d+) passed/);
    if (testMatch) {
      metrics.testMetrics.totalTests = parseInt(testMatch[1]);
    }
  }
  
  // カバレッジレポートが存在する場合
  if (fs.existsSync('coverage/coverage-summary.json')) {
    try {
      const coverageSummary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
      metrics.testMetrics = {
        statements: coverageSummary.total.statements.pct,
        branches: coverageSummary.total.branches.pct,
        functions: coverageSummary.total.functions.pct,
        lines: coverageSummary.total.lines.pct,
        totalTests: metrics.testMetrics.totalTests || 0,
      };
    } catch (error) {
      console.log(`  ${colors.yellow}カバレッジサマリーの読み込みに失敗${colors.reset}`);
    }
  }
  
  console.log(`  ステートメント: ${colors.yellow}${metrics.testMetrics.statements || 'N/A'}%${colors.reset}`);
  console.log(`  ブランチ: ${colors.yellow}${metrics.testMetrics.branches || 'N/A'}%${colors.reset}`);
  console.log(`  関数: ${colors.yellow}${metrics.testMetrics.functions || 'N/A'}%${colors.reset}`);
  console.log(`  行: ${colors.yellow}${metrics.testMetrics.lines || 'N/A'}%${colors.reset}`);
}

/**
 * ビルドメトリクスを測定
 */
function measureBuildMetrics() {
  console.log(`\n${colors.bright}🔨 ビルドメトリクスを測定中...${colors.reset}`);
  
  // ビルドを実行
  console.log('  ビルドを実行中...');
  const startTime = Date.now();
  const buildOutput = runCommand('npm run build 2>&1', true);
  const buildTime = Date.now() - startTime;
  
  metrics.buildMetrics.buildTime = buildTime;
  
  // ビルドサイズを測定
  if (fs.existsSync('.next')) {
    metrics.buildMetrics.nextBuildSize = getDirectorySize('.next');
    
    // スタティックファイルのサイズ
    if (fs.existsSync('.next/static')) {
      metrics.buildMetrics.staticSize = getDirectorySize('.next/static');
    }
    
    // サーバーファイルのサイズ
    if (fs.existsSync('.next/server')) {
      metrics.buildMetrics.serverSize = getDirectorySize('.next/server');
    }
  }
  
  // バンドル分析
  if (buildOutput) {
    // First Load JSサイズを抽出
    const firstLoadMatch = buildOutput.match(/First Load JS shared by all\s+([0-9.]+\s*[kKmM]B)/);
    if (firstLoadMatch) {
      metrics.buildMetrics.firstLoadJS = firstLoadMatch[1];
    }
    
    // ページ数を抽出
    const pagesMatch = buildOutput.match(/(\d+)\s+pages/);
    if (pagesMatch) {
      metrics.buildMetrics.totalPages = parseInt(pagesMatch[1]);
    }
  }
  
  console.log(`  ビルド時間: ${colors.yellow}${(buildTime / 1000).toFixed(2)}秒${colors.reset}`);
  console.log(`  ビルドサイズ: ${colors.yellow}${((metrics.buildMetrics.nextBuildSize || 0) / 1024 / 1024).toFixed(2)}MB${colors.reset}`);
  console.log(`  First Load JS: ${colors.yellow}${metrics.buildMetrics.firstLoadJS || 'N/A'}${colors.reset}`);
}

/**
 * パフォーマンスメトリクスを測定（簡易版）
 */
function measurePerformanceMetrics() {
  console.log(`\n${colors.bright}⚡ パフォーマンスメトリクスを測定中...${colors.reset}`);
  
  // APIクライアントのインポート時間を測定
  const measureScript = `
    const start = Date.now();
    require('../src/lib/api');
    const importTime = Date.now() - start;
    console.log(importTime);
  `;
  
  fs.writeFileSync('scripts/measure-import.js', measureScript);
  
  try {
    const importTime = runCommand('node scripts/measure-import.js', true);
    if (importTime) {
      metrics.performanceMetrics.apiClientImportTime = parseInt(importTime.trim());
    }
  } catch {
    console.log(`  ${colors.yellow}インポート時間の測定に失敗${colors.reset}`);
  } finally {
    // 一時ファイルを削除
    if (fs.existsSync('scripts/measure-import.js')) {
      fs.unlinkSync('scripts/measure-import.js');
    }
  }
  
  // メモリ使用量
  const memUsage = process.memoryUsage();
  metrics.performanceMetrics.memoryUsage = {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
  };
  
  console.log(`  APIクライアントインポート時間: ${colors.yellow}${metrics.performanceMetrics.apiClientImportTime || 'N/A'}ms${colors.reset}`);
  console.log(`  メモリ使用量: ${colors.yellow}${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB${colors.reset}`);
}

/**
 * 依存関係を分析
 */
function analyzeDependencies() {
  console.log(`\n${colors.bright}📦 依存関係を分析中...${colors.reset}`);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    metrics.dependencies = {
      total: Object.keys(packageJson.dependencies || {}).length,
      dev: Object.keys(packageJson.devDependencies || {}).length,
      apiRelated: [],
    };
    
    // API関連の依存関係を抽出
    const apiRelatedDeps = ['axios', 'swr', '@tanstack/react-query'];
    apiRelatedDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        metrics.dependencies.apiRelated.push({
          name: dep,
          version: packageJson.dependencies[dep],
        });
      }
    });
    
    console.log(`  依存関係数: ${colors.yellow}${metrics.dependencies.total}${colors.reset}`);
    console.log(`  開発依存関係数: ${colors.yellow}${metrics.dependencies.dev}${colors.reset}`);
    console.log(`  API関連: ${colors.yellow}${metrics.dependencies.apiRelated.length}${colors.reset}`);
  } catch (error) {
    console.log(`  ${colors.red}package.jsonの読み込みに失敗${colors.reset}`);
  }
}

/**
 * レポートを生成
 */
function generateReport() {
  console.log(`\n${colors.bright}📝 レポートを生成中...${colors.reset}`);
  
  // ディレクトリを作成
  if (!fs.existsSync('docs/migration')) {
    fs.mkdirSync('docs/migration', { recursive: true });
  }
  
  // JSONファイルに保存
  const jsonPath = 'docs/migration/baseline-metrics.json';
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
  console.log(`  ${colors.green}✅ ${jsonPath} に保存しました${colors.reset}`);
  
  // Markdownレポートを生成
  const mdPath = 'docs/migration/baseline-report.md';
  const mdContent = `# APIクライアント移行 ベースラインメトリクス

**測定日時**: ${metrics.timestamp}

## 📊 コードメトリクス

| メトリクス | 値 |
|-----------|-----|
| 総ファイル数 | ${metrics.codeMetrics.totalFiles} |
| APIファイル数 | ${metrics.codeMetrics.apiFiles} |
| 総行数 | ${metrics.codeMetrics.totalLines} |
| APIインポート数 | ${metrics.codeMetrics.apiImports} |
| srcディレクトリサイズ | ${(metrics.codeMetrics.srcSize / 1024 / 1024).toFixed(2)}MB |

## 🧪 テストメトリクス

| カバレッジ | 値 |
|-----------|-----|
| ステートメント | ${metrics.testMetrics.statements || 'N/A'}% |
| ブランチ | ${metrics.testMetrics.branches || 'N/A'}% |
| 関数 | ${metrics.testMetrics.functions || 'N/A'}% |
| 行 | ${metrics.testMetrics.lines || 'N/A'}% |
| 総テスト数 | ${metrics.testMetrics.totalTests || 'N/A'} |

## 🔨 ビルドメトリクス

| メトリクス | 値 |
|-----------|-----|
| ビルド時間 | ${((metrics.buildMetrics.buildTime || 0) / 1000).toFixed(2)}秒 |
| ビルドサイズ | ${((metrics.buildMetrics.nextBuildSize || 0) / 1024 / 1024).toFixed(2)}MB |
| First Load JS | ${metrics.buildMetrics.firstLoadJS || 'N/A'} |
| 総ページ数 | ${metrics.buildMetrics.totalPages || 'N/A'} |

## ⚡ パフォーマンスメトリクス

| メトリクス | 値 |
|-----------|-----|
| APIクライアントインポート時間 | ${metrics.performanceMetrics.apiClientImportTime || 'N/A'}ms |
| ヒープ使用量 | ${((metrics.performanceMetrics.memoryUsage?.heapUsed || 0) / 1024 / 1024).toFixed(2)}MB |
| ヒープ総量 | ${((metrics.performanceMetrics.memoryUsage?.heapTotal || 0) / 1024 / 1024).toFixed(2)}MB |

## 📦 依存関係

| メトリクス | 値 |
|-----------|-----|
| 依存関係数 | ${metrics.dependencies.total} |
| 開発依存関係数 | ${metrics.dependencies.dev} |
| API関連依存関係 | ${metrics.dependencies.apiRelated?.length || 0} |

### API関連依存関係詳細

${metrics.dependencies.apiRelated?.map(dep => `- ${dep.name}: ${dep.version}`).join('\n') || 'なし'}

## 🎯 改善目標

移行後の目標値：

- **コード削減**: 重複コードを85%削減
- **テストカバレッジ**: 90%以上に向上
- **ビルドサイズ**: 40%削減
- **パフォーマンス**: API呼び出し時間を33%削減
- **バンドルサイズ**: First Load JSを30%削減

---

このベースラインメトリクスは、APIクライアント移行の効果を測定するための基準値として使用されます。
`;
  
  fs.writeFileSync(mdPath, mdContent);
  console.log(`  ${colors.green}✅ ${mdPath} に保存しました${colors.reset}`);
}

/**
 * メイン処理
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  APIクライアント移行 ベースラインメトリクス測定${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  // 各メトリクスを測定
  measureCodeMetrics();
  measureTestMetrics();
  measureBuildMetrics();
  measurePerformanceMetrics();
  analyzeDependencies();
  
  // レポートを生成
  generateReport();
  
  console.log(`\n${colors.green}${colors.bright}✅ ベースラインメトリクス測定完了！${colors.reset}\n`);
}

// 実行
main().catch(error => {
  console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  process.exit(1);
});