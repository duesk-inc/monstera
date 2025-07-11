# サービス層実装仕様書

## 概要

サービス層はビジネスロジックを実装し、必要に応じて複数のリポジトリを組み合わせて処理を行います。

## 実装規約

### 基本原則

- **インターフェースと実装の分離**: テスタビリティと拡張性の確保
- **トランザクション管理**: データ整合性の保証
- **複数リポジトリの調整**: 関連するデータの一貫性確保
- **ビジネスルールの検証**: ドメインロジックの適切な実装
- **DTO⇔モデル間の変換**: データ形式の適切な変換
- **詳細なログ記録**: 処理の追跡とデバッグ支援

### 実装構造

```go
// インターフェース定義
type ExampleService interface {
    GetItems(ctx context.Context, page, limit int, search string) ([]dto.ItemResponse, int, error)
    GetItemByID(ctx context.Context, id uuid.UUID) (dto.ItemResponse, error)
    CreateItem(ctx context.Context, req dto.CreateItemRequest) (dto.ItemResponse, error)
    UpdateItem(ctx context.Context, req dto.UpdateItemRequest) (dto.ItemResponse, error)
    DeleteItem(ctx context.Context, id, userID uuid.UUID) error
}

// 実装構造体
type exampleService struct {
    txManager    transaction.TransactionManager
    itemRepo     repository.ItemRepository
    userRepo     repository.UserRepository
    logger       *zap.Logger
}

// コンストラクタ
func NewExampleService(db *gorm.DB, itemRepo repository.ItemRepository, userRepo repository.UserRepository, logger *zap.Logger) ExampleService {
    return &exampleService{
        txManager: transaction.NewTransactionManager(db, logger),
        itemRepo:  itemRepo,
        userRepo:  userRepo,
        logger:    logger,
    }
}
```

## 実装パターン

### 1. 基本的なCRUD操作

#### 取得処理の実装例

```go
func (s *exampleService) GetItems(ctx context.Context, page, limit int, search string) ([]dto.ItemResponse, int, error) {
    logger.LogInfo(s.logger, "アイテム一覧取得開始",
        zap.Int("page", page),
        zap.Int("limit", limit),
        zap.String("search", search))
    
    // リポジトリから取得
    items, total, err := s.itemRepo.GetItems(ctx, page, limit, search)
    if err != nil {
        return nil, 0, logger.LogAndWrapError(s.logger, err, "アイテム一覧の取得に失敗しました")
    }
    
    // DTOに変換
    responses := make([]dto.ItemResponse, len(items))
    for i, item := range items {
        responses[i] = s.itemToResponse(item)
    }
    
    logger.LogInfo(s.logger, "アイテム一覧取得完了",
        zap.Int("count", len(responses)),
        zap.Int("total", total))
    
    return responses, total, nil
}

func (s *exampleService) GetItemByID(ctx context.Context, id uuid.UUID) (dto.ItemResponse, error) {
    logger.LogInfo(s.logger, "アイテム取得開始",
        zap.String("item_id", id.String()))
    
    // バリデーション
    if id == uuid.Nil {
        return dto.ItemResponse{}, errors.New("無効なアイテムIDです")
    }
    
    // リポジトリから取得
    item, err := s.itemRepo.GetItemByID(ctx, id)
    if err != nil {
        return dto.ItemResponse{}, logger.LogAndWrapError(s.logger, err, "アイテムの取得に失敗しました")
    }
    
    response := s.itemToResponse(item)
    
    logger.LogInfo(s.logger, "アイテム取得完了",
        zap.String("item_id", response.ID))
    
    return response, nil
}
```

#### 作成処理の実装例

