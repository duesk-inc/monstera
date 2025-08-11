package repository

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/duesk/monstera/internal/common/repository"
	"github.com/duesk/monstera/internal/model"
)

// LeaveRepository は休暇関連のリポジトリインターフェースです
type LeaveRepository interface {
	// 休暇種別
	GetLeaveTypes(ctx context.Context) ([]model.LeaveType, error)
	GetLeaveTypeByID(ctx context.Context, id string) (model.LeaveType, error)

	// ユーザーの休暇残日数
	GetUserLeaveBalances(ctx context.Context, userID string) ([]model.UserLeaveBalance, error)
	GetUserLeaveBalanceByType(ctx context.Context, userID string, leaveTypeID string) (model.UserLeaveBalance, error)
	UpdateUserLeaveBalance(ctx context.Context, balance model.UserLeaveBalance) error

	// 休暇申請
	CreateLeaveRequest(ctx context.Context, request model.LeaveRequest) (model.LeaveRequest, error)
	GetLeaveRequestsByUserID(ctx context.Context, userID string) ([]model.LeaveRequest, error)
	GetLeaveRequestByID(ctx context.Context, id string) (model.LeaveRequest, error)
	UpdateLeaveRequest(ctx context.Context, request model.LeaveRequest) error
	CheckExistingLeaveRequestsByDate(ctx context.Context, userID string, dates []time.Time) (map[string]bool, error)

	// 休日情報
	GetHolidaysByYear(ctx context.Context, year int) ([]model.Holiday, error)

	// 振替特別休暇
	GetSubstituteLeaveGrants(ctx context.Context, userID string) ([]model.SubstituteLeaveGrant, error)
	GetSubstituteLeaveGrantByID(ctx context.Context, id string) (model.SubstituteLeaveGrant, error)
	CreateSubstituteLeaveGrant(ctx context.Context, grant model.SubstituteLeaveGrant) (model.SubstituteLeaveGrant, error)
	UpdateSubstituteLeaveGrant(ctx context.Context, grant model.SubstituteLeaveGrant) error
	DeleteSubstituteLeaveGrant(ctx context.Context, id string) error
	GetTotalSubstituteLeaveBalance(ctx context.Context, userID string) (float64, error)
}

// leaveRepository は休暇関連のリポジトリ実装です
type leaveRepository struct {
	repository.BaseRepository
	Logger *zap.Logger
}

// NewLeaveRepository は新しいLeaveRepositoryインスタンスを作成します
func NewLeaveRepository(db *gorm.DB, logger *zap.Logger) LeaveRepository {
	// BaseRepositoryを初期化
	baseRepo := repository.NewBaseRepository(db, logger)

	return &leaveRepository{
		BaseRepository: baseRepo,
		Logger:         logger,
	}
}

// GetLeaveTypes は有効な休暇種別一覧を取得します
func (r *leaveRepository) GetLeaveTypes(ctx context.Context) ([]model.LeaveType, error) {
	var leaveTypes []model.LeaveType
	result := r.WithContext(ctx).Where("is_active = ?", true).Order("display_order").Find(&leaveTypes)
	return leaveTypes, result.Error
}

// GetLeaveTypeByID はIDによる休暇種別を取得します
func (r *leaveRepository) GetLeaveTypeByID(ctx context.Context, id string) (model.LeaveType, error) {
	var leaveType model.LeaveType
	result := r.WithContext(ctx).First(&leaveType, "id = ?", id)
	return leaveType, result.Error
}

// GetUserLeaveBalances はユーザーの休暇残日数一覧を取得します
func (r *leaveRepository) GetUserLeaveBalances(ctx context.Context, userID string) ([]model.UserLeaveBalance, error) {
	var balances []model.UserLeaveBalance
	result := r.WithContext(ctx).
		Preload("LeaveType").
		Where("user_id = ?", userID).
		Find(&balances)
	return balances, result.Error
}

// GetUserLeaveBalanceByType はユーザーの特定休暇種別の残日数を取得します
func (r *leaveRepository) GetUserLeaveBalanceByType(ctx context.Context, userID string, leaveTypeID string) (model.UserLeaveBalance, error) {
	var balance model.UserLeaveBalance
	result := r.WithContext(ctx).
		Preload("LeaveType").
		Where("user_id = ? AND leave_type_id = ?", userID, leaveTypeID).
		First(&balance)
	return balance, result.Error
}

// UpdateUserLeaveBalance はユーザーの休暇残日数を更新します
func (r *leaveRepository) UpdateUserLeaveBalance(ctx context.Context, balance model.UserLeaveBalance) error {
	// 直接SQLを使って特定のカラムのみを更新する
	query := `UPDATE user_leave_balances 
              SET total_days = ?, used_days = ?, remaining_days = ?, updated_at = ? 
              WHERE id = ?`

	return r.WithContext(ctx).Exec(
		query,
		balance.TotalDays,
		balance.UsedDays,
		balance.RemainingDays,
		balance.UpdatedAt,
		balance.ID,
	).Error
}

