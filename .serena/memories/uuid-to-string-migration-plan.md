# UUID to String 型移行パターン

## 概要
MonsteraプロジェクトにおけるUUID型からstring型（Cognito Sub）への移行パターン。

## 移行パターン

### 1. モデル層
```go
// Before
type Model struct {
    ID         uuid.UUID  `gorm:"type:varchar(255);primary_key"`
    UserID     uuid.UUID  `gorm:"type:varchar(255)"`
    CreatedBy  *uuid.UUID `gorm:"type:varchar(255)"`
}

// After
type Model struct {
    ID         string  `gorm:"type:varchar(255);primary_key"`
    UserID     string  `gorm:"type:varchar(255)"`
    CreatedBy  *string `gorm:"type:varchar(255)"`
}
```

### 2. リポジトリ層
```go
// Before
type Repository interface {
    GetByID(ctx context.Context, id uuid.UUID) (*model.Model, error)
    FindByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Model, error)
}

// After
type Repository interface {
    GetByID(ctx context.Context, id string) (*model.Model, error)
    FindByUserID(ctx context.Context, userID string) ([]*model.Model, error)
}
```

### 3. サービス層
```go
// Before
func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*dto.Model, error)

// After
func (s *Service) GetByID(ctx context.Context, id string) (*dto.Model, error)
```

### 4. ハンドラー層
```go
// Before
userIDInterface, _ := c.Get("user_id")
userID := userIDInterface.(uuid.UUID) // パニックの可能性

// After
userIDInterface, _ := c.Get("user_id")
userID := userIDInterface.(string) // 安全
```

### 5. DTO層
```go
// Before
type ModelDTO struct {
    ID     uuid.UUID `json:"id"`
    UserID uuid.UUID `json:"user_id"`
}

// After
type ModelDTO struct {
    ID     string `json:"id"`
    UserID string `json:"user_id"`
}
```

## 移行時の注意点

1. **段階的移行**
   - 各層を独立して移行
   - 各段階でテスト実施

2. **型の一貫性**
   - 全ての層で統一した型を使用
   - 混在期間を最小限に

3. **テスト戦略**
   - 既存テストの型修正
   - 境界テストの追加

4. **パフォーマンス**
   - string比較は問題なし
   - インデックスの確認

## 一時的な互換性対応

移行期間中のみ使用する変換関数：
```go
func adaptUUIDToString(id interface{}) string {
    switch v := id.(type) {
    case uuid.UUID:
        return v.String()
    case string:
        return v
    default:
        return ""
    }
}
```

## システムユーザーID
- 形式: `system-00000000-0000-0000-0000-000000000000`
- 用途: 未認証アクションの記録用