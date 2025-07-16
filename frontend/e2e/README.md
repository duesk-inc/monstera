# E2Eテスト (Playwright)

エンジニア管理システムのE2E（End-to-End）テストです。

## 概要

このディレクトリには、Playwrightを使用したE2Eテストが含まれています。主要な機能について実際のブラウザを使用した統合テストを実行します。

## ディレクトリ構成

```
e2e/
├── README.md                          # このファイル
├── global-setup.ts                    # 全テスト実行前のセットアップ
├── global-teardown.ts                 # 全テスト実行後のクリーンアップ
├── helpers/                           # テストヘルパー関数
│   ├── auth-helper.ts                 # 認証関連のヘルパー
│   ├── engineer-helper.ts             # エンジニア管理関連のヘルパー
│   ├── unsubmitted-helper.ts          # 未提出者管理関連のヘルパー
│   └── admin-helper.ts                # 管理者機能関連のヘルパー
├── specs/                             # テストスペック
│   ├── authentication.spec.ts         # 認証機能のテスト
│   ├── engineer-management.spec.ts    # エンジニア管理機能のテスト
│   ├── unsubmitted-management.spec.ts # 未提出者管理機能のテスト
│   └── admin-weekly-report-management.spec.ts # 管理者週報管理画面のテスト
├── test-data/                         # テストデータ
│   ├── engineers.csv                  # CSVインポート用テストデータ
│   └── admin-test-data.ts             # 管理者機能用テストデータ
└── fixtures/                          # テストフィクスチャ
    └── unsubmitted-data.ts            # 未提出者データフィクスチャ
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Playwrightブラウザのインストール

```bash
npx playwright install
```

### 3. 環境準備

テストを実行する前に、以下が起動していることを確認してください：

- バックエンドAPI (`http://localhost:8080`)
- データベース (MySQL)

Docker環境の場合：
```bash
docker-compose up -d backend mysql
```

## テスト実行

### 全テスト実行

```bash
npm run test:e2e
```

### ヘッドレスモードで実行

```bash
npm run test:e2e:headed
```

### UIモードで実行（デバッグ用）

```bash
npm run test:e2e:ui
```

### デバッグモードで実行

```bash
npm run test:e2e:debug
```

### 特定のテストファイルのみ実行

```bash
npx playwright test engineer-management.spec.ts
```

### 特定のテストケースのみ実行

```bash
npx playwright test --grep "エンジニアを作成できる"
```

## テスト設定

### 設定ファイル

- `playwright.config.ts`: Playwrightの設定
- `e2e/global-setup.ts`: 全テスト前のセットアップ
- `e2e/global-teardown.ts`: 全テスト後のクリーンアップ

### 環境変数

以下の環境変数でテストの動作を制御できます：

- `CI=true`: CI環境での実行時に設定
- `HEADLESS=false`: ヘッドレスモードを無効化

## テストカバレッジ

### 認証機能 (`authentication.spec.ts`)

- ✅ 管理者ログイン
- ✅ エンジニアログイン
- ✅ ログアウト
- ✅ 無効な認証情報での失敗
- ✅ 未認証ユーザーのアクセス制御
- ✅ ロール切り替え
- ✅ セッション管理

### エンジニア管理機能 (`engineer-management.spec.ts`)

- ✅ エンジニア一覧表示
- ✅ 新規エンジニア作成
- ✅ エンジニア検索・フィルタリング
- ✅ エンジニア情報編集
- ✅ ステータス変更
- ✅ エンジニア削除
- ✅ CSVエクスポート
- ✅ CSVインポート
- ✅ ページネーション
- ✅ 権限チェック

### 未提出者管理機能 (`unsubmitted-management.spec.ts`)

- ✅ 未提出者一覧の表示
- ✅ 統計情報（サマリーカード）の表示
- ✅ 部署別フィルタリング
- ✅ 個別リマインダー送信
- ✅ 一括リマインダー送信
- ✅ CSV/Excelエクスポート
- ✅ 経過日数による警告レベル表示
- ✅ リマインダー送信履歴表示
- ✅ エスカレーション対象者の識別
- ✅ ページリフレッシュ機能

### 管理者週報管理画面 (`admin-weekly-report-management.spec.ts`)

- ✅ 画面遷移とタブ切り替え
- ✅ 未提出者管理タブの全機能
- ✅ 週次レポートタブ（一覧表示、フィルタリング、詳細表示）
- ✅ 月次レポートタブ（月次サマリー、部署別統計、PDFエクスポート）
- ✅ アラート設定タブ（設定表示・更新、バリデーション）
- ✅ 権限管理（管理者、マネージャー、一般ユーザー）
- ✅ レスポンシブデザイン
- ✅ 大量データのパフォーマンス

## デバッグ

### テスト失敗時のデバッグ

1. **スクリーンショット**: テスト失敗時に自動的に撮影されます
2. **ビデオ録画**: 失敗したテストのビデオが保存されます
3. **トレース**: 実行トレースが記録されます

これらのファイルは `test-results/` ディレクトリに保存されます。

### ブラウザを表示してテスト

```bash
npm run test:e2e:headed
```

### ステップ実行

```bash
npm run test:e2e:debug
```

## テストデータ

### CSVインポート用データ

`e2e/test-data/engineers.csv` にテスト用のエンジニアデータが含まれています。

### テストアカウント

テストでは以下のアカウントを使用します：

- **管理者**: `admin@duesk.co.jp` / `admin123`
- **マネージャー**: `manager@duesk.co.jp` / `manager123`
- **エンジニア**: `engineer@duesk.co.jp` / `engineer123`
- **一般ユーザー**: `user@duesk.co.jp` / `user123`

## ベストプラクティス

### テストの書き方

1. **独立性**: 各テストは独立して実行できるように作成
2. **クリーンアップ**: テスト後に適切なクリーンアップを実行
3. **data-testid**: 要素の選択にはdata-testid属性を使用
4. **ヘルパー関数**: 共通の操作はヘルパー関数に分離

### 要素の選択

```typescript
// 推奨: data-testid属性を使用
await page.click('[data-testid="submit-button"]');

// 非推奨: CSSセレクターに依存
await page.click('.btn-primary');
```

### 待機処理

```typescript
// ページ遷移の待機
await page.waitForURL('/admin/engineers');

// 要素の表示待ち
await page.waitForSelector('[data-testid="engineer-list"]');
```

## トラブルシューティング

### よくある問題

1. **タイムアウトエラー**
   - アプリケーションの起動が遅い場合があります
   - `playwright.config.ts`のタイムアウト値を調整してください

2. **要素が見つからない**
   - data-testid属性が実装されているか確認
   - 要素の表示タイミングを適切に待機

3. **認証エラー**
   - テストアカウントがデータベースに存在するか確認
   - セッション管理が正常に動作しているか確認

### ログ確認

```bash
# 詳細ログ付きで実行
DEBUG=pw:* npm run test:e2e
```

## CI/CD統合

GitHub ActionsやJenkinsなどのCI/CD環境での実行時は、以下の点に注意してください：

1. **ヘッドレスモード**: CI環境では自動的にヘッドレスモードで実行
2. **並列実行**: CI環境では再試行回数と並列実行数を調整
3. **アーティファクト**: テスト結果とレポートを適切に保存

## 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Integration](https://playwright.dev/docs/ci-intro)