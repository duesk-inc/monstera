package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang/mock/gomock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/service"
	"github.com/duesk/monstera/internal/testdata"
	mocks "github.com/duesk/monstera/test/cognito/mocks"
)

// TestSalesEmailHandler SalesEmailHandlerのテストスイート
func TestSalesEmailHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("EmailTemplate", func(t *testing.T) {
		testEmailTemplateHandlers(t)
	})

	t.Run("EmailCampaign", func(t *testing.T) {
		testEmailCampaignHandlers(t)
	})

	t.Run("EmailSending", func(t *testing.T) {
		testEmailSendingHandlers(t)
	})

	t.Run("Statistics", func(t *testing.T) {
		testStatisticsHandlers(t)
	})
}

// testEmailTemplateHandlers メールテンプレート関連ハンドラーのテスト
func testEmailTemplateHandlers(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		body           interface{}
		setupMocks     func(*mocks.MockSalesEmailService, *mocks.MockSalesTeamService)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:   "メールテンプレート作成成功",
			method: "POST",
			path:   "/templates",
			body: map[string]interface{}{
				"name":      "テスト提案テンプレート",
				"subject":   "【提案】{{.EngineerName}}様の案件について",
				"body_html": "<h1>{{.EngineerName}}様</h1><p>{{.ClientName}}からの案件です。</p>",
				"body_text": "{{.EngineerName}}様\n{{.ClientName}}からの案件です。",
				"category":  "proposal",
				"variables": []map[string]interface{}{
					{"name": "EngineerName", "type": "string", "description": "エンジニア名"},
					{"name": "ClientName", "type": "string", "description": "クライアント名"},
				},
			},
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				expectedTemplate := &model.EmailTemplate{
					ID:       uuid.New().String(),
					Name:     "テスト提案テンプレート",
					Subject:  "【提案】{{.EngineerName}}様の案件について",
					BodyHTML: "<h1>{{.EngineerName}}様</h1><p>{{.ClientName}}からの案件です。</p>",
					Category: "proposal",
					IsActive: true,
				}

				mockEmailSvc.EXPECT().
					CreateEmailTemplate(gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx interface{}, req *service.CreateEmailTemplateRequest) (*model.EmailTemplate, error) {
						assert.Equal(t, "テスト提案テンプレート", req.Name)
						assert.Equal(t, "proposal", req.Category)
						assert.Equal(t, "test_user", req.CreatedBy)
						return expectedTemplate, nil
					}).
					Times(1)
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, "テスト提案テンプレート", data["name"])
				assert.Equal(t, "proposal", data["category"])
				assert.Equal(t, true, data["is_active"])
			},
		},
		{
			name:           "メールテンプレート作成リクエスト不正",
			method:         "POST",
			path:           "/templates",
			body:           map[string]interface{}{"invalid": "request"},
			setupMocks:     func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "error")
				assert.Equal(t, "リクエストが不正です", response["error"])
			},
		},
		{
			name:   "メールテンプレート取得成功",
			method: "GET",
			path:   "/templates/123e4567-e89b-12d3-a456-426614174000",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				templateID := "123e4567-e89b-12d3-a456-426614174000"
				expectedTemplate := &model.EmailTemplate{
					ID:       templateID,
					Name:     "テストテンプレート",
					Subject:  "テスト件名",
					BodyHTML: "<p>テスト本文</p>",
					Category: "test",
					IsActive: true,
				}

				mockEmailSvc.EXPECT().
					GetEmailTemplate(gomock.Any(), templateID).
					Return(expectedTemplate, nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, "テストテンプレート", data["name"])
				assert.Equal(t, "test", data["category"])
			},
		},
		{
			name:   "メールテンプレート取得NotFound",
			method: "GET",
			path:   "/templates/nonexistent",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				mockEmailSvc.EXPECT().
					GetEmailTemplate(gomock.Any(), "nonexistent").
					Return(nil, fmt.Errorf("not found")).
					Times(1)
			},
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "error")
				assert.Equal(t, "メールテンプレートが見つかりません", response["error"])
			},
		},
		{
			name:   "メールテンプレート一覧取得成功",
			method: "GET",
			path:   "/templates?category=proposal&page=1&limit=10",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				expectedResponse := &service.EmailTemplateListResponse{
					Templates: []*model.EmailTemplate{
						{
							ID:       uuid.New().String(),
							Name:     "提案テンプレート1",
							Subject:  "提案件名1",
							Category: "proposal",
							IsActive: true,
						},
						{
							ID:       uuid.New().String(),
							Name:     "提案テンプレート2",
							Subject:  "提案件名2",
							Category: "proposal",
							IsActive: true,
						},
					},
					Total: 2,
					Page:  1,
					Limit: 10,
				}

				mockEmailSvc.EXPECT().
					GetEmailTemplateList(gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx interface{}, filter service.EmailTemplateFilter) (*service.EmailTemplateListResponse, error) {
						assert.Equal(t, "proposal", filter.Category)
						assert.Equal(t, 1, filter.Page)
						assert.Equal(t, 10, filter.Limit)
						return expectedResponse, nil
					}).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, float64(2), data["total"])
				assert.Equal(t, float64(1), data["page"])
				assert.Equal(t, float64(10), data["limit"])

				templates := data["templates"].([]interface{})
				assert.Len(t, templates, 2)
			},
		},
		{
			name:   "メールテンプレート更新成功",
			method: "PUT",
			path:   "/templates/123e4567-e89b-12d3-a456-426614174000",
			body: map[string]interface{}{
				"name":      "更新されたテンプレート",
				"subject":   "更新された件名",
				"body_html": "<p>更新された本文</p>",
				"category":  "updated",
			},
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				templateID := "123e4567-e89b-12d3-a456-426614174000"
				updatedTemplate := &model.EmailTemplate{
					ID:       templateID,
					Name:     "更新されたテンプレート",
					Subject:  "更新された件名",
					BodyHTML: "<p>更新された本文</p>",
					Category: "updated",
					IsActive: true,
				}

				mockEmailSvc.EXPECT().
					UpdateEmailTemplate(gomock.Any(), templateID, gomock.Any()).
					DoAndReturn(func(ctx interface{}, id string, req *service.UpdateEmailTemplateRequest) (*model.EmailTemplate, error) {
						assert.Equal(t, "更新されたテンプレート", req.Name)
						assert.Equal(t, "updated", req.Category)
						assert.Equal(t, "test_user", req.UpdatedBy)
						return updatedTemplate, nil
					}).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, "更新されたテンプレート", data["name"])
				assert.Equal(t, "updated", data["category"])
			},
		},
		{
			name:   "メールテンプレート削除成功",
			method: "DELETE",
			path:   "/templates/123e4567-e89b-12d3-a456-426614174000",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				templateID := "123e4567-e89b-12d3-a456-426614174000"

				mockEmailSvc.EXPECT().
					DeleteEmailTemplate(gomock.Any(), templateID, "test_user").
					Return(nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "message")
				assert.Equal(t, "メールテンプレートを削除しました", response["message"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockEmailSvc := mocks.NewMockSalesEmailService(ctrl)
			mockTeamSvc := mocks.NewMockSalesTeamService(ctrl)
			logger, _ := zap.NewDevelopment()

			tt.setupMocks(mockEmailSvc, mockTeamSvc)

			handler := NewSalesEmailHandler(mockEmailSvc, mockTeamSvc, logger)

			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("user_id", "test_user")
				c.Next()
			})

			// ルート設定
			setupEmailTemplateRoutes(router, handler)

			var req *http.Request
			if tt.body != nil {
				bodyBytes, _ := json.Marshal(tt.body)
				req = httptest.NewRequest(tt.method, tt.path, bytes.NewBuffer(bodyBytes))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// testEmailCampaignHandlers メールキャンペーン関連ハンドラーのテスト
func testEmailCampaignHandlers(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		body           interface{}
		setupMocks     func(*mocks.MockSalesEmailService, *mocks.MockSalesTeamService)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:   "メールキャンペーン作成成功",
			method: "POST",
			path:   "/campaigns",
			body: map[string]interface{}{
				"name":         "テストキャンペーン",
				"template_id":  "123e4567-e89b-12d3-a456-426614174000",
				"scheduled_at": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
				"recipients": []map[string]interface{}{
					{"email": "test@duesk.co.jp", "name": "テストユーザー", "type": "client"},
				},
				"target_role":   "client",
				"target_status": "active",
			},
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				expectedCampaign := &model.EmailCampaign{
					ID:     uuid.New().String(),
					Name:   "テストキャンペーン",
					Status: model.CampaignStatusDraft,
				}

				mockEmailSvc.EXPECT().
					CreateEmailCampaign(gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx interface{}, req *service.CreateEmailCampaignRequest) (*model.EmailCampaign, error) {
						assert.Equal(t, "テストキャンペーン", req.Name)
						assert.Equal(t, "123e4567-e89b-12d3-a456-426614174000", req.TemplateID)
						assert.Equal(t, "test_user", req.CreatedBy)
						return expectedCampaign, nil
					}).
					Times(1)
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, "テストキャンペーン", data["name"])
				assert.Equal(t, "draft", data["status"])
			},
		},
		{
			name:   "メールキャンペーン取得成功",
			method: "GET",
			path:   "/campaigns/123e4567-e89b-12d3-a456-426614174000",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				campaignID := "123e4567-e89b-12d3-a456-426614174000"
				expectedCampaign := &model.EmailCampaign{
					ID:     campaignID,
					Name:   "テストキャンペーン",
					Status: model.CampaignStatusDraft,
				}

				mockEmailSvc.EXPECT().
					GetEmailCampaign(gomock.Any(), campaignID).
					Return(expectedCampaign, nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, "テストキャンペーン", data["name"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockEmailSvc := mocks.NewMockSalesEmailService(ctrl)
			mockTeamSvc := mocks.NewMockSalesTeamService(ctrl)
			logger, _ := zap.NewDevelopment()

			tt.setupMocks(mockEmailSvc, mockTeamSvc)

			handler := NewSalesEmailHandler(mockEmailSvc, mockTeamSvc, logger)

			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("user_id", "test_user")
				c.Next()
			})

			// ルート設定
			setupEmailCampaignRoutes(router, handler)

			var req *http.Request
			if tt.body != nil {
				bodyBytes, _ := json.Marshal(tt.body)
				req = httptest.NewRequest(tt.method, tt.path, bytes.NewBuffer(bodyBytes))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// testEmailSendingHandlers メール送信関連ハンドラーのテスト
func testEmailSendingHandlers(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		body           interface{}
		setupMocks     func(*mocks.MockSalesEmailService, *mocks.MockSalesTeamService)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:   "キャンペーン送信成功",
			method: "POST",
			path:   "/campaigns/123e4567-e89b-12d3-a456-426614174000/send",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				campaignID := "123e4567-e89b-12d3-a456-426614174000"

				mockEmailSvc.EXPECT().
					SendCampaign(gomock.Any(), campaignID).
					Return(nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "message")
				assert.Equal(t, "キャンペーンの送信を開始しました", response["message"])
			},
		},
		{
			name:   "提案メール送信成功",
			method: "POST",
			path:   "/proposals/send",
			body: map[string]interface{}{
				"proposal_id": "123e4567-e89b-12d3-a456-426614174000",
				"template_id": "123e4567-e89b-12d3-a456-426614174001",
				"custom_data": map[string]interface{}{
					"additional_info": "追加情報",
				},
			},
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				proposalID := "123e4567-e89b-12d3-a456-426614174000"
				templateID := "123e4567-e89b-12d3-a456-426614174001"

				mockEmailSvc.EXPECT().
					SendProposalEmail(gomock.Any(), proposalID, templateID, gomock.Any()).
					DoAndReturn(func(ctx interface{}, pID, tID string, customData map[string]interface{}) error {
						assert.Equal(t, proposalID, pID)
						assert.Equal(t, templateID, tID)
						assert.Equal(t, "追加情報", customData["additional_info"])
						return nil
					}).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "message")
				assert.Equal(t, "提案メールを送信しました", response["message"])
			},
		},
		{
			name:   "面談確認メール送信成功",
			method: "POST",
			path:   "/interviews/send",
			body: map[string]interface{}{
				"interview_id": "123e4567-e89b-12d3-a456-426614174000",
			},
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				interviewID := "123e4567-e89b-12d3-a456-426614174000"

				mockEmailSvc.EXPECT().
					SendInterviewConfirmation(gomock.Any(), interviewID).
					Return(nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "message")
				assert.Equal(t, "面談確認メールを送信しました", response["message"])
			},
		},
		{
			name:   "契約延長依頼メール送信成功",
			method: "POST",
			path:   "/extensions/send",
			body: map[string]interface{}{
				"extension_id": "123e4567-e89b-12d3-a456-426614174000",
			},
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				extensionID := "123e4567-e89b-12d3-a456-426614174000"

				mockEmailSvc.EXPECT().
					SendContractExtensionRequest(gomock.Any(), extensionID).
					Return(nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "message")
				assert.Equal(t, "契約延長依頼メールを送信しました", response["message"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockEmailSvc := mocks.NewMockSalesEmailService(ctrl)
			mockTeamSvc := mocks.NewMockSalesTeamService(ctrl)
			logger, _ := zap.NewDevelopment()

			tt.setupMocks(mockEmailSvc, mockTeamSvc)

			handler := NewSalesEmailHandler(mockEmailSvc, mockTeamSvc, logger)

			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("user_id", "test_user")
				c.Next()
			})

			// ルート設定
			setupEmailSendingRoutes(router, handler)

			var req *http.Request
			if tt.body != nil {
				bodyBytes, _ := json.Marshal(tt.body)
				req = httptest.NewRequest(tt.method, tt.path, bytes.NewBuffer(bodyBytes))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// testStatisticsHandlers 統計関連ハンドラーのテスト
func testStatisticsHandlers(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		body           interface{}
		setupMocks     func(*mocks.MockSalesEmailService, *mocks.MockSalesTeamService)
		expectedStatus int
		checkResponse  func(*testing.T, *httptest.ResponseRecorder)
	}{
		{
			name:   "キャンペーン統計取得成功",
			method: "GET",
			path:   "/campaigns/123e4567-e89b-12d3-a456-426614174000/stats",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				campaignID := "123e4567-e89b-12d3-a456-426614174000"
				expectedStats := &model.EmailCampaignStats{
					TotalRecipients: 100,
					SentCount:       95,
					OpenCount:       80,
					ClickCount:      40,
					DeliveryRate:    95.0,
					OpenRate:        84.2,
					ClickRate:       42.1,
				}

				mockEmailSvc.EXPECT().
					GetCampaignStats(gomock.Any(), campaignID).
					Return(expectedStats, nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].(map[string]interface{})
				assert.Equal(t, float64(100), data["total_recipients"])
				assert.Equal(t, float64(95), data["sent_count"])
				assert.Equal(t, float64(80), data["open_count"])
				assert.Equal(t, float64(40), data["click_count"])
			},
		},
		{
			name:   "送信履歴取得成功",
			method: "GET",
			path:   "/campaigns/123e4567-e89b-12d3-a456-426614174000/history",
			body:   nil,
			setupMocks: func(mockEmailSvc *mocks.MockSalesEmailService, mockTeamSvc *mocks.MockSalesTeamService) {
				campaignID := "123e4567-e89b-12d3-a456-426614174000"
				expectedHistory := []*model.EmailSentHistory{
					{
						ID:             uuid.New().String(),
						CampaignID:     campaignID,
						RecipientEmail: testdata.DefaultTestEmail,
						RecipientName:  "ユーザー1",
						SentAt:         time.Now(),
						DeliveryStatus: model.EmailDeliveryStatusSent,
					},
					{
						ID:             uuid.New().String(),
						CampaignID:     campaignID,
						RecipientEmail: testdata.DefaultTestEmail + "2",
						RecipientName:  "ユーザー2",
						SentAt:         time.Now(),
						DeliveryStatus: model.EmailDeliveryStatusOpened,
					},
				}

				mockEmailSvc.EXPECT().
					GetSentHistory(gomock.Any(), campaignID).
					Return(expectedHistory, nil).
					Times(1)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, w *httptest.ResponseRecorder) {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "data")

				data := response["data"].([]interface{})
				assert.Len(t, data, 2)

				firstHistory := data[0].(map[string]interface{})
				assert.Equal(t, testdata.DefaultTestEmail, firstHistory["recipient_email"])
				assert.Equal(t, "ユーザー1", firstHistory["recipient_name"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockEmailSvc := mocks.NewMockSalesEmailService(ctrl)
			mockTeamSvc := mocks.NewMockSalesTeamService(ctrl)
			logger, _ := zap.NewDevelopment()

			tt.setupMocks(mockEmailSvc, mockTeamSvc)

			handler := NewSalesEmailHandler(mockEmailSvc, mockTeamSvc, logger)

			router := gin.New()
			router.Use(func(c *gin.Context) {
				c.Set("user_id", "test_user")
				c.Next()
			})

			// ルート設定
			setupStatisticsRoutes(router, handler)

			var req *http.Request
			if tt.body != nil {
				bodyBytes, _ := json.Marshal(tt.body)
				req = httptest.NewRequest(tt.method, tt.path, bytes.NewBuffer(bodyBytes))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, w)
			}
		})
	}
}

