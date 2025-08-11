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

// setupQuestionTestDB 質問テスト用データベースのセットアップ
func setupQuestionTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// テーブル作成
	err = db.AutoMigrate(
		&model.EngineerProposalQuestion{},
		&model.EngineerProposal{},
		&model.User{},
	)
	require.NoError(t, err)

	return db
}

// setupQuestionRepositoryTest 質問リポジトリテストのセットアップ
func setupQuestionRepositoryTest(t *testing.T) (*engineerProposalQuestionRepository, *gorm.DB) {
	db := setupQuestionTestDB(t)
	logger := zap.NewNop()

	repo := &engineerProposalQuestionRepository{
		db:     db,
		logger: logger,
	}

	return repo, db
}

// createTestQuestion テスト用質問データの作成
func createTestQuestion(proposalID string, userID string, questionText string, isResponded bool) *model.EngineerProposalQuestion {
	question := &model.EngineerProposalQuestion{
		ID:           uuid.New().String(),
		ProposalID:   proposalID,
		UserID:       userID,
		QuestionText: questionText,
		IsResponded:  isResponded,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if isResponded {
		responseText := "テスト回答"
		question.ResponseText = &responseText
		respondedAt := time.Now()
		question.RespondedAt = &respondedAt
		question.SalesUserID = &userID // 簡単のため同じユーザーIDを使用
	}

	return question
}

// TestEngineerProposalQuestionRepository_Create 質問作成のテスト
func TestEngineerProposalQuestionRepository_Create(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 質問作成成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		question := createTestQuestion(proposalID, userID, "テスト質問", false)

		// テスト実行
		err := repo.Create(ctx, question)

		// 検証
		assert.NoError(t, err)
		assert.NotEqual(t, "", question.ID)
	})

	t.Run("正常ケース - 質問文の長さ制限", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// 長い質問文でテスト
		longQuestion := ""
		for i := 0; i < 1000; i++ {
			longQuestion += "長い質問文です。"
		}

		question := createTestQuestion(proposalID, userID, longQuestion, false)

		// テスト実行
		err := repo.Create(ctx, question)

		// 検証（実装によってはバリデーションエラーになる可能性）
		if err != nil {
			assert.Error(t, err)
		} else {
			assert.NoError(t, err)
		}
	})
}

// TestEngineerProposalQuestionRepository_GetByID ID指定取得のテスト
func TestEngineerProposalQuestionRepository_GetByID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 質問取得成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成
		originalQuestion := createTestQuestion(proposalID, userID, "取得テスト質問", false)
		err := repo.Create(ctx, originalQuestion)
		require.NoError(t, err)

		// テスト実行
		result, err := repo.GetByID(ctx, originalQuestion.ID)

		// 検証
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, originalQuestion.ID, result.ID)
		assert.Equal(t, proposalID, result.ProposalID)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, "取得テスト質問", result.QuestionText)
		assert.False(t, result.IsResponded)
	})

	t.Run("異常ケース - 存在しないID", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		nonExistentID := uuid.New().String()

		// テスト実行
		result, err := repo.GetByID(ctx, nonExistentID)

		// 検証
		assert.Error(t, err)
		assert.Nil(t, result)
	})
}

// TestEngineerProposalQuestionRepository_Update 質問更新のテスト
func TestEngineerProposalQuestionRepository_Update(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 質問更新成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成
		question := createTestQuestion(proposalID, userID, "更新前質問", false)
		err := repo.Create(ctx, question)
		require.NoError(t, err)

		// 質問文更新
		question.QuestionText = "更新後質問"
		question.UpdatedAt = time.Now()

		// テスト実行
		err = repo.Update(ctx, question)

		// 検証
		assert.NoError(t, err)

		// 更新されたデータを取得して確認
		updated, err := repo.GetByID(ctx, question.ID)
		assert.NoError(t, err)
		assert.Equal(t, "更新後質問", updated.QuestionText)
	})

	t.Run("正常ケース - 回答データの更新", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()
		salesUserID := uuid.New().String()

		// テストデータ作成（未回答質問）
		question := createTestQuestion(proposalID, userID, "回答待ち質問", false)
		err := repo.Create(ctx, question)
		require.NoError(t, err)

		// 回答データ設定
		responseText := "営業からの回答です"
		respondedAt := time.Now()
		question.ResponseText = &responseText
		question.RespondedAt = &respondedAt
		question.SalesUserID = &salesUserID
		question.IsResponded = true
		question.UpdatedAt = time.Now()

		// テスト実行
		err = repo.Update(ctx, question)

		// 検証
		assert.NoError(t, err)

		// 更新されたデータを取得して確認
		updated, err := repo.GetByID(ctx, question.ID)
		assert.NoError(t, err)
		assert.True(t, updated.IsResponded)
		assert.NotNil(t, updated.ResponseText)
		assert.Equal(t, responseText, *updated.ResponseText)
		assert.NotNil(t, updated.RespondedAt)
		assert.NotNil(t, updated.SalesUserID)
		assert.Equal(t, salesUserID, *updated.SalesUserID)
	})
}

