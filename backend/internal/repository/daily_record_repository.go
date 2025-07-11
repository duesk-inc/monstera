package repository

import (
	"database/sql"
	"strings"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// DailyRecordRepository 日次勤怠記録に関するデータアクセスの責務を持つ
type DailyRecordRepository struct {
	db         *gorm.DB
	logger     *zap.Logger
	sqlAdapter *PostgreSQLSQLAdapter
}

// NewDailyRecordRepository DailyRecordRepositoryのインスタンスを生成する
func NewDailyRecordRepository(db *gorm.DB, logger *zap.Logger) *DailyRecordRepository {
	return &DailyRecordRepository{
		db:         db,
		logger:     logger,
		sqlAdapter: NewPostgreSQLSQLAdapter(db, logger),
	}
}

// Create 新しい日次勤怠記録を作成
func (r *DailyRecordRepository) Create(record *model.DailyRecord) error {
	return r.db.Create(record).Error
}

// FindByID IDで日次勤怠記録を検索
func (r *DailyRecordRepository) FindByID(id uuid.UUID) (*model.DailyRecord, error) {
	var record model.DailyRecord
	err := r.db.First(&record, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// FindByWeeklyReportID 週報IDで日次勤怠記録を検索
func (r *DailyRecordRepository) FindByWeeklyReportID(weeklyReportID uuid.UUID) ([]*model.DailyRecord, error) {
	var records []*model.DailyRecord

	// 標準のORMクエリで取得
	err := r.db.Where("weekly_report_id = ?", weeklyReportID).
		Order("date ASC").
		Find(&records).Error

	// エラーが発生した場合、手動でSQLを実行してみる
	if err != nil {
		query := `
			SELECT 
				id, weekly_report_id, date, 
				start_time, end_time, break_time, 
				work_hours, client_start_time, client_end_time, 
				client_break_time, client_work_hours, has_client_work, 
				remarks, is_holiday_work, 
				created_at, updated_at 
			FROM daily_records 
			WHERE weekly_report_id = ? 
			ORDER BY date ASC`
		records, err = r.findDailyRecordsByRawSQL(query, weeklyReportID)
		if err != nil {
			return nil, err
		}
	}

	return records, nil
}

// FindByDateRange 日付範囲で日次勤怠記録を検索
func (r *DailyRecordRepository) FindByDateRange(weeklyReportID uuid.UUID, startDate, endDate time.Time) ([]*model.DailyRecord, error) {
	var records []*model.DailyRecord

	// 標準のORMクエリで取得
	err := r.db.Where("weekly_report_id = ? AND date BETWEEN ? AND ?", weeklyReportID, startDate, endDate).
		Order("date ASC").
		Find(&records).Error

	// エラーが発生した場合、手動でSQLを実行してみる
	if err != nil {
		query := `
			SELECT 
				id, weekly_report_id, date, 
				start_time, end_time, break_time, 
				work_hours, client_start_time, client_end_time, 
				client_break_time, client_work_hours, has_client_work, 
				remarks, is_holiday_work, 
				created_at, updated_at 
			FROM daily_records 
			WHERE weekly_report_id = ? AND date BETWEEN ? AND ?
			ORDER BY date ASC`
		records, err = r.findDailyRecordsByRawSQL(query, weeklyReportID, startDate, endDate)
		if err != nil {
			return nil, err
		}
	}

	return records, nil
}

// Update 日次勤怠記録を更新
func (r *DailyRecordRepository) Update(record *model.DailyRecord) error {
	return r.db.Save(record).Error
}

// Delete 日次勤怠記録を削除
func (r *DailyRecordRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.DailyRecord{}, "id = ?", id).Error
}

// DeleteByWeeklyReportID 週報IDに関連する全ての日次勤怠記録を削除
func (r *DailyRecordRepository) DeleteByWeeklyReportID(weeklyReportID uuid.UUID) error {
	return r.db.Delete(&model.DailyRecord{}, "weekly_report_id = ?", weeklyReportID).Error
}

// BatchCreate 複数の日次勤怠記録をバッチ登録
func (r *DailyRecordRepository) BatchCreate(records []*model.DailyRecord) error {
	return r.db.CreateInBatches(records, len(records)).Error
}

// CalculateTotalWorkHours 週報の合計稼働時間を計算
func (r *DailyRecordRepository) CalculateTotalWorkHours(weeklyReportID uuid.UUID) (float64, error) {
	var totalHours float64
	err := r.db.Model(&model.DailyRecord{}).
		Select("COALESCE(SUM(work_hours), 0) as total_hours").
		Where("weekly_report_id = ?", weeklyReportID).
		Scan(&totalHours).Error
	return totalHours, err
}

// CalculateClientTotalWorkHours 週報の客先勤怠合計稼働時間を計算
func (r *DailyRecordRepository) CalculateClientTotalWorkHours(weeklyReportID uuid.UUID) (float64, error) {
	var totalHours float64
	err := r.db.Model(&model.DailyRecord{}).
		Select("COALESCE(SUM(client_work_hours), 0) as total_hours").
		Where("weekly_report_id = ? AND has_client_work = true", weeklyReportID).
		Scan(&totalHours).Error
	return totalHours, err
}

// CalculateBothTotalWorkHours 週報の自社・客先両方の合計稼働時間を計算
func (r *DailyRecordRepository) CalculateBothTotalWorkHours(weeklyReportID uuid.UUID) (float64, float64, error) {
	// 自社勤怠の合計時間
	companyTotalHours, err := r.CalculateTotalWorkHours(weeklyReportID)
	if err != nil {
		return 0, 0, err
	}

	// 客先勤怠の合計時間
	clientTotalHours, err := r.CalculateClientTotalWorkHours(weeklyReportID)
	if err != nil {
		return 0, 0, err
	}

	return companyTotalHours, clientTotalHours, nil
}

// findDailyRecordsByRawSQL カスタムSQLクエリを使用して日次勤怠記録を検索する（内部用）
func (r *DailyRecordRepository) findDailyRecordsByRawSQL(query string, args ...interface{}) ([]*model.DailyRecord, error) {
	// カスタムSQLで新しいフィールドも含めるように修正
	if !strings.Contains(strings.ToLower(query), "client_start_time") {
		// "remarks"の前に客先勤怠フィールドを挿入する
		query = strings.Replace(
			query,
			"work_hours, remarks",
			"work_hours, client_start_time, client_end_time, client_break_time, client_work_hours, has_client_work, remarks",
			1,
		)
	}

	// PostgreSQL対応のクエリ変換
	convertedQuery := r.sqlAdapter.GetConvertedSQL(query)

	rows, err := r.db.Raw(convertedQuery, args...).Rows()
	if err != nil {
		r.logger.Error("Failed to execute raw SQL query",
			zap.Error(err),
			zap.String("original_query", query),
			zap.String("converted_query", convertedQuery))
		return nil, err
	}
	defer rows.Close()

	records := make([]*model.DailyRecord, 0)

	// 各行を手動でスキャン
	for rows.Next() {
		var record model.DailyRecord
		var startTime, endTime, clientStartTime, clientEndTime sql.NullString
		var hasClientWork sql.NullBool
		var clientBreakTime, clientWorkHours sql.NullFloat64

		err := rows.Scan(
			&record.ID,
			&record.WeeklyReportID,
			&record.Date,
			&startTime,
			&endTime,
			&record.BreakTime,
			&record.WorkHours,
			&clientStartTime,
			&clientEndTime,
			&clientBreakTime,
			&clientWorkHours,
			&hasClientWork,
			&record.Remarks,
			&record.IsHolidayWork,
			&record.CreatedAt,
			&record.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		// NULL値の処理
		if startTime.Valid {
			record.StartTime = startTime.String
		}

		if endTime.Valid {
			record.EndTime = endTime.String
		}

		if clientStartTime.Valid {
			record.ClientStartTime = clientStartTime.String
		}

		if clientEndTime.Valid {
			record.ClientEndTime = clientEndTime.String
		}

		if clientBreakTime.Valid {
			record.ClientBreakTime = clientBreakTime.Float64
		}

		if clientWorkHours.Valid {
			record.ClientWorkHours = clientWorkHours.Float64
		}

		if hasClientWork.Valid {
			record.HasClientWork = hasClientWork.Bool
		}

		records = append(records, &record)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return records, nil
}
