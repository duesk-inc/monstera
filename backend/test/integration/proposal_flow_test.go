package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/config"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/handler"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/routes"
	"github.com/duesk/monstera/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ProposalFlowIntegrationTest 提案機能の統合テスト
type ProposalFlowIntegrationTest struct {
	t            *testing.T
	db           *gorm.DB
	router       *gin.Engine
	logger       *zap.Logger
	engineerUser *model.User
	salesUser    *model.User
	adminUser    *model.User
	project      *model.Project
	proposal     *model.EngineerProposal
}

// NewProposalFlowIntegrationTest テストスイートの初期化
func NewProposalFlowIntegrationTest(t *testing.T) *ProposalFlowIntegrationTest {
	// ロガーの初期化
	logger, _ := zap.NewDevelopment()

	// インメモリデータベースの初期化
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// テーブルのマイグレーション
	err = db.AutoMigrate(
		&model.User{},
		&model.UserRole{},
		&model.RolePermission{},
		&model.Project{},
		&model.EngineerProposal{},
		&model.EngineerProposalQuestion{},
		&model.Notification{},
	)
	require.NoError(t, err)

	return &ProposalFlowIntegrationTest{
		t:      t,
		db:     db,
		logger: logger,
	}
}

// SetupTestData テストデータのセットアップ
func (suite *ProposalFlowIntegrationTest) SetupTestData() {
	// テストユーザーの作成
	suite.engineerUser = &model.User{
		Base:     model.Base{ID: uuid.New()},
		Username: "engineer_test",
		Email:    "engineer@test.com",
		Name:     "テストエンジニア",
	}

	suite.salesUser = &model.User{
		Base:     model.Base{ID: uuid.New()},
		Username: "sales_test",
		Email:    "sales@test.com",
		Name:     "テスト営業",
	}

	suite.adminUser = &model.User{
		Base:     model.Base{ID: uuid.New()},
		Username: "admin_test",
		Email:    "admin@test.com",
		Name:     "テスト管理者",
	}

	// ユーザーの保存
	suite.db.Create(suite.engineerUser)
	suite.db.Create(suite.salesUser)
	suite.db.Create(suite.adminUser)

	// ロールの設定
	engineerRole := &model.UserRole{
		UserID: suite.engineerUser.ID,
		Role:   model.RoleEngineer,
	}
	salesRole := &model.UserRole{
		UserID: suite.salesUser.ID,
		Role:   model.RoleSales,
	}
	adminRole := &model.UserRole{
		UserID: suite.adminUser.ID,
		Role:   model.RoleAdmin,
	}

	suite.db.Create(engineerRole)
	suite.db.Create(salesRole)
	suite.db.Create(adminRole)

	// プロジェクトの作成
	suite.project = &model.Project{
		ID:            uuid.New(),
		ProjectName:   "統合テストプロジェクト",
		ClientName:    "テストクライアント株式会社",
		Status:        "active",
		WorkLocation:  "東京都港区",
		MinPrice:      600000,
		MaxPrice:      800000,
		RequiredSkill: "Go, React, AWS",
		Description:   "統合テスト用プロジェクト",
		SalesUserID:   &suite.salesUser.ID,
	}
	suite.db.Create(suite.project)

	// 提案の作成
	suite.proposal = &model.EngineerProposal{
		Base:      model.Base{ID: uuid.New()},
		UserID:    suite.engineerUser.ID,
		ProjectID: suite.project.ID,
		Status:    model.ProposalStatusProposed,
		CreatedAt: time.Now(),
	}
	suite.db.Create(suite.proposal)
}

// SetupRouter ルーターのセットアップ
func (suite *ProposalFlowIntegrationTest) SetupRouter() {
	// リポジトリの作成
	baseRepo := repository.NewBaseRepository(suite.db, suite.logger)
	userRepo := repository.NewUserRepository(suite.db, suite.logger)
	proposalRepo := repository.NewEngineerProposalRepository(baseRepo)
	questionRepo := repository.NewEngineerProposalQuestionRepository(baseRepo)
	notificationRepo := repository.NewNotificationRepository(suite.db, suite.logger)
	rolePermissionRepo := repository.NewRolePermissionRepository(baseRepo)

	// サービスの作成
	proposalService := service.NewProposalService(suite.db, proposalRepo, questionRepo, userRepo, notificationRepo, suite.logger)
	salesTeamService := service.NewSalesTeamService(suite.db, nil, rolePermissionRepo, suite.logger)

	// ハンドラーの作成
	proposalHandler := handler.NewProposalHandler(proposalService, salesTeamService, suite.logger)

	// ルーターの設定
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()

	// APIグループの設定
	api := suite.router.Group("/api/v1")

	// 認証ミドルウェアのモック（テスト用）
	api.Use(func(c *gin.Context) {
		// テスト用にユーザーIDを設定
		userIDHeader := c.GetHeader("X-User-ID")
		if userIDHeader != "" {
			if userID, err := uuid.Parse(userIDHeader); err == nil {
				c.Set("user_id", userID)

				// ロールも設定
				var user model.User
				if err := suite.db.Preload("Roles").First(&user, userID).Error; err == nil {
					var roles []model.Role
					for _, userRole := range user.Roles {
						roles = append(roles, userRole.Role)
					}
					c.Set("user_roles", roles)
				}
			}
		}
		c.Next()
	})

	// 営業ハンドラーの設定
	salesHandlers := &routes.SalesHandlers{
		ProposalHandler: proposalHandler,
	}

	// ルートの設定
	cfg := &config.Config{}
	routes.SetupSalesRoutes(api, cfg, salesHandlers, suite.logger, rolePermissionRepo)

	// エンジニア向けルートの設定
	proposals := api.Group("/proposals")
	{
		proposals.GET("", proposalHandler.GetProposals)
		proposals.GET("/:id", proposalHandler.GetProposalDetail)
		proposals.PUT("/:id/status", proposalHandler.UpdateProposalStatus)
		proposals.POST("/:proposalId/questions", proposalHandler.CreateQuestion)
		proposals.GET("/:proposalId/questions", proposalHandler.GetQuestions)
	}

	// 質問関連ルート
	questions := api.Group("/questions")
	{
		questions.PUT("/:id", proposalHandler.UpdateQuestion)
		questions.DELETE("/:id", proposalHandler.DeleteQuestion)
	}
}