// CreateLeaveRequest は新しい休暇申請を作成します
func (r *leaveRepository) CreateLeaveRequest(ctx context.Context, request model.LeaveRequest) (model.LeaveRequest, error) {
	// 新しいIDを必ず生成
	if request.ID == "" {
		request.ID = r.NewID()
	}

	// ステップ1: 休暇申請レコードを作成
	err := r.ExecuteInTransaction(ctx, func(tx *gorm.DB) error {
		return tx.Create(&request).Error
	})

	if err != nil {
		return request, fmt.Errorf("休暇申請の作成に失敗しました: %w", err)
	}

	// ステップ2: 日付の重複を排除した詳細レコードを準備
	var uniqueDetails []model.LeaveRequestDetail
	uniqueDatesMap := make(map[string]bool)

	for _, detail := range request.Details {
		// 日付を文字列として標準化（YYYY-MM-DD形式）
		dateStr := detail.LeaveDate.Format("2006-01-02")

		// 重複した日付は除外
		if uniqueDatesMap[dateStr] {
			continue
		}

		uniqueDatesMap[dateStr] = true

		// 新しい詳細レコードを作成
		newDetail := model.LeaveRequestDetail{
			ID:             r.NewID(),
			LeaveRequestID: request.ID,
			LeaveDate:      detail.LeaveDate,
			StartTime:      detail.StartTime,
			EndTime:        detail.EndTime,
			DayValue:       detail.DayValue,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		uniqueDetails = append(uniqueDetails, newDetail)
	}

	// 詳細レコードがない場合は早期リターン
	if len(uniqueDetails) == 0 {
		// 既に作成した休暇申請を取得して返す
		var result model.LeaveRequest
		r.WithContext(ctx).
			Preload("LeaveType").
			First(&result, "id = ?", request.ID)
		return result, nil
	}

	// ステップ3: 詳細レコード挿入の前に既存レコードをチェック＆クリーンアップ
	errDetails := r.ExecuteInTransaction(ctx, func(tx *gorm.DB) error {
		// 既存の詳細レコードがあれば削除
		if err := tx.Where("leave_request_id = ?", request.ID).Delete(&model.LeaveRequestDetail{}).Error; err != nil {
			return fmt.Errorf("既存の詳細レコードの削除に失敗しました: %w", err)
		}

		// 1つずつ挿入して詳細なエラーハンドリング
		for _, detail := range uniqueDetails {
			if err := tx.Create(&detail).Error; err != nil {
				// エラーの詳細をログに記録
				if r.Logger != nil {
					r.Logger.Error("詳細レコード挿入エラー",
						zap.Any("レコード", detail),
						zap.Error(err))
				} else {
					log.Printf("詳細レコード挿入エラー - レコード: %+v, エラー: %v", detail, err)
				}
				return fmt.Errorf("詳細レコードの作成に失敗しました: %w", err)
			}
		}

		return nil
	})

	if errDetails != nil {
		// 詳細レコードの作成に失敗した場合、休暇申請自体も削除
		r.WithContext(ctx).Delete(&model.LeaveRequest{}, "id = ?", request.ID)
		return request, errDetails
	}

	// 完全なデータを返すために再取得
	var result model.LeaveRequest
	r.WithContext(ctx).
		Preload("LeaveType").
		Preload("Details").
		First(&result, "id = ?", request.ID)

	return result, nil
}

// GetLeaveRequestsByUserID はユーザーIDによる休暇申請一覧を取得します
func (r *leaveRepository) GetLeaveRequestsByUserID(ctx context.Context, userID string) ([]model.LeaveRequest, error) {
	var requests []model.LeaveRequest
	result := r.WithContext(ctx).
		Preload("LeaveType").
		Preload("Details").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&requests)
	return requests, result.Error
}

// GetLeaveRequestByID はIDによる休暇申請を取得します
func (r *leaveRepository) GetLeaveRequestByID(ctx context.Context, id string) (model.LeaveRequest, error) {
	// IDの検証
	if err := r.ValidateID(id); err != nil {
		return model.LeaveRequest{}, err
	}

	var request model.LeaveRequest
	result := r.WithContext(ctx).
		Preload("LeaveType").
		Preload("Details").
		First(&request, "id = ?", id)
	return request, result.Error
}

// UpdateLeaveRequest は休暇申請を更新します
func (r *leaveRepository) UpdateLeaveRequest(ctx context.Context, request model.LeaveRequest) error {
	return r.WithContext(ctx).Save(&request).Error
}

