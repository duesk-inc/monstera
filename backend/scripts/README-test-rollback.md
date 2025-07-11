# マイグレーションロールバックテストスクリプト

## 概要
`test-rollback.sh` は、マイグレーションのロールバック動作確認を自動化するスクリプトです。
安全にマイグレーションを巻き戻し、データベースの整合性を確認できます。

## 機能
1. 現在のマイグレーション状態表示
2. ロールバック可能なマイグレーション一覧表示
3. 1ステップロールバック実行
4. 指定バージョンまでのロールバック実行
5. ロールバック前後のテーブル状態比較
6. MySQL接続確認とエラーハンドリング

## 使用方法

### 基本的な使用方法
```bash
# backendディレクトリから実行
./scripts/test-rollback.sh [オプション] [ターゲットバージョン]

# プロジェクトルートから実行
cd backend && ./scripts/test-rollback.sh [オプション] [ターゲットバージョン]
```

### オプション一覧

#### 情報表示系
```bash
# 現在のマイグレーション状態を表示
./scripts/test-rollback.sh --status

# ロールバック可能なマイグレーション一覧を表示
./scripts/test-rollback.sh --list

# 現在のテーブル一覧を表示
./scripts/test-rollback.sh --tables

# ヘルプを表示
./scripts/test-rollback.sh --help
```

#### ロールバック実行系
```bash
# 1ステップだけロールバック
./scripts/test-rollback.sh --one-step

# 指定バージョンまでロールバック
./scripts/test-rollback.sh 200003

# 最初の状態（バージョン0）まで完全ロールバック
./scripts/test-rollback.sh 0
```

### Docker環境での実行
```bash
# Docker Composeが起動している状態で
docker-compose exec backend ./scripts/test-rollback.sh --status
docker-compose exec backend ./scripts/test-rollback.sh --one-step
```

## 環境変数
以下の環境変数を使用します（未設定の場合はデフォルト値を使用）：

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| DB_HOST | localhost | データベースホスト |
| DB_PORT | 3306 | データベースポート |
| DB_USER | monstera | データベースユーザー |
| DB_PASSWORD | password | データベースパスワード |
| DB_NAME | monstera | データベース名 |

## 出力例

### 状態確認の例
```
[INFO] 現在のマイグレーション状態:
+--------+-------+
| version| dirty |
+--------+-------+
| 200004 |     0 |
+--------+-------+

[DEBUG] 現在のテーブル一覧:
+---------------------------+
| Tables_in_monstera        |
+---------------------------+
| departments               |
| schema_migrations         |
| users                     |
+---------------------------+
```

### 1ステップロールバックの例
```
[INFO] 1ステップロールバックテストを開始します
[INFO] MySQL接続: OK
[INFO] ロールバック前の状態:
| version| dirty |
| 200004 |     0 |

[INFO] Docker環境でマイグレーションロールバックを実行中...
[INFO] ロールバック実行: 完了
[INFO] ロールバック後の状態:
| version| dirty |
| 200003 |     0 |

[INFO] 1ステップロールバックテスト: 完了 ✅
```

### ロールバック可能なマイグレーション一覧の例
```
[INFO] ロールバック可能なマイグレーション一覧:
現在のバージョン: 200004
ロールバック可能なマイグレーション:
200004 - add_department_to_users
200003 - create_departments_table
200001 - create_user_roles_table
200000 - seed_notification_data
100001 - seed_technology_master
100000 - seed_initial_data
```

## エラー時の対処

### MySQL接続エラー
```
[ERROR] MySQL接続に失敗しました
```
→ Docker Composeが起動しているか確認してください
```bash
docker-compose ps
docker-compose up -d
```

### migrateコマンドが見つからない
```
[ERROR] migrate コマンドが見つかりません。golang-migrate をインストールしてください
```
→ ローカル環境でgolang-migrateをインストールしてください：
```bash
go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

### ロールバック実行失敗
```
[ERROR] ロールバック実行に失敗しました
```
→ 以下を確認してください：
1. マイグレーションファイルの構文エラー
2. 外部キー制約の問題
3. データベースの整合性問題

### dirty状態エラー
```
error: Dirty database version X. Fix and force version.
```
→ dirty状態を解消してください：
```bash
# 強制的にクリーンな状態にする
docker-compose exec backend migrate -path migrations -database "mysql://..." force [version]
```

## 安全な使用のための注意事項

### 本番環境では使用禁止
- このスクリプトは開発・テスト環境専用です
- 本番環境では絶対に使用しないでください

### バックアップの推奨
```bash
# ロールバック前にデータベースをバックアップ
docker-compose exec mysql mysqldump -umonstera -ppassword monstera > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 段階的なロールバック
- 大きなバージョン差がある場合は、段階的にロールバックすることを推奨
- 1回に3-5バージョン程度に留める

### 外部キー制約への注意
- テーブル間の依存関係により、ロールバックが失敗する場合があります
- エラーが発生した場合は、手動で依存関係を解決してください

## トラブルシューティング

### ロールバック中断時の復旧
1. 現在の状態を確認：`./scripts/test-rollback.sh --status`
2. dirty状態の場合は強制修正：`migrate force [version]`
3. 必要に応じて手動でテーブル修正

### テーブル削除エラー
- 外部キー制約により削除できない場合
- 制約を一時的に無効化：`SET FOREIGN_KEY_CHECKS=0;`
- 削除後に再有効化：`SET FOREIGN_KEY_CHECKS=1;`

---

**最終更新日**: 2025年7月3日
**バージョン**: 1.0