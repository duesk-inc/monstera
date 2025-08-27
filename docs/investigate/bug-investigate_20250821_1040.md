# バグ調査レポート - 経費一覧画面の500エラー（根本原因）

## 実行日時
2025-08-21 10:40

## 問題の概要
経費申請一覧画面を表示した際に、ブラウザコンソールに500エラーが表示される。
前回の修正（401エラーのステータスコード保持）後も問題が解決していない。

## エラー詳細
```
エラー詳細: {error: {…}, status: 500, timestamp: '2025-08-21T01:30:04.508Z'}
error @ logger.ts:543
getExpenseCategories @ expense.ts:655
await in getExpenseCategories        
useCategories.useQuery @ useCategories.ts:73
<ExpenseHistoryView>        
ExpensesPage
```

## 調査結果

### 1. 根本原因の特定
**バックエンド側でのデータベースアクセスエラー**

エラーが発生している処理フロー：
1. フロントエンド: `getExpenseCategories()` → `/api/v1/expenses/categories` を呼び出し
2. バックエンド: `ExpenseHandler.GetCategories()` → `expenseService.GetActiveCategories()` を呼び出し
3. サービス層: Redisキャッシュまたはデータベースからカテゴリを取得
4. **問題発生箇所**: `categoryRepo.GetActiveOrderByDisplayOrder()` でエラー発生
5. エラーハンドリング: HTTP 500を返す

### 2. 問題の詳細分析

#### バックエンド側のエラー処理
```go
// backend/internal/handler/expense_handler.go:340-348
categories, err := h.expenseService.GetActiveCategories(c.Request.Context())
if err != nil {
    h.logger.Error("Failed to get expense categories",
        zap.Error(err),
        zap.String("user_id", userID))
    HandleStandardError(c, http.StatusInternalServerError,
        constants.ErrExpenseSaveFailed,
        "カテゴリの取得に失敗しました", h.logger, err)
    return
}
```

#### サービス層の実装
```go
// backend/internal/service/expense_service.go:635-639
categories, err := s.categoryRepo.GetActiveOrderByDisplayOrder(ctx)
if err != nil {
    s.logger.Error("Failed to get active categories", zap.Error(err))
    return nil, dto.NewExpenseError(dto.ErrCodeInternalError, "カテゴリ一覧の取得に失敗しました")
}
```

#### リポジトリ層の実装
```go
// backend/internal/repository/expense_category_repository.go
func (r *ExpenseCategoryRepositoryImpl) GetActive(ctx context.Context) ([]model.ExpenseCategoryMaster, error) {
    var categories []model.ExpenseCategoryMaster
    err := r.db.WithContext(ctx).
        Where("is_active = ?", true).
        Order("display_order ASC").
        Find(&categories).Error
    if err != nil {
        r.logger.Error("Failed to get active expense categories", zap.Error(err))
        return nil, err
    }
    return categories, nil
}
```

### 3. 考えられる根本原因

1. **データベース接続の問題**
   - PostgreSQLへの接続が確立されていない
   - 接続プールが枯渇している
   - Docker環境でのネットワーク問題

2. **テーブル/データの不在**
   - `expense_category_masters`テーブルが存在しない
   - テーブルは存在するが、`is_active = true`のデータがない
   - マイグレーションが実行されていない

3. **Redisキャッシュの問題**
   - Redis接続エラー
   - 不正なキャッシュデータによるエラー

4. **権限の問題**
   - データベースユーザーの権限不足
   - テーブルへのアクセス権限がない

### 4. 前回の修正との関係
前回の修正（エラーハンドラーのステータスコード保持）は正しく機能している。
今回の500エラーは、実際にバックエンドから返されている本物の500エラーである。

### 5. 影響範囲
- **影響を受ける機能**: 
  - 経費一覧画面の表示
  - 経費申請フォーム（カテゴリ選択）
  - その他経費カテゴリを使用するすべての機能

- **影響を受けるユーザー**: 
  - 全ユーザー

- **データ整合性への影響**: なし（読み取り専用の操作）

## 修正方針

### 短期的な対応
1. **データベース状態の確認**
   ```sql
   -- テーブルの存在確認
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'expense_category_masters';
   
   -- データの存在確認
   SELECT * FROM expense_category_masters 
   WHERE is_active = true 
   ORDER BY display_order;
   ```

2. **マイグレーション実行**
   ```bash
   docker-compose exec backend migrate -path migrations -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" up
   ```

3. **初期データ投入**
   必要に応じて経費カテゴリマスタデータを投入

### 長期的な改善
1. **エラーハンドリングの改善**
   - より詳細なエラーメッセージの返却
   - データベース接続エラーと通常のエラーの区別

2. **ヘルスチェック機能の追加**
   - データベース接続状態の監視
   - 必要なマスタデータの存在チェック

3. **開発環境セットアップの改善**
   - 必要なマスタデータの自動投入
   - 環境構築手順の文書化

## 確認コマンド

### Docker環境の確認
```bash
# コンテナの状態確認
docker-compose ps

# バックエンドのログ確認
docker-compose logs -f backend

# PostgreSQLへの接続確認
docker-compose exec postgres psql -U postgres -d monstera -c "\\dt"
```

### データベースの確認
```bash
# PostgreSQLコンテナに接続
docker-compose exec postgres psql -U postgres -d monstera

# テーブル一覧確認
\\dt

# expense_category_mastersテーブルの確認
SELECT * FROM expense_category_masters;
```

## 推奨される次のステップ

1. **環境確認**
   ```bash
   docker-compose ps
   docker-compose logs backend | tail -50
   ```

2. **データベース状態確認**
   ```bash
   docker-compose exec postgres psql -U postgres -d monstera -c "SELECT count(*) FROM expense_category_masters WHERE is_active = true;"
   ```

3. **必要に応じてデータ投入またはマイグレーション実行**

4. **修正実装**
   - エラーメッセージの改善
   - 初期データ投入スクリプトの作成

## 備考
- このエラーは環境依存の可能性が高い
- 開発環境のセットアップ手順を確認する必要がある
- バックエンドのログを詳細に確認することで、具体的なエラー内容を特定できる