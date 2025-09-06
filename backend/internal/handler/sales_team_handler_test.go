//go:build sales_team_tests
// +build sales_team_tests

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
	"github.com/duesk/monstera/internal/testutil"
	mocks "github.com/duesk/monstera/test/cognito/mocks"
	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

// TestSalesTeamHandler 営業チームハンドラのテストスイート
func TestSalesTeamHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("CreateMember", func(t *testing.T) {
		testCreateMember(t)
	})

	t.Run("GetMember", func(t *testing.T) {
		testGetMember(t)
	})

	t.Run("UpdateMember", func(t *testing.T) {
		testUpdateMember(t)
	})

	t.Run("DeleteMember", func(t *testing.T) {
		testDeleteMember(t)
	})

	t.Run("StatusManagement", func(t *testing.T) {
		testStatusManagement(t)
	})

	t.Run("MemberList", func(t *testing.T) {
		testMemberList(t)
	})

	t.Run("Statistics", func(t *testing.T) {
		testStatistics(t)
	})
}

// testCreateMember メンバー作成のテスト
func testCreateMember(t *testing.T) {
	t.Run("正常にメンバーを作成", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		userID := uuid.New()
		member := &model.SalesTeam{
			ID:       uuid.New(),
			UserID:   userID,
			TeamRole: "member",
			IsActive: true,
		}

		mockService.EXPECT().
			CreateMember(gomock.Any(), gomock.Any()).
			Return(member, nil)

		router := gin.New()
		router.POST("/members", handler.CreateMember)

		reqBody := service.CreateSalesTeamMemberRequest{
			UserID:      userID.String(),
			TeamRole:    "member",
			Permissions: []string{"read", "write"},
			CreatedBy:   testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/members", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response model.SalesTeam
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, userID, response.UserID)
		assert.Equal(t, "member", response.TeamRole)
	})

	t.Run("ユーザーが見つからない場合", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		mockService.EXPECT().
			CreateMember(gomock.Any(), gomock.Any()).
			Return(nil, fmt.Errorf("ユーザーが見つかりません"))

		router := gin.New()
		router.POST("/members", handler.CreateMember)

		reqBody := service.CreateSalesTeamMemberRequest{
			UserID:    uuid.New().String(),
			TeamRole:  "member",
			CreatedBy: testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/members", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "ユーザーが見つかりません")
	})

	t.Run("既存メンバーの場合", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		mockService.EXPECT().
			CreateMember(gomock.Any(), gomock.Any()).
			Return(nil, fmt.Errorf("このユーザーは既に営業チームのメンバーです"))

		router := gin.New()
		router.POST("/members", handler.CreateMember)

		reqBody := service.CreateSalesTeamMemberRequest{
			UserID:    uuid.New().String(),
			TeamRole:  "member",
			CreatedBy: testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/members", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)
		assert.Contains(t, w.Body.String(), "既に営業チームのメンバーです")
	})

	t.Run("無効なリクエストボディ", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		router := gin.New()
		router.POST("/members", handler.CreateMember)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/members", bytes.NewBuffer([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "リクエストが不正です")
	})
}

