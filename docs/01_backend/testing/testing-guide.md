# テスト実装ガイド

## 概要

本ドキュメントはバックエンドシステムのテスト戦略と実装方法を定義します。

## テスト戦略

### テストピラミッド

```
        E2E Tests (少数)
       /               \
  Integration Tests (中程度)
 /                           \
Unit Tests (多数・高速)
```

### テストカテゴリ

- **ユニットテスト**: 個別の関数・メソッドのテスト
- **統合テスト**: 複数のコンポーネント間の連携テスト
- **E2Eテスト**: エンドツーエンドのシナリオテスト

## ユニットテスト

### 1. サービス層のテスト

#### テスト構造

```go
func TestExampleService_CreateItem(t *testing.T) {
    // テストケースの定義
    tests := []struct {
        name          string
        input         dto.CreateItemRequest
        mockSetup     func(*mock.MockItemRepository, *mock.MockUserRepository)
        expected      dto.ItemResponse
        expectedError string
    }{
        {
            name: "正常なアイテム作成",
            input: dto.CreateItemRequest{
                UserID:      uuid.New(),
                Name:        "テストアイテム",
                Description: "テスト用のアイテムです",
            },
            mockSetup: func(mockItemRepo *mock.MockItemRepository, mockUserRepo *mock.MockUserRepository) {
                userID := uuid.New()
                
                // ユーザー存在確認のモック
                mockUserRepo.EXPECT().
                    GetUserByID(gomock.Any(), userID).
                    Return(model.User{ID: userID}, nil)
                
                // 重複チェックのモック
                mockItemRepo.EXPECT().
                    GetItemByUserAndName(gomock.Any(), userID, "テストアイテム").
                    Return(model.Item{}, gorm.ErrRecordNotFound)
                
                // アイテム作成のモック
                mockItemRepo.EXPECT().
                    CreateItem(gomock.Any(), gomock.Any()).
                    DoAndReturn(func(ctx context.Context, item model.Item) (model.Item, error) {
                        item.ID = uuid.New()
                        item.CreatedAt = time.Now()
                        item.UpdatedAt = time.Now()
                        return item, nil
                    })
            },
            expected: dto.ItemResponse{
                Name:        "テストアイテム",
                Description: "テスト用のアイテムです",
                Status:      "active",
            },
        },
        {
            name: "存在しないユーザーでの作成失敗",
            input: dto.CreateItemRequest{
                UserID:      uuid.New(),
                Name:        "テストアイテム",
                Description: "テスト用のアイテムです",
            },
            mockSetup: func(mockItemRepo *mock.MockItemRepository, mockUserRepo *mock.MockUserRepository) {
                userID := uuid.New()
                
                mockUserRepo.EXPECT().
                    GetUserByID(gomock.Any(), userID).
                    Return(model.User{}, gorm.ErrRecordNotFound)
            },
            expectedError: "指定されたユーザーが見つかりません",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // モックの準備
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()
            
            mockItemRepo := mock.NewMockItemRepository(ctrl)
            mockUserRepo := mock.NewMockUserRepository(ctrl)
            mockLogger := zaptest.NewLogger(t)
            
            // モックの設定
            if tt.mockSetup != nil {
                tt.mockSetup(mockItemRepo, mockUserRepo)
            }
            
            // サービスの初期化
            service := NewExampleService(nil, mockItemRepo, mockUserRepo, mockLogger)
            
            // テスト実行
            result, err := service.CreateItem(context.Background(), tt.input)
            
            // 結果の検証
            if tt.expectedError != "" {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.expectedError)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expected.Name, result.Name)
                assert.Equal(t, tt.expected.Description, result.Description)
                assert.Equal(t, tt.expected.Status, result.Status)
                assert.NotEmpty(t, result.ID)
                assert.NotEmpty(t, result.CreatedAt)
            }
        })
    }
}
```

### 2. リポジトリ層のテスト

#### テストデータベースのセットアップ

