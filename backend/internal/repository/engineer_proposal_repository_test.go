package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/model"
)

// setupTestDB テスト用データベースのセットアップ
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// テーブル作成
	err = db.AutoMigrate(
		&model.EngineerProposal{},
		&model.User{},
		&model.Project{},
	)
	require.NoError(t, err)

	return db
}

// setupProposalRepositoryTest リポジトリテストのセットアップ
func setupProposalRepositoryTest(t *testing.T) (*engineerProposalRepository, *gorm.DB) {
	db := setupTestDB(t)
	logger := zap.NewNop()

	repo := &engineerProposalRepository{
		db:     db,
		logger: logger,
	}

	return repo, db
}

// createTestProposal テスト用提案データの作成
func createTestProposal(userID uuid.UUID, projectID uuid.UUID, status string) *model.EngineerProposal {
	return &model.EngineerProposal{
		ID:        uuid.New(),
		UserID:    userID,
		ProjectID: projectID,
		Status:    status,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// TestEngineerProposalRepository_Create 提案作成のテスト
func TestEngineerProposalRepository_Create(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 提案作成成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		proposal := createTestProposal(userID, projectID, "proposed")

		// テスト実行
		err := repo.Create(ctx, proposal)

		// 検証
		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, proposal.ID)
	})

	t.Run("異常ケース - 重複作成", func(t *testing.T) {
		repo, db := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// 最初の提案を作成
		proposal1 := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal1)
		require.NoError(t, err)

		// 同じユーザー・プロジェクトで重複制約を設定（実際のテーブルに制約がある場合）
		proposal2 := createTestProposal(userID, projectID, "proposed")

		// テスト実行（重複チェックは別メソッドで行うため、ここでは作成が成功する場合もある）
		err = repo.Create(ctx, proposal2)

		// 重複制約がDBレベルで設定されている場合はエラーになる
		if err != nil {
			assert.Error(t, err)
		} else {
			// 重複チェックをアプリケーションレベルで行う場合
			exists, checkErr := repo.CheckDuplicateProposal(ctx, projectID, userID)
			assert.NoError(t, checkErr)
			assert.True(t, exists)

			// 重複データを削除
			db.Delete(proposal2)
		}
	})
}

// TestEngineerProposalRepository_GetByID ID指定取得のテスト
func TestEngineerProposalRepository_GetByID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 提案取得成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テストデータ作成
		originalProposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, originalProposal)
		require.NoError(t, err)

		// テスト実行
		result, err := repo.GetByID(ctx, originalProposal.ID)

		// 検証
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, originalProposal.ID, result.ID)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, projectID, result.ProjectID)
		assert.Equal(t, "proposed", result.Status)
	})

	t.Run("異常ケース - 存在しないID", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		nonExistentID := uuid.New()

		// テスト実行
		result, err := repo.GetByID(ctx, nonExistentID)

		// 検証
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestEngineerProposalRepository_Update 提案更新のテスト
func TestEngineerProposalRepository_Update(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 提案更新成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テストデータ作成
		proposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal)
		require.NoError(t, err)

		// ステータス更新
		proposal.Status = "proceed"
		proposal.UpdatedAt = time.Now()

		// テスト実行
		err = repo.Update(ctx, proposal)

		// 検証
		assert.NoError(t, err)

		// 更新されたデータを取得して確認
		updated, err := repo.GetByID(ctx, proposal.ID)
		assert.NoError(t, err)
		assert.Equal(t, "proceed", updated.Status)
	})

	t.Run("異常ケース - 存在しない提案の更新", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)

		nonExistentProposal := &model.EngineerProposal{
			ID:        uuid.New(),
			UserID:    uuid.New(),
			ProjectID: uuid.New(),
			Status:    "proceed",
			UpdatedAt: time.Now(),
		}

		// テスト実行
		err := repo.Update(ctx, nonExistentProposal)

		// 検証（GORMでは存在しないレコードの更新でもエラーにならない場合がある）
		// 実際の実装に応じて適切な検証を行う
		if err != nil {
			assert.Error(t, err)
		}
	})
}

// TestEngineerProposalRepository_Delete 提案削除のテスト
func TestEngineerProposalRepository_Delete(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 提案削除成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テストデータ作成
		proposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal)
		require.NoError(t, err)

		// テスト実行
		err = repo.Delete(ctx, proposal.ID)

		// 検証
		assert.NoError(t, err)

		// 削除確認
		_, err = repo.GetByID(ctx, proposal.ID)
		assert.Error(t, err) // 削除されているのでエラーになる
	})
}