```go
func (s *exampleService) CreateItem(ctx context.Context, req dto.CreateItemRequest) (dto.ItemResponse, error) {
    logger.LogInfo(s.logger, "アイテム作成開始",
        zap.String("user_id", req.UserID.String()),
        zap.String("name", req.Name))
    
    // バリデーション
    if err := s.validateCreateRequest(ctx, req); err != nil {
        return dto.ItemResponse{}, logger.LogAndWrapError(s.logger, err, "作成リクエストのバリデーションに失敗しました")
    }
    
    // DTOからモデルへの変換
    item := model.Item{
        ID:          uuid.New(),
        UserID:      req.UserID,
        Name:        req.Name,
        Description: req.Description,
        Status:      "active",
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
    
    var response dto.ItemResponse
    
    // トランザクション内で実行
    err := s.executeInTransaction(ctx, func(tx *gorm.DB) error {
        // トランザクション用のリポジトリを作成
        txItemRepo := repository.NewItemRepository(tx, s.logger)
        
        // アイテムを作成
        createdItem, err := txItemRepo.CreateItem(ctx, item)
        if err != nil {
            return logger.LogAndWrapError(s.logger, err, "アイテムの作成に失敗しました")
        }
        
        // レスポンスの作成
        response = s.itemToResponse(createdItem)
        
        return nil
    })
    
    if err != nil {
        return dto.ItemResponse{}, err
    }
    
    logger.LogInfo(s.logger, "アイテム作成完了",
        zap.String("item_id", response.ID))
    
    return response, nil
}
```

#### 更新処理の実装例

```go
func (s *exampleService) UpdateItem(ctx context.Context, req dto.UpdateItemRequest) (dto.ItemResponse, error) {
    logger.LogInfo(s.logger, "アイテム更新開始",
        zap.String("item_id", req.ID.String()),
        zap.String("user_id", req.UserID.String()))
    
    // バリデーション
    if err := s.validateUpdateRequest(ctx, req); err != nil {
        return dto.ItemResponse{}, logger.LogAndWrapError(s.logger, err, "更新リクエストのバリデーションに失敗しました")
    }
    
    var response dto.ItemResponse
    
    // トランザクション内で実行
    err := s.executeInTransaction(ctx, func(tx *gorm.DB) error {
        txItemRepo := repository.NewItemRepository(tx, s.logger)
        
        // 既存アイテムの取得
        existingItem, err := txItemRepo.GetItemByID(ctx, req.ID)
        if err != nil {
            return logger.LogAndWrapError(s.logger, err, "更新対象のアイテムが見つかりません")
        }
        
        // 権限チェック
        if existingItem.UserID != req.UserID {
            return errors.New("このアイテムを更新する権限がありません")
        }
        
        // 更新データの準備
        existingItem.Name = req.Name
        existingItem.Description = req.Description
        existingItem.UpdatedAt = time.Now()
        
        // 更新実行
        updatedItem, err := txItemRepo.UpdateItem(ctx, existingItem)
        if err != nil {
            return logger.LogAndWrapError(s.logger, err, "アイテムの更新に失敗しました")
        }
        
        response = s.itemToResponse(updatedItem)
        
        return nil
    })
    
    if err != nil {
        return dto.ItemResponse{}, err
    }
    
    logger.LogInfo(s.logger, "アイテム更新完了",
        zap.String("item_id", response.ID))
    
    return response, nil
}
```

#### 削除処理の実装例

```go
func (s *exampleService) DeleteItem(ctx context.Context, id, userID uuid.UUID) error {
    logger.LogInfo(s.logger, "アイテム削除開始",
        zap.String("item_id", id.String()),
        zap.String("user_id", userID.String()))
    
    // バリデーション
    if id == uuid.Nil || userID == uuid.Nil {
        return errors.New("無効なIDです")
    }
    
    // トランザクション内で実行
    err := s.executeInTransaction(ctx, func(tx *gorm.DB) error {
        txItemRepo := repository.NewItemRepository(tx, s.logger)
        
        // 既存アイテムの取得
        existingItem, err := txItemRepo.GetItemByID(ctx, id)
        if err != nil {
            return logger.LogAndWrapError(s.logger, err, "削除対象のアイテムが見つかりません")
        }
        
        // 権限チェック
        if existingItem.UserID != userID {
            return errors.New("このアイテムを削除する権限がありません")
        }
        
        // 削除実行
        if err := txItemRepo.DeleteItem(ctx, id); err != nil {
            return logger.LogAndWrapError(s.logger, err, "アイテムの削除に失敗しました")
        }
        
        return nil
    })
    
    if err != nil {
        return err
    }
    
    logger.LogInfo(s.logger, "アイテム削除完了",
        zap.String("item_id", id.String()))
    
    return nil
}
```

