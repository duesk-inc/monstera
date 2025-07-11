# 📊 Code Coverage Guide

このガイドでは、Monsteraプロジェクトのコードカバレッジの計測と管理について説明します。

## 📋 概要

コードカバレッジは、テストがどれだけのコードをカバーしているかを示す重要な品質指標です。本プロジェクトでは、バックエンド（Go）とフロントエンド（TypeScript/React）の両方でカバレッジを計測し、統合レポートを生成します。

## 🎯 カバレッジ目標

| コンポーネント | 最小カバレッジ率 | 推奨カバレッジ率 |
|---------------|----------------|----------------|
| バックエンド   | 80%           | 90%以上        |
| フロントエンド | 80%           | 90%以上        |
| 総合          | 80%           | 90%以上        |

## 🚀 ローカルでのカバレッジ計測

### バックエンド（Go）

```bash
# 単体でのカバレッジ計測
cd backend
go test -v -race -coverprofile=coverage.out ./...

# HTMLレポートの生成
go tool cover -html=coverage.out -o coverage.html

# カバレッジ率の確認
go tool cover -func=coverage.out

# 特定のパッケージのみ
go test -v -coverprofile=coverage.out ./internal/services/...
```

### フロントエンド（TypeScript/React）

```bash
# 単体でのカバレッジ計測
cd frontend
npm run test:coverage

# ウォッチモードでのカバレッジ計測
npm run test:coverage -- --watch

# 特定のファイルのみ
npm run test:coverage -- --testPathPattern=components/users
```

## 📈 CI/CDでのカバレッジ

### GitHub Actions ワークフロー

`.github/workflows/coverage.yml` が以下を自動実行：

1. **並列実行**: バックエンドとフロントエンドのテストを並列実行
2. **閾値チェック**: 設定された最小カバレッジ率をチェック
3. **レポート生成**: 統合カバレッジレポートを生成
4. **PRコメント**: プルリクエストに結果をコメント
5. **バッジ更新**: mainブランチでカバレッジバッジを更新

### カバレッジレポートの確認方法

1. **PRコメント**: 自動的にPRにコメントされるサマリーを確認
2. **Actions タブ**: ワークフロー実行結果の詳細を確認
3. **Artifacts**: 詳細なHTMLレポートをダウンロード

## 🛠️ カバレッジの改善

### カバレッジが低い場合の対処法

1. **未テストコードの特定**
   ```bash
   # バックエンド
   go tool cover -html=coverage.out
   # 赤色でハイライトされた部分が未テスト
   
   # フロントエンド  
   open frontend/coverage/lcov-report/index.html
   # 赤色の行が未テスト
   ```

2. **優先順位の設定**
   - ビジネスロジック > ユーティリティ > UI
   - 複雑な条件分岐 > 単純な処理
   - エラーハンドリング > 正常系

3. **テストの追加**
   - ユニットテスト: 個別の関数・メソッド
   - 統合テスト: 複数コンポーネントの連携
   - E2Eテスト: ユーザーシナリオ全体

### カバレッジから除外する場合

#### バックエンド（Go）

```go
// ビルドタグで除外
//go:build !test

// または特定の関数を除外（推奨しない）
func excludedFunction() {
    // この関数はカバレッジ計測から除外されない
    // 代わりにテストを書くことを推奨
}
```

#### フロントエンド（TypeScript）

```typescript
/* istanbul ignore next */
function excludedFunction() {
  // この関数はカバレッジ計測から除外される
}

// ファイル全体を除外（jest.config.jsで設定）
```

## 📊 カバレッジの種類

### 1. Line Coverage（行カバレッジ）
実行されたコード行の割合

### 2. Branch Coverage（分岐カバレッジ）
実行された条件分岐の割合

### 3. Function Coverage（関数カバレッジ）
実行された関数の割合

### 4. Statement Coverage（文カバレッジ）
実行された文の割合

## 🔧 設定のカスタマイズ

### カバレッジ閾値の変更

`.github/workflows/coverage.yml` の環境変数を編集：

```yaml
env:
  COVERAGE_THRESHOLD_BACKEND: 85  # 80から85に変更
  COVERAGE_THRESHOLD_FRONTEND: 85
  COVERAGE_THRESHOLD_TOTAL: 85
```

### カバレッジ対象の変更

#### バックエンド
特定のパッケージを除外する場合は、テストコマンドを調整

#### フロントエンド
`frontend/jest.config.js` の `collectCoverageFrom` を編集：

```javascript
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.stories.{js,jsx,ts,tsx}',
  '!src/**/__tests__/**',
  '!src/pages/**',  // pagesディレクトリを除外
],
```

## 📝 ベストプラクティス

1. **継続的な改善**
   - カバレッジは徐々に改善する
   - 新規コードは高カバレッジを維持
   - リファクタリング時にテストを追加

2. **質 > 量**
   - 100%を目指すより、重要な部分を確実にテスト
   - エッジケースとエラーハンドリングを重視
   - 意味のあるテストを書く

3. **チーム文化**
   - カバレッジをチーム全体で監視
   - レビュー時にテストの質も確認
   - カバレッジ低下時は原因を議論

## 🆘 トラブルシューティング

### よくある問題

1. **カバレッジが計測されない**
   - テストファイルの命名規則を確認（`*_test.go`, `*.test.ts`）
   - 設定ファイルのパスを確認
   - ビルドタグやコメントによる除外を確認

2. **CI/CDでカバレッジが異なる**
   - 環境変数の違いを確認
   - データベース接続などの外部依存を確認
   - 並列実行による競合状態を確認

3. **カバレッジレポートが見つからない**
   - アーティファクトのアップロードを確認
   - ワークフローのログを確認
   - 権限設定を確認

## 📚 参考資料

- [Go Coverage Tutorial](https://go.dev/blog/cover)
- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)

---

最終更新日: 2024-01-11