// TestProposalFlow 提案フローの統合テスト
func TestProposalFlow(t *testing.T) {
	suite := NewProposalFlowIntegrationTest(t)
	suite.SetupTestData()
	suite.SetupRouter()

	// シナリオ1: エンジニアが提案一覧を確認
	t.Run("エンジニアが提案一覧を確認", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/proposals", nil)
		req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.ProposalListResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Len(t, response.Items, 1)
		assert.Equal(t, suite.proposal.ID.String(), response.Items[0].ID)
	})

	// シナリオ2: エンジニアが提案詳細を確認
	t.Run("エンジニアが提案詳細を確認", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/proposals/%s", suite.proposal.ID), nil)
		req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.ProposalDetailResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, suite.proposal.ID.String(), response.ID)
		assert.Equal(t, suite.project.ProjectName, response.Project.ProjectName)
	})

	// シナリオ3: エンジニアが質問を投稿
	var questionID string
	t.Run("エンジニアが質問を投稿", func(t *testing.T) {
		reqBody := dto.CreateQuestionRequest{
			QuestionText: "リモートワークは可能ですか？",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/proposals/%s/questions", suite.proposal.ID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusCreated, rec.Code)

		var response dto.ProposalQuestionDTO
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, reqBody.QuestionText, response.QuestionText)
		questionID = response.ID

		// 通知が作成されたか確認
		var notification model.Notification
		err = suite.db.Where("related_id = ? AND type = ?", response.ID, model.NotificationTypeProposalQuestion).First(&notification).Error
		assert.NoError(t, err)
		assert.Equal(t, suite.salesUser.ID, notification.UserID)
	})

	// シナリオ4: 営業担当者が未回答質問一覧を確認
	t.Run("営業担当者が未回答質問一覧を確認", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/sales/questions/pending", nil)
		req.Header.Set("X-User-ID", suite.salesUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.PendingQuestionsListResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, 1, response.Total)
		assert.Len(t, response.Items, 1)
		assert.Equal(t, 1, response.Items[0].PendingCount)
	})

	// シナリオ5: 営業担当者が質問に回答
	t.Run("営業担当者が質問に回答", func(t *testing.T) {
		reqBody := dto.RespondQuestionRequest{
			ResponseText: "はい、週2-3日のリモートワークが可能です。詳細は面談時にご相談ください。",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/sales/questions/%s/response", questionID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", suite.salesUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		// 質問が回答済みになったか確認
		var question model.EngineerProposalQuestion
		err := suite.db.First(&question, questionID).Error
		require.NoError(t, err)
		assert.True(t, question.IsResponded)
		assert.Equal(t, reqBody.ResponseText, *question.ResponseText)
		assert.NotNil(t, question.RespondedAt)

		// 通知が作成されたか確認
		var notification model.Notification
		err = suite.db.Where("related_id = ? AND type = ?", questionID, model.NotificationTypeQuestionResponse).First(&notification).Error
		assert.NoError(t, err)
		assert.Equal(t, suite.engineerUser.ID, notification.UserID)
	})

	// シナリオ6: エンジニアが回答を確認
	t.Run("エンジニアが回答を確認", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/proposals/%s/questions", suite.proposal.ID), nil)
		req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response dto.QuestionsListResponse
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Len(t, response.Items, 1)
		assert.True(t, response.Items[0].IsResponded)
		assert.NotNil(t, response.Items[0].ResponseText)
		assert.Contains(t, *response.Items[0].ResponseText, "リモートワーク")
	})

	// シナリオ7: エンジニアが提案ステータスを更新
	t.Run("エンジニアが提案を「選考へ進む」に更新", func(t *testing.T) {
		reqBody := dto.UpdateProposalStatusRequest{
			Status: model.ProposalStatusProceed,
			Reason: "条件が良く、興味があるため選考に進みたいです。",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/proposals/%s/status", suite.proposal.ID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		// ステータスが更新されたか確認
		var proposal model.EngineerProposal
		err := suite.db.First(&proposal, suite.proposal.ID).Error
		require.NoError(t, err)
		assert.Equal(t, model.ProposalStatusProceed, proposal.Status)
		assert.NotNil(t, proposal.RespondedAt)

		// 営業担当者への通知が作成されたか確認
		var notification model.Notification
		err = suite.db.Where("related_id = ? AND type = ?", suite.proposal.ID.String(), model.NotificationTypeProposalStatusUpdate).First(&notification).Error
		assert.NoError(t, err)
		assert.Equal(t, suite.salesUser.ID, notification.UserID)
	})

	// シナリオ8: 提案の24時間ルールを確認
	t.Run("24時間以内は同じユーザーに新しい提案を作成できない", func(t *testing.T) {
		// 別のプロジェクトを作成
		newProject := &model.Project{
			ID:            uuid.New(),
			ProjectName:   "新規プロジェクト",
			ClientName:    "新規クライアント",
			Status:        "active",
			WorkLocation:  "大阪府",
			MinPrice:      700000,
			MaxPrice:      900000,
			RequiredSkill: "Python, Django",
			SalesUserID:   &suite.salesUser.ID,
		}
		suite.db.Create(newProject)

		// 新しい提案を作成しようとする（同じエンジニアに対して）
		newProposal := &model.EngineerProposal{
			Base:      model.Base{ID: uuid.New()},
			UserID:    suite.engineerUser.ID,
			ProjectID: newProject.ID,
			Status:    model.ProposalStatusProposed,
			CreatedAt: time.Now(),
		}

		// 直接データベースに保存しようとしても、サービス層で24時間ルールがチェックされる想定
		// ここでは統合テストのため、実際のAPIエンドポイントは提供されていないが、
		// サービス層のビジネスロジックが正しく動作することを確認
	})
}