```go
func setupTestDB(t *testing.T) *gorm.DB {
    // テスト用のインメモリSQLiteデータベース
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Silent),
    })
    require.NoError(t, err)
    
    // マイグレーション実行
    err = db.AutoMigrate(&model.User{}, &model.Item{}, &model.Category{}, &model.Tag{})
    require.NoError(t, err)
    
    return db
}

func TestItemRepository_CreateItem(t *testing.T) {
    db := setupTestDB(t)
    logger := zaptest.NewLogger(t)
    repo := NewItemRepository(db, logger)
    
    // テストデータの準備
    userID := uuid.New()
    item := model.Item{
        UserID:      userID,
        Name:        "テストアイテム",
        Description: "テスト用のアイテムです",
        Status:      "active",
    }
    
    // テスト実行
    createdItem, err := repo.CreateItem(context.Background(), item)
    
    // 結果の検証
    assert.NoError(t, err)
    assert.NotEqual(t, uuid.Nil, createdItem.ID)
    assert.Equal(t, item.UserID, createdItem.UserID)
    assert.Equal(t, item.Name, createdItem.Name)
    assert.Equal(t, item.Description, createdItem.Description)
    assert.Equal(t, item.Status, createdItem.Status)
    assert.False(t, createdItem.CreatedAt.IsZero())
    assert.False(t, createdItem.UpdatedAt.IsZero())
    
    // データベースから直接確認
    var dbItem model.Item
    err = db.First(&dbItem, "id = ?", createdItem.ID).Error
    assert.NoError(t, err)
    assert.Equal(t, createdItem.Name, dbItem.Name)
}

func TestItemRepository_GetItems(t *testing.T) {
    db := setupTestDB(t)
    logger := zaptest.NewLogger(t)
    repo := NewItemRepository(db, logger)
    
    // テストデータの作成
    userID := uuid.New()
    items := []model.Item{
        {
            ID:          uuid.New(),
            UserID:      userID,
            Name:        "アイテム1",
            Description: "説明1",
            Status:      "active",
            CreatedAt:   time.Now().Add(-2 * time.Hour),
            UpdatedAt:   time.Now().Add(-2 * time.Hour),
        },
        {
            ID:          uuid.New(),
            UserID:      userID,
            Name:        "アイテム2",
            Description: "説明2",
            Status:      "active",
            CreatedAt:   time.Now().Add(-1 * time.Hour),
            UpdatedAt:   time.Now().Add(-1 * time.Hour),
        },
    }
    
    for _, item := range items {
        db.Create(&item)
    }
    
    // テスト実行
    results, total, err := repo.GetItems(context.Background(), 1, 10, "")
    
    // 結果の検証
    assert.NoError(t, err)
    assert.Equal(t, 2, total)
    assert.Len(t, results, 2)
    
    // 作成順序の逆順（新しい順）で取得されることを確認
    assert.Equal(t, "アイテム2", results[0].Name)
    assert.Equal(t, "アイテム1", results[1].Name)
}
```

### 3. ハンドラー層のテスト

#### HTTPテストの実装

