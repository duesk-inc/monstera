#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

/**
 * E2Eテスト結果レポートジェネレーター
 * Playwright のJSON結果ファイルを解析して、詳細なレポートを生成
 */
class E2ETestReportGenerator {
  constructor() {
    this.resultsPath = path.join(__dirname, '../test-results/e2e-results.json');
    this.reportPath = path.join(__dirname, '../test-results/e2e-test-report.md');
  }

  /**
   * レポートを生成
   */
  async generate() {
    try {
      console.log('📊 E2Eテストレポート生成を開始します...');

      // JSON結果ファイルの読み込み
      if (!fs.existsSync(this.resultsPath)) {
        console.error('❌ テスト結果ファイルが見つかりません:', this.resultsPath);
        console.log('💡 先にE2Eテストを実行してください: npm run test:e2e');
        process.exit(1);
      }

      const rawData = fs.readFileSync(this.resultsPath, 'utf-8');
      const testResults = JSON.parse(rawData);

      // レポートの生成
      const report = this.generateMarkdownReport(testResults);

      // レポートの保存
      fs.writeFileSync(this.reportPath, report);
      console.log('✅ レポートを生成しました:', this.reportPath);

      // サマリーの表示
      this.printSummary(testResults);

    } catch (error) {
      console.error('❌ レポート生成中にエラーが発生しました:', error);
      process.exit(1);
    }
  }

  /**
   * Markdownフォーマットのレポートを生成
   */
  generateMarkdownReport(results) {
    const { stats } = results;
    const startTime = new Date(stats.startTime);
    const endTime = new Date(new Date(stats.startTime).getTime() + stats.duration);

    let report = `# E2Eテスト実行レポート

## 📅 実行情報

- **実行日時**: ${format(startTime, 'yyyy年MM月dd日 HH:mm:ss')}
- **実行時間**: ${(stats.duration / 1000).toFixed(2)}秒
- **実行環境**: ${results.config.projects.map(p => p.name).join(', ')}

## 📊 テスト結果サマリー

| 項目 | 件数 | 割合 |
|------|------|------|
| ✅ 成功 | ${stats.expected} | ${this.getPercentage(stats.expected, this.getTotalTests(stats))}% |
| ❌ 失敗 | ${stats.unexpected} | ${this.getPercentage(stats.unexpected, this.getTotalTests(stats))}% |
| ⚠️ 不安定 | ${stats.flaky} | ${this.getPercentage(stats.flaky, this.getTotalTests(stats))}% |
| ⏭️ スキップ | ${stats.skipped} | ${this.getPercentage(stats.skipped, this.getTotalTests(stats))}% |
| **合計** | **${this.getTotalTests(stats)}** | **100%** |

## 📝 テスト詳細

`;

    // テストスイートごとの結果を追加
    results.suites.forEach(suite => {
      report += this.generateSuiteReport(suite, 0);
    });

    // 失敗したテストの詳細
    const failedTests = this.collectFailedTests(results.suites);
    if (failedTests.length > 0) {
      report += `
## ❌ 失敗したテストの詳細

`;
      failedTests.forEach((test, index) => {
        report += `### ${index + 1}. ${test.title}

**エラーメッセージ:**
\`\`\`
${test.error?.message || 'エラーメッセージなし'}
\`\`\`

`;
        if (test.error?.stack) {
          report += `**スタックトレース:**
\`\`\`
${test.error.stack}
\`\`\`

`;
        }
      });
    }

    // 推奨事項
    report += this.generateRecommendations(stats, failedTests);

    return report;
  }

  /**
   * スイートレポートの生成
   */
  generateSuiteReport(suite, level) {
    let report = '';
    const indent = '  '.repeat(level);

    if (suite.title) {
      report += `${indent}### ${suite.title}\n\n`;
    }

    // テスト結果
    suite.tests.forEach(test => {
      const icon = this.getStatusIcon(test.status);
      const duration = `(${(test.duration / 1000).toFixed(2)}秒)`;
      report += `${indent}- ${icon} ${test.title} ${duration}\n`;
    });

    // ネストされたスイート
    suite.suites.forEach(nestedSuite => {
      report += this.generateSuiteReport(nestedSuite, level + 1);
    });

    return report;
  }

