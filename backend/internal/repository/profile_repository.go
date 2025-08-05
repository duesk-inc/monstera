package repository

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProfileRepository プロフィールに関するデータアクセスのインターフェース
type ProfileRepository interface {
	Create(profile *model.Profile) error
	FindByID(id uuid.UUID) (*model.Profile, error)
	FindByUserID(userID string) (*model.Profile, error)
	FindByUserIDWithWorkHistory(userID string) (*model.Profile, error)
	Update(profile *model.Profile) error
	Delete(id uuid.UUID) error
	CreateOrUpdate(profile *model.Profile) error
	SaveLanguageSkills(profileID uuid.UUID, skills []model.LanguageSkill) error
	SaveFrameworkSkills(profileID uuid.UUID, skills []model.FrameworkSkill) error
	SaveBusinessExperiences(profileID uuid.UUID, experiences []model.BusinessExperience) error
	SaveWorkHistories(profileID uuid.UUID, userID string, histories []model.WorkHistory) error
	SaveCertifications(profileID uuid.UUID, certifications []dto.CertificationRequest) error

	// 履歴関連の追加メソッド
	CreateProfileHistory(profile *model.Profile) error
	FindProfileHistoryByVersion(profileID uuid.UUID, version int) (*model.ProfileHistory, error)
	FindLatestProfileHistory(profileID uuid.UUID) (*model.ProfileHistory, error)
}

// ProfileRepositoryImpl プロフィールに関するデータアクセスの実装
type ProfileRepositoryImpl struct {
	db *gorm.DB
}

// NewProfileRepository ProfileRepositoryのインスタンスを生成する
func NewProfileRepository(db *gorm.DB) ProfileRepository {
	return &ProfileRepositoryImpl{db: db}
}

// Create 新しいプロフィールを作成
func (r *ProfileRepositoryImpl) Create(profile *model.Profile) error {
	// 初期バージョンを設定
	profile.CurrentVersion = 1
	return r.db.Create(profile).Error
}