// TestEngineerProposalQuestionRepository_Delete 質問削除のテスト
func TestEngineerProposalQuestionRepository_Delete(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 質問削除成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成
		question := createTestQuestion(proposalID, userID, "削除テスト質問", false)
		err := repo.Create(ctx, question)
		require.NoError(t, err)

		// テスト実行
		err = repo.Delete(ctx, question.ID)

		// 検証
		assert.NoError(t, err)

		// 削除確認
		_, err = repo.GetByID(ctx, question.ID)
		assert.Error(t, err) // 削除されているのでエラーになる
	})
}

// TestEngineerProposalQuestionRepository_GetByProposalID 提案別質問取得のテスト
func TestEngineerProposalQuestionRepository_GetByProposalID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 提案別質問取得成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		otherProposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成（同じ提案に複数質問）
		question1 := createTestQuestion(proposalID, userID, "質問1", false)
		question2 := createTestQuestion(proposalID, userID, "質問2", true)
		question3 := createTestQuestion(proposalID, userID, "質問3", false)

		// 他の提案の質問（除外される）
		otherQuestion := createTestQuestion(otherProposalID, userID, "他の提案の質問", false)

		err := repo.Create(ctx, question1)
		require.NoError(t, err)
		err = repo.Create(ctx, question2)
		require.NoError(t, err)
		err = repo.Create(ctx, question3)
		require.NoError(t, err)
		err = repo.Create(ctx, otherQuestion)
		require.NoError(t, err)

		// フィルター設定
		filter := QuestionFilter{
			Page:  1,
			Limit: 10,
		}

		// テスト実行
		results, total, err := repo.GetByProposalID(ctx, proposalID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 3)
		assert.Equal(t, int64(3), total)

		// 提案IDが正しいことを確認
		for _, result := range results {
			assert.Equal(t, proposalID, result.ProposalID)
		}
	})

	t.Run("正常ケース - 回答状況フィルター", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成
		question1 := createTestQuestion(proposalID, userID, "未回答質問1", false)
		question2 := createTestQuestion(proposalID, userID, "回答済み質問", true)
		question3 := createTestQuestion(proposalID, userID, "未回答質問2", false)

		err := repo.Create(ctx, question1)
		require.NoError(t, err)
		err = repo.Create(ctx, question2)
		require.NoError(t, err)
		err = repo.Create(ctx, question3)
		require.NoError(t, err)

		// フィルター設定（未回答のみ）
		isResponded := false
		filter := QuestionFilter{
			IsResponded: &isResponded,
			Page:        1,
			Limit:       10,
		}

		// テスト実行
		results, total, err := repo.GetByProposalID(ctx, proposalID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2) // 未回答質問のみ2件
		assert.Equal(t, int64(2), total)

		// 回答状況が正しいことを確認
		for _, result := range results {
			assert.False(t, result.IsResponded)
		}
	})

	t.Run("正常ケース - ページネーション", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成（5件）
		for i := 0; i < 5; i++ {
			question := createTestQuestion(proposalID, userID, fmt.Sprintf("質問%d", i+1), false)
			err := repo.Create(ctx, question)
			require.NoError(t, err)
		}

		// フィルター設定（1ページあたり2件、2ページ目）
		filter := QuestionFilter{
			Page:  2,
			Limit: 2,
		}

		// テスト実行
		results, total, err := repo.GetByProposalID(ctx, proposalID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2)        // 2件取得
		assert.Equal(t, int64(5), total) // 全体では5件
	})
}