```go
func TestExampleHandler_GetItems(t *testing.T) {
    // モックの準備
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    
    mockService := mock.NewMockExampleService(ctrl)
    logger := zaptest.NewLogger(t)
    handler := NewExampleHandler(mockService, logger)
    
    // テストケース
    tests := []struct {
        name           string
        queryParams    string
        mockSetup      func(*mock.MockExampleService)
        expectedStatus int
        expectedBody   string
    }{
        {
            name:        "正常な一覧取得",
            queryParams: "?page=1&limit=10",
            mockSetup: func(mockService *mock.MockExampleService) {
                items := []dto.ItemResponse{
                    {
                        ID:          uuid.New().String(),
                        Name:        "テストアイテム1",
                        Description: "説明1",
                        Status:      "active",
                    },
                }
                
                mockService.EXPECT().
                    GetItems(gomock.Any(), 1, 10, "").
                    Return(items, 1, nil)
            },
            expectedStatus: http.StatusOK,
        },
        {
            name:        "無効なページ番号",
            queryParams: "?page=0&limit=10",
            mockSetup:   func(mockService *mock.MockExampleService) {},
            expectedStatus: http.StatusBadRequest,
            expectedBody: "無効なページ番号です",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // モックの設定
            tt.mockSetup(mockService)
            
            // リクエストの作成
            req, _ := http.NewRequest("GET", "/items"+tt.queryParams, nil)
            w := httptest.NewRecorder()
            
            // Ginコンテキストの作成
            gin.SetMode(gin.TestMode)
            c, _ := gin.CreateTestContext(w)
            c.Request = req
            
            // ハンドラー実行
            handler.GetItems(c)
            
            // 結果の検証
            assert.Equal(t, tt.expectedStatus, w.Code)
            
            if tt.expectedBody != "" {
                assert.Contains(t, w.Body.String(), tt.expectedBody)
            }
        })
    }
}

func TestExampleHandler_CreateItem(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()
    
    mockService := mock.NewMockExampleService(ctrl)
    logger := zaptest.NewLogger(t)
    handler := NewExampleHandler(mockService, logger)
    
    // 認証済みユーザーのモック
    userID := uuid.New()
    
    // 正常なケース
    t.Run("正常なアイテム作成", func(t *testing.T) {
        // リクエストボディ
        requestBody := `{
            "name": "新しいアイテム",
            "description": "説明"
        }`
        
        // レスポンスのモック
        expectedResponse := dto.ItemResponse{
            ID:          uuid.New().String(),
            UserID:      userID.String(),
            Name:        "新しいアイテム",
            Description: "説明",
            Status:      "active",
        }
        
        mockService.EXPECT().
            CreateItem(gomock.Any(), gomock.Any()).
            DoAndReturn(func(ctx context.Context, req dto.CreateItemRequest) (dto.ItemResponse, error) {
                assert.Equal(t, userID, req.UserID)
                assert.Equal(t, "新しいアイテム", req.Name)
                assert.Equal(t, "説明", req.Description)
                return expectedResponse, nil
            })
        
        // リクエストの作成
        req, _ := http.NewRequest("POST", "/items", strings.NewReader(requestBody))
        req.Header.Set("Content-Type", "application/json")
        w := httptest.NewRecorder()
        
        // Ginコンテキストの作成
        gin.SetMode(gin.TestMode)
        c, _ := gin.CreateTestContext(w)
        c.Request = req
        c.Set("user_id", userID) // 認証済みユーザーIDを設定
        
        // ハンドラー実行
        handler.CreateItem(c)
        
        // 結果の検証
        assert.Equal(t, http.StatusCreated, w.Code)
        
        var response dto.ItemResponse
        err := json.Unmarshal(w.Body.Bytes(), &response)
        assert.NoError(t, err)
        assert.Equal(t, expectedResponse.Name, response.Name)
    })
}
```

## 統合テスト

### 1. データベース統合テスト

#### テストコンテナの使用