// FindByID IDでプロフィールを検索
func (r *ProfileRepositoryImpl) FindByID(id uuid.UUID) (*model.Profile, error) {
	var profile model.Profile
	err := r.db.First(&profile, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindByUserID ユーザーIDでプロフィールを検索
func (r *ProfileRepositoryImpl) FindByUserID(userID string) (*model.Profile, error) {
	var profile model.Profile
	err := r.db.Preload("User").
		Preload("Certifications").
		Preload("LanguageSkills").
		Preload("FrameworkSkills").
		Preload("BusinessExps").
		First(&profile, "user_id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindByUserIDWithWorkHistory ユーザーIDでプロフィールを検索（職務経歴含む）
func (r *ProfileRepositoryImpl) FindByUserIDWithWorkHistory(userID string) (*model.Profile, error) {
	var profile model.Profile
	err := r.db.Preload("User").
		Preload("Certifications").
		Preload("LanguageSkills").
		Preload("FrameworkSkills").
		Preload("BusinessExps").
		Preload("WorkHistories", func(db *gorm.DB) *gorm.DB {
			return db.Order("start_date DESC")
		}).
		First(&profile, "user_id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

// Update プロフィール情報を更新
func (r *ProfileRepositoryImpl) Update(profile *model.Profile) error {
	// 現在のプロフィール情報を取得
	currentProfile, err := r.FindByID(profile.ID)
	if err != nil {
		return err
	}

	// 一時保存の場合は履歴を作成せず、バージョンも更新しない
	if profile.IsTempSaved {
		return r.db.Save(profile).Error
	}

	// 履歴を作成（一時保存ではない場合のみ）
	err = r.CreateProfileHistory(currentProfile)
	if err != nil {
		return err
	}

	// バージョンを更新
	profile.CurrentVersion = currentProfile.CurrentVersion + 1

	return r.db.Save(profile).Error
}

// Delete プロフィールを削除（ソフトデリート）
func (r *ProfileRepositoryImpl) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Profile{}, "id = ?", id).Error
}

// CreateOrUpdate プロフィール情報を作成または更新
func (r *ProfileRepositoryImpl) CreateOrUpdate(profile *model.Profile) error {
	var existingProfile model.Profile
	err := r.db.Where("user_id = ?", profile.UserID).First(&existingProfile).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// プロフィールが存在しない場合は新規作成
			return r.Create(profile)
		}
		return err
	}

	// 既存のプロフィールが見つかった場合はIDを設定して更新
	profile.ID = existingProfile.ID
	return r.Update(profile)
}

// SaveLanguageSkills 言語スキルを保存
func (r *ProfileRepositoryImpl) SaveLanguageSkills(profileID uuid.UUID, skills []model.LanguageSkill) error {
	// 既存のスキルを削除
	if err := r.db.Where("profile_id = ?", profileID).Delete(&model.LanguageSkill{}).Error; err != nil {
		return err
	}

	// スキルがない場合は終了
	if len(skills) == 0 {
		return nil
	}

	// 新しいスキルを保存
	for i := range skills {
		skills[i].ProfileID = profileID
		if err := r.db.Create(&skills[i]).Error; err != nil {
			return err
		}
	}

	return nil
}

// SaveFrameworkSkills フレームワークスキルを保存
func (r *ProfileRepositoryImpl) SaveFrameworkSkills(profileID uuid.UUID, skills []model.FrameworkSkill) error {
	// 既存のスキルを削除
	if err := r.db.Where("profile_id = ?", profileID).Delete(&model.FrameworkSkill{}).Error; err != nil {
		return err
	}

	// スキルがない場合は終了
	if len(skills) == 0 {
		return nil
	}

	// 新しいスキルを保存
	for i := range skills {
		skills[i].ProfileID = profileID
		if err := r.db.Create(&skills[i]).Error; err != nil {
			return err
		}
	}

	return nil
}

// SaveBusinessExperiences 業務経験を保存
func (r *ProfileRepositoryImpl) SaveBusinessExperiences(profileID uuid.UUID, experiences []model.BusinessExperience) error {
	// 既存の経験を削除
	if err := r.db.Where("profile_id = ?", profileID).Delete(&model.BusinessExperience{}).Error; err != nil {
		return err
	}

	// 経験がない場合は終了
	if len(experiences) == 0 {
		return nil
	}

	// 新しい経験を保存
	for i := range experiences {
		experiences[i].ProfileID = profileID
		if err := r.db.Create(&experiences[i]).Error; err != nil {
			return err
		}
	}

	return nil
}

// SaveWorkHistories 職務経歴を保存
func (r *ProfileRepositoryImpl) SaveWorkHistories(profileID uuid.UUID, userID string, histories []model.WorkHistory) error {
	// 既存の経歴を削除
	if err := r.db.Where("profile_id = ?", profileID).Delete(&model.WorkHistory{}).Error; err != nil {
		return err
	}

	// 経歴がない場合は終了
	if len(histories) == 0 {
		return nil
	}

	// 新しい経歴を保存
	for i := range histories {
		histories[i].ProfileID = profileID
		histories[i].UserID = userID
		if err := r.db.Create(&histories[i]).Error; err != nil {
			return err
		}
	}

	return nil
}

// SaveCertifications プロフィールの資格情報を保存
func (r *ProfileRepositoryImpl) SaveCertifications(profileID uuid.UUID, certifications []dto.CertificationRequest) error {
	// 既存の資格情報を削除
	if err := r.db.Where("profile_id = ?", profileID).Delete(&model.ProfileCertification{}).Error; err != nil {
		return err
	}

	// 新しい資格情報を保存
	for _, certReq := range certifications {
		// 資格名が空の場合はスキップ
		if strings.TrimSpace(certReq.Name) == "" {
			continue
		}

		// 資格マスタから既存の資格を検索、なければ作成
		var certification model.Certification
		err := r.db.Where("name = ?", certReq.Name).First(&certification).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 新しい資格を作成
				certification = model.Certification{
					ID:   uuid.New(),
					Name: certReq.Name,
				}
				if err := r.db.Create(&certification).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}

		// 取得日をパース（YYYY-MM形式を日付に変換）
		var acquiredDate time.Time
		if certReq.AcquiredAt != "" {
			parsedDate, err := time.Parse("2006-01", certReq.AcquiredAt)
			if err != nil {
				// パースエラーの場合は現在時刻を設定
				acquiredDate = time.Now()
			} else {
				acquiredDate = parsedDate
			}
		} else {
			acquiredDate = time.Now()
		}

		// ProfileCertificationレコードを作成
		profileCert := model.ProfileCertification{
			ProfileID:       profileID,
			CertificationID: &certification.ID,
			AcquiredDate:    acquiredDate,
		}

		if err := r.db.Create(&profileCert).Error; err != nil {
			return err
		}
	}

	return nil
}

// CreateProfileHistory プロフィール履歴を作成
func (r *ProfileRepositoryImpl) CreateProfileHistory(profile *model.Profile) error {
	// プロフィール情報をWorkHistoriesと一緒に再取得
	var profileWithHistory model.Profile
	err := r.db.Preload("WorkHistories").First(&profileWithHistory, "id = ?", profile.ID).Error
	if err != nil {
		return err
	}

	// 履歴を作成
	profileHistory := &model.ProfileHistory{
		ProfileID:      profile.ID,
		UserID:         profile.UserID,
		Education:      profile.Education,
		NearestStation: profile.NearestStation,
		CanTravel:      int(profile.CanTravel),
		AppealPoints:   profile.AppealPoints,
		Version:        profile.CurrentVersion,
	}

	// トランザクション開始
	tx := r.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// プロフィール履歴を保存
	if err := tx.Create(profileHistory).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 職務経歴の履歴を保存
	for _, wh := range profileWithHistory.WorkHistories {
		workHistoryHistory := &model.WorkHistoryHistory{
			HistoryID:        wh.ID,
			ProfileHistoryID: profileHistory.ID,
			UserID:           wh.UserID,
			ProjectName:      wh.ProjectName,
			StartDate:        wh.StartDate,
			EndDate:          wh.EndDate,
			Industry:         strconv.Itoa(int(wh.Industry)),
			ProjectOverview:  wh.ProjectOverview,
			Role:             wh.Role,
			TeamSize:         int(wh.TeamSize),
			ProjectProcesses: wh.Processes,
		}

		if err := tx.Create(workHistoryHistory).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// トランザクションをコミット
	return tx.Commit().Error
}

// FindProfileHistoryByVersion 特定バージョンのプロフィール履歴を取得
func (r *ProfileRepositoryImpl) FindProfileHistoryByVersion(profileID uuid.UUID, version int) (*model.ProfileHistory, error) {
	var profileHistory model.ProfileHistory
	err := r.db.Preload("WorkHistories").
		Where("profile_id = ? AND version = ?", profileID, version).
		First(&profileHistory).Error
	if err != nil {
		return nil, err
	}
	return &profileHistory, nil
}

// FindLatestProfileHistory 最新のプロフィール履歴を取得
func (r *ProfileRepositoryImpl) FindLatestProfileHistory(profileID uuid.UUID) (*model.ProfileHistory, error) {
	var profileHistory model.ProfileHistory
	err := r.db.Preload("WorkHistories").
		Where("profile_id = ?", profileID).
		Order("version DESC").
		First(&profileHistory).Error
	if err != nil {
		return nil, err
	}
	return &profileHistory, nil
}