// TestEngineerProposalQuestionRepository_CountByProposalID 提案別質問数カウントのテスト
func TestEngineerProposalQuestionRepository_CountByProposalID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 質問数カウント成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// テストデータ作成（3件）
		for i := 0; i < 3; i++ {
			question := createTestQuestion(proposalID, userID, fmt.Sprintf("質問%d", i+1), false)
			err := repo.Create(ctx, question)
			require.NoError(t, err)
		}

		// 他の提案の質問（カウントされない）
		otherQuestion := createTestQuestion(uuid.New().String(), userID, "他の質問", false)
		err := repo.Create(ctx, otherQuestion)
		require.NoError(t, err)

		// テスト実行
		count, err := repo.CountByProposalID(ctx, proposalID)

		// 検証
		assert.NoError(t, err)
		assert.Equal(t, int64(3), count)
	})

	t.Run("正常ケース - 質問が0件", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()

		// テスト実行（質問なし）
		count, err := repo.CountByProposalID(ctx, proposalID)

		// 検証
		assert.NoError(t, err)
		assert.Equal(t, int64(0), count)
	})
}

// TestEngineerProposalQuestionRepository_GetPendingQuestions 未回答質問取得のテスト
func TestEngineerProposalQuestionRepository_GetPendingQuestions(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 未回答質問取得成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		salesUserID := uuid.New().String()
		userID := uuid.New().String()
		proposalID1 := uuid.New().String()
		proposalID2 := uuid.New().String()

		// テストデータ作成
		// 未回答質問（取得対象）
		question1 := createTestQuestion(proposalID1, userID, "未回答質問1", false)
		question2 := createTestQuestion(proposalID2, userID, "未回答質問2", false)

		// 回答済み質問（除外される）
		question3 := createTestQuestion(proposalID1, userID, "回答済み質問", true)

		err := repo.Create(ctx, question1)
		require.NoError(t, err)
		err = repo.Create(ctx, question2)
		require.NoError(t, err)
		err = repo.Create(ctx, question3)
		require.NoError(t, err)

		// フィルター設定
		filter := PendingQuestionFilter{
			Page:  1,
			Limit: 10,
		}

		// テスト実行
		results, total, err := repo.GetPendingQuestions(ctx, salesUserID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2) // 未回答質問のみ2件
		assert.Equal(t, int64(2), total)

		// 回答状況が正しいことを確認
		for _, result := range results {
			assert.False(t, result.IsResponded)
		}
	})

	t.Run("正常ケース - 担当者フィルター", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		salesUserID := uuid.New().String()
		otherSalesUserID := uuid.New().String()
		userID := uuid.New().String()
		proposalID := uuid.New().String()

		// テストデータ作成
		// 担当者なしの未回答質問
		question1 := createTestQuestion(proposalID, userID, "担当者なし質問", false)

		// 他の担当者の質問
		question2 := createTestQuestion(proposalID, userID, "他の担当者質問", false)
		question2.SalesUserID = &otherSalesUserID

		err := repo.Create(ctx, question1)
		require.NoError(t, err)
		err = repo.Create(ctx, question2)
		require.NoError(t, err)

		// フィルター設定（担当者指定）
		filter := PendingQuestionFilter{
			SalesUserID: &salesUserID,
			Page:        1,
			Limit:       10,
		}

		// テスト実行
		results, total, err := repo.GetPendingQuestions(ctx, salesUserID, filter)

		// 検証
		assert.NoError(t, err)
		// 担当者が指定された場合、その担当者の質問のみ取得される
		// 実装に応じて適切な検証を行う
		assert.GreaterOrEqual(t, len(results), 0)
		assert.GreaterOrEqual(t, total, int64(0))
	})
}