### 2. トランザクション管理

#### トランザクション実行ヘルパー

```go
// トランザクション実行ヘルパー
func (s *exampleService) executeInTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
    return s.txManager.ExecuteInTransaction(ctx, func(tx *gorm.DB) error {
        return fn(tx)
    })
}

// 複雑なトランザクション処理の例
func (s *exampleService) CreateItemWithRelations(ctx context.Context, req dto.CreateItemWithRelationsRequest) (dto.ItemResponse, error) {
    logger.LogInfo(s.logger, "関連データ付きアイテム作成開始")
    
    var response dto.ItemResponse
    
    err := s.executeInTransaction(ctx, func(tx *gorm.DB) error {
        // 各リポジトリのトランザクション版を作成
        txItemRepo := repository.NewItemRepository(tx, s.logger)
        txCategoryRepo := repository.NewCategoryRepository(tx, s.logger)
        txTagRepo := repository.NewTagRepository(tx, s.logger)
        
        // 1. アイテムの作成
        item := model.Item{
            ID:          uuid.New(),
            UserID:      req.UserID,
            Name:        req.Name,
            Description: req.Description,
            Status:      "active",
            CreatedAt:   time.Now(),
            UpdatedAt:   time.Now(),
        }
        
        createdItem, err := txItemRepo.CreateItem(ctx, item)
        if err != nil {
            return fmt.Errorf("アイテムの作成に失敗しました: %w", err)
        }
        
        // 2. カテゴリの関連付け
        if req.CategoryID != uuid.Nil {
            if err := txCategoryRepo.AssignItemToCategory(ctx, createdItem.ID, req.CategoryID); err != nil {
                return fmt.Errorf("カテゴリの関連付けに失敗しました: %w", err)
            }
        }
        
        // 3. タグの関連付け
        for _, tagID := range req.TagIDs {
            if err := txTagRepo.AssignItemToTag(ctx, createdItem.ID, tagID); err != nil {
                return fmt.Errorf("タグの関連付けに失敗しました: %w", err)
            }
        }
        
        // 4. 完全なデータを再取得
        fullItem, err := txItemRepo.GetItemWithRelations(ctx, createdItem.ID)
        if err != nil {
            return fmt.Errorf("作成されたアイテムの取得に失敗しました: %w", err)
        }
        
        response = s.itemWithRelationsToResponse(fullItem)
        
        return nil
    })
    
    if err != nil {
        return dto.ItemResponse{}, err
    }
    
    logger.LogInfo(s.logger, "関連データ付きアイテム作成完了",
        zap.String("item_id", response.ID))
    
    return response, nil
}
```

### 3. バリデーション

#### ビジネスルールの検証