// testGetMember メンバー取得のテスト
func testGetMember(t *testing.T) {
	t.Run("IDでメンバーを取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		memberID := uuid.New()
		member := &model.SalesTeam{
			ID:       memberID,
			TeamRole: "leader",
			IsActive: true,
		}

		mockService.EXPECT().
			GetMemberByID(gomock.Any(), memberID.String()).
			Return(member, nil)

		router := gin.New()
		router.GET("/members/:id", handler.GetMember)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", fmt.Sprintf("/members/%s", memberID.String()), nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response model.SalesTeam
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, memberID, response.ID)
		assert.Equal(t, "leader", response.TeamRole)
	})

	t.Run("存在しないメンバーの取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		nonExistentID := uuid.New().String()

		mockService.EXPECT().
			GetMemberByID(gomock.Any(), nonExistentID).
			Return(nil, fmt.Errorf("営業チームメンバーが見つかりません"))

		router := gin.New()
		router.GET("/members/:id", handler.GetMember)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", fmt.Sprintf("/members/%s", nonExistentID), nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "営業チームメンバーが見つかりません")
	})

	t.Run("ユーザーIDでメンバーを取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		userID := uuid.New()
		member := &model.SalesTeam{
			ID:       uuid.New(),
			UserID:   userID,
			TeamRole: "member",
		}

		mockService.EXPECT().
			GetMemberByUserID(gomock.Any(), userID.String()).
			Return(member, nil)

		router := gin.New()
		router.GET("/members/user/:user_id", handler.GetMemberByUserID)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", fmt.Sprintf("/members/user/%s", userID.String()), nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response model.SalesTeam
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, userID, response.UserID)
	})

	t.Run("IDが指定されていない場合", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		router := gin.New()
		router.GET("/members/:id", handler.GetMember)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/members/", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

// testUpdateMember メンバー更新のテスト
func testUpdateMember(t *testing.T) {
	t.Run("正常にメンバーを更新", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		memberID := uuid.New()
		updatedMember := &model.SalesTeam{
			ID:       memberID,
			TeamRole: "leader",
			IsActive: true,
		}

		mockService.EXPECT().
			UpdateMember(gomock.Any(), memberID.String(), gomock.Any()).
			Return(updatedMember, nil)

		router := gin.New()
		router.PUT("/members/:id", handler.UpdateMember)

		reqBody := service.UpdateSalesTeamMemberRequest{
			TeamRole:  "leader",
			UpdatedBy: testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/members/%s", memberID.String()), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response model.SalesTeam
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "leader", response.TeamRole)
	})

	t.Run("存在しないメンバーの更新", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		nonExistentID := uuid.New().String()

		mockService.EXPECT().
			UpdateMember(gomock.Any(), nonExistentID, gomock.Any()).
			Return(nil, fmt.Errorf("営業チームメンバーが見つかりません"))

		router := gin.New()
		router.PUT("/members/:id", handler.UpdateMember)

		reqBody := service.UpdateSalesTeamMemberRequest{
			TeamRole:  "leader",
			UpdatedBy: testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PUT", fmt.Sprintf("/members/%s", nonExistentID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "営業チームメンバーが見つかりません")
	})
}

// testDeleteMember メンバー削除のテスト
func testDeleteMember(t *testing.T) {
	t.Run("正常にメンバーを削除", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		memberID := uuid.New().String()

		mockService.EXPECT().
			DeleteMember(gomock.Any(), memberID, testutil.RoleStringAdmin).
			Return(nil)

		router := gin.New()
		router.DELETE("/members/:id", handler.DeleteMember)

		reqBody := map[string]string{
			"deleted_by": testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", fmt.Sprintf("/members/%s", memberID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "営業チームメンバーを削除しました")
	})

	t.Run("削除者情報が不足", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		router := gin.New()
		router.DELETE("/members/:id", handler.DeleteMember)

		reqBody := map[string]string{}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("DELETE", "/members/test-id", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "削除者情報が必要です")
	})
}

// testStatusManagement ステータス管理のテスト
func testStatusManagement(t *testing.T) {
	t.Run("メンバーをアクティブ化", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		memberID := uuid.New().String()

		mockService.EXPECT().
			ActivateMember(gomock.Any(), memberID, testutil.RoleStringAdmin).
			Return(nil)

		router := gin.New()
		router.POST("/members/:id/activate", handler.ActivateMember)

		reqBody := map[string]string{
			"activated_by": testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", fmt.Sprintf("/members/%s/activate", memberID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "営業チームメンバーをアクティブ化しました")
	})

	t.Run("メンバーを非アクティブ化", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		memberID := uuid.New().String()

		mockService.EXPECT().
			DeactivateMember(gomock.Any(), memberID, testutil.RoleStringAdmin).
			Return(nil)

		router := gin.New()
		router.POST("/members/:id/deactivate", handler.DeactivateMember)

		reqBody := map[string]string{
			"deactivated_by": testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", fmt.Sprintf("/members/%s/deactivate", memberID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "営業チームメンバーを非アクティブ化しました")
	})

	t.Run("存在しないメンバーのアクティブ化", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		nonExistentID := uuid.New().String()

		mockService.EXPECT().
			ActivateMember(gomock.Any(), nonExistentID, testutil.RoleStringAdmin).
			Return(fmt.Errorf("営業チームメンバーが見つかりません"))

		router := gin.New()
		router.POST("/members/:id/activate", handler.ActivateMember)

		reqBody := map[string]string{
			"activated_by": testutil.RoleStringAdmin,
		}
		body, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", fmt.Sprintf("/members/%s/activate", nonExistentID), bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "営業チームメンバーが見つかりません")
	})
}

