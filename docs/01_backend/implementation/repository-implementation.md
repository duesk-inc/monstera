# リポジトリ層実装仕様書

## 概要

リポジトリ層はデータアクセスを担当し、データベースとの通信を抽象化します。

## 実装規約

### 基本原則

- **インターフェースと実装の分離**: テスタビリティと拡張性の確保
- **共通リポジトリ機能の活用**: BaseRepositoryの積極的な利用
- **コンテキストの受け渡し**: リクエストコンテキストの適切な管理
- **クエリパフォーマンスの考慮**: 効率的なSQL生成
- **IDの妥当性検証**: UUID検証の実装
- **適切なログ記録**: データアクセスの追跡

### 実装構造

```go
// インターフェース定義
type ExampleRepository interface {
    GetItems(ctx context.Context, page, limit int, search string) ([]model.Item, int, error)
    GetItemByID(ctx context.Context, id uuid.UUID) (model.Item, error)
    CreateItem(ctx context.Context, item model.Item) (model.Item, error)
    UpdateItem(ctx context.Context, item model.Item) (model.Item, error)
    DeleteItem(ctx context.Context, id uuid.UUID) error
}

// 実装構造体
type exampleRepository struct {
    repository.BaseRepository
    logger *zap.Logger
}

// コンストラクタ
func NewExampleRepository(db *gorm.DB, logger *zap.Logger) ExampleRepository {
    baseRepo := repository.NewBaseRepository(db, logger)
    
    return &exampleRepository{
        BaseRepository: baseRepo,
        logger:         logger,
    }
}
```

## 実装パターン

### 1. 基本的なCRUD操作

#### 取得処理の実装例

```go
func (r *exampleRepository) GetItems(ctx context.Context, page, limit int, search string) ([]model.Item, int, error) {
    var items []model.Item
    var total int64
    
    // ベースクエリの構築
    query := r.WithContext(ctx).Model(&model.Item{})
    
    // 検索条件の追加
    if search != "" {
        query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
    }
    
    // 総件数の取得
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("総件数の取得に失敗しました: %w", err)
    }
    
    // ページネーション
    offset := (page - 1) * limit
    if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&items).Error; err != nil {
        return nil, 0, fmt.Errorf("アイテム一覧の取得に失敗しました: %w", err)
    }
    
    return items, int(total), nil
}

func (r *exampleRepository) GetItemByID(ctx context.Context, id uuid.UUID) (model.Item, error) {
    // IDの妥当性検証
    if err := r.ValidateID(id); err != nil {
        return model.Item{}, fmt.Errorf("無効なIDです: %w", err)
    }
    
    var item model.Item
    result := r.WithContext(ctx).First(&item, "id = ?", id)
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return model.Item{}, fmt.Errorf("アイテムが見つかりません: %w", result.Error)
        }
        return model.Item{}, fmt.Errorf("アイテムの取得に失敗しました: %w", result.Error)
    }
    
    return item, nil
}
```

#### 作成処理の実装例

```go
func (r *exampleRepository) CreateItem(ctx context.Context, item model.Item) (model.Item, error) {
    // 新しいIDを必ず生成
    if item.ID == uuid.Nil {
        item.ID = r.NewID()
    }
    
    // タイムスタンプの設定
    now := time.Now()
    item.CreatedAt = now
    item.UpdatedAt = now
    
    // 作成実行
    result := r.WithContext(ctx).Create(&item)
    if result.Error != nil {
        return model.Item{}, fmt.Errorf("アイテムの作成に失敗しました: %w", result.Error)
    }
    
    // 作成後データを取得して返す
    var createdItem model.Item
    if err := r.WithContext(ctx).First(&createdItem, "id = ?", item.ID).Error; err != nil {
        return model.Item{}, fmt.Errorf("作成されたアイテムの取得に失敗しました: %w", err)
    }
    
    return createdItem, nil
}
```

#### 更新処理の実装例

