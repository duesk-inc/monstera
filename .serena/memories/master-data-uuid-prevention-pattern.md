# マスタデータUUID不整合の予防パターン

## 問題
データベース再初期化時にマスタデータのUUIDが変わることで、フロントエンドとの不整合が発生する。

## 根本原因
- マイグレーションで`gen_random_uuid()`を使用
- DB再初期化のたびに異なるUUIDが生成される
- フロントエンドがキャッシュしているIDと一致しない

## 推奨される解決策

### 1. コードベース識別（推奨）
マスタデータはコードフィールドで識別する：
```go
// DTOでコードを受け取る
type CreateRequest struct {
    Category string `json:"category"` // コード
    CategoryID *uuid.UUID `json:"category_id,omitempty"` // 後方互換性
}

// サービス層でコード優先で検索
if req.Category != "" {
    category, err = repo.GetByCode(ctx, req.Category)
} else if req.CategoryID != nil {
    category, err = repo.GetByID(ctx, *req.CategoryID)
}
```

### 2. 固定UUID使用
マイグレーションで固定UUIDを使用：
```sql
INSERT INTO categories (id, code, name) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'transport', '交通費'),
('550e8400-e29b-41d4-a716-446655440002', 'supplies', '備品');
```

### 3. チェックポイント
- [ ] すべてのマスタデータテーブルを確認
- [ ] コードフィールドにUNIQUE制約
- [ ] APIはコードとIDの両方を受け入れる
- [ ] フロントエンドはコードを優先的に使用

## 対象となるマスタデータ
- 経費カテゴリ（expense_categories）
- 部署（departments）
- 役職（positions）
- その他の区分マスタ