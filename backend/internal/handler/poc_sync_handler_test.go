//go:build poc_sync_tests
// +build poc_sync_tests

package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	mocks "github.com/duesk/monstera/test/cognito/mocks"
	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// TestPocSyncHandler POC同期ハンドラのテストスイート
func TestPocSyncHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("SyncOperations", func(t *testing.T) {
		testSyncOperations(t)
	})

	t.Run("StatusAndHistory", func(t *testing.T) {
		testStatusAndHistory(t)
	})

	t.Run("ProjectManagement", func(t *testing.T) {
		testProjectManagement(t)
	})

	t.Run("Settings", func(t *testing.T) {
		testSettings(t)
	})
}

// testSyncOperations 同期操作のテスト
func testSyncOperations(t *testing.T) {
	t.Run("SyncAllProjects", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に全プロジェクトを同期", func(t *testing.T) {
			result := &service.SyncResult{
				TotalProjects: 5,
				SuccessCount:  4,
				FailureCount:  1,
				SkippedCount:  0,
				StartTime:     time.Now(),
				EndTime:       time.Now().Add(5 * time.Second),
				Errors:        []string{"プロジェクトAの同期に失敗"},
			}

			mockService.EXPECT().
				SyncAllProjects(gomock.Any()).
				Return(result, nil)

			router := gin.New()
			router.POST("/sync/all", handler.SyncAllProjects)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/sync/all", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response service.SyncResult
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, result.TotalProjects, response.TotalProjects)
			assert.Equal(t, result.SuccessCount, response.SuccessCount)
			assert.Equal(t, result.FailureCount, response.FailureCount)
		})

		t.Run("同期エラーの場合", func(t *testing.T) {
			mockService.EXPECT().
				SyncAllProjects(gomock.Any()).
				Return(nil, fmt.Errorf("同期エラー"))

			router := gin.New()
			router.POST("/sync/all", handler.SyncAllProjects)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/sync/all", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusInternalServerError, w.Code)
			assert.Contains(t, w.Body, "プロジェクトの同期に失敗しました")
		})
	})

	t.Run("SyncProjectByID", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に特定プロジェクトを同期", func(t *testing.T) {
			pocProjectID := uuid.New().String()

			mockService.EXPECT().
				SyncProjectByID(gomock.Any(), pocProjectID).
				Return(nil)

			router := gin.New()
			router.POST("/sync/:id", handler.SyncProjectByID)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", fmt.Sprintf("/sync/%s", pocProjectID), nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Contains(t, w.Body, "同期が完了しました")
		})

		t.Run("IDが指定されていない場合", func(t *testing.T) {
			router := gin.New()
			router.POST("/sync/:id", handler.SyncProjectByID)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/sync/", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code)
		})

		t.Run("同期エラーの場合", func(t *testing.T) {
			pocProjectID := uuid.New().String()

			mockService.EXPECT().
				SyncProjectByID(gomock.Any(), pocProjectID).
				Return(fmt.Errorf("プロジェクトが見つかりません"))

			router := gin.New()
			router.POST("/sync/:id", handler.SyncProjectByID)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", fmt.Sprintf("/sync/%s", pocProjectID), nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusInternalServerError, w.Code)
		})
	})

	t.Run("ForceSync", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に強制同期", func(t *testing.T) {
			pocProjectID := uuid.New().String()

			mockService.EXPECT().
				ForceSync(gomock.Any(), pocProjectID).
				Return(nil)

			router := gin.New()
			router.POST("/sync/:id/force", handler.ForceSync)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", fmt.Sprintf("/sync/%s/force", pocProjectID), nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Contains(t, w.Body, "強制同期が完了しました")
		})
	})

	t.Run("RunScheduledSync", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常にスケジュール同期を実行", func(t *testing.T) {
			result := &service.SyncResult{
				TotalProjects: 3,
				SuccessCount:  3,
				FailureCount:  0,
				SkippedCount:  0,
				StartTime:     time.Now(),
				EndTime:       time.Now().Add(3 * time.Second),
			}

			mockService.EXPECT().
				RunScheduledSync(gomock.Any()).
				Return(result, nil)

			router := gin.New()
			router.POST("/sync/scheduled", handler.RunScheduledSync)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/sync/scheduled", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response service.SyncResult
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, result.TotalProjects, response.TotalProjects)
			assert.Equal(t, result.SuccessCount, response.SuccessCount)
		})
	})
}