// ルートセットアップ用のヘルパー関数
func setupEmailTemplateRoutes(router *gin.Engine, handler SalesEmailHandler) {
	router.POST("/templates", handler.CreateEmailTemplate)
	router.GET("/templates/:id", handler.GetEmailTemplate)
	router.GET("/templates", handler.GetEmailTemplateList)
	router.PUT("/templates/:id", handler.UpdateEmailTemplate)
	router.DELETE("/templates/:id", handler.DeleteEmailTemplate)
}

func setupEmailCampaignRoutes(router *gin.Engine, handler SalesEmailHandler) {
	router.POST("/campaigns", handler.CreateEmailCampaign)
	router.GET("/campaigns/:id", handler.GetEmailCampaign)
	router.GET("/campaigns", handler.GetEmailCampaignList)
	router.PUT("/campaigns/:id", handler.UpdateEmailCampaign)
	router.DELETE("/campaigns/:id", handler.DeleteEmailCampaign)
}

func setupEmailSendingRoutes(router *gin.Engine, handler SalesEmailHandler) {
	router.POST("/campaigns/:id/send", handler.SendCampaign)
	router.POST("/proposals/send", handler.SendProposalEmail)
	router.POST("/interviews/send", handler.SendInterviewConfirmation)
	router.POST("/extensions/send", handler.SendContractExtensionRequest)
}

func setupStatisticsRoutes(router *gin.Engine, handler SalesEmailHandler) {
	router.GET("/campaigns/:id/stats", handler.GetCampaignStats)
	router.GET("/campaigns/:id/history", handler.GetSentHistory)
}