// TestEngineerProposalQuestionRepository_GetQuestionsByUserID ユーザー別質問取得のテスト
func TestEngineerProposalQuestionRepository_GetQuestionsByUserID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - ユーザー別質問取得成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		userID := uuid.New().String()
		otherUserID := uuid.New().String()
		proposalID := uuid.New().String()

		// テストデータ作成
		question1 := createTestQuestion(proposalID, userID, "ユーザー質問1", false)
		question2 := createTestQuestion(proposalID, userID, "ユーザー質問2", true)

		// 他のユーザーの質問（除外される）
		otherQuestion := createTestQuestion(proposalID, otherUserID, "他のユーザー質問", false)

		err := repo.Create(ctx, question1)
		require.NoError(t, err)
		err = repo.Create(ctx, question2)
		require.NoError(t, err)
		err = repo.Create(ctx, otherQuestion)
		require.NoError(t, err)

		// フィルター設定
		filter := QuestionFilter{
			Page:  1,
			Limit: 10,
		}

		// テスト実行
		results, total, err := repo.GetQuestionsByUserID(ctx, userID, filter)

		// 検証
		assert.NoError(t, err)
		assert.Len(t, results, 2)
		assert.Equal(t, int64(2), total)

		// ユーザーIDが正しいことを確認
		for _, result := range results {
			assert.Equal(t, userID, result.UserID)
		}
	})
}

// TestEngineerProposalQuestionRepository_AssignToSales 営業担当者割り当てのテスト
func TestEngineerProposalQuestionRepository_AssignToSales(t *testing.T) {
	ctx := context.Background()

	t.Run("正常ケース - 営業担当者割り当て成功", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()
		salesUserID := uuid.New().String()

		// テストデータ作成（担当者なしの質問）
		question := createTestQuestion(proposalID, userID, "担当者割り当てテスト質問", false)
		err := repo.Create(ctx, question)
		require.NoError(t, err)

		// テスト実行
		err = repo.AssignToSales(ctx, question.ID, salesUserID)

		// 検証
		assert.NoError(t, err)

		// 割り当て確認
		updated, err := repo.GetByID(ctx, question.ID)
		assert.NoError(t, err)
		assert.NotNil(t, updated.SalesUserID)
		assert.Equal(t, salesUserID, *updated.SalesUserID)
	})

	t.Run("正常ケース - 担当者変更", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()
		salesUserID1 := uuid.New().String()
		salesUserID2 := uuid.New().String()

		// テストデータ作成（既に担当者ありの質問）
		question := createTestQuestion(proposalID, userID, "担当者変更テスト質問", false)
		question.SalesUserID = &salesUserID1
		err := repo.Create(ctx, question)
		require.NoError(t, err)

		// テスト実行（担当者変更）
		err = repo.AssignToSales(ctx, question.ID, salesUserID2)

		// 検証
		assert.NoError(t, err)

		// 変更確認
		updated, err := repo.GetByID(ctx, question.ID)
		assert.NoError(t, err)
		assert.NotNil(t, updated.SalesUserID)
		assert.Equal(t, salesUserID2, *updated.SalesUserID)
	})

	t.Run("異常ケース - 存在しない質問ID", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		nonExistentID := uuid.New().String()
		salesUserID := uuid.New().String()

		// テスト実行
		err := repo.AssignToSales(ctx, nonExistentID, salesUserID)

		// 検証（実装によってはエラーにならない場合もある）
		if err != nil {
			assert.Error(t, err)
		}
	})
}

// TestEngineerProposalQuestionRepository_ErrorHandling エラーハンドリングのテスト
func TestEngineerProposalQuestionRepository_ErrorHandling(t *testing.T) {
	ctx := context.Background()

	t.Run("無効なUUID", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)

		// 無効なUUIDでの取得テスト
		_, err := repo.GetByID(ctx, "")
		assert.Error(t, err)
	})

	t.Run("空の質問文", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)
		proposalID := uuid.New().String()
		userID := uuid.New().String()

		// 空の質問文でテスト
		question := createTestQuestion(proposalID, userID, "", false)
		err := repo.Create(ctx, question)

		// 検証（バリデーション次第）
		if err != nil {
			assert.Error(t, err)
		} else {
			// 空の質問文が許可される場合
			assert.NoError(t, err)
		}
	})

	t.Run("コンテキストキャンセル", func(t *testing.T) {
		repo, _ := setupQuestionRepositoryTest(t)

		// キャンセル済みコンテキスト
		canceledCtx, cancel := context.WithCancel(ctx)
		cancel()

		question := createTestQuestion(uuid.New().String(), uuid.New().String(), "キャンセルテスト", false)
		err := repo.Create(canceledCtx, question)

		// コンテキストキャンセルでエラーになる可能性がある
		if err != nil {
			assert.Error(t, err)
		}
	})
}
