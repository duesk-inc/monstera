package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/common/dateutil"
	"github.com/duesk/monstera/internal/common/transaction"
	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"sort"
)

// ProfileService プロフィール関連のビジネスロジックを提供
type ProfileService struct {
	profileRepo         repository.ProfileRepository
	userRepo            repository.UserRepository
	techCategoryRepo    repository.TechnologyCategoryRepository
	workHistoryTechRepo repository.WorkHistoryTechnologyRepository
	txManager           transaction.TransactionManager
	db                  *gorm.DB
	logger              *zap.Logger
}

// NewProfileService ProfileServiceのインスタンスを生成する
func NewProfileService(
	profileRepo repository.ProfileRepository,
	userRepo repository.UserRepository,
	techCategoryRepo repository.TechnologyCategoryRepository,
	workHistoryTechRepo repository.WorkHistoryTechnologyRepository,
	db *gorm.DB,
	logger *zap.Logger,
) *ProfileService {
	return &ProfileService{
		profileRepo:         profileRepo,
		userRepo:            userRepo,
		techCategoryRepo:    techCategoryRepo,
		workHistoryTechRepo: workHistoryTechRepo,
		txManager:           transaction.NewTransactionManager(db, logger),
		db:                  db,
		logger:              logger,
	}
}

// ProfileResponse プロフィール情報レスポンス
type ProfileResponse struct {
	ID              string                   `json:"id"`
	UserID          string                   `json:"user_id"`
	Email           string                   `json:"email"`
	FirstName       string                   `json:"first_name"`
	LastName        string                   `json:"last_name"`
	FirstNameKana   string                   `json:"first_name_kana"`
	LastNameKana    string                   `json:"last_name_kana"`
	Birthdate       *string                  `json:"birthdate,omitempty"`
	Gender          string                   `json:"gender"`
	Address         string                   `json:"address"`
	PhoneNumber     string                   `json:"phone_number"`
	Education       string                   `json:"education"`
	NearestStation  string                   `json:"nearest_station"`
	CanTravel       int                      `json:"can_travel"`
	AppealPoints    string                   `json:"appeal_points"`
	IsTempSaved     bool                     `json:"is_temp_saved"`
	TempSavedAt     *string                  `json:"temp_saved_at,omitempty"`
	Certifications  []CertificationResponse  `json:"certifications"`
	LanguageSkills  []LanguageSkillResponse  `json:"language_skills"`
	FrameworkSkills []FrameworkSkillResponse `json:"framework_skills"`
	BusinessExps    []BusinessExpResponse    `json:"business_experiences"`
	Role            string                   `json:"role"`
}

// CertificationResponse 資格レスポンス
type CertificationResponse struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	AcquiredDate string  `json:"acquired_date"` // YYYY-MM形式
	ExpiryDate   *string `json:"expiry_date,omitempty"`
}

// LanguageSkillResponse 言語スキルレスポンス
type LanguageSkillResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Level             int    `json:"level"`
	YearsOfExperience int    `json:"years_of_experience"`
	Months            int    `json:"months"` // 月数（フロントエンド用に追加）
}

// FrameworkSkillResponse フレームワークスキルレスポンス
type FrameworkSkillResponse struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Level             int    `json:"level"`
	YearsOfExperience int    `json:"years_of_experience"`
	Months            int    `json:"months"` // 月数（フロントエンド用に追加）
}

// BusinessExpResponse 業務経験レスポンス
type BusinessExpResponse struct {
	ID                string `json:"id"`
	Industry          string `json:"industry"`
	ExperienceDetail  string `json:"experience_detail"`
	YearsOfExperience int    `json:"years_of_experience"`
}

// WorkHistoryResponse 職務経歴レスポンス
type WorkHistoryResponse struct {
	ID                   string                       `json:"id"`
	ProjectName          string                       `json:"project_name"`
	StartDate            string                       `json:"start_date"`
	EndDate              *string                      `json:"end_date,omitempty"`
	Industry             int                          `json:"industry"` // 文字列から数値に変更
	ProjectOverview      string                       `json:"project_overview"`
	Responsibilities     string                       `json:"responsibilities"`
	Achievements         string                       `json:"achievements"`
	Notes                string                       `json:"notes"`
	Processes            []int                        `json:"processes"`    // []stringから[]intに変更
	Technologies         string                       `json:"technologies"` // 後方互換性のため保持
	ProgrammingLanguages []string                     `json:"programming_languages"`
	ServersDatabases     []string                     `json:"servers_databases"`
	Tools                []string                     `json:"tools"`
	TechnologyItems      []dto.TechnologyItemResponse `json:"technology_items"`
	TeamSize             int                          `json:"team_size"`
	Role                 string                       `json:"role"`
}

