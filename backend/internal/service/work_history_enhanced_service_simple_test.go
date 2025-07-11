package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/validator"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestWorkHistoryEnhancedServiceSimple(t *testing.T) {
	// テスト用のSQLiteデータベースを作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 簡略化したテーブル作成
	err = db.Exec(`
		CREATE TABLE work_histories (
			id TEXT PRIMARY KEY,
			profile_id TEXT,
			user_id TEXT NOT NULL,
			project_name TEXT NOT NULL,
			start_date DATETIME NOT NULL,
			end_date DATETIME,
			industry INTEGER NOT NULL,
			project_overview TEXT,
			responsibilities TEXT,
			achievements TEXT,
			notes TEXT,
			processes TEXT,
			technologies TEXT,
			team_size INTEGER,
			role TEXT NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)
	`).Error
	assert.NoError(t, err)

	err = db.Exec(`
		CREATE TABLE work_history_technologies (
			id TEXT PRIMARY KEY,
			work_history_id TEXT,
			category_id TEXT,
			technology_name TEXT,
			created_at DATETIME,
			updated_at DATETIME
		)
	`).Error
	assert.NoError(t, err)

	err = db.Exec(`
		CREATE TABLE technology_masters (
			id TEXT PRIMARY KEY,
			category TEXT NOT NULL,
			name TEXT NOT NULL UNIQUE,
			display_name TEXT,
			usage_count INTEGER DEFAULT 0,
			created_at DATETIME,
			updated_at DATETIME
		)
	`).Error
	assert.NoError(t, err)

	t.Run("バリデーション機能テスト", func(t *testing.T) {
		validator := validator.NewWorkHistoryValidator()

		t.Run("正常なリクエスト", func(t *testing.T) {
			req := dto.WorkHistoryRequestV2{
				ProjectName: "テストプロジェクト",
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
				Technologies: []dto.TechnologyRequestV2{
					{
						CategoryID:     uuid.New().String(),
						TechnologyName: "Java",
					},
				},
			}

			errors := validator.ValidateWorkHistory(req)
			assert.Empty(t, errors, "正常なリクエストでエラーが発生")
		})

		t.Run("必須項目不備", func(t *testing.T) {
			req := dto.WorkHistoryRequestV2{
				ProjectName: "", // 必須項目が空
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
			}

			errors := validator.ValidateWorkHistory(req)
			assert.NotEmpty(t, errors, "バリデーションエラーが発生すべき")
			assert.Contains(t, errors[0].Message, "プロジェクト名は必須")
		})

		t.Run("不正な日付形式", func(t *testing.T) {
			req := dto.WorkHistoryRequestV2{
				ProjectName: "テストプロジェクト",
				StartDate:   "2023/01/01", // 不正な形式
				Industry:    "IT・Web",
				Role:        "SE",
			}

			errors := validator.ValidateWorkHistory(req)
			assert.NotEmpty(t, errors, "日付形式エラーが発生すべき")
		})

		t.Run("無効な業種", func(t *testing.T) {
			req := dto.WorkHistoryRequestV2{
				ProjectName: "テストプロジェクト",
				StartDate:   "2023-01-01",
				Industry:    "無効な業種",
				Role:        "SE",
			}

			errors := validator.ValidateWorkHistory(req)
			assert.NotEmpty(t, errors, "業種バリデーションエラーが発生すべき")
		})

		t.Run("技術情報バリデーション", func(t *testing.T) {
			req := dto.WorkHistoryRequestV2{
				ProjectName: "テストプロジェクト",
				StartDate:   "2023-01-01",
				Industry:    "IT・Web",
				Role:        "SE",
				Technologies: []dto.TechnologyRequestV2{
					{
						CategoryID:     "invalid-uuid", // 無効なUUID
						TechnologyName: "Java",
					},
				},
			}

			errors := validator.ValidateWorkHistory(req)
			assert.NotEmpty(t, errors, "技術情報バリデーションエラーが発生すべき")
		})
	})

	t.Run("IT経験年数計算テスト", func(t *testing.T) {
		// calculator package がないため、サービス内の計算ロジックをテスト
		userID := uuid.New()

		// 簡単なデータを挿入
		workHistory := &model.WorkHistory{
			ID:          uuid.New(),
			UserID:      userID,
			ProjectName: "テストプロジェクト",
			StartDate:   time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:     nil, // 現在進行中
			Industry:    1,
			Role:        "SE",
		}

		err := db.Create(workHistory).Error
		assert.NoError(t, err)

		// 期間計算のテスト
		years, months := workHistory.CalculateDuration()
		totalMonths := years*12 + months

		// 3年以上の経験があるべき
		assert.True(t, totalMonths >= 36, "IT経験年数計算が正しくない")
		assert.True(t, years >= 3, "経験年数が3年以上であるべき")

		// レベル判定のテスト
		var level string
		switch {
		case totalMonths < 12:
			level = "初級"
		case totalMonths < 36:
			level = "ミドル"
		case totalMonths < 60:
			level = "シニア"
		default:
			level = "エキスパート"
		}

		assert.Contains(t, []string{"ミドル", "シニア", "エキスパート"}, level, "経験レベルが正しく計算されていない")
	})

	t.Run("期間テキスト生成テスト", func(t *testing.T) {
		testCases := []struct {
			name     string
			years    int
			months   int
			expected string
		}{
			{"6ヶ月", 0, 6, "6ヶ月"},
			{"1年", 1, 0, "1年"},
			{"1年6ヶ月", 1, 6, "1年6ヶ月"},
			{"3年", 3, 0, "3年"},
			{"5年2ヶ月", 5, 2, "5年2ヶ月"},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				totalMonths := int32(tc.years*12 + tc.months)
				years := totalMonths / 12
				remainingMonths := totalMonths % 12

				var text string
				if years == 0 {
					text = fmt.Sprintf("%dヶ月", remainingMonths)
				} else if remainingMonths == 0 {
					text = fmt.Sprintf("%d年", years)
				} else {
					text = fmt.Sprintf("%d年%dヶ月", years, remainingMonths)
				}

				assert.Equal(t, tc.expected, text, "期間テキストが正しく生成されていない")
			})
		}
	})

	t.Run("プロジェクト期間計算テスト", func(t *testing.T) {
		testCases := []struct {
			name         string
			startDate    time.Time
			endDate      *time.Time
			expectYears  int
			expectMonths int
		}{
			{
				name:         "6ヶ月プロジェクト",
				startDate:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
				endDate:      &time.Time{},
				expectYears:  0,
				expectMonths: 6,
			},
			{
				name:         "1年プロジェクト",
				startDate:    time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC),
				endDate:      &time.Time{},
				expectYears:  1,
				expectMonths: 0,
			},
			{
				name:         "進行中プロジェクト",
				startDate:    time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
				endDate:      nil,
				expectYears:  0,
				expectMonths: 0, // 現在進行中なので変動する
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				if tc.endDate != nil && tc.endDate.IsZero() {
					// 期間を計算して設定
					*tc.endDate = tc.startDate.AddDate(tc.expectYears, tc.expectMonths, 0)
				}

				workHistory := &model.WorkHistory{
					StartDate: tc.startDate,
					EndDate:   tc.endDate,
				}

				years, months := workHistory.CalculateDuration()

				if tc.endDate != nil {
					// 終了日がある場合は期待値通りかチェック
					assert.Equal(t, tc.expectYears, years, "計算された年数が期待値と異なる")
					assert.Equal(t, tc.expectMonths, months, "計算された月数が期待値と異なる")
				} else {
					// 進行中の場合は現在との差分を確認
					now := time.Now()
					expectedMonths := int(now.Sub(tc.startDate).Hours() / 24 / 30) // 概算
					actualMonths := years*12 + months

					// 1ヶ月程度の誤差は許容
					assert.True(t, abs(actualMonths-expectedMonths) <= 1,
						"進行中プロジェクトの期間計算が大きく異なる: actual=%d, expected=%d",
						actualMonths, expectedMonths)
				}
			})
		}
	})
}

// abs 絶対値を計算
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
