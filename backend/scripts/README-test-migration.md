# マイグレーションテストスクリプト

## 概要
`test-migration.sh` は、マイグレーションの実行と検証を自動化するスクリプトです。
特に、新しく追加された200057番のマイグレーション（recommended_leave_periods）の動作確認に対応しています。

## 機能
1. 環境変数の確認と設定
2. MySQL接続の確認
3. 現在のマイグレーション状態の表示
4. 200057マイグレーションファイルの存在確認
5. マイグレーションの実行
6. 適用結果の検証
7. テーブル構造の確認（詳細モード）

## 使用方法

### 基本的な実行
```bash
# backendディレクトリから実行
./scripts/test-migration.sh

# プロジェクトルートから実行
cd backend && ./scripts/test-migration.sh
```

### 詳細モード（テーブル構造も表示）
```bash
./scripts/test-migration.sh --verbose
# または
./scripts/test-migration.sh -v
```

### Docker環境での実行
```bash
# Docker Composeが起動している状態で
docker-compose exec backend ./scripts/test-migration.sh
```

## 環境変数
以下の環境変数を使用します（未設定の場合はデフォルト値を使用）：

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| DB_HOST | localhost | データベースホスト |
| DB_PORT | 3306 | データベースポート |
| DB_USER | root | データベースユーザー |
| DB_PASSWORD | password | データベースパスワード |
| DB_NAME | monstera | データベース名 |

## 出力例
```
[INFO] マイグレーションテストを開始します
[INFO] 実行環境: ローカル
[INFO] 環境変数を確認中...
[INFO] MySQL接続を確認中...
[INFO] MySQL接続: OK
[INFO] 現在のマイグレーション状態を確認中...
[INFO] 200057 マイグレーションファイルの存在を確認中...
[INFO] 200057 マイグレーションファイル: 存在確認OK
[INFO] ローカル環境でマイグレーションを実行中...
[INFO] マイグレーション実行: 完了
[INFO] 200057 マイグレーションの適用を確認中...
[INFO] 200057 マイグレーション: 適用済み確認OK
[INFO] テーブル作成: 確認OK
[INFO] マイグレーションテスト: すべて正常に完了しました ✅
```

## エラー時の対処

### MySQL接続エラー
```
[ERROR] MySQL接続に失敗しました
```
→ Docker Composeが起動しているか確認してください

### マイグレーションファイルが見つからない
```
[ERROR] 200057 マイグレーションファイルが見つかりません
```
→ backendディレクトリから実行しているか確認してください

### migrateコマンドが見つからない
```
[ERROR] migrate コマンドが見つかりません。golang-migrate をインストールしてください
```
→ golang-migrateをインストールしてください：
```bash
go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

## 注意事項
- このスクリプトは開発環境での使用を想定しています
- 本番環境では使用しないでください
- マイグレーションは不可逆的な操作を含む可能性があります