// testStatusAndHistory ステータスと履歴のテスト
func testStatusAndHistory(t *testing.T) {
	t.Run("GetSyncStatus", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常にステータスを取得", func(t *testing.T) {
			lastSync := time.Now().Add(-1 * time.Hour)
			nextRun := time.Now().Add(23 * time.Hour)
			status := &service.SyncStatusResponse{
				IsRunning:        false,
				LastSyncTime:     &lastSync,
				NextScheduledRun: &nextRun,
				PendingCount:     5,
				FailedCount:      2,
			}

			mockService.EXPECT().
				GetSyncStatus(gomock.Any()).
				Return(status, nil)

			router := gin.New()
			router.GET("/sync/status", handler.GetSyncStatus)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/sync/status", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response service.SyncStatusResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, status.PendingCount, response.PendingCount)
			assert.Equal(t, status.FailedCount, response.FailedCount)
		})
	})

	t.Run("GetUnsyncedProjects", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に未同期プロジェクトを取得", func(t *testing.T) {
			projects := []*model.PocProject{
				{
					ID:         uuid.New().String(),
					ExternalID: "POC001",
					Name:       "未同期プロジェクト1",
					Status:     "active",
					SyncStatus: model.PocSyncStatusPending,
				},
				{
					ID:         uuid.New().String(),
					ExternalID: "POC002",
					Name:       "未同期プロジェクト2",
					Status:     "active",
					SyncStatus: model.PocSyncStatusPending,
				},
			}

			mockService.EXPECT().
				GetUnsyncedProjects(gomock.Any()).
				Return(projects, nil)

			router := gin.New()
			router.GET("/sync/unsynced", handler.GetUnsyncedProjects)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/sync/unsynced", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, float64(2), response["total"])
			assert.Len(t, response["items"], 2)
		})
	})

	t.Run("GetSyncHistory", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に同期履歴を取得", func(t *testing.T) {
			history := []*service.SyncHistoryEntry{
				{
					ID:           uuid.New().String(),
					PocProjectID: uuid.New().String(),
					ProjectName:  "プロジェクトA",
					SyncType:     "create",
					Status:       "success",
					SyncedAt:     time.Now(),
				},
			}

			mockService.EXPECT().
				GetSyncHistory(gomock.Any(), gomock.Any()).
				Return(history, int64(1), nil)

			router := gin.New()
			router.GET("/sync/history", handler.GetSyncHistory)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/sync/history?page=1&limit=20", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, float64(1), response["total"])
			assert.Len(t, response["items"], 1)
		})

		t.Run("日付フィルターでの取得", func(t *testing.T) {
			startDate := time.Now().Add(-7 * 24 * time.Hour)
			endDate := time.Now()

			mockService.EXPECT().
				GetSyncHistory(gomock.Any(), gomock.Any()).
				DoAndReturn(func(ctx interface{}, filter service.SyncHistoryFilter) ([]*service.SyncHistoryEntry, int64, error) {
					assert.NotNil(t, filter.StartDate)
					assert.NotNil(t, filter.EndDate)
					return []*service.SyncHistoryEntry{}, 0, nil
				})

			router := gin.New()
			router.GET("/sync/history", handler.GetSyncHistory)

			w := httptest.NewRecorder()
			url := fmt.Sprintf("/sync/history?start_date=%s&end_date=%s",
				startDate.Format(time.RFC3339),
				endDate.Format(time.RFC3339))
			req, _ := http.NewRequest("GET", url, nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
		})

		t.Run("不正な日付形式", func(t *testing.T) {
			router := gin.New()
			router.GET("/sync/history", handler.GetSyncHistory)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/sync/history?start_date=invalid-date", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			assert.Contains(t, w.Body, "開始日時の形式が不正です")
		})
	})
}