```go
func setupTestContainer(t *testing.T) (testcontainers.Container, *gorm.DB) {
    ctx := context.Background()
    
    // MySQLコンテナの起動
    req := testcontainers.ContainerRequest{
        Image:        "mysql:8.0",
        ExposedPorts: []string{"3306/tcp"},
        Env: map[string]string{
            "MYSQL_ROOT_PASSWORD": "testpass",
            "MYSQL_USER":          "testuser",
            "MYSQL_PASSWORD":      "testpass",
            "MYSQL_DATABASE":      "testdb",
        },
        WaitingFor: wait.ForListeningPort("3306/tcp"),
    }
    
    mysql, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    require.NoError(t, err)
    
    // データベース接続
    host, _ := mysql.Host(ctx)
    port, _ := mysql.MappedPort(ctx, "3306")
    
    dsn := fmt.Sprintf("testuser:testpass@tcp(%s:%s)/testdb?charset=utf8mb4&parseTime=True&loc=Local",
        host, port.Port())
    
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    require.NoError(t, err)
    
    // マイグレーション
    err = db.AutoMigrate(&model.User{}, &model.Item{}, &model.Category{}, &model.Tag{})
    require.NoError(t, err)
    
    return mysql, db
}

func TestCreateItemWithTags_Integration(t *testing.T) {
    container, db := setupTestContainer(t)
    defer container.Terminate(context.Background())
    
    logger := zaptest.NewLogger(t)
    
    // リポジトリの初期化
    itemRepo := NewItemRepository(db, logger)
    tagRepo := NewTagRepository(db, logger)
    
    // サービスの初期化
    service := NewExampleService(db, itemRepo, nil, logger)
    
    // テストデータの準備
    userID := uuid.New()
    
    // タグの作成
    tag1 := model.Tag{ID: uuid.New(), Name: "タグ1", CreatedAt: time.Now()}
    tag2 := model.Tag{ID: uuid.New(), Name: "タグ2", CreatedAt: time.Now()}
    
    db.Create(&tag1)
    db.Create(&tag2)
    
    // アイテム作成リクエスト
    req := dto.CreateItemWithRelationsRequest{
        UserID:      userID,
        Name:        "テストアイテム",
        Description: "説明",
        TagIDs:      []uuid.UUID{tag1.ID, tag2.ID},
    }
    
    // テスト実行
    response, err := service.CreateItemWithRelations(context.Background(), req)
    
    // 結果の検証
    assert.NoError(t, err)
    assert.NotEmpty(t, response.ID)
    assert.Equal(t, req.Name, response.Name)
    assert.Len(t, response.Tags, 2)
    
    // データベースから直接確認
    var dbItem model.Item
    err = db.Preload("Tags").First(&dbItem, "id = ?", response.ID).Error
    assert.NoError(t, err)
    assert.Len(t, dbItem.Tags, 2)
}
```

### 2. API統合テスト

#### エンドツーエンドAPIテスト

```go
func TestItemAPI_Integration(t *testing.T) {
    // テストサーバーのセットアップ
    container, db := setupTestContainer(t)
    defer container.Terminate(context.Background())
    
    logger := zaptest.NewLogger(t)
    
    // 依存性の初期化
    itemRepo := NewItemRepository(db, logger)
    userRepo := NewUserRepository(db, logger)
    itemService := NewExampleService(db, itemRepo, userRepo, logger)
    itemHandler := NewExampleHandler(itemService, logger)
    
    // Ginルーターのセットアップ
    gin.SetMode(gin.TestMode)
    router := gin.New()
    
    // 認証ミドルウェアのモック
    router.Use(func(c *gin.Context) {
        c.Set("user_id", uuid.New())
        c.Next()
    })
    
    // ルートの設定
    v1 := router.Group("/api/v1")
    {
        items := v1.Group("/items")
        {
            items.GET("", itemHandler.GetItems)
            items.POST("", itemHandler.CreateItem)
            items.GET("/:id", itemHandler.GetItemByID)
            items.PUT("/:id", itemHandler.UpdateItem)
            items.DELETE("/:id", itemHandler.DeleteItem)
        }
    }
    
    // テストサーバーの起動
    server := httptest.NewServer(router)
    defer server.Close()
    
    client := &http.Client{}
    
    // シナリオテスト: アイテムの作成から削除まで
    t.Run("アイテムのCRUDシナリオ", func(t *testing.T) {
        // 1. アイテムの作成
        createBody := `{
            "name": "統合テストアイテム",
            "description": "統合テスト用のアイテムです"
        }`
        
        createReq, _ := http.NewRequest("POST", server.URL+"/api/v1/items", strings.NewReader(createBody))
        createReq.Header.Set("Content-Type", "application/json")
        
        createResp, err := client.Do(createReq)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusCreated, createResp.StatusCode)
        
        var createdItem dto.ItemResponse
        json.NewDecoder(createResp.Body).Decode(&createdItem)
        createResp.Body.Close()
        
        assert.NotEmpty(t, createdItem.ID)
        assert.Equal(t, "統合テストアイテム", createdItem.Name)
        
        // 2. アイテムの取得
        getReq, _ := http.NewRequest("GET", server.URL+"/api/v1/items/"+createdItem.ID, nil)
        getResp, err := client.Do(getReq)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusOK, getResp.StatusCode)
        
        var retrievedItem dto.ItemResponse
        json.NewDecoder(getResp.Body).Decode(&retrievedItem)
        getResp.Body.Close()
        
        assert.Equal(t, createdItem.ID, retrievedItem.ID)
        assert.Equal(t, createdItem.Name, retrievedItem.Name)
        
        // 3. アイテムの更新
        updateBody := `{
            "name": "更新されたアイテム",
            "description": "更新された説明"
        }`
        
        updateReq, _ := http.NewRequest("PUT", server.URL+"/api/v1/items/"+createdItem.ID, strings.NewReader(updateBody))
        updateReq.Header.Set("Content-Type", "application/json")
        
        updateResp, err := client.Do(updateReq)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusOK, updateResp.StatusCode)
        
        var updatedItem dto.ItemResponse
        json.NewDecoder(updateResp.Body).Decode(&updatedItem)
        updateResp.Body.Close()
        
        assert.Equal(t, "更新されたアイテム", updatedItem.Name)
        assert.Equal(t, "更新された説明", updatedItem.Description)
        
        // 4. アイテムの削除
        deleteReq, _ := http.NewRequest("DELETE", server.URL+"/api/v1/items/"+createdItem.ID, nil)
        deleteResp, err := client.Do(deleteReq)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusOK, deleteResp.StatusCode)
        deleteResp.Body.Close()
        
        // 5. 削除確認
        confirmReq, _ := http.NewRequest("GET", server.URL+"/api/v1/items/"+createdItem.ID, nil)
        confirmResp, err := client.Do(confirmReq)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusNotFound, confirmResp.StatusCode)
        confirmResp.Body.Close()
    })
}
```

