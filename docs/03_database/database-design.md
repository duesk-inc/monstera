# データベース設計・整合性

このドキュメントは、Monsteraプロジェクトにおけるデータベース設計の原則とデータ整合性の保証方法を定義します。

## 更新履歴
- 2025-01-10: CLAUDE.mdから分離して作成

## 論理削除とユニーク制約

### 基本的な論理削除
```sql
-- ユニーク制約（論理削除考慮）
CREATE UNIQUE INDEX idx_users_email_active 
ON users(email) 
WHERE deleted_at IS NULL;

-- 復活可能な設計
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP,
    deleted_count INT DEFAULT 0, -- 削除回数
    CONSTRAINT uk_users_email_deleted 
        UNIQUE(email, deleted_count)
);

-- 削除時はdeleted_countをインクリメント
UPDATE users 
SET deleted_at = NOW(), 
    deleted_count = deleted_count + 1 
WHERE id = ?;
```

### 論理削除の実装パターン
1. **単純な論理削除**: `deleted_at`カラムのみ使用
2. **復活可能な論理削除**: `deleted_count`を追加してユニーク制約を維持
3. **完全削除との併用**: 一定期間後に物理削除するバッチ処理

## 外部キー制約

### 重要な関連のみに適用
```sql
-- 必須の外部キー
ALTER TABLE weekly_reports 
ADD CONSTRAINT fk_weekly_reports_user 
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE expenses 
ADD CONSTRAINT fk_expenses_approver 
FOREIGN KEY (approved_by) REFERENCES users(id);

-- カスケード削除は原則禁止（論理削除を使用）
```

### 外部キー制約の設計方針
1. **パフォーマンスへの影響を考慮**: 過度な制約は更新性能を低下させる
2. **論理削除との整合性**: 物理削除ではなく論理削除を使用
3. **アプリケーション層での検証と併用**: データベース層は最後の砦

## トランザクション管理

### トランザクションパターン
```go
// サービス層でのトランザクション管理
func (s *Service) TransferOwnership(ctx context.Context, fromID, toID string) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 元の所有者の確認
        var fromUser User
        if err := tx.Set("gorm:query_option", "FOR UPDATE").
            First(&fromUser, fromID).Error; err != nil {
            return err
        }
        
        // 2. 新しい所有者の確認
        var toUser User
        if err := tx.Set("gorm:query_option", "FOR UPDATE").
            First(&toUser, toID).Error; err != nil {
            return err
        }
        
        // 3. 所有権の移転
        if err := tx.Model(&Resource{}).
            Where("owner_id = ?", fromID).
            Update("owner_id", toID).Error; err != nil {
            return err
        }
        
        // 4. 監査ログの記録
        audit := AuditLog{
            Action: "TRANSFER_OWNERSHIP",
            UserID: getCurrentUserID(ctx),
            Details: map[string]interface{}{
                "from": fromID,
                "to":   toID,
            },
        }
        return tx.Create(&audit).Error
    })
}
```

### 分離レベルの選択
```go
// デフォルト: READ COMMITTED
// 必要に応じて変更
tx := db.Begin(&sql.TxOptions{
    Isolation: sql.LevelSerializable,
})
```

## インデックス設計

### 必須インデックス
```sql
-- 1. 外部キー
CREATE INDEX idx_weekly_reports_user_id ON weekly_reports(user_id);

-- 2. ステータス + 論理削除
CREATE INDEX idx_weekly_reports_status_deleted 
ON weekly_reports(status) 
WHERE deleted_at IS NULL;

-- 3. ソート用
CREATE INDEX idx_weekly_reports_created_at ON weekly_reports(created_at DESC);

-- 4. 複合検索
CREATE INDEX idx_weekly_reports_user_status_date 
ON weekly_reports(user_id, status, created_at) 
WHERE deleted_at IS NULL;

-- 5. 部分インデックス（特定ステータスのみ）
CREATE INDEX idx_weekly_reports_pending 
ON weekly_reports(created_at) 
WHERE status = 'submitted' AND deleted_at IS NULL;
```

### インデックス設計の原則
1. **選択性の高いカラムを左に配置**
2. **WHERE句の条件を考慮した部分インデックス**
3. **カバリングインデックスでI/O削減**
4. **定期的な使用状況の監視と最適化**

## データ整合性の保証

### 1. 制約による保証
```sql
-- CHECK制約
ALTER TABLE expenses 
ADD CONSTRAINT check_amount_positive 
CHECK (amount > 0);

-- 複合ユニーク制約
ALTER TABLE user_departments 
ADD CONSTRAINT uk_user_department 
UNIQUE (user_id, department_id);
```

### 2. トリガーによる保証
```sql
-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 3. アプリケーション層での保証
```go
// ビジネスロジックの検証
func (s *Service) ValidateExpense(expense *Expense) error {
    if expense.Amount <= 0 {
        return ErrInvalidAmount
    }
    
    if expense.Date.After(time.Now()) {
        return ErrFutureDate
    }
    
    // カテゴリの存在確認
    var count int64
    s.db.Model(&Category{}).Where("id = ?", expense.CategoryID).Count(&count)
    if count == 0 {
        return ErrCategoryNotFound
    }
    
    return nil
}
```

## マイグレーション戦略

### 1. スキーマバージョン管理
```bash
# golang-migrate使用
migrate create -ext sql -dir migrations -seq create_users_table
```

### 2. 安全なマイグレーション
```sql
-- カラム追加（NOT NULL制約は段階的に）
ALTER TABLE users ADD COLUMN department_id UUID;
UPDATE users SET department_id = '00000000-0000-0000-0000-000000000000';
ALTER TABLE users ALTER COLUMN department_id SET NOT NULL;
```

### 3. ロールバック対応
```sql
-- up.sql
ALTER TABLE users ADD COLUMN status VARCHAR(20);

-- down.sql
ALTER TABLE users DROP COLUMN status;
```

## パフォーマンス考慮事項

### 1. パーティショニング
```sql
-- 時系列データのパーティショニング
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 2. バキューム戦略
```sql
-- 自動バキュームの調整
ALTER TABLE large_table SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);
```

### 3. 統計情報の更新
```sql
-- 定期的な統計情報更新
ANALYZE weekly_reports;
```

## 関連ドキュメント
- [DDL仕様書](../../docs/03_database/ddl-specification.md)
- [PostgreSQL移行ガイド](../../docs/postgresql-migration/)
- [パフォーマンス最適化](.cursor/rules/performance-optimization.md)