// GetUserProfile ユーザーIDからプロフィール情報を取得
func (s *ProfileService) GetUserProfile(userID uuid.UUID) (*ProfileResponse, error) {
	// ユーザー情報を取得
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	// プロフィール情報を取得
	profile, err := s.profileRepo.FindByUserID(userID)
	if err != nil {
		// プロフィールが存在しない場合はデフォルト値で作成
		if errors.Is(err, gorm.ErrRecordNotFound) {
			profile = &model.Profile{
				UserID: userID,
				User:   *user,
			}
		} else {
			return nil, err
		}
	}

	// デバッグログ: 取得したプロフィール情報
	s.logger.Info("プロフィール情報取得完了",
		zap.String("user_id", userID.String()),
		zap.String("profile_id", profile.ID.String()),
		zap.Int("certifications_count", len(profile.Certifications)),
		zap.Any("certifications_raw", profile.Certifications),
	)

	// レスポンス用のデータを作成
	response := s.createProfileResponse(profile, user)

	// デバッグログ: レスポンス作成完了
	s.logger.Info("プロフィールレスポンス作成完了",
		zap.String("user_id", userID.String()),
		zap.Int("response_certifications_count", len(response.Certifications)),
		zap.Any("response_certifications", response.Certifications),
	)

	return response, nil
}

// GetUserProfileWithWorkHistory ユーザーIDからプロフィール情報と職務経歴を取得
func (s *ProfileService) GetUserProfileWithWorkHistory(userID uuid.UUID) (*ProfileResponse, []WorkHistoryResponse, error) {
	// ユーザー情報を取得
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, nil, err
	}

	// プロフィール情報を取得
	profile, err := s.profileRepo.FindByUserIDWithWorkHistory(userID)
	if err != nil {
		// プロフィールが存在しない場合はデフォルト値で作成
		if errors.Is(err, gorm.ErrRecordNotFound) {
			profile = &model.Profile{
				UserID: userID,
				User:   *user,
			}
			return s.createProfileResponse(profile, user), []WorkHistoryResponse{}, nil
		}
		return nil, nil, err
	}

	// 職務経歴のレスポンスを作成
	workHistories := make([]WorkHistoryResponse, len(profile.WorkHistories))
	for i, wh := range profile.WorkHistories {
		var endDate *string
		if wh.EndDate != nil {
			formattedDate := wh.EndDate.Format("2006-01-02")
			endDate = &formattedDate
		}

		// 技術項目を取得
		techItems, err := s.workHistoryTechRepo.GetWithCategory(context.Background(), wh.ID)
		if err != nil {
			s.logger.Error("技術項目取得エラー", zap.Error(err), zap.String("work_history_id", wh.ID.String()))
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

		workHistories[i] = WorkHistoryResponse{
			ID:                   wh.ID.String(),
			ProjectName:          wh.ProjectName,
			StartDate:            wh.StartDate.Format("2006-01-02"),
			EndDate:              endDate,
			Industry:             int(wh.Industry), // int32からintに変換
			ProjectOverview:      wh.ProjectOverview,
			Responsibilities:     wh.Responsibilities,
			Achievements:         wh.Achievements,
			Notes:                wh.Notes,
			Processes:            convertInt32SliceToIntSlice(wh.GetProcessesArray()), // []int32から[]intに変換
			Technologies:         wh.Technologies,                                     // 後方互換性のため保持
			ProgrammingLanguages: programmingLanguages,
			ServersDatabases:     serversDatabases,
			Tools:                tools,
			TechnologyItems:      technologyItemsResp,
			TeamSize:             int(wh.TeamSize), // int32からintに変換
			Role:                 wh.Role,
		}
	}

	return s.createProfileResponse(profile, user), workHistories, nil
}

