# 経費カテゴリデータベースエラーパターン

## 問題の概要
経費一覧画面で500エラーが発生。バックエンド側でデータベースアクセスに失敗。

## 発生日
2025-08-21

## 根本原因
データベース関連の問題：
1. expense_category_mastersテーブルの不在
2. is_active = trueのデータ不在  
3. データベース接続の問題
4. マイグレーション未実行

## エラーフロー
1. Frontend: getExpenseCategories() → /api/v1/expenses/categories
2. Backend: ExpenseHandler.GetCategories() → expenseService.GetActiveCategories()
3. Service: categoryRepo.GetActiveOrderByDisplayOrder() でエラー
4. Handler: HTTP 500を返す

## 影響箇所
- `backend/internal/handler/expense_handler.go:340-348`
- `backend/internal/service/expense_service.go:635-639`
- `backend/internal/repository/expense_category_repository.go`

## 確認コマンド
```bash
# テーブル存在確認
docker-compose exec postgres psql -U postgres -d monstera -c "\\dt expense_category_masters"

# データ確認
docker-compose exec postgres psql -U postgres -d monstera -c "SELECT * FROM expense_category_masters WHERE is_active = true;"

# マイグレーション実行
docker-compose exec backend migrate -path migrations -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" up
```

## 教訓
- 開発環境では必須マスタデータの存在を確認する仕組みが必要
- エラーメッセージはデータベースエラーと業務エラーを区別すべき
- 環境構築手順に初期データ投入を含める