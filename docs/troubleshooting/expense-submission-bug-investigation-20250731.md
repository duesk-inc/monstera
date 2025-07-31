# 経費申請提出エラー調査報告書

**調査日**: 2025年7月31日  
**報告者**: Claude Code  
**対象バグ**: 経費申請提出時の「管理部承認者が設定されていません」エラー

## 概要

経費申請の「作成して提出」機能でエラーが発生し、申請を提出できない問題を調査・解決しました。

## エラー内容

```json
{
  "error_code": "E001N001",
  "message": "管理部承認者が設定されていません。システム管理者に承認者の設定を依頼してください"
}
```

## 根本原因

調査の結果、以下の2つの問題が原因でした：

### 1. マイグレーション未実行
- **問題**: migration `200072_seed_expense_approver_settings_initial.up.sql` が実行されていなかった
- **影響**: `expense_approver_settings` テーブルに承認者データが存在しなかった
- **解決**: `make migrate-up` でマイグレーションを実行

### 2. データベーススキーマ不整合
- **問題**: `expense_summaries` テーブルに `expense_count` カラムが存在しなかった
- **影響**: 経費提出時の月次集計更新でSQLエラーが発生し、トランザクション全体がロールバック
- **解決**: migration `200073_add_expense_count_to_summaries.up.sql` を作成・実行

## 調査プロセス

### 1. 初期エラー分析
```
expense_approval_repository.go:425 - "No active manager approvers found"
```

### 2. データ確認
```sql
SELECT COUNT(*) FROM expense_approver_settings WHERE approval_type = 'manager' AND is_active = true;
-- 結果: 0 (データが存在しない)
```

### 3. マイグレーション状態確認
```sql
SELECT * FROM schema_migrations ORDER BY version DESC;
-- 結果: 200071まで実行済み、200072が未実行
```

### 4. 二次エラーの発見
マイグレーション実行後、新たなエラーが発生：
```
ERROR: column "expense_count" of relation "expense_summaries" does not exist (SQLSTATE 42703)
```

### 5. スキーマ修正
`expense_summaries` テーブルに `expense_count` カラムを追加するマイグレーションを作成・実行

## 実行した修正

### 1. 承認者データの作成
```bash
make migrate-up  # 200072を実行
```

実行後の承認者設定：
| 承認タイプ | 優先順位 | 承認者 |
|----------|---------|--------|
| manager | 1 | admin@duesk.co.jp |
| manager | 2 | daichiro.uesaka@duesk.co.jp |
| executive | 1 | admin@duesk.co.jp |
| executive | 2 | daichiro.uesaka@duesk.co.jp |

### 2. スキーマ修正
```sql
-- 200073_add_expense_count_to_summaries.up.sql
ALTER TABLE expense_summaries
ADD COLUMN expense_count INTEGER NOT NULL DEFAULT 0;
```

## 検証結果

修正後のテスト結果：
- ✅ 経費申請作成: 成功
- ✅ 経費申請提出: 成功（HTTP 200）
- ✅ 承認フロー作成: 管理部承認者2名が正しく設定
- ✅ ステータス更新: "draft" → "submitted"

## 今後の対策

### 1. マイグレーション管理
- Docker環境再構築時のマイグレーション自動実行を検討
- マイグレーション状態のヘルスチェック追加

### 2. スキーマ整合性
- エンティティモデルとテーブル定義の自動検証
- 開発環境でのスキーマ差分チェック

### 3. エラーハンドリング改善
- トランザクション内エラーの詳細ログ出力
- ユーザー向けエラーメッセージの改善

## 関連ファイル

- `/backend/internal/repository/expense_approval_repository.go`
- `/backend/internal/service/expense_service.go`
- `/backend/migrations/200072_seed_expense_approver_settings_initial.up.sql`
- `/backend/migrations/200073_add_expense_count_to_summaries.up.sql`

## 教訓

1. **マイグレーション管理の重要性**: 開発環境でもマイグレーション状態を定期的に確認する必要がある
2. **エラーログの詳細化**: トランザクション内でのエラーは原因特定が困難なため、詳細なログ出力が重要
3. **スキーマ変更の影響範囲**: テーブル構造の変更は関連する全ての処理を確認する必要がある

---

調査完了: 2025-07-31 13:25:00 JST