// createProfileResponse プロフィールレスポンスを作成
func (s *ProfileService) createProfileResponse(profile *model.Profile, user *model.User) *ProfileResponse {
	// 生年月日をフォーマット
	var birthdate *string
	if user.Birthdate != nil {
		formattedDate := user.Birthdate.Format("2006-01-02")
		birthdate = &formattedDate
	}

	// 一時保存日時をフォーマット
	var tempSavedAt *string
	if profile.TempSavedAt != nil {
		formattedDate := profile.TempSavedAt.Format(time.RFC3339)
		tempSavedAt = &formattedDate
	}

	// 言語スキルのレスポンスを作成
	languageSkills := make([]LanguageSkillResponse, len(profile.LanguageSkills))
	for i, ls := range profile.LanguageSkills {
		// 経験年数を年と月に分ける（フロントエンド用）
		years := ls.YearsOfExperience
		months := 0
		if years > 0 {
			months = years % 12
			years = years / 12
		}

		languageSkills[i] = LanguageSkillResponse{
			ID:                ls.ID.String(),
			Name:              ls.Name,
			Level:             ls.Level,
			YearsOfExperience: years,
			Months:            months,
		}
	}

	// フレームワークスキルのレスポンスを作成
	frameworkSkills := make([]FrameworkSkillResponse, len(profile.FrameworkSkills))
	for i, fs := range profile.FrameworkSkills {
		// 経験年数を年と月に分ける（フロントエンド用）
		years := fs.YearsOfExperience
		months := 0
		if years > 0 {
			months = years % 12
			years = years / 12
		}

		frameworkSkills[i] = FrameworkSkillResponse{
			ID:                fs.ID.String(),
			Name:              fs.Name,
			Level:             fs.Level,
			YearsOfExperience: years,
			Months:            months,
		}
	}

	// 業務経験のレスポンスを作成
	businessExps := make([]BusinessExpResponse, len(profile.BusinessExps))
	for i, be := range profile.BusinessExps {
		businessExps[i] = BusinessExpResponse{
			ID:                be.ID.String(),
			Industry:          be.Industry,
			ExperienceDetail:  be.ExperienceDetail,
			YearsOfExperience: be.YearsOfExperience,
		}
	}

	// 資格情報をレスポンス形式に変換
	var certifications []CertificationResponse
	s.logger.Info("資格情報変換開始",
		zap.String("profile_id", profile.ID.String()),
	)

	// ProfileCertificationを直接取得（取得年月の昇順）
	var profileCerts []model.ProfileCertification
	err := s.db.Where("profile_id = ?", profile.ID).
		Preload("Certification").
		Order("acquired_date ASC").
		Find(&profileCerts).Error
	if err != nil {
		s.logger.Error("プロフィール資格取得エラー", zap.Error(err))
		profileCerts = []model.ProfileCertification{}
	}

	// ソート前のログ
	s.logger.Info("ソート前の資格情報",
		zap.Int("count", len(profileCerts)),
	)
	for i, pc := range profileCerts {
		s.logger.Info("ソート前",
			zap.Int("index", i),
			zap.String("name", func() string {
				if pc.IsCustom && pc.CustomName != nil {
					return *pc.CustomName
				} else if pc.Certification != nil {
					return pc.Certification.Name
				}
				return "不明"
			}()),
			zap.String("acquired_date", pc.AcquiredDate.Format("2006-01")),
		)
	}

	// 明示的に取得年月でソート（昇順）
	sort.Slice(profileCerts, func(i, j int) bool {
		return profileCerts[i].AcquiredDate.Before(profileCerts[j].AcquiredDate)
	})

	// ソート後のログ
	s.logger.Info("ソート後の資格情報",
		zap.Int("count", len(profileCerts)),
	)
	for i, pc := range profileCerts {
		s.logger.Info("ソート後",
			zap.Int("index", i),
			zap.String("name", func() string {
				if pc.IsCustom && pc.CustomName != nil {
					return *pc.CustomName
				} else if pc.Certification != nil {
					return pc.Certification.Name
				}
				return "不明"
			}()),
			zap.String("acquired_date", pc.AcquiredDate.Format("2006-01")),
		)
	}

	for i, pc := range profileCerts {
		s.logger.Info("資格情報変換中",
			zap.Int("index", i),
			zap.Bool("is_custom", pc.IsCustom),
		)

		certResponse := CertificationResponse{
			AcquiredDate: pc.AcquiredDate.Format("2006-01"),
		}

		// 資格名の設定
		if pc.IsCustom {
			// カスタム入力の場合
			if pc.CustomName != nil {
				certResponse.Name = *pc.CustomName
			}
			certResponse.ID = profile.ID.String() + "-custom-" + fmt.Sprintf("%d", i) // 仮のID
		} else {
			// マスタ資格の場合
			if pc.Certification != nil {
				certResponse.ID = pc.Certification.ID.String()
				certResponse.Name = pc.Certification.Name
			}
		}

		// 有効期限の設定
		if pc.ExpiryDate != nil {
			expiryStr := pc.ExpiryDate.Format("2006-01")
			certResponse.ExpiryDate = &expiryStr
		}

		s.logger.Info("資格情報変換完了",
			zap.String("cert_name", certResponse.Name),
			zap.String("acquired_date", certResponse.AcquiredDate),
		)

		certifications = append(certifications, certResponse)
	}

	s.logger.Info("資格情報変換完了",
		zap.Int("converted_certifications_count", len(certifications)),
		zap.Any("converted_certifications", certifications),
	)

	// プロフィールレスポンスを作成
	return &ProfileResponse{
		ID:              profile.ID.String(),
		UserID:          user.ID.String(),
		Email:           user.Email,
		FirstName:       user.FirstName,
		LastName:        user.LastName,
		FirstNameKana:   user.FirstNameKana,
		LastNameKana:    user.LastNameKana,
		Birthdate:       birthdate,
		Gender:          user.Gender,
		Address:         user.Address,
		PhoneNumber:     user.PhoneNumber,
		Education:       profile.Education,
		NearestStation:  profile.NearestStation,
		CanTravel:       int(profile.CanTravel), // int32からintに変換
		AppealPoints:    profile.AppealPoints,
		IsTempSaved:     profile.IsTempSaved,
		TempSavedAt:     tempSavedAt,
		Certifications:  certifications,
		LanguageSkills:  languageSkills,
		FrameworkSkills: frameworkSkills,
		BusinessExps:    businessExps,
		Role:            user.Role.String(),
	}
}