```go
func (r *exampleRepository) UpdateItem(ctx context.Context, item model.Item) (model.Item, error) {
    // IDの妥当性検証
    if err := r.ValidateID(item.ID); err != nil {
        return model.Item{}, fmt.Errorf("無効なIDです: %w", err)
    }
    
    // 更新タイムスタンプの設定
    item.UpdatedAt = time.Now()
    
    // 更新実行
    result := r.WithContext(ctx).Save(&item)
    if result.Error != nil {
        return model.Item{}, fmt.Errorf("アイテムの更新に失敗しました: %w", result.Error)
    }
    
    // 更新後データを取得
    var updatedItem model.Item
    if err := r.WithContext(ctx).First(&updatedItem, "id = ?", item.ID).Error; err != nil {
        return model.Item{}, fmt.Errorf("更新されたアイテムの取得に失敗しました: %w", err)
    }
    
    return updatedItem, nil
}
```

#### 削除処理の実装例

```go
func (r *exampleRepository) DeleteItem(ctx context.Context, id uuid.UUID) error {
    // IDの妥当性検証
    if err := r.ValidateID(id); err != nil {
        return fmt.Errorf("無効なIDです: %w", err)
    }
    
    // 削除実行
    result := r.WithContext(ctx).Delete(&model.Item{}, "id = ?", id)
    if result.Error != nil {
        return fmt.Errorf("アイテムの削除に失敗しました: %w", result.Error)
    }
    
    // 削除対象が存在しない場合
    if result.RowsAffected == 0 {
        return fmt.Errorf("削除対象のアイテムが見つかりません")
    }
    
    return nil
}
```

### 2. 関連データを含む操作

#### Preloadを使用した関連データ取得

```go
func (r *exampleRepository) GetItemWithRelations(ctx context.Context, id uuid.UUID) (model.ItemWithRelations, error) {
    if err := r.ValidateID(id); err != nil {
        return model.ItemWithRelations{}, fmt.Errorf("無効なIDです: %w", err)
    }
    
    var item model.ItemWithRelations
    result := r.WithContext(ctx).
        Preload("User").
        Preload("Category").
        Preload("Tags").
        First(&item, "id = ?", id)
    
    if result.Error != nil {
        if errors.Is(result.Error, gorm.ErrRecordNotFound) {
            return model.ItemWithRelations{}, fmt.Errorf("アイテムが見つかりません: %w", result.Error)
        }
        return model.ItemWithRelations{}, fmt.Errorf("アイテムの取得に失敗しました: %w", result.Error)
    }
    
    return item, nil
}

func (r *exampleRepository) GetItemsByUserID(ctx context.Context, userID uuid.UUID, page, limit int) ([]model.Item, int, error) {
    if err := r.ValidateID(userID); err != nil {
        return nil, 0, fmt.Errorf("無効なユーザーIDです: %w", err)
    }
    
    var items []model.Item
    var total int64
    
    // 総件数の取得
    query := r.WithContext(ctx).Model(&model.Item{}).Where("user_id = ?", userID)
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("総件数の取得に失敗しました: %w", err)
    }
    
    // データの取得
    offset := (page - 1) * limit
    if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&items).Error; err != nil {
        return nil, 0, fmt.Errorf("ユーザーのアイテム一覧取得に失敗しました: %w", err)
    }
    
    return items, int(total), nil
}
```

### 3. 複雑なクエリ

#### 条件付き検索