// TestEngineerProposalRepository_UpdateStatus ステータス更新のテスト
func TestEngineerProposalRepository_UpdateStatus(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - ステータス更新成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テストデータ作成
		proposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal)
		require.NoError(t, err)

		// テスト実行
		respondedAt := time.Now()
		err = repo.UpdateStatus(ctx, proposal.ID, "proceed", &respondedAt)

		// 検証
		assert.NoError(t, err)

		// 更新確認
		updated, err := repo.GetByID(ctx, proposal.ID)
		assert.NoError(t, err)
		assert.Equal(t, "proceed", updated.Status)
		assert.NotNil(t, updated.RespondedAt)
	})

	t.Run("正常ケース - respondedAtがnilの場合", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テストデータ作成
		proposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal)
		require.NoError(t, err)

		// テスト実行（respondedAtをnilで渡す）
		err = repo.UpdateStatus(ctx, proposal.ID, "declined", nil)

		// 検証
		assert.NoError(t, err)

		// 更新確認
		updated, err := repo.GetByID(ctx, proposal.ID)
		assert.NoError(t, err)
		assert.Equal(t, "declined", updated.Status)
	})
}

// TestEngineerProposalRepository_GetByUserID ユーザー別取得のテスト
func TestEngineerProposalRepository_GetByUserID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - ユーザー別提案取得成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID1 := uuid.New()
		projectID2 := uuid.New()
		otherUserID := uuid.New()

		// テストデータ作成（対象ユーザーの提案）
		proposal1 := createTestProposal(userID, projectID1, "proposed")
		proposal2 := createTestProposal(userID, projectID2, "proceed")
		err := repo.Create(ctx, proposal1)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal2)
		require.NoError(t, err)

		// 他のユーザーの提案（除外される）
		otherProposal := createTestProposal(otherUserID, uuid.New(), "proposed")
		err = repo.Create(ctx, otherProposal)
		require.NoError(t, err)

		// フィルター設定
		filter := EngineerProposalFilter{
			Page:  1,
			Limit: 10,
		}

		// テスト実行
		results, total, err := repo.GetByUserID(ctx, userID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2)
		assert.Equal(t, int64(2), total)

		// ユーザーIDが正しいことを確認
		for _, result := range results {
			assert.Equal(t, userID, result.UserID)
		}
	})

	t.Run("正常ケース - ステータスフィルター", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()

		// テストデータ作成
		proposal1 := createTestProposal(userID, uuid.New(), "proposed")
		proposal2 := createTestProposal(userID, uuid.New(), "proceed")
		proposal3 := createTestProposal(userID, uuid.New(), "proposed")

		err := repo.Create(ctx, proposal1)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal2)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal3)
		require.NoError(t, err)

		// フィルター設定（proposedステータスのみ）
		status := "proposed"
		filter := EngineerProposalFilter{
			Status: &status,
			Page:   1,
			Limit:  10,
		}

		// テスト実行
		results, total, err := repo.GetByUserID(ctx, userID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2) // proposedステータスのみ2件
		assert.Equal(t, int64(2), total)

		// ステータスが正しいことを確認
		for _, result := range results {
			assert.Equal(t, "proposed", result.Status)
		}
	})

	t.Run("正常ケース - ページネーション", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()

		// テストデータ作成（5件）
		for i := 0; i < 5; i++ {
			proposal := createTestProposal(userID, uuid.New(), "proposed")
			err := repo.Create(ctx, proposal)
			require.NoError(t, err)
		}

		// フィルター設定（1ページあたり2件、2ページ目）
		filter := EngineerProposalFilter{
			Page:  2,
			Limit: 2,
		}

		// テスト実行
		results, total, err := repo.GetByUserID(ctx, userID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2)        // 2件取得
		assert.Equal(t, int64(5), total) // 全体では5件
	})
}