// GetProfileHistoryByVersion 特定バージョンのプロフィール履歴を取得
func (s *ProfileService) GetProfileHistoryByVersion(userID uuid.UUID, version int) (*ProfileHistoryResponse, error) {
	// ユーザーのプロフィール情報を取得
	profile, err := s.profileRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	// 履歴情報を取得
	profileHistory, err := s.profileRepo.FindProfileHistoryByVersion(profile.ID, version)
	if err != nil {
		return nil, err
	}

	// レスポンス用のデータを作成
	workHistories := make([]WorkHistoryHistoryResponse, len(profileHistory.WorkHistories))
	for i, wh := range profileHistory.WorkHistories {
		var endDate *string
		if wh.EndDate != nil {
			formattedDate := wh.EndDate.Format("2006-01-02")
			endDate = &formattedDate
		}

		workHistories[i] = WorkHistoryHistoryResponse{
			ID:               wh.ID.String(),
			HistoryID:        wh.HistoryID.String(),
			ProfileHistoryID: wh.ProfileHistoryID.String(),
			UserID:           wh.UserID.String(),
			ProjectName:      wh.ProjectName,
			StartDate:        wh.StartDate.Format("2006-01-02"),
			EndDate:          endDate,
			Industry:         wh.Industry,
			ProjectOverview:  wh.ProjectOverview,
			Role:             wh.Role,
			TeamSize:         wh.TeamSize,
			ProjectProcesses: wh.ProjectProcesses,
			CreatedAt:        wh.CreatedAt.Format(time.RFC3339),
		}
	}

	return &ProfileHistoryResponse{
		ID:             profileHistory.ID.String(),
		ProfileID:      profileHistory.ProfileID.String(),
		UserID:         profileHistory.UserID.String(),
		Education:      profileHistory.Education,
		NearestStation: profileHistory.NearestStation,
		CanTravel:      profileHistory.CanTravel,
		AppealPoints:   profileHistory.AppealPoints,
		Version:        profileHistory.Version,
		CreatedAt:      profileHistory.CreatedAt.Format(time.RFC3339),
		WorkHistories:  workHistories,
	}, nil
}

// GetLatestProfileHistory 最新のプロフィール履歴を取得
func (s *ProfileService) GetLatestProfileHistory(userID uuid.UUID) (*ProfileHistoryResponse, error) {
	// ユーザーのプロフィール情報を取得
	profile, err := s.profileRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	// 最新の履歴情報を取得
	profileHistory, err := s.profileRepo.FindLatestProfileHistory(profile.ID)
	if err != nil {
		return nil, err
	}

	// レスポンス用のデータを作成
	workHistories := make([]WorkHistoryHistoryResponse, len(profileHistory.WorkHistories))
	for i, wh := range profileHistory.WorkHistories {
		var endDate *string
		if wh.EndDate != nil {
			formattedDate := wh.EndDate.Format("2006-01-02")
			endDate = &formattedDate
		}

		workHistories[i] = WorkHistoryHistoryResponse{
			ID:               wh.ID.String(),
			HistoryID:        wh.HistoryID.String(),
			ProfileHistoryID: wh.ProfileHistoryID.String(),
			UserID:           wh.UserID.String(),
			ProjectName:      wh.ProjectName,
			StartDate:        wh.StartDate.Format("2006-01-02"),
			EndDate:          endDate,
			Industry:         wh.Industry,
			ProjectOverview:  wh.ProjectOverview,
			Role:             wh.Role,
			TeamSize:         wh.TeamSize,
			ProjectProcesses: wh.ProjectProcesses,
			CreatedAt:        wh.CreatedAt.Format(time.RFC3339),
		}
	}

	return &ProfileHistoryResponse{
		ID:             profileHistory.ID.String(),
		ProfileID:      profileHistory.ProfileID.String(),
		UserID:         profileHistory.UserID.String(),
		Education:      profileHistory.Education,
		NearestStation: profileHistory.NearestStation,
		CanTravel:      profileHistory.CanTravel,
		AppealPoints:   profileHistory.AppealPoints,
		Version:        profileHistory.Version,
		CreatedAt:      profileHistory.CreatedAt.Format(time.RFC3339),
		WorkHistories:  workHistories,
	}, nil
}