  /**
   * 失敗したテストを収集
   */
  collectFailedTests(suites) {
    const failedTests = [];

    const collectFromSuite = (suite) => {
      suite.tests.forEach(test => {
        if (test.status === 'failed') {
          failedTests.push(test);
        }
      });
      suite.suites.forEach(collectFromSuite);
    };

    suites.forEach(collectFromSuite);
    return failedTests;
  }

  /**
   * 推奨事項の生成
   */
  generateRecommendations(stats, failedTests) {
    let recommendations = `
## 💡 推奨事項

`;

    const totalTests = this.getTotalTests(stats);
    const successRate = (stats.expected / totalTests) * 100;

    if (successRate === 100) {
      recommendations += `✨ **素晴らしい！** すべてのテストが成功しました。

- 継続的にテストを実行し、品質を維持してください
- 新機能追加時は必ずE2Eテストも追加してください
`;
    } else if (successRate >= 80) {
      recommendations += `👍 **良好** テストの成功率は${successRate.toFixed(1)}%です。

- 失敗したテストの修正を優先してください
- 不安定なテストがある場合は、安定化を図ってください
`;
    } else {
      recommendations += `⚠️ **要改善** テストの成功率は${successRate.toFixed(1)}%です。

- 失敗の原因を分析し、早急に修正してください
- テスト環境の安定性を確認してください
- 必要に応じてテストの再設計を検討してください
`;
    }

    // 失敗パターンの分析
    if (failedTests.length > 0) {
      recommendations += `
### 失敗パターンの分析

`;
      const errorPatterns = this.analyzeErrorPatterns(failedTests);
      errorPatterns.forEach((count, pattern) => {
        recommendations += `- **${pattern}**: ${count}件\n`;
      });
    }

    return recommendations;
  }

  /**
   * エラーパターンの分析
   */
  analyzeErrorPatterns(failedTests) {
    const patterns = new Map();

    failedTests.forEach(test => {
      const message = test.error?.message || '';
      let pattern = 'その他のエラー';

      if (message.includes('timeout')) {
        pattern = 'タイムアウトエラー';
      } else if (message.includes('not found')) {
        pattern = '要素が見つからない';
      } else if (message.includes('Expected')) {
        pattern = 'アサーションエラー';
      } else if (message.includes('network')) {
        pattern = 'ネットワークエラー';
      }

      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return patterns;
  }

  /**
   * コンソールにサマリーを表示
   */
  printSummary(results) {
    const { stats } = results;
    const totalTests = this.getTotalTests(stats);
    const successRate = (stats.expected / totalTests) * 100;

    console.log('\n📊 テスト実行結果サマリー');
    console.log('========================');
    console.log(`総テスト数: ${totalTests}`);
    console.log(`✅ 成功: ${stats.expected}`);
    console.log(`❌ 失敗: ${stats.unexpected}`);
    console.log(`⚠️ 不安定: ${stats.flaky}`);
    console.log(`⏭️ スキップ: ${stats.skipped}`);
    console.log(`\n成功率: ${successRate.toFixed(1)}%`);
    console.log(`実行時間: ${(stats.duration / 1000).toFixed(2)}秒`);
  }

  /**
   * ユーティリティメソッド
   */
  getTotalTests(stats) {
    return stats.expected + stats.unexpected + stats.flaky + stats.skipped;
  }

  getPercentage(value, total) {
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }

  getStatusIcon(status) {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'flaky': return '⚠️';
      default: return '❓';
    }
  }
}

// メイン実行
if (require.main === module) {
  const generator = new E2ETestReportGenerator();
  generator.generate();
}

module.exports = { E2ETestReportGenerator };