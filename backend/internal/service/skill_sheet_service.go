package service

import (
	"context"
	"errors"
	"time"

	"github.com/duesk/monstera/internal/common/dateutil"
	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SkillSheetService スキルシート関連のビジネスロジックを提供
type SkillSheetService struct {
	profileRepo         repository.ProfileRepository
	userRepo            repository.UserRepository
	techCategoryRepo    repository.TechnologyCategoryRepository
	workHistoryTechRepo repository.WorkHistoryTechnologyRepository
	txManager           transaction.TransactionManager
	db                  *gorm.DB
	logger              *zap.Logger
}

// NewSkillSheetService SkillSheetServiceのインスタンスを生成する
func NewSkillSheetService(
	profileRepo repository.ProfileRepository,
	userRepo repository.UserRepository,
	techCategoryRepo repository.TechnologyCategoryRepository,
	workHistoryTechRepo repository.WorkHistoryTechnologyRepository,
	db *gorm.DB,
	logger *zap.Logger,
) *SkillSheetService {
	return &SkillSheetService{
		profileRepo:         profileRepo,
		userRepo:            userRepo,
		techCategoryRepo:    techCategoryRepo,
		workHistoryTechRepo: workHistoryTechRepo,
		txManager:           transaction.NewTransactionManager(db, logger),
		db:                  db,
		logger:              logger,
	}
}

// GetUserSkillSheet ユーザーIDからスキルシート情報を取得
func (s *SkillSheetService) GetUserSkillSheet(userID string) (*dto.SkillSheetResponse, error) {
	s.logger.Info("スキルシート取得開始", zap.String("user_id", userID))

	// ユーザー情報を取得
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		s.logger.Error("ユーザー取得エラー", zap.Error(err), zap.String("user_id", userID))
		return nil, err
	}

	// プロフィール情報を取得（職務経歴含む）
	profile, err := s.profileRepo.FindByUserIDWithWorkHistory(userID)
	if err != nil {
		// プロフィールが存在しない場合はデフォルト値で作成
		if errors.Is(err, gorm.ErrRecordNotFound) {
			profile = &model.Profile{
				UserID: userID,
				User:   *user,
			}
			s.logger.Info("プロフィールが存在しないため空のスキルシートを返却", zap.String("user_id", userID))
			return s.createSkillSheetResponse(profile, user), nil
		}
		s.logger.Error("プロフィール取得エラー", zap.Error(err), zap.String("user_id", userID))
		return nil, err
	}

	s.logger.Info("スキルシート取得完了",
		zap.String("user_id", userID),
		zap.Int("work_histories_count", len(profile.WorkHistories)),
	)

	return s.createSkillSheetResponse(profile, user), nil
}