// UpdateUserProfile ユーザープロフィールを更新
func (s *ProfileService) UpdateUserProfile(userID uuid.UUID, education, nearestStation string, canTravel int, appealPoints string, workHistories []struct {
	ProjectName      string `json:"project_name"`
	StartDate        string `json:"start_date"`
	EndDate          string `json:"end_date"`
	Industry         int    `json:"industry"` // 文字列から数値に変更
	ProjectOverview  string `json:"project_overview"`
	Responsibilities string `json:"responsibilities"`
	Achievements     string `json:"achievements"`
	Notes            string `json:"notes"`
	Processes        []int  `json:"processes"` // []stringから[]intに変更
	Technologies     string `json:"technologies"`
	TeamSize         int    `json:"team_size"`
	Role             string `json:"role"`
}, isTempSave bool) error {
	// ユーザー情報を取得
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	// プロフィール情報を取得
	var profile *model.Profile
	profile, err = s.profileRepo.FindByUserID(userID)
	if err != nil {
		// プロフィールが存在しない場合は新規作成
		if errors.Is(err, gorm.ErrRecordNotFound) {
			profile = &model.Profile{
				UserID: userID,
				User:   *user,
			}
		} else {
			return err
		}
	}

	// デフォルト値の設定 (1-3の範囲外の値は3に設定)
	if canTravel < 1 || canTravel > 3 {
		canTravel = 3 // デフォルト値は3（要相談）
	}

	// プロフィール情報を更新
	profile.Education = education
	profile.NearestStation = nearestStation
	profile.CanTravel = int32(canTravel) // intからint32に変換
	profile.AppealPoints = appealPoints

	// 一時保存の場合
	if isTempSave {
		profile.IsTempSaved = true
		now := time.Now()
		profile.TempSavedAt = &now
	} else {
		profile.IsTempSaved = false
		profile.TempSavedAt = nil
	}

	// トランザクションを開始
	err = s.txManager.ExecuteInTransaction(context.Background(), func(tx *gorm.DB) error {
		// プロフィール情報を保存
		txProfileRepo := repository.NewProfileRepository(tx)
		if profile.ID == uuid.Nil {
			if err := txProfileRepo.Create(profile); err != nil {
				return err
			}
		} else {
			if err := txProfileRepo.Update(profile); err != nil {
				return err
			}
		}

		// 職務経歴を保存
		var modelWorkHistories []model.WorkHistory
		for _, wh := range workHistories {
			// 一時保存の場合、必須項目の検証をスキップする
			if !isTempSave && (wh.ProjectName == "" || wh.StartDate == "") {
				// 本保存では必須項目のバリデーションを行う
				continue
			}

			// 開始日の処理
			var startDate time.Time
			var hasValidStartDate bool = false

			if wh.StartDate != "" {
				parsedStartDate, err := time.Parse("2006-01-02", wh.StartDate)
				if err != nil {
					// 日付パースエラーの場合、一時保存ではスキップ
					if isTempSave {
						continue
					}
					return err
				}
				startDate = parsedStartDate
				hasValidStartDate = true
			} else if isTempSave {
				// 一時保存で開始日が空の場合は、今日の日付を使用
				startDate = time.Now()
				hasValidStartDate = true
			}

			// 有効な開始日がない場合はこの職務経歴をスキップ
			if !hasValidStartDate {
				continue
			}

			// 終了日の処理
			var endDate *time.Time
			if wh.EndDate != "" {
				parsedEndDate, err := time.Parse("2006-01-02", wh.EndDate)
				if err != nil {
					// 日付パースエラーの場合、一時保存ではスキップ
					if isTempSave {
						continue
					}
					return err
				}
				endDate = &parsedEndDate
			}

			// 業務プロセスを数値配列から文字列に変換
			wh_model := model.WorkHistory{
				ProfileID:        profile.ID,
				UserID:           userID,
				ProjectName:      wh.ProjectName,
				StartDate:        startDate,
				EndDate:          endDate,
				Industry:         int32(wh.Industry), // intからint32に変換
				ProjectOverview:  wh.ProjectOverview,
				Responsibilities: wh.Responsibilities,
				Achievements:     wh.Achievements,
				Notes:            wh.Notes,
				Technologies:     wh.Technologies,
				TeamSize:         int32(wh.TeamSize), // intからint32に変換
				Role:             wh.Role,
			}
			wh_model.SetProcessesArray(convertIntSliceToInt32Slice(wh.Processes)) // []intから[]int32に変換

			modelWorkHistories = append(modelWorkHistories, wh_model)
		}

		return txProfileRepo.SaveWorkHistories(profile.ID, userID, modelWorkHistories)
	})

	return err
}