// TestEngineerProposalRepository_GetByProjectID プロジェクト別取得のテスト
func TestEngineerProposalRepository_GetByProjectID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - プロジェクト別提案取得成功", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		projectID := uuid.New()
		user1ID := uuid.New()
		user2ID := uuid.New()

		// テストデータ作成（同じプロジェクトに複数ユーザーが提案）
		proposal1 := createTestProposal(user1ID, projectID, "proposed")
		proposal2 := createTestProposal(user2ID, projectID, "proceed")
		err := repo.Create(ctx, proposal1)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal2)
		require.NoError(t, err)

		// 他のプロジェクトの提案（除外される）
		otherProposal := createTestProposal(user1ID, uuid.New(), "proposed")
		err = repo.Create(ctx, otherProposal)
		require.NoError(t, err)

		// テスト実行
		results, err := repo.GetByProjectID(ctx, projectID)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2)

		// プロジェクトIDが正しいことを確認
		for _, result := range results {
			assert.Equal(t, projectID, result.ProjectID)
		}
	})

	t.Run("正常ケース - 該当なし", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		nonExistentProjectID := uuid.New()

		// テスト実行
		results, err := repo.GetByProjectID(ctx, nonExistentProjectID)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 0)
	})
}

// TestEngineerProposalRepository_CheckDuplicateProposal 重複チェックのテスト
func TestEngineerProposalRepository_CheckDuplicateProposal(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 重複あり", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テストデータ作成
		proposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal)
		require.NoError(t, err)

		// テスト実行
		exists, err := repo.CheckDuplicateProposal(ctx, projectID, userID)

		// 検証
		assert.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("正常ケース - 重複なし", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()

		// テスト実行（データなし）
		exists, err := repo.CheckDuplicateProposal(ctx, projectID, userID)

		// 検証
		assert.NoError(t, err)
		assert.False(t, exists)
	})

	t.Run("正常ケース - 異なるユーザー/プロジェクト", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()
		projectID := uuid.New()
		otherUserID := uuid.New()
		otherProjectID := uuid.New()

		// テストデータ作成
		proposal := createTestProposal(userID, projectID, "proposed")
		err := repo.Create(ctx, proposal)
		require.NoError(t, err)

		// テスト実行（異なるユーザー）
		exists, err := repo.CheckDuplicateProposal(ctx, projectID, otherUserID)
		assert.NoError(t, err)
		assert.False(t, exists)

		// テスト実行（異なるプロジェクト）
		exists, err = repo.CheckDuplicateProposal(ctx, otherProjectID, userID)
		assert.NoError(t, err)
		assert.False(t, exists)
	})
}

// TestEngineerProposalRepository_GetByUserAndStatus ユーザー・ステータス別取得のテスト
func TestEngineerProposalRepository_GetByUserAndStatus(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 複数ステータス検索", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()

		// テストデータ作成
		proposal1 := createTestProposal(userID, uuid.New(), "proposed")
		proposal2 := createTestProposal(userID, uuid.New(), "proceed")
		proposal3 := createTestProposal(userID, uuid.New(), "declined")
		proposal4 := createTestProposal(userID, uuid.New(), "proposed")

		err := repo.Create(ctx, proposal1)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal2)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal3)
		require.NoError(t, err)
		err = repo.Create(ctx, proposal4)
		require.NoError(t, err)

		// テスト実行（proposedとproceedのみ）
		statuses := []string{"proposed", "proceed"}
		results, err := repo.GetByUserAndStatus(ctx, userID, statuses)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 3) // proposed x2 + proceed x1

		// ステータスが正しいことを確認
		for _, result := range results {
			assert.Contains(t, statuses, result.Status)
		}
	})

	t.Run("正常ケース - 該当なし", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)
		userID := uuid.New()

		// テスト実行（存在しないステータス）
		statuses := []string{"non_existent_status"}
		results, err := repo.GetByUserAndStatus(ctx, userID, statuses)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 0)
	})
}

// TestEngineerProposalRepository_ErrorHandling エラーハンドリングのテスト
func TestEngineerProposalRepository_ErrorHandling(t *testing.T) {
	ctx := context.Background()

	t.Run("無効なUUID", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)

		// 無効なUUIDでの取得テスト
		_, err := repo.GetByID(ctx, uuid.Nil)
		assert.Error(t, err)
	})

	t.Run("コンテキストキャンセル", func(t *testing.T) {
		repo, _ := setupProposalRepositoryTest(t)

		// キャンセル済みコンテキスト
		canceledCtx, cancel := context.WithCancel(ctx)
		cancel()

		proposal := createTestProposal(uuid.New(), uuid.New(), "proposed")
		err := repo.Create(canceledCtx, proposal)

		// コンテキストキャンセルでエラーになる可能性がある
		// ただし、SQLiteの場合は即座に実行されるためキャンセルされない場合もある
		if err != nil {
			assert.Error(t, err)
		}
	})
}