// createSkillSheetResponse スキルシートレスポンスを作成
func (s *SkillSheetService) createSkillSheetResponse(profile *model.Profile, user *model.User) *dto.SkillSheetResponse {
	// 職務経歴のレスポンスを作成
	workHistories := make([]dto.WorkHistoryResponse, len(profile.WorkHistories))
	technicalSkillsMap := make(map[string]map[string]bool) // [categoryName][technologyName] = true

	for i, wh := range profile.WorkHistories {
		var endDate *string
		if wh.EndDate != nil {
			formattedDate := wh.EndDate.Format("2006-01-02")
			endDate = &formattedDate
		}

		// 技術項目を取得
		techItems, err := s.workHistoryTechRepo.GetWithCategory(context.Background(), wh.ID)
		if err != nil {
			s.logger.Error("技術項目取得エラー", zap.Error(err), zap.String("work_history_id", wh.ID))
			techItems = []model.WorkHistoryTechnology{}
		}

		// 技術項目をレスポンス形式に変換
		technologyItemsResp := make([]dto.TechnologyItemResponse, len(techItems))
		for j, tech := range techItems {
			technologyItemsResp[j] = dto.TechnologyItemResponse{
				ID:             tech.ID,
				CategoryID:     tech.CategoryID,
				TechnologyName: tech.TechnologyName,
			}
			if tech.Category != nil {
				technologyItemsResp[j].Category = &dto.TechnologyCategoryResponse{
					ID:          tech.Category.ID,
					Name:        tech.Category.Name,
					DisplayName: tech.Category.DisplayName,
					SortOrder:   tech.Category.SortOrder,
				}

				// 技術スキルサマリー用にデータを蓄積
				if _, exists := technicalSkillsMap[tech.Category.DisplayName]; !exists {
					technicalSkillsMap[tech.Category.DisplayName] = make(map[string]bool)
				}
				technicalSkillsMap[tech.Category.DisplayName][tech.TechnologyName] = true
			}
		}

		// カテゴリ別に技術項目を分類
		programmingLanguages := []string{}
		serversDatabases := []string{}
		tools := []string{}

		for _, tech := range techItems {
			if tech.Category != nil {
				switch tech.Category.Name {
				case "programming_languages":
					programmingLanguages = append(programmingLanguages, tech.TechnologyName)
				case "servers_databases":
					serversDatabases = append(serversDatabases, tech.TechnologyName)
				case "tools":
					tools = append(tools, tech.TechnologyName)
				}
			}
		}

		workHistories[i] = dto.WorkHistoryResponse{
			ID:                   wh.ID,
			ProjectName:          wh.ProjectName,
			StartDate:            wh.StartDate.Format("2006-01-02"),
			EndDate:              endDate,
			Industry:             wh.Industry,
			ProjectOverview:      wh.ProjectOverview,
			Responsibilities:     wh.Responsibilities,
			Achievements:         wh.Achievements,
			Notes:                wh.Notes,
			Processes:            wh.GetProcessesArray(),
			Technologies:         wh.Technologies, // 後方互換性のため保持
			ProgrammingLanguages: programmingLanguages,
			ServersDatabases:     serversDatabases,
			Tools:                tools,
			TechnologyItems:      technologyItemsResp,
			TeamSize:             wh.TeamSize,
			Role:                 wh.Role,
		}
	}

	// 技術スキルサマリーを作成
	technicalSkills := make([]dto.TechnicalSkillResponse, 0, len(technicalSkillsMap))
	for categoryDisplayName, technologies := range technicalSkillsMap {
		techList := make([]string, 0, len(technologies))
		for tech := range technologies {
			techList = append(techList, tech)
		}

		// カテゴリ名を取得（表示名から内部名への変換）
		categoryName := categoryDisplayName
		switch categoryDisplayName {
		case "プログラミング言語":
			categoryName = "programming_languages"
		case "サーバー・DB":
			categoryName = "servers_databases"
		case "ツール":
			categoryName = "tools"
		}

		technicalSkills = append(technicalSkills, dto.TechnicalSkillResponse{
			CategoryName: categoryName,
			DisplayName:  categoryDisplayName,
			Technologies: techList,
		})
	}

	// レスポンス作成
	return &dto.SkillSheetResponse{
		UserID:          user.ID,
		Email:           user.Email,
		FirstName:       user.FirstName,
		LastName:        user.LastName,
		FirstNameKana:   user.FirstNameKana,
		LastNameKana:    user.LastNameKana,
		WorkHistories:   workHistories,
		TechnicalSkills: technicalSkills,
		CreatedAt:       profile.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       profile.UpdatedAt.Format(time.RFC3339),
	}
}