// ProfileHistoryResponse プロフィール履歴レスポンス
type ProfileHistoryResponse struct {
	ID             string                       `json:"id"`
	ProfileID      string                       `json:"profile_id"`
	UserID         string                       `json:"user_id"`
	Education      string                       `json:"education"`
	NearestStation string                       `json:"nearest_station"`
	CanTravel      int                          `json:"can_travel"`
	AppealPoints   string                       `json:"appeal_points"`
	Version        int                          `json:"version"`
	CreatedAt      string                       `json:"created_at"`
	WorkHistories  []WorkHistoryHistoryResponse `json:"work_histories"`
}

// WorkHistoryHistoryResponse 職務経歴履歴レスポンス
type WorkHistoryHistoryResponse struct {
	ID               string  `json:"id"`
	HistoryID        string  `json:"history_id"`
	ProfileHistoryID string  `json:"profile_history_id"`
	UserID           string  `json:"user_id"`
	ProjectName      string  `json:"project_name"`
	StartDate        string  `json:"start_date"`
	EndDate          *string `json:"end_date"`
	Industry         string  `json:"industry"` // 文字列のまま（履歴データはレガシー）
	ProjectOverview  string  `json:"project_overview"`
	Role             string  `json:"role"`
	TeamSize         int     `json:"team_size"`
	ProjectProcesses string  `json:"project_processes"`
	CreatedAt        string  `json:"created_at"`
}