// testProjectManagement プロジェクト管理のテスト
func testProjectManagement(t *testing.T) {
	t.Run("CreateProjectFromPoc", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常にプロジェクトを作成", func(t *testing.T) {
			pocProjectID := uuid.New().String()
			projectID := uuid.New().String()
			now := time.Now()

			project := &model.Project{
				ID:          projectID,
				ProjectName: "新規プロジェクト",
				Status:      model.ProjectStatusProposal,
				StartDate:   &now,
				EndDate:     &now,
				CreatedAt:   now,
				UpdatedAt:   now,
			}

			mockService.EXPECT().
				CreateProjectFromPoc(gomock.Any(), pocProjectID).
				Return(project, nil)

			router := gin.New()
			router.POST("/create-project", handler.CreateProjectFromPoc)

			reqBody := map[string]string{
				"poc_project_id": pocProjectID,
			}
			body, _ := json.Marshal(reqBody)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/create-project", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)

			var response model.Project
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, project.ProjectName, response.ProjectName)
		})

		t.Run("必須パラメータが不足", func(t *testing.T) {
			router := gin.New()
			router.POST("/create-project", handler.CreateProjectFromPoc)

			reqBody := map[string]string{}
			body, _ := json.Marshal(reqBody)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/create-project", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			assert.Contains(t, w.Body, "リクエストが不正です")
		})
	})

	t.Run("UpdateProjectFromPoc", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常にプロジェクトを更新", func(t *testing.T) {
			projectID := uuid.New().String()
			pocProjectID := uuid.New().String()
			now := time.Now()

			project := &model.Project{
				ID:          projectID,
				ProjectName: "更新されたプロジェクト",
				Status:      model.ProjectStatusActive,
				StartDate:   &now,
				EndDate:     &now,
				UpdatedAt:   now,
			}

			mockService.EXPECT().
				UpdateProjectFromPoc(gomock.Any(), projectID, pocProjectID).
				Return(project, nil)

			router := gin.New()
			router.PUT("/update-project", handler.UpdateProjectFromPoc)

			reqBody := map[string]string{
				"project_id":     projectID,
				"poc_project_id": pocProjectID,
			}
			body, _ := json.Marshal(reqBody)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/update-project", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response model.Project
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, project.ProjectName, response.ProjectName)
		})
	})
}

// testSettings 設定のテスト
func testSettings(t *testing.T) {
	t.Run("GetSyncSettings", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に設定を取得", func(t *testing.T) {
			settings := &service.SyncSettings{
				AutoSyncEnabled:    true,
				SyncInterval:       24,
				MaxRetryAttempts:   3,
				NotifyOnError:      true,
				NotificationEmails: []string{"admin@duesk.co.jp"},
			}

			mockService.EXPECT().
				GetSyncSettings(gomock.Any()).
				Return(settings, nil)

			router := gin.New()
			router.GET("/settings", handler.GetSyncSettings)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/settings", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response service.SyncSettings
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, settings.AutoSyncEnabled, response.AutoSyncEnabled)
			assert.Equal(t, settings.SyncInterval, response.SyncInterval)
		})
	})

	t.Run("UpdateSyncSettings", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockPocSyncService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewPocSyncHandler(mockService, logger)

		t.Run("正常に設定を更新", func(t *testing.T) {
			settings := service.SyncSettings{
				AutoSyncEnabled:    false,
				SyncInterval:       12,
				MaxRetryAttempts:   5,
				NotifyOnError:      true,
				NotificationEmails: []string{"new@duesk.co.jp"},
			}

			mockService.EXPECT().
				UpdateSyncSettings(gomock.Any(), &settings).
				Return(nil)

			router := gin.New()
			router.PUT("/settings", handler.UpdateSyncSettings)

			body, _ := json.Marshal(settings)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/settings", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.Contains(t, w.Body, "同期設定を更新しました")
		})

		t.Run("不正なリクエストボディ", func(t *testing.T) {
			router := gin.New()
			router.PUT("/settings", handler.UpdateSyncSettings)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("PUT", "/settings", bytes.NewBuffer([]byte("invalid json")))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
			assert.Contains(t, w.Body, "リクエストが不正です")
		})
	})
}