```go
// 作成リクエストのバリデーション
func (s *exampleService) validateCreateRequest(ctx context.Context, req dto.CreateItemRequest) error {
    // 基本的なバリデーション
    if req.UserID == uuid.Nil {
        return errors.New("ユーザーIDが必要です")
    }
    
    if strings.TrimSpace(req.Name) == "" {
        return errors.New("アイテム名が必要です")
    }
    
    if len(req.Name) > 100 {
        return errors.New("アイテム名は100文字以下で入力してください")
    }
    
    // ユーザーの存在確認
    _, err := s.userRepo.GetUserByID(ctx, req.UserID)
    if err != nil {
        return logger.LogAndWrapError(s.logger, err, "指定されたユーザーが見つかりません")
    }
    
    // 重複チェック
    existingItem, err := s.itemRepo.GetItemByUserAndName(ctx, req.UserID, req.Name)
    if err == nil && existingItem.ID != uuid.Nil {
        return errors.New("同じ名前のアイテムが既に存在します")
    }
    
    return nil
}

// 更新リクエストのバリデーション
func (s *exampleService) validateUpdateRequest(ctx context.Context, req dto.UpdateItemRequest) error {
    // 基本的なバリデーション
    if req.ID == uuid.Nil {
        return errors.New("アイテムIDが必要です")
    }
    
    if req.UserID == uuid.Nil {
        return errors.New("ユーザーIDが必要です")
    }
    
    if strings.TrimSpace(req.Name) == "" {
        return errors.New("アイテム名が必要です")
    }
    
    if len(req.Name) > 100 {
        return errors.New("アイテム名は100文字以下で入力してください")
    }
    
    // 重複チェック（自分以外）
    existingItem, err := s.itemRepo.GetItemByUserAndName(ctx, req.UserID, req.Name)
    if err == nil && existingItem.ID != uuid.Nil && existingItem.ID != req.ID {
        return errors.New("同じ名前のアイテムが既に存在します")
    }
    
    return nil
}
```

### 4. データ変換

#### DTO変換メソッド

```go
// モデルからDTOへの変換
func (s *exampleService) itemToResponse(item model.Item) dto.ItemResponse {
    return dto.ItemResponse{
        ID:          item.ID.String(),
        UserID:      item.UserID.String(),
        Name:        item.Name,
        Description: item.Description,
        Status:      item.Status,
        CreatedAt:   item.CreatedAt.Format(time.RFC3339),
        UpdatedAt:   item.UpdatedAt.Format(time.RFC3339),
    }
}

// 関連データ付きモデルからDTOへの変換
func (s *exampleService) itemWithRelationsToResponse(item model.ItemWithRelations) dto.ItemWithRelationsResponse {
    response := dto.ItemWithRelationsResponse{
        ID:          item.ID.String(),
        UserID:      item.UserID.String(),
        Name:        item.Name,
        Description: item.Description,
        Status:      item.Status,
        CreatedAt:   item.CreatedAt.Format(time.RFC3339),
        UpdatedAt:   item.UpdatedAt.Format(time.RFC3339),
    }
    
    // カテゴリ情報の設定
    if item.Category != nil {
        response.Category = &dto.CategoryResponse{
            ID:   item.Category.ID.String(),
            Name: item.Category.Name,
        }
    }
    
    // タグ情報の設定
    response.Tags = make([]dto.TagResponse, len(item.Tags))
    for i, tag := range item.Tags {
        response.Tags[i] = dto.TagResponse{
            ID:   tag.ID.String(),
            Name: tag.Name,
        }
    }
    
    return response
}

// DTOからモデルへの変換
func (s *exampleService) createRequestToModel(req dto.CreateItemRequest) model.Item {
    return model.Item{
        ID:          uuid.New(),
        UserID:      req.UserID,
        Name:        req.Name,
        Description: req.Description,
        Status:      "active",
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
}
```

#### ステータス値の管理