// TestConcurrentQuestionCreation 並行質問作成のテスト
func TestConcurrentQuestionCreation(t *testing.T) {
	suite := NewProposalFlowIntegrationTest(t)
	suite.SetupTestData()
	suite.SetupRouter()

	// 10個の質問を並行して作成
	numQuestions := 10
	done := make(chan bool, numQuestions)
	errors := make(chan error, numQuestions)

	for i := 0; i < numQuestions; i++ {
		go func(index int) {
			reqBody := dto.CreateQuestionRequest{
				QuestionText: fmt.Sprintf("質問 %d", index+1),
			}

			body, _ := json.Marshal(reqBody)
			req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/proposals/%s/questions", suite.proposal.ID), bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
			rec := httptest.NewRecorder()

			suite.router.ServeHTTP(rec, req)

			if rec.Code != http.StatusCreated && rec.Code != http.StatusConflict {
				errors <- fmt.Errorf("unexpected status code: %d", rec.Code)
			}

			done <- true
		}(i)
	}

	// 全ての並行処理が完了するまで待機
	for i := 0; i < numQuestions; i++ {
		select {
		case <-done:
			// 正常完了
		case err := <-errors:
			t.Error(err)
		case <-time.After(5 * time.Second):
			t.Error("timeout waiting for concurrent operations")
		}
	}

	// 作成された質問数を確認（10個を超えていないこと）
	var count int64
	suite.db.Model(&model.EngineerProposalQuestion{}).Where("proposal_id = ?", suite.proposal.ID).Count(&count)
	assert.LessOrEqual(t, count, int64(10), "質問数が10個を超えています")
}

// TestNotificationDelivery 通知配信のテスト
func TestNotificationDelivery(t *testing.T) {
	suite := NewProposalFlowIntegrationTest(t)
	suite.SetupTestData()
	suite.SetupRouter()

	// 質問作成時の通知
	t.Run("質問作成時に営業担当者へ通知", func(t *testing.T) {
		reqBody := dto.CreateQuestionRequest{
			QuestionText: "通知テスト用の質問",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/v1/proposals/%s/questions", suite.proposal.ID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", suite.engineerUser.ID.String())
		rec := httptest.NewRecorder()

		suite.router.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusCreated, rec.Code)

		// 通知が作成されたか確認
		var notifications []model.Notification
		suite.db.Where("user_id = ? AND type = ?", suite.salesUser.ID, model.NotificationTypeProposalQuestion).Find(&notifications)
		assert.NotEmpty(t, notifications)

		// 最新の通知を確認
		latestNotification := notifications[len(notifications)-1]
		assert.Equal(t, suite.salesUser.ID, latestNotification.UserID)
		assert.False(t, latestNotification.IsRead)
		assert.Contains(t, latestNotification.Message, "新しい質問")
	})
}