```go
func (r *exampleRepository) SearchItems(ctx context.Context, criteria model.SearchCriteria) ([]model.Item, int, error) {
    var items []model.Item
    var total int64
    
    // ベースクエリの構築
    query := r.WithContext(ctx).Model(&model.Item{})
    
    // 動的な条件の追加
    if criteria.UserID != uuid.Nil {
        query = query.Where("user_id = ?", criteria.UserID)
    }
    
    if criteria.Status != "" {
        query = query.Where("status = ?", criteria.Status)
    }
    
    if criteria.CategoryID != uuid.Nil {
        query = query.Where("category_id = ?", criteria.CategoryID)
    }
    
    if criteria.Search != "" {
        query = query.Where("name ILIKE ? OR description ILIKE ?", 
            "%"+criteria.Search+"%", "%"+criteria.Search+"%")
    }
    
    if !criteria.CreatedAfter.IsZero() {
        query = query.Where("created_at >= ?", criteria.CreatedAfter)
    }
    
    if !criteria.CreatedBefore.IsZero() {
        query = query.Where("created_at <= ?", criteria.CreatedBefore)
    }
    
    // 総件数の取得
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("検索結果の総件数取得に失敗しました: %w", err)
    }
    
    // ソート条件の適用
    orderBy := "created_at DESC"
    if criteria.SortBy != "" {
        orderBy = criteria.SortBy
        if criteria.SortDirection == "ASC" {
            orderBy += " ASC"
        } else {
            orderBy += " DESC"
        }
    }
    
    // ページネーション
    offset := (criteria.Page - 1) * criteria.Limit
    if err := query.Offset(offset).Limit(criteria.Limit).Order(orderBy).Find(&items).Error; err != nil {
        return nil, 0, fmt.Errorf("検索結果の取得に失敗しました: %w", err)
    }
    
    return items, int(total), nil
}
```

#### 集計クエリ

```go
func (r *exampleRepository) GetItemStatsByUser(ctx context.Context, userID uuid.UUID) (model.ItemStats, error) {
    if err := r.ValidateID(userID); err != nil {
        return model.ItemStats{}, fmt.Errorf("無効なユーザーIDです: %w", err)
    }
    
    var stats model.ItemStats
    
    // 基本統計の取得
    err := r.WithContext(ctx).Model(&model.Item{}).
        Select("COUNT(*) as total_count, "+
            "COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count, "+
            "COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count").
        Where("user_id = ?", userID).
        Scan(&stats).Error
    
    if err != nil {
        return model.ItemStats{}, fmt.Errorf("アイテム統計の取得に失敗しました: %w", err)
    }
    
    return stats, nil
}

func (r *exampleRepository) GetItemCountByCategory(ctx context.Context) ([]model.CategoryCount, error) {
    var counts []model.CategoryCount
    
    err := r.WithContext(ctx).Model(&model.Item{}).
        Select("categories.name as category_name, COUNT(items.id) as item_count").
        Joins("LEFT JOIN categories ON items.category_id = categories.id").
        Group("categories.id, categories.name").
        Order("item_count DESC").
        Scan(&counts).Error
    
    if err != nil {
        return nil, fmt.Errorf("カテゴリ別アイテム数の取得に失敗しました: %w", err)
    }
    
    return counts, nil
}
```

### 4. トランザクション対応

#### トランザクション内でのリポジトリ操作

```go
func (r *exampleRepository) CreateItemWithTags(ctx context.Context, item model.Item, tagIDs []uuid.UUID) (model.Item, error) {
    // トランザクション内で実行されることを前提とした処理
    
    // アイテムの作成
    createdItem, err := r.CreateItem(ctx, item)
    if err != nil {
        return model.Item{}, fmt.Errorf("アイテムの作成に失敗しました: %w", err)
    }
    
    // タグの関連付け
    for _, tagID := range tagIDs {
        itemTag := model.ItemTag{
            ID:     r.NewID(),
            ItemID: createdItem.ID,
            TagID:  tagID,
        }
        
        if err := r.WithContext(ctx).Create(&itemTag).Error; err != nil {
            return model.Item{}, fmt.Errorf("タグの関連付けに失敗しました: %w", err)
        }
    }
    
    // 関連データを含む完全なアイテムを取得
    fullItem, err := r.GetItemWithRelations(ctx, createdItem.ID)
    if err != nil {
        return model.Item{}, fmt.Errorf("作成されたアイテムの取得に失敗しました: %w", err)
    }
    
    return model.Item{
        ID:          fullItem.ID,
        UserID:      fullItem.UserID,
        Name:        fullItem.Name,
        Description: fullItem.Description,
        Status:      fullItem.Status,
        CreatedAt:   fullItem.CreatedAt,
        UpdatedAt:   fullItem.UpdatedAt,
    }, nil
}
```