// GetHolidaysByYear は指定年の休日情報を取得します
func (r *leaveRepository) GetHolidaysByYear(ctx context.Context, year int) ([]model.Holiday, error) {
	var holidays []model.Holiday
	startDate := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC)

	result := r.WithContext(ctx).
		Where("holiday_date >= ? AND holiday_date < ?", startDate, endDate).
		Order("holiday_date").
		Find(&holidays)

	return holidays, result.Error
}

// GetSubstituteLeaveGrants はユーザーの振替特別休暇付与履歴一覧を取得します
func (r *leaveRepository) GetSubstituteLeaveGrants(ctx context.Context, userID string) ([]model.SubstituteLeaveGrant, error) {
	var grants []model.SubstituteLeaveGrant
	result := r.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("grant_date DESC").
		Find(&grants)
	return grants, result.Error
}

// GetSubstituteLeaveGrantByID はIDによる振替特別休暇付与履歴を取得します
func (r *leaveRepository) GetSubstituteLeaveGrantByID(ctx context.Context, id string) (model.SubstituteLeaveGrant, error) {
	// IDの検証
	if err := r.ValidateID(id); err != nil {
		return model.SubstituteLeaveGrant{}, err
	}

	var grant model.SubstituteLeaveGrant
	result := r.WithContext(ctx).
		First(&grant, "id = ?", id)
	return grant, result.Error
}

// CreateSubstituteLeaveGrant は新しい振替特別休暇付与履歴を作成します
func (r *leaveRepository) CreateSubstituteLeaveGrant(ctx context.Context, grant model.SubstituteLeaveGrant) (model.SubstituteLeaveGrant, error) {
	// 残日数の初期設定
	grant.RemainingDays = grant.GrantedDays - grant.UsedDays

	// IDが空の場合は新規生成
	if grant.ID == "" {
		grant.ID = r.NewID()
	}

	result := r.WithContext(ctx).Create(&grant)
	return grant, result.Error
}

// UpdateSubstituteLeaveGrant は振替特別休暇付与履歴を更新します
func (r *leaveRepository) UpdateSubstituteLeaveGrant(ctx context.Context, grant model.SubstituteLeaveGrant) error {
	// 残日数の再計算
	grant.RemainingDays = grant.GrantedDays - grant.UsedDays

	return r.WithContext(ctx).Save(&grant).Error
}

// DeleteSubstituteLeaveGrant は振替特別休暇付与履歴を削除します
func (r *leaveRepository) DeleteSubstituteLeaveGrant(ctx context.Context, id string) error {
	// IDの検証
	if err := r.ValidateID(id); err != nil {
		return err
	}

	return r.WithContext(ctx).Delete(&model.SubstituteLeaveGrant{}, "id = ?", id).Error
}

// GetTotalSubstituteLeaveBalance はユーザーの振替特別休暇の合計残日数を取得します
func (r *leaveRepository) GetTotalSubstituteLeaveBalance(ctx context.Context, userID string) (float64, error) {
	type Result struct {
		TotalRemaining float64
	}

	var result Result

	err := r.WithContext(ctx).
		Model(&model.SubstituteLeaveGrant{}).
		Select("SUM(remaining_days) as total_remaining").
		Where("user_id = ? AND is_expired = ? AND expire_date >= ?", userID, false, time.Now()).
		Scan(&result).Error

	return result.TotalRemaining, err
}

// CheckExistingLeaveRequestsByDate はユーザーの特定の日付における既存の休暇申請を確認します
func (r *leaveRepository) CheckExistingLeaveRequestsByDate(ctx context.Context, userID string, dates []time.Time) (map[string]bool, error) {
	existingRequests := make(map[string]bool)

	// 日付文字列のリストを作成（SQLクエリ用）
	dateStrings := make([]string, len(dates))
	for i, date := range dates {
		dateStrings[i] = date.Format("2006-01-02")
		existingRequests[dateStrings[i]] = false // 初期値としてfalseをセット
	}

	if len(dateStrings) == 0 {
		return existingRequests, nil
	}

	// 指定された日付に既に申請があるかを確認するSQL
	type Result struct {
		LeaveDate string
	}
	var results []Result

	// JOIN句を使用して、ユーザーIDと日付でフィルタリングした休暇申請詳細を取得
	err := r.WithContext(ctx).
		Table("leave_request_details AS d").
		Select("DATE(d.leave_date) AS leave_date").
		Joins("INNER JOIN leave_requests AS r ON d.leave_request_id = r.id").
		Where("r.user_id = ? AND DATE(d.leave_date) IN ? AND r.status != 'rejected'", userID, dateStrings).
		Find(&results).Error

	if err != nil {
		return nil, fmt.Errorf("既存の休暇申請の確認に失敗しました: %w", err)
	}

	// 検索結果に基づいてマップを更新
	for _, result := range results {
		existingRequests[result.LeaveDate] = true
	}

	return existingRequests, nil
}