## テストユーティリティ

### 1. テストデータファクトリ

```go
// TestDataFactory テストデータの生成を支援
type TestDataFactory struct {
    db *gorm.DB
}

func NewTestDataFactory(db *gorm.DB) *TestDataFactory {
    return &TestDataFactory{db: db}
}

func (f *TestDataFactory) CreateUser(overrides ...func(*model.User)) model.User {
    user := model.User{
        ID:           uuid.New(),
        Email:        fmt.Sprintf("test%d@duesk.co.jp", time.Now().UnixNano()),
        Username:     fmt.Sprintf("testuser%d", time.Now().UnixNano()),
        PasswordHash: "$2a$10$test.hash",
        Role:         "user",
        Status:       "active",
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }
    
    // オーバーライドの適用
    for _, override := range overrides {
        override(&user)
    }
    
    f.db.Create(&user)
    return user
}

func (f *TestDataFactory) CreateItem(userID uuid.UUID, overrides ...func(*model.Item)) model.Item {
    item := model.Item{
        ID:          uuid.New(),
        UserID:      userID,
        Name:        fmt.Sprintf("Test Item %d", time.Now().UnixNano()),
        Description: "Test description",
        Status:      "active",
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
    
    for _, override := range overrides {
        override(&item)
    }
    
    f.db.Create(&item)
    return item
}

// 使用例
func TestWithFactory(t *testing.T) {
    db := setupTestDB(t)
    factory := NewTestDataFactory(db)
    
    // テストユーザーの作成
    user := factory.CreateUser(func(u *model.User) {
        u.Email = "specific@duesk.co.jp"
        u.Role = "admin"
    })
    
    // テストアイテムの作成
    item := factory.CreateItem(user.ID, func(i *model.Item) {
        i.Name = "特定のアイテム名"
        i.Status = "inactive"
    })
    
    assert.Equal(t, "specific@duesk.co.jp", user.Email)
    assert.Equal(t, "特定のアイテム名", item.Name)
}
```

### 2. アサーションヘルパー

```go
// カスタムアサーション関数
func AssertValidUUID(t *testing.T, uuidStr string) {
    t.Helper()
    _, err := uuid.Parse(uuidStr)
    assert.NoError(t, err, "有効なUUIDである必要があります: %s", uuidStr)
}

func AssertTimestampWithinRange(t *testing.T, timestamp, expected time.Time, tolerance time.Duration) {
    t.Helper()
    diff := timestamp.Sub(expected)
    if diff < 0 {
        diff = -diff
    }
    assert.True(t, diff <= tolerance, 
        "タイムスタンプが許容範囲外です。期待値: %v, 実際: %v, 許容範囲: %v", 
        expected, timestamp, tolerance)
}

func AssertContainsAll(t *testing.T, container []string, items ...string) {
    t.Helper()
    for _, item := range items {
        assert.Contains(t, container, item)
    }
}
```