### 5. パフォーマンス最適化

#### バッチ操作

```go
func (r *exampleRepository) CreateItemsBatch(ctx context.Context, items []model.Item) error {
    if len(items) == 0 {
        return nil
    }
    
    // IDとタイムスタンプの設定
    now := time.Now()
    for i := range items {
        if items[i].ID == uuid.Nil {
            items[i].ID = r.NewID()
        }
        items[i].CreatedAt = now
        items[i].UpdatedAt = now
    }
    
    // バッチサイズに分けて処理
    batchSize := 100
    for i := 0; i < len(items); i += batchSize {
        end := i + batchSize
        if end > len(items) {
            end = len(items)
        }
        
        batch := items[i:end]
        if err := r.WithContext(ctx).CreateInBatches(batch, batchSize).Error; err != nil {
            return fmt.Errorf("バッチ作成に失敗しました (バッチ %d-%d): %w", i, end-1, err)
        }
    }
    
    return nil
}

func (r *exampleRepository) UpdateItemsBatch(ctx context.Context, updates []model.ItemUpdate) error {
    if len(updates) == 0 {
        return nil
    }
    
    // トランザクション内で一括更新
    return r.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        for _, update := range updates {
            result := tx.Model(&model.Item{}).
                Where("id = ?", update.ID).
                Updates(map[string]interface{}{
                    "name":        update.Name,
                    "description": update.Description,
                    "status":      update.Status,
                    "updated_at":  time.Now(),
                })
            
            if result.Error != nil {
                return fmt.Errorf("アイテム %s の更新に失敗しました: %w", update.ID, result.Error)
            }
            
            if result.RowsAffected == 0 {
                return fmt.Errorf("アイテム %s が見つかりません", update.ID)
            }
        }
        return nil
    })
}
```

#### インデックス活用

```go
func (r *exampleRepository) GetItemsByUserAndStatus(ctx context.Context, userID uuid.UUID, status string) ([]model.Item, error) {
    if err := r.ValidateID(userID); err != nil {
        return nil, fmt.Errorf("無効なユーザーIDです: %w", err)
    }
    
    var items []model.Item
    
    // 複合インデックス(user_id, status)を活用したクエリ
    err := r.WithContext(ctx).
        Where("user_id = ? AND status = ?", userID, status).
        Order("created_at DESC").
        Find(&items).Error
    
    if err != nil {
        return nil, fmt.Errorf("アイテムの取得に失敗しました: %w", err)
    }
    
    return items, nil
}
```

## 実装時の注意点

### パフォーマンス

1. **インデックス設計**: よく使用される検索条件にインデックスを設定
2. **N+1問題**: Preloadの適切な使用
3. **バッチ処理**: 大量データの効率的な処理
4. **クエリ最適化**: 不要なカラムの取得を避ける

### エラーハンドリング

1. **具体的なエラーメッセージ**: 問題の特定が容易なメッセージ
2. **エラーのラッピング**: 原因エラーの保持
3. **ログ記録**: 適切なレベルでのログ記録
4. **リカバリ処理**: 可能な場合の自動復旧

### セキュリティ

1. **SQLインジェクション対策**: パラメータバインディングの使用
2. **権限チェック**: データアクセス権限の確認
3. **データサニタイゼーション**: 入力値の適切な処理
4. **監査ログ**: 重要な操作の記録

---

## 関連ドキュメント

- [バックエンド仕様書](./backend-specification.md)
- [ハンドラー実装仕様書](./backend-handler-implementation.md)
- [サービス実装仕様書](./backend-service-implementation.md)
- [共通パッケージガイド](./backend-common-packages.md)
- [テスト実装ガイド](./backend-testing-guide.md) 