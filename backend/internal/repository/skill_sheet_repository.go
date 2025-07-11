package repository

import (
	"context"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SkillSheetRepository スキルシートリポジトリのインターフェース
type SkillSheetRepository interface {
	FindByUserID(ctx context.Context, userID uuid.UUID) (*model.SkillSheet, error)
	Create(ctx context.Context, skillSheet *model.SkillSheet) error
	Update(ctx context.Context, skillSheet *model.SkillSheet) error
}

// skillSheetRepository スキルシートリポジトリの実装
type skillSheetRepository struct {
	base repository.BaseRepository
}

// NewSkillSheetRepository スキルシートリポジトリのインスタンスを生成する
func NewSkillSheetRepository(base repository.BaseRepository) SkillSheetRepository {
	return &skillSheetRepository{base: base}
}

// FindByUserID ユーザーIDでスキルシートを検索
func (r *skillSheetRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*model.SkillSheet, error) {
	var skillSheet model.SkillSheet
	if err := r.base.GetDB().WithContext(ctx).Where("user_id = ?", userID).First(&skillSheet).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// レコードが見つからない場合は空のスキルシートを返す
			return &model.SkillSheet{
				UserID:             userID,
				ITExperienceYears:  0,
				ITExperienceMonths: 0,
			}, nil
		}
		return nil, err
	}
	return &skillSheet, nil
}

// Create 新しいスキルシートを作成
func (r *skillSheetRepository) Create(ctx context.Context, skillSheet *model.SkillSheet) error {
	return r.base.GetDB().WithContext(ctx).Create(skillSheet).Error
}

// Update スキルシートを更新
func (r *skillSheetRepository) Update(ctx context.Context, skillSheet *model.SkillSheet) error {
	return r.base.GetDB().WithContext(ctx).Save(skillSheet).Error
}
