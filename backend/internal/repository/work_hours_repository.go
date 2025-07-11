package repository

import (
	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkHoursRepository 作業時間に関するデータアクセスの責務を持つ
type WorkHoursRepository struct {
	db *gorm.DB
}

// NewWorkHoursRepository WorkHoursRepositoryのインスタンスを生成する
func NewWorkHoursRepository(db *gorm.DB) *WorkHoursRepository {
	return &WorkHoursRepository{db: db}
}

// Create 新しい作業時間を作成
func (r *WorkHoursRepository) Create(workHour *model.WorkHour) error {
	return r.db.Create(workHour).Error
}

// FindByID IDで作業時間を検索
func (r *WorkHoursRepository) FindByID(id uuid.UUID) (*model.WorkHour, error) {
	var workHour model.WorkHour
	err := r.db.First(&workHour, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &workHour, nil
}

// FindByReportID 週報IDで作業時間を検索
func (r *WorkHoursRepository) FindByReportID(reportID uuid.UUID) ([]*model.WorkHour, error) {
	var workHours []*model.WorkHour
	err := r.db.Where("weekly_report_id = ?", reportID).Find(&workHours).Error
	if err != nil {
		return nil, err
	}
	return workHours, nil
}

// Update 作業時間を更新
func (r *WorkHoursRepository) Update(workHour *model.WorkHour) error {
	return r.db.Save(workHour).Error
}

// Delete 作業時間を削除
func (r *WorkHoursRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.WorkHour{}, "id = ?", id).Error
}

// DeleteByReportID 週報IDに基づいて作業時間を一括削除
func (r *WorkHoursRepository) DeleteByReportID(reportID uuid.UUID) error {
	return r.db.Delete(&model.WorkHour{}, "weekly_report_id = ?", reportID).Error
}

// SumHoursByReportID 週報IDの作業時間合計を取得
func (r *WorkHoursRepository) SumHoursByReportID(reportID uuid.UUID) (float64, error) {
	var totalHours float64
	err := r.db.Model(&model.WorkHour{}).
		Where("weekly_report_id = ?", reportID).
		Select("COALESCE(SUM(hours), 0) as total_hours").
		Scan(&totalHours).Error
	return totalHours, err
}