// UpdateUserSkillSheetWithDTO DTOを使用してスキルシート情報を更新
func (s *SkillSheetService) UpdateUserSkillSheetWithDTO(userID string, request dto.SkillSheetSaveRequest, isTempSave bool) error {
	s.logger.Info("スキルシート更新処理開始",
		zap.String("user_id", userID),
		zap.Bool("is_temp_save", isTempSave),
		zap.Int("work_histories_count", len(request.WorkHistory)),
	)

	// トランザクション開始
	tx := s.db.Begin()
	if tx.Error != nil {
		s.logger.Error("トランザクション開始に失敗", zap.Error(tx.Error))
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			s.logger.Error("パニックが発生したためロールバック", zap.Any("panic", r))
		}
	}()

	// ユーザー存在確認
	var user model.User
	if err := tx.First(&user, "id = ?", userID).Error; err != nil {
		tx.Rollback()
		s.logger.Error("ユーザーが見つかりません", zap.Error(err), zap.String("user_id", userID))
		return err
	}

	s.logger.Info("ユーザー確認完了", zap.String("user_id", userID), zap.String("email", user.Email))

	// プロフィール取得または作成
	var profile model.Profile
	err := tx.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Info("プロフィールが存在しないため新規作成", zap.String("user_id", userID))
			// 新規プロフィール作成
			profile = model.Profile{
				ID:             uuid.New().String(),
				UserID:         userID,
				Education:      "", // スキルシートでは管理しない
				NearestStation: "", // スキルシートでは管理しない
				CanTravel:      3,  // デフォルト値
				AppealPoints:   "", // スキルシートでは管理しない
				IsTempSaved:    isTempSave,
				CurrentVersion: 1,
			}
			if isTempSave {
				now := time.Now()
				profile.TempSavedAt = &now
			}

			if err := tx.Create(&profile).Error; err != nil {
				tx.Rollback()
				s.logger.Error("プロフィール作成に失敗", zap.Error(err))
				return err
			}
			s.logger.Info("プロフィール新規作成完了", zap.String("profile_id", profile.ID))
		} else {
			tx.Rollback()
			s.logger.Error("プロフィール取得でエラー発生", zap.Error(err))
			return err
		}
	} else {
		s.logger.Info("既存プロフィール更新", zap.String("profile_id", profile.ID))
		// 既存プロフィール更新（職務経歴関連のみ）
		profile.IsTempSaved = isTempSave

		if isTempSave {
			now := time.Now()
			profile.TempSavedAt = &now
		} else {
			profile.TempSavedAt = nil
			profile.CurrentVersion++
		}

		if err := tx.Save(&profile).Error; err != nil {
			tx.Rollback()
			s.logger.Error("プロフィール更新に失敗", zap.Error(err))
			return err
		}
		s.logger.Info("プロフィール更新完了", zap.String("profile_id", profile.ID))
	}

	// 既存の職務経歴を削除
	s.logger.Info("既存職務経歴削除開始", zap.String("profile_id", profile.ID))
	if err := tx.Where("profile_id = ?", profile.ID).Delete(&model.WorkHistory{}).Error; err != nil {
		tx.Rollback()
		s.logger.Error("既存職務経歴削除に失敗", zap.Error(err))
		return err
	}

	// 既存の職務経歴技術項目も削除（外部キー制約により自動削除されない場合のため）
	if err := tx.Exec("DELETE FROM work_history_technologies WHERE work_history_id IN (SELECT id FROM work_histories WHERE profile_id = ?)", profile.ID).Error; err != nil {
		s.logger.Warn("既存職務経歴技術項目削除で警告", zap.Error(err))
		// 警告レベルに留める（外部キー制約で既に削除されている可能性があるため）
	}

	// 職務経歴の処理
	s.logger.Info("職務経歴処理開始", zap.Int("work_histories_count", len(request.WorkHistory)))
	for i, workReq := range request.WorkHistory {
		s.logger.Info("職務経歴処理中",
			zap.Int("index", i),
			zap.String("project_name", workReq.ProjectName),
		)

		if workReq.ProjectName == "" {
			s.logger.Warn("空のプロジェクト名をスキップ", zap.Int("index", i))
			continue
		}

		// 開始日をパース
		var startDate time.Time
		if workReq.StartDate != "" {
			parsedStartDate, parseErr := time.Parse("2006-01-02", workReq.StartDate)
			if parseErr != nil {
				s.logger.Warn("開始日のパースに失敗", zap.Error(parseErr), zap.String("start_date", workReq.StartDate))
				// パースに失敗した場合は現在日時を使用
				startDate = time.Now()
			} else {
				// 日付範囲の検証（最小年と未来日付）
				if err := dateutil.ValidateCareerDate(parsedStartDate, "開始日"); err != nil {
					tx.Rollback()
					s.logger.Error("開始日のバリデーションエラー",
						zap.Error(err),
						zap.String("start_date", workReq.StartDate))
					return err
				}
				startDate = parsedStartDate
			}
		} else {
			// 空の場合は現在日時を使用
			startDate = time.Now()
		}

		// 終了日をパース
		var endDate *time.Time
		if workReq.EndDate != "" {
			parsedEndDate, parseErr := time.Parse("2006-01-02", workReq.EndDate)
			if parseErr != nil {
				s.logger.Warn("終了日のパースに失敗", zap.Error(parseErr), zap.String("end_date", workReq.EndDate))
				// パースに失敗した場合はnilのまま
			} else {
				// 日付範囲の検証（最小年と未来日付）
				if err := dateutil.ValidateCareerDate(parsedEndDate, "終了日"); err != nil {
					tx.Rollback()
					s.logger.Error("終了日のバリデーションエラー",
						zap.Error(err),
						zap.String("end_date", workReq.EndDate))
					return err
				}
				// 開始日と終了日の前後関係を検証
				if err := dateutil.ValidateDateRange(startDate, parsedEndDate); err != nil {
					tx.Rollback()
					s.logger.Error("日付範囲のバリデーションエラー",
						zap.Error(err),
						zap.String("start_date", workReq.StartDate),
						zap.String("end_date", workReq.EndDate))
					return err
				}
				endDate = &parsedEndDate
			}
		}

		workHistory := model.WorkHistory{
			ID:               uuid.New().String(),
			ProfileID:        profile.ID,
			UserID:           userID,
			ProjectName:      workReq.ProjectName,
			StartDate:        startDate,
			EndDate:          endDate,
			Industry:         workReq.Industry,
			ProjectOverview:  workReq.ProjectOverview,
			Responsibilities: workReq.Responsibilities,
			Achievements:     workReq.Achievements,
			Notes:            workReq.Notes,
			Technologies:     workReq.Technologies, // 後方互換性のため保持
			TeamSize:         workReq.TeamSize,
			Role:             workReq.Role,
		}

		// プロセス情報を数値配列から文字列に変換
		workHistory.SetProcessesArray(workReq.Processes)

		if err := tx.Create(&workHistory).Error; err != nil {
			tx.Rollback()
			s.logger.Error("職務経歴作成に失敗", zap.Error(err))
			return err
		}
		s.logger.Info("職務経歴作成完了", zap.String("work_history_id", workHistory.ID))

		// 新しい技術項目の処理
		allTechItems := []string{}

		// 各カテゴリの技術項目を処理
		techCategories := map[string][]string{
			"programming_languages": workReq.ProgrammingLanguages,
			"servers_databases":     workReq.ServersDatabases,
			"tools":                 workReq.Tools,
		}

		for categoryName, techNames := range techCategories {
			if len(techNames) == 0 {
				continue
			}

			// カテゴリを取得
			category, err := s.techCategoryRepo.GetByName(context.Background(), categoryName)
			if err != nil {
				s.logger.Error("技術カテゴリ取得エラー", zap.Error(err), zap.String("category", categoryName))
				tx.Rollback()
				return err
			}

			// 技術項目を作成
			for _, techName := range techNames {
				if techName == "" {
					continue
				}

				techItem := model.WorkHistoryTechnology{
					ID:             uuid.New().String(),
					WorkHistoryID:  workHistory.ID,
					CategoryID:     category.ID,
					TechnologyName: techName,
					CreatedAt:      time.Now(),
					UpdatedAt:      time.Now(),
				}

				if err := tx.Create(&techItem).Error; err != nil {
					tx.Rollback()
					s.logger.Error("技術項目作成に失敗",
						zap.Error(err),
						zap.String("work_history_id", workHistory.ID),
						zap.String("technology", techName),
						zap.String("category", categoryName))
					return err
				}

				allTechItems = append(allTechItems, techName)
			}
		}

		// TechnologyItemsからも処理（APIで直接送信された場合）
		for _, techItem := range workReq.TechnologyItems {
			if techItem.TechnologyName == "" {
				continue
			}

			// カテゴリを取得
			category, err := s.techCategoryRepo.GetByName(context.Background(), techItem.CategoryName)
			if err != nil {
				s.logger.Error("技術カテゴリ取得エラー", zap.Error(err), zap.String("category", techItem.CategoryName))
				tx.Rollback()
				return err
			}

			techItemModel := model.WorkHistoryTechnology{
				ID:             uuid.New().String(),
				WorkHistoryID:  workHistory.ID,
				CategoryID:     category.ID,
				TechnologyName: techItem.TechnologyName,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := tx.Create(&techItemModel).Error; err != nil {
				tx.Rollback()
				s.logger.Error("技術項目作成に失敗",
					zap.Error(err),
					zap.String("work_history_id", workHistory.ID),
					zap.String("technology", techItem.TechnologyName),
					zap.String("category", techItem.CategoryName))
				return err
			}

			allTechItems = append(allTechItems, techItem.TechnologyName)
		}

		s.logger.Info("技術項目処理完了",
			zap.String("work_history_id", workHistory.ID),
			zap.Int("tech_items_count", len(allTechItems)))
	}

	// コミット
	if err := tx.Commit().Error; err != nil {
		s.logger.Error("トランザクションコミットに失敗", zap.Error(err))
		return err
	}

	s.logger.Info("スキルシート更新処理完了",
		zap.String("user_id", userID),
		zap.String("profile_id", profile.ID),
		zap.Bool("is_temp_save", isTempSave),
	)

	return nil
}