// UpdateUserProfileWithDTO DTOを使用してプロフィール情報を更新
func (s *ProfileService) UpdateUserProfileWithDTO(userID uuid.UUID, request dto.ProfileSaveRequest, isTempSave bool) error {
	s.logger.Info("プロフィール更新処理開始",
		zap.String("user_id", userID.String()),
		zap.Bool("is_temp_save", isTempSave),
		zap.Int("certifications_count", len(request.Certifications)),
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
		s.logger.Error("ユーザーが見つかりません", zap.Error(err), zap.String("user_id", userID.String()))
		return err
	}

	s.logger.Info("ユーザー確認完了", zap.String("user_id", userID.String()), zap.String("email", user.Email))

	// プロフィール取得または作成
	var profile model.Profile
	err := tx.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Info("プロフィールが存在しないため新規作成", zap.String("user_id", userID.String()))
			// 新規プロフィール作成
			profile = model.Profile{
				ID:             uuid.New(),
				UserID:         userID,
				Education:      request.Education,
				NearestStation: request.NearestStation,
				CanTravel:      request.CanTravel,
				AppealPoints:   request.AppealPoints,
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
			s.logger.Info("プロフィール新規作成完了", zap.String("profile_id", profile.ID.String()))
		} else {
			tx.Rollback()
			s.logger.Error("プロフィール取得でエラー発生", zap.Error(err))
			return err
		}
	} else {
		s.logger.Info("既存プロフィール更新", zap.String("profile_id", profile.ID.String()))
		// 既存プロフィール更新
		profile.Education = request.Education
		profile.NearestStation = request.NearestStation
		profile.CanTravel = request.CanTravel
		profile.AppealPoints = request.AppealPoints
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
		s.logger.Info("プロフィール更新完了", zap.String("profile_id", profile.ID.String()))
	}

	// 既存の資格情報を削除
	s.logger.Info("既存資格情報削除開始", zap.String("profile_id", profile.ID.String()))
	if err := tx.Where("profile_id = ?", profile.ID).Delete(&model.ProfileCertification{}).Error; err != nil {
		tx.Rollback()
		s.logger.Error("既存資格情報削除に失敗", zap.Error(err))
		return err
	}

	// 資格情報の処理
	s.logger.Info("資格情報処理開始", zap.Int("certifications_count", len(request.Certifications)))

	// マスタ資格の重複チェック
	certificationIDMap := make(map[uuid.UUID]string) // certification_id -> 資格名のマップ
	for _, certReq := range request.Certifications {
		if certReq.Name == "" {
			continue
		}

		// よく使う資格マスタから検索
		var certification model.Certification
		err := tx.Where("name = ? AND is_common = true", certReq.Name).First(&certification).Error
		if err == nil {
			// マスタ資格の場合、重複チェック
			if existingName, exists := certificationIDMap[certification.ID]; exists {
				tx.Rollback()
				errorMsg := fmt.Sprintf("資格「%s」が重複しています", existingName)
				s.logger.Error("マスタ資格の重複エラー",
					zap.String("certification_name", existingName),
					zap.String("certification_id", certification.ID.String()),
				)
				return fmt.Errorf(errorMsg)
			}
			certificationIDMap[certification.ID] = certification.Name
		}
		// カスタム資格は重複チェックの対象外
	}

	// 重複チェックを通過したら、実際の保存処理
	for i, certReq := range request.Certifications {
		s.logger.Info("資格情報処理中",
			zap.Int("index", i),
			zap.String("name", certReq.Name),
			zap.String("acquired_at", certReq.AcquiredAt),
		)

		if certReq.Name == "" {
			s.logger.Warn("空の資格名をスキップ", zap.Int("index", i))
			continue
		}

		// 資格名があって取得年月が空の場合はエラー
		if certReq.AcquiredAt == "" {
			tx.Rollback()
			errorMsg := fmt.Sprintf("資格「%s」の取得年月を入力してください", certReq.Name)
			s.logger.Error("資格取得年月未設定エラー",
				zap.String("certification_name", certReq.Name),
				zap.Int("index", i))
			return fmt.Errorf(errorMsg)
		}

		// 取得日をパース (YYYY-MM形式からtime.Timeに変換)
		var acquiredDate time.Time
		// 未来年月の検証
		if err := dateutil.ValidateYearMonth(certReq.AcquiredAt, "資格取得年月"); err != nil {
			tx.Rollback()
			s.logger.Error("資格取得年月のバリデーションエラー",
				zap.Error(err),
				zap.String("acquired_at", certReq.AcquiredAt))
			return err
		}

		parsedDate, parseErr := time.Parse("2006-01", certReq.AcquiredAt)
		if parseErr != nil {
			tx.Rollback()
			s.logger.Error("取得日のパースに失敗", zap.Error(parseErr), zap.String("acquired_at", certReq.AcquiredAt))
			return fmt.Errorf("資格「%s」の取得年月の形式が正しくありません", certReq.Name)
		}
		acquiredDate = parsedDate

		// よく使う資格マスタから検索
		var certification model.Certification
		err := tx.Where("name = ? AND is_common = true", certReq.Name).First(&certification).Error

		profileCert := model.ProfileCertification{
			ID:           uuid.New(),
			ProfileID:    profile.ID,
			AcquiredDate: acquiredDate,
		}

		if err == nil {
			// よく使う資格マスタに存在する場合
			s.logger.Info("よく使う資格を使用", zap.String("certification_id", certification.ID.String()))
			profileCert.CertificationID = &certification.ID
			profileCert.IsCustom = false
		} else {
			// マスタにない場合はカスタム入力として保存
			s.logger.Info("カスタム資格として保存", zap.String("name", certReq.Name))
			profileCert.CustomName = &certReq.Name
			profileCert.IsCustom = true
		}

		if err := tx.Create(&profileCert).Error; err != nil {
			tx.Rollback()
			s.logger.Error("プロフィール資格関連付けに失敗",
				zap.Error(err),
				zap.String("profile_id", profile.ID.String()),
			)
			return err
		}
		s.logger.Info("プロフィール資格関連付け完了",
			zap.String("profile_id", profile.ID.String()),
			zap.Bool("is_custom", profileCert.IsCustom),
		)
	}

	// 既存の職務経歴を削除
	s.logger.Info("既存職務経歴削除開始", zap.String("profile_id", profile.ID.String()))
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
				// 未来日付の検証
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
				// 未来日付の検証
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
			ID:               uuid.New(),
			ProfileID:        profile.ID,
			UserID:           userID,
			ProjectName:      workReq.ProjectName,
			StartDate:        startDate,
			EndDate:          endDate,
			Industry:         int32(workReq.Industry), // intからint32に変換
			ProjectOverview:  workReq.ProjectOverview,
			Responsibilities: workReq.Responsibilities,
			Achievements:     workReq.Achievements,
			Notes:            workReq.Notes,
			Technologies:     workReq.Technologies,    // 後方互換性のため保持
			TeamSize:         int32(workReq.TeamSize), // intからint32に変換
			Role:             workReq.Role,
		}

		// プロセス情報を数値配列から文字列に変換
		workHistory.SetProcessesArray(workReq.Processes) // 既に[]int32型なのでそのまま使用

		if err := tx.Create(&workHistory).Error; err != nil {
			tx.Rollback()
			s.logger.Error("職務経歴作成に失敗", zap.Error(err))
			return err
		}
		s.logger.Info("職務経歴作成完了", zap.String("work_history_id", workHistory.ID.String()))

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
					WorkHistoryID:  workHistory.ID.String(),
					CategoryID:     category.ID,
					TechnologyName: techName,
					CreatedAt:      time.Now(),
					UpdatedAt:      time.Now(),
				}

				if err := tx.Create(&techItem).Error; err != nil {
					tx.Rollback()
					s.logger.Error("技術項目作成に失敗",
						zap.Error(err),
						zap.String("work_history_id", workHistory.ID.String()),
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
				WorkHistoryID:  workHistory.ID.String(),
				CategoryID:     category.ID,
				TechnologyName: techItem.TechnologyName,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := tx.Create(&techItemModel).Error; err != nil {
				tx.Rollback()
				s.logger.Error("技術項目作成に失敗",
					zap.Error(err),
					zap.String("work_history_id", workHistory.ID.String()),
					zap.String("technology", techItem.TechnologyName),
					zap.String("category", techItem.CategoryName))
				return err
			}

			allTechItems = append(allTechItems, techItem.TechnologyName)
		}

		s.logger.Info("技術項目処理完了",
			zap.String("work_history_id", workHistory.ID.String()),
			zap.Int("tech_items_count", len(allTechItems)))
	}

	// コミット
	if err := tx.Commit().Error; err != nil {
		s.logger.Error("トランザクションコミットに失敗", zap.Error(err))
		return err
	}

	s.logger.Info("プロフィール更新処理完了",
		zap.String("user_id", userID.String()),
		zap.String("profile_id", profile.ID.String()),
		zap.Bool("is_temp_save", isTempSave),
	)

	return nil
}