// testMemberList メンバー一覧のテスト
func testMemberList(t *testing.T) {
	t.Run("メンバー一覧を取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		members := []*model.SalesTeam{
			{ID: uuid.New(), TeamRole: "leader", IsActive: true},
			{ID: uuid.New(), TeamRole: "member", IsActive: true},
		}

		response := &service.SalesTeamMemberListResponse{
			Members: members,
			Total:   2,
			Page:    1,
			Limit:   20,
		}

		mockService.EXPECT().
			GetMemberList(gomock.Any(), gomock.Any()).
			Return(response, nil)

		router := gin.New()
		router.GET("/members", handler.GetMemberList)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/members?team_role=member&page=1&limit=20", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result service.SalesTeamMemberListResponse
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Len(t, result.Members, 2)
		assert.Equal(t, int64(2), result.Total)
	})

	t.Run("アクティブメンバーを取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		activeMembers := []*model.SalesTeam{
			{ID: uuid.New(), TeamRole: "leader", IsActive: true},
			{ID: uuid.New(), TeamRole: "member", IsActive: true},
		}

		mockService.EXPECT().
			GetActiveMembers(gomock.Any()).
			Return(activeMembers, nil)

		router := gin.New()
		router.GET("/members/active", handler.GetActiveMembers)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/members/active", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, float64(2), result["total"])
		assert.Len(t, result["items"], 2)
	})

	t.Run("ロール別メンバーを取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		leaders := []*model.SalesTeam{
			{ID: uuid.New(), TeamRole: "leader", IsActive: true},
		}

		mockService.EXPECT().
			GetMembersByRole(gomock.Any(), "leader").
			Return(leaders, nil)

		router := gin.New()
		router.GET("/members/role/:role", handler.GetMembersByRole)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/members/role/leader", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, float64(1), result["total"])
		assert.Len(t, result["items"], 1)
	})

	t.Run("ロールが指定されていない場合", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		router := gin.New()
		router.GET("/members/role/:role", handler.GetMembersByRole)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/members/role/", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

// testStatistics 統計のテスト
func testStatistics(t *testing.T) {
	t.Run("チーム統計を取得", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		stats := &service.SalesTeamStatistics{
			TotalMembers:    5,
			ActiveMembers:   4,
			InactiveMembers: 1,
			RoleDistribution: map[string]int{
				"leader": 1,
				"member": 4,
			},
			RecentJoins:  []*model.SalesTeam{},
			RecentLeaves: []*model.SalesTeam{},
		}

		mockService.EXPECT().
			GetTeamStatistics(gomock.Any()).
			Return(stats, nil)

		router := gin.New()
		router.GET("/statistics", handler.GetTeamStatistics)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/statistics", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var result service.SalesTeamStatistics
		err := json.Unmarshal(w.Body.Bytes(), &result)
		assert.NoError(t, err)
		assert.Equal(t, 5, result.TotalMembers)
		assert.Equal(t, 4, result.ActiveMembers)
		assert.Equal(t, 1, result.InactiveMembers)
		assert.Equal(t, 1, result.RoleDistribution["leader"])
		assert.Equal(t, 4, result.RoleDistribution["member"])
	})

	t.Run("統計取得エラー", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockService := mocks.NewMockSalesTeamService(ctrl)
		logger, _ := zap.NewDevelopment()
		handler := NewSalesTeamHandler(mockService, logger)

		mockService.EXPECT().
			GetTeamStatistics(gomock.Any()).
			Return(nil, fmt.Errorf("データベースエラー"))

		router := gin.New()
		router.GET("/statistics", handler.GetTeamStatistics)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/statistics", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "統計情報の取得に失敗しました")
	})
}