## テスト実行とカバレッジ

### 1. テスト実行コマンド

```bash
# 全テストの実行
go test ./...

# 詳細出力付きテスト実行
go test -v ./...

# カバレッジ付きテスト実行
go test -cover ./...

# HTML形式のカバレッジレポート生成
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 特定のパッケージのテスト実行
go test ./internal/service/...

# 特定のテスト関数の実行
go test -run TestExampleService_CreateItem ./internal/service/

# 並列実行の制御
go test -p 4 ./...

# タイムアウトの設定
go test -timeout 30s ./...
```

### 2. テスト設定

#### testify設定

```go
// suite_test.go
type ExampleServiceSuite struct {
    suite.Suite
    db      *gorm.DB
    service ExampleService
    factory *TestDataFactory
}

func (suite *ExampleServiceSuite) SetupSuite() {
    // スイート全体の初期化
    suite.db = setupTestDB(suite.T())
    suite.factory = NewTestDataFactory(suite.db)
}

func (suite *ExampleServiceSuite) SetupTest() {
    // 各テストの前に実行
    suite.db.Exec("TRUNCATE TABLE items, users RESTART IDENTITY CASCADE")
    
    // モックの初期化
    ctrl := gomock.NewController(suite.T())
    mockItemRepo := mock.NewMockItemRepository(ctrl)
    mockUserRepo := mock.NewMockUserRepository(ctrl)
    logger := zaptest.NewLogger(suite.T())
    
    suite.service = NewExampleService(suite.db, mockItemRepo, mockUserRepo, logger)
}

func (suite *ExampleServiceSuite) TearDownSuite() {
    // スイート終了時のクリーンアップ
    sqlDB, _ := suite.db.DB()
    sqlDB.Close()
}

func TestExampleServiceSuite(t *testing.T) {
    suite.Run(t, new(ExampleServiceSuite))
}

func (suite *ExampleServiceSuite) TestCreateItem() {
    // テストの実装
    user := suite.factory.CreateUser()
    
    req := dto.CreateItemRequest{
        UserID:      user.ID,
        Name:        "テストアイテム",
        Description: "説明",
    }
    
    result, err := suite.service.CreateItem(context.Background(), req)
    
    suite.NoError(err)
    suite.Equal(req.Name, result.Name)
}
```

## パフォーマンステスト

### 1. ベンチマークテスト

```go
func BenchmarkItemRepository_CreateItem(b *testing.B) {
    db := setupTestDB(&testing.T{})
    logger := zaptest.NewLogger(&testing.T{})
    repo := NewItemRepository(db, logger)
    
    userID := uuid.New()
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        item := model.Item{
            UserID:      userID,
            Name:        fmt.Sprintf("Benchmark Item %d", i),
            Description: "Benchmark description",
            Status:      "active",
        }
        
        _, err := repo.CreateItem(context.Background(), item)
        if err != nil {
            b.Fatal(err)
        }
    }
}

func BenchmarkItemService_GetItems(b *testing.B) {
    // テストデータの準備
    db := setupTestDB(&testing.T{})
    factory := NewTestDataFactory(db)
    
    userID := uuid.New()
    for i := 0; i < 1000; i++ {
        factory.CreateItem(userID)
    }
    
    logger := zaptest.NewLogger(&testing.T{})
    repo := NewItemRepository(db, logger)
    service := NewExampleService(db, repo, nil, logger)
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        _, _, err := service.GetItems(context.Background(), 1, 10, "")
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

---

## 関連ドキュメント

- [バックエンド仕様書](./backend-specification.md)
- [ハンドラー実装仕様書](./backend-handler-implementation.md)
- [サービス実装仕様書](./backend-service-implementation.md)
- [リポジトリ実装仕様書](./backend-repository-implementation.md)
- [認証実装仕様書](./backend-auth-implementation.md) 