// UpdateUserProfileWithTempSaveDTO DTOリクエストでユーザープロフィールを一時保存（資格情報含む）
func (s *ProfileService) UpdateUserProfileWithTempSaveDTO(userID uuid.UUID, request dto.ProfileTempSaveRequest) error {
	// ProfileTempSaveRequestをProfileSaveRequestに変換
	saveRequest := dto.ProfileSaveRequest{
		Education:      request.Education,
		NearestStation: request.NearestStation,
		CanTravel:      request.CanTravel,
		Certifications: request.Certifications,
		AppealPoints:   request.AppealPoints,
		WorkHistory:    request.WorkHistory,
	}

	return s.UpdateUserProfileWithDTO(userID, saveRequest, true)
}

// GetTechnologyCategories 技術カテゴリ一覧を取得
func (s *ProfileService) GetTechnologyCategories() ([]dto.TechnologyCategoryResponse, error) {
	categories, err := s.techCategoryRepo.GetAll(context.Background())
	if err != nil {
		s.logger.Error("技術カテゴリ取得エラー", zap.Error(err))
		return nil, err
	}

	response := make([]dto.TechnologyCategoryResponse, len(categories))
	for i, cat := range categories {
		response[i] = dto.TechnologyCategoryResponse{
			ID:          cat.ID,
			Name:        cat.Name,
			DisplayName: cat.DisplayName,
			SortOrder:   cat.SortOrder,
		}
	}

	return response, nil
}

// GetCommonCertifications よく使う資格一覧を取得
func (s *ProfileService) GetCommonCertifications() ([]model.Certification, error) {
	var certifications []model.Certification
	// GORMは自動的にdeleted_atがNULLのレコードのみを取得するため、明示的な条件は不要
	err := s.db.Model(&model.Certification{}).
		Where("is_common = ?", true).
		Order("display_order, name").
		Find(&certifications).Error

	if err != nil {
		s.logger.Error("よく使う資格一覧取得エラー",
			zap.Error(err),
			zap.String("query", "SELECT * FROM certifications WHERE is_common = true ORDER BY display_order, name"))
		return nil, err
	}

	s.logger.Info("よく使う資格一覧取得成功",
		zap.Int("count", len(certifications)))

	return certifications, nil
}

func convertInt32SliceToIntSlice(input []int32) []int {
	result := make([]int, len(input))
	for i, v := range input {
		result[i] = int(v)
	}
	return result
}

func convertIntSliceToInt32Slice(input []int) []int32 {
	result := make([]int32, len(input))
	for i, v := range input {
		result[i] = int32(v)
	}
	return result
}