```go
// ステータス定数の定義（データベースのENUM値と完全一致）
const (
    ItemStatusDraft     = "draft"
    ItemStatusActive    = "active"
    ItemStatusInactive  = "inactive"
    ItemStatusArchived  = "archived"
)

// 既存INT型ステータスとの互換性維持（移行期間中のみ）
var legacyStatusMap = map[int]string{
    1: ItemStatusDraft,
    2: ItemStatusActive,
    3: ItemStatusInactive,
    4: ItemStatusArchived,
}

// INT型からstring型への変換ヘルパー
func (s *exampleService) convertLegacyStatus(intStatus int) string {
    if status, ok := legacyStatusMap[intStatus]; ok {
        return status
    }
    return ItemStatusDraft // デフォルト値
}

// 移行期間中のデータ読み込み例
func (s *exampleService) itemToResponseWithLegacySupport(item model.Item) dto.ItemResponse {
    response := dto.ItemResponse{
        ID:          item.ID.String(),
        UserID:      item.UserID.String(),
        Name:        item.Name,
        Description: item.Description,
        CreatedAt:   item.CreatedAt.Format(time.RFC3339),
        UpdatedAt:   item.UpdatedAt.Format(time.RFC3339),
    }
    
    // 既存のINT型フィールドがある場合の変換
    if item.LegacyStatus != nil {
        response.Status = s.convertLegacyStatus(*item.LegacyStatus)
    } else {
        response.Status = item.Status // 新しいstring型フィールド
    }
    
    return response
}

// ステータス更新の実装例
func (s *exampleService) UpdateItemStatus(ctx context.Context, itemID uuid.UUID, newStatus string) error {
    // ステータスのバリデーション
    validStatuses := []string{ItemStatusDraft, ItemStatusActive, ItemStatusInactive, ItemStatusArchived}
    isValid := false
    for _, valid := range validStatuses {
        if newStatus == valid {
            isValid = true
            break
        }
    }
    
    if !isValid {
        return fmt.Errorf("無効なステータス値です: %s", newStatus)
    }
    
    // 更新処理
    return s.executeInTransaction(ctx, func(tx *gorm.DB) error {
        txItemRepo := repository.NewItemRepository(tx, s.logger)
        
        item, err := txItemRepo.GetItemByID(ctx, itemID)
        if err != nil {
            return err
        }
        
        item.Status = newStatus
        item.UpdatedAt = time.Now()
        
        _, err = txItemRepo.UpdateItem(ctx, item)
        return err
    })
}
```

### 5. エラーハンドリング

#### 階層的エラーハンドリング

```go
// ビジネスエラーの定義
var (
    ErrItemNotFound      = errors.New("アイテムが見つかりません")
    ErrUnauthorized      = errors.New("この操作を実行する権限がありません")
    ErrDuplicateItem     = errors.New("同じ名前のアイテムが既に存在します")
    ErrInvalidInput      = errors.New("入力値が不正です")
)

// エラーの分類と処理
func (s *exampleService) handleRepositoryError(err error, operation string) error {
    if err == nil {
        return nil
    }
    
    // 特定のエラーパターンを識別
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return logger.LogAndWrapError(s.logger, ErrItemNotFound, operation+"で対象が見つかりませんでした")
    }
    
    // データベース制約違反
    if strings.Contains(err.Error(), "duplicate key") {
        return logger.LogAndWrapError(s.logger, ErrDuplicateItem, operation+"で重複エラーが発生しました")
    }
    
    // その他のエラー
    return logger.LogAndWrapError(s.logger, err, operation+"で予期しないエラーが発生しました")
}
```

## 実装時の注意点

### トランザクション設計

1. **適切な境界設定**: ビジネストランザクションの単位でトランザクションを設定
2. **デッドロック対策**: リソースの取得順序を統一
3. **長時間実行の回避**: 大量データ処理時の分割処理
4. **エラー時のロールバック**: 例外発生時の適切な処理

### パフォーマンス最適化

1. **N+1問題の回避**: 適切なPreloadの使用
2. **バッチ処理**: 大量データの効率的な処理
3. **キャッシュ活用**: 頻繁にアクセスされるデータのキャッシュ
4. **インデックス最適化**: クエリパフォーマンスの向上

### ログ記録

1. **処理開始・完了**: 主要な処理の開始と完了をログ記録
2. **エラー詳細**: エラー発生時の詳細な情報記録
3. **パフォーマンス**: 処理時間の測定と記録
4. **セキュリティ**: 認証・認可関連の操作記録

---

## 関連ドキュメント

- [バックエンド仕様書](./backend-specification.md)
- [ハンドラー実装仕様書](./backend-handler-implementation.md)
- [リポジトリ実装仕様書](./backend-repository-implementation.md)
- [認証実装仕様書](./backend-auth-implementation.md)
- [共通パッケージガイド](./backend-common-packages.md) 