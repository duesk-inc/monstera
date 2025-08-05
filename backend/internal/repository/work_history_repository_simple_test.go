package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestWorkHistoryRepositoryCore(t *testing.T) {
	// テスト用のSQLiteデータベースを作成
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 最小限のテーブル作成
	err = db.Exec(`
		CREATE TABLE work_histories (
			id TEXT PRIMARY KEY,
			profile_id TEXT,
			user_id TEXT NOT NULL,
			project_name TEXT NOT NULL,
			start_date DATETIME NOT NULL,
			end_date DATETIME,
			industry INTEGER NOT NULL,
			project_overview TEXT NOT NULL,
			responsibilities TEXT NOT NULL,
			achievements TEXT,
			notes TEXT,
			processes TEXT,
			technologies TEXT NOT NULL,
			team_size INTEGER NOT NULL,
			role TEXT NOT NULL,
			duration_months INTEGER,
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

	repo := NewWorkHistoryRepository(db, zap.NewNop())
	ctx := context.Background()

	t.Run("Basic CRUD Operations", func(t *testing.T) {
		userID := uuid.New()
		profileID := uuid.New()

		workHistory := &model.WorkHistory{
			ID:               uuid.New(),
			ProfileID:        profileID,
			UserID:           userID,
			ProjectName:      "テストプロジェクト",
			StartDate:        time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:          nil,
			Industry:         1,
			ProjectOverview:  "プロジェクト概要",
			Responsibilities: "担当業務",
			Achievements:     "成果",
			Notes:            "備考",
			Processes:        "1,2,3",
			Technologies:     "Java,MySQL",
			TeamSize:         5,
			Role:             "SE",
		}

		// 作成
		err := repo.Create(ctx, workHistory)
		assert.NoError(t, err)

		// 取得
		result, err := repo.GetByID(ctx, workHistory.ID)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "テストプロジェクト", result.ProjectName)
		assert.Equal(t, userID, result.UserID)

		// 更新
		result.ProjectName = "更新後プロジェクト"
		err = repo.Update(ctx, result)
		assert.NoError(t, err)

		// 更新後の確認
		updated, err := repo.GetByID(ctx, workHistory.ID)
		assert.NoError(t, err)
		assert.Equal(t, "更新後プロジェクト", updated.ProjectName)

		// ユーザーの職務経歴一覧取得
		userWorkHistories, err := repo.GetByUserID(ctx, userID)
		assert.NoError(t, err)
		assert.Len(t, userWorkHistories, 1)
	})

	t.Run("Transaction Operations", func(t *testing.T) {
		userID := uuid.New()
		profileID := uuid.New()

		workHistory := &model.WorkHistory{
			ID:               uuid.New(),
			ProfileID:        profileID,
			UserID:           userID,
			ProjectName:      "技術付きプロジェクト",
			StartDate:        time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			Industry:         1,
			ProjectOverview:  "概要",
			Responsibilities: "業務",
			TeamSize:         5,
			Role:             "SE",
		}

		technologies := []model.WorkHistoryTechnology{
			{
				ID:             uuid.New().String(),
				CategoryID:     uuid.New().String(),
				TechnologyName: "Java",
			},
			{
				ID:             uuid.New().String(),
				CategoryID:     uuid.New().String(),
				TechnologyName: "MySQL",
			},
		}

		// トランザクションでの作成
		err := repo.CreateWithTechnologies(ctx, workHistory, technologies)
		assert.NoError(t, err)

		// 作成確認
		result, err := repo.GetByID(ctx, workHistory.ID)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "技術付きプロジェクト", result.ProjectName)
	})

	t.Run("Search Functionality", func(t *testing.T) {
		userID := uuid.New()
		profileID := uuid.New()

		// 検索用のデータを作成
		workHistory := &model.WorkHistory{
			ID:               uuid.New(),
			ProfileID:        profileID,
			UserID:           userID,
			ProjectName:      "検索テストプロジェクト",
			StartDate:        time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
			Industry:         1,
			ProjectOverview:  "検索用の概要",
			Responsibilities: "検索用の業務",
			TeamSize:         10,
			Role:             "リーダー",
		}
		err := repo.Create(ctx, workHistory)
		assert.NoError(t, err)

		// 検索実行
		userIDStr := userID
		projectName := "検索テスト"
		req := dto.WorkHistoryQueryRequest{
			UserID:      &userIDStr,
			ProjectName: &projectName,
			Page:        1,
			Limit:       10,
		}

		results, total, err := repo.Search(ctx, req)
		assert.NoError(t, err)
		assert.Equal(t, int64(1), total)
		assert.Len(t, results, 1)
		assert.Equal(t, "検索テストプロジェクト", results[0].ProjectName)
	})

	t.Run("Statistics Functions", func(t *testing.T) {
		userID := uuid.New()
		profileID := uuid.New()

		// 統計用のデータを作成
		for i := 0; i < 3; i++ {
			workHistory := &model.WorkHistory{
				ID:               uuid.New(),
				ProfileID:        profileID,
				UserID:           userID,
				ProjectName:      fmt.Sprintf("統計用プロジェクト%d", i+1),
				StartDate:        time.Date(2023, time.Month(i+1), 1, 0, 0, 0, 0, time.UTC),
				Industry:         1,
				ProjectOverview:  "概要",
				Responsibilities: "業務",
				TeamSize:         5,
				Role:             "SE",
			}
			err := repo.Create(ctx, workHistory)
			assert.NoError(t, err)
		}

		// プロジェクト数取得
		count, err := repo.GetProjectCount(ctx, userID)
		assert.NoError(t, err)
		assert.Equal(t, int32(3), count)

		// 進行中プロジェクト数取得（終了日がnull）
		activeCount, err := repo.GetActiveProjectCount(ctx, userID)
		assert.NoError(t, err)
		assert.Equal(t, int32(3), activeCount) // 全て終了日がnullなので3

		// IT経験年数計算（簡略版）
		itExperience, err := repo.CalculateITExperience(ctx, userID)
		assert.NoError(t, err)
		assert.True(t, itExperience >= 0) // 計算結果が有効な値
	})

	t.Run("Bulk Operations", func(t *testing.T) {
		userID := uuid.New()
		profileID := uuid.New()

		// 一括作成用のデータ
		var workHistories []*model.WorkHistory
		for i := 0; i < 3; i++ {
			workHistories = append(workHistories, &model.WorkHistory{
				ID:               uuid.New(),
				ProfileID:        profileID,
				UserID:           userID,
				ProjectName:      fmt.Sprintf("一括作成プロジェクト%d", i+1),
				StartDate:        time.Date(2023, time.Month(i+1), 1, 0, 0, 0, 0, time.UTC),
				Industry:         1,
				ProjectOverview:  "概要",
				Responsibilities: "業務",
				TeamSize:         5,
				Role:             "SE",
			})
		}

		// 一括作成
		err := repo.BulkCreate(ctx, workHistories)
		assert.NoError(t, err)

		// 作成確認
		results, err := repo.GetByUserID(ctx, userID)
		assert.NoError(t, err)
		assert.Len(t, results, 3)
	})
}
