package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type LeaveRequestAdminRepository interface {
	GetAllWithFilters(ctx context.Context, filters LeaveRequestFilters, pagination Pagination) ([]*model.LeaveRequest, int64, error)
	ApproveRequest(ctx context.Context, requestID, approverID uuid.UUID) error
	RejectRequest(ctx context.Context, requestID, approverID uuid.UUID, reason string) error
	BulkApprove(ctx context.Context, requestIDs []uuid.UUID, approverID uuid.UUID) error
	GetStatistics(ctx context.Context, filters StatisticsFilters) (*LeaveStatistics, error)
	GetUserStatistics(ctx context.Context, userID string, filters StatisticsFilters) (*UserLeaveStatistics, error)
}

type leaveRequestAdminRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewLeaveRequestAdminRepository(db *gorm.DB, logger *zap.Logger) LeaveRequestAdminRepository {
	return &leaveRequestAdminRepository{
		db:     db,
		logger: logger,
	}
}

type LeaveRequestFilters struct {
	UserName       string
	StartDate      *time.Time
	EndDate        *time.Time
	Status         string
	LeaveTypeID    *uuid.UUID
	ExcludeRetired bool
}

type Pagination struct {
	Page  int
	Limit int
}

type StatisticsFilters struct {
	Year        int
	Month       *int
	UserID      *uuid.UUID
	LeaveTypeID *uuid.UUID
}

type LeaveStatistics struct {
	TotalRequests    int                      `json:"totalRequests"`
	TotalDays        float64                  `json:"totalDays"`
	ByStatus         map[string]int           `json:"byStatus"`
	ByLeaveType      map[string]LeaveTypeStat `json:"byLeaveType"`
	MonthlyBreakdown []MonthlyStatistic       `json:"monthlyBreakdown"`
}

type LeaveTypeStat struct {
	Count     int     `json:"count"`
	TotalDays float64 `json:"totalDays"`
	TypeName  string  `json:"typeName"`
}

type MonthlyStatistic struct {
	Year      int     `json:"year"`
	Month     int     `json:"month"`
	Count     int     `json:"count"`
	TotalDays float64 `json:"totalDays"`
}

type UserLeaveStatistics struct {
	UserID           uuid.UUID              `json:"userId"`
	UserName         string                 `json:"userName"`
	TotalUsedDays    map[string]float64     `json:"totalUsedDays"`
	RemainingDays    map[string]float64     `json:"remainingDays"`
	MonthlyBreakdown []UserMonthlyStatistic `json:"monthlyBreakdown"`
}

type UserMonthlyStatistic struct {
	Year     int                `json:"year"`
	Month    int                `json:"month"`
	UsedDays map[string]float64 `json:"usedDays"`
}

func (r *leaveRequestAdminRepository) GetAllWithFilters(ctx context.Context, filters LeaveRequestFilters, pagination Pagination) ([]*model.LeaveRequest, int64, error) {
	var requests []*model.LeaveRequest
	var total int64

	query := r.db.WithContext(ctx).Model(&model.LeaveRequest{}).
		Preload("User").
		Preload("LeaveType").
		Preload("Details").
		Preload("Approver")

	// ユーザー名検索
	if filters.UserName != "" {
		query = query.Joins("JOIN users ON users.id = leave_requests.user_id").
			Where("users.name LIKE ?", "%"+filters.UserName+"%")
	}

	// 退職者除外
	if filters.ExcludeRetired {
		query = query.Joins("JOIN users ON users.id = leave_requests.user_id").
			Where("users.employment_status = ?", "active")
	}

	// 申請期間フィルター
	if filters.StartDate != nil {
		query = query.Where("request_date >= ?", filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("request_date <= ?", filters.EndDate)
	}

	// ステータスフィルター
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}

	// 休暇種別フィルター
	if filters.LeaveTypeID != nil {
		query = query.Where("leave_type_id = ?", filters.LeaveTypeID)
	}

	// 件数取得
	if err := query.Count(&total).Error; err != nil {
		r.logger.Error("Failed to count leave requests", zap.Error(err))
		return nil, 0, err
	}

	// ページネーション適用
	offset := (pagination.Page - 1) * pagination.Limit
	query = query.Order("request_date DESC").Offset(offset).Limit(pagination.Limit)

	// データ取得
	if err := query.Find(&requests).Error; err != nil {
		r.logger.Error("Failed to fetch leave requests", zap.Error(err))
		return nil, 0, err
	}

	return requests, total, nil
}

func (r *leaveRequestAdminRepository) ApproveRequest(ctx context.Context, requestID, approverID uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.LeaveRequest{}).
		Where("id = ? AND status = ?", requestID, "pending").
		Updates(map[string]interface{}{
			"status":       "approved",
			"approver_id":  approverID,
			"processed_at": now,
			"updated_at":   now,
		}).Error
}

func (r *leaveRequestAdminRepository) RejectRequest(ctx context.Context, requestID, approverID uuid.UUID, reason string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.LeaveRequest{}).
		Where("id = ? AND status = ?", requestID, "pending").
		Updates(map[string]interface{}{
			"status":           "rejected",
			"approver_id":      approverID,
			"rejection_reason": reason,
			"processed_at":     now,
			"updated_at":       now,
		}).Error
}

func (r *leaveRequestAdminRepository) BulkApprove(ctx context.Context, requestIDs []uuid.UUID, approverID uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&model.LeaveRequest{}).
		Where("id IN ? AND status = ?", requestIDs, "pending").
		Updates(map[string]interface{}{
			"status":       "approved",
			"approver_id":  approverID,
			"processed_at": now,
			"updated_at":   now,
		}).Error
}

func (r *leaveRequestAdminRepository) GetStatistics(ctx context.Context, filters StatisticsFilters) (*LeaveStatistics, error) {
	stats := &LeaveStatistics{
		ByStatus:    make(map[string]int),
		ByLeaveType: make(map[string]LeaveTypeStat),
	}

	query := r.db.WithContext(ctx).Model(&model.LeaveRequest{}).
		Where("status = ?", "approved")

	// 年フィルター
	if filters.Year > 0 {
		startDate := time.Date(filters.Year, 1, 1, 0, 0, 0, 0, time.UTC)
		endDate := time.Date(filters.Year, 12, 31, 23, 59, 59, 999999999, time.UTC)
		query = query.Where("request_date BETWEEN ? AND ?", startDate, endDate)
	}

	// 月フィルター
	if filters.Month != nil && *filters.Month > 0 {
		startDate := time.Date(filters.Year, time.Month(*filters.Month), 1, 0, 0, 0, 0, time.UTC)
		endDate := startDate.AddDate(0, 1, -1)
		query = query.Where("request_date BETWEEN ? AND ?", startDate, endDate)
	}

	// ユーザーフィルター
	if filters.UserID != nil {
		query = query.Where("user_id = ?", filters.UserID)
	}

	// 休暇種別フィルター
	if filters.LeaveTypeID != nil {
		query = query.Where("leave_type_id = ?", filters.LeaveTypeID)
	}

	// 統計データ取得
	var requests []*model.LeaveRequest
	if err := query.Preload("LeaveType").Find(&requests).Error; err != nil {
		return nil, err
	}

	// 集計
	monthlyMap := make(map[string]*MonthlyStatistic)
	for _, req := range requests {
		stats.TotalRequests++
		stats.TotalDays += req.TotalDays

		// ステータス別集計
		stats.ByStatus[req.Status]++

		// 休暇種別集計
		typeStat, exists := stats.ByLeaveType[req.LeaveType.Code]
		if !exists {
			typeStat = LeaveTypeStat{
				TypeName: req.LeaveType.Name,
			}
		}
		typeStat.Count++
		typeStat.TotalDays += req.TotalDays
		stats.ByLeaveType[req.LeaveType.Code] = typeStat

		// 月別集計
		monthKey := fmt.Sprintf("%d-%02d", req.RequestDate.Year(), req.RequestDate.Month())
		if _, exists := monthlyMap[monthKey]; !exists {
			monthlyMap[monthKey] = &MonthlyStatistic{
				Year:  req.RequestDate.Year(),
				Month: int(req.RequestDate.Month()),
			}
		}
		monthlyMap[monthKey].Count++
		monthlyMap[monthKey].TotalDays += req.TotalDays
	}

	// 月別データをスライスに変換
	for _, monthly := range monthlyMap {
		stats.MonthlyBreakdown = append(stats.MonthlyBreakdown, *monthly)
	}

	return stats, nil
}

func (r *leaveRequestAdminRepository) GetUserStatistics(ctx context.Context, userID string, filters StatisticsFilters) (*UserLeaveStatistics, error) {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	
	userStats := &UserLeaveStatistics{
		UserID:        parsedUserID,
		TotalUsedDays: make(map[string]float64),
		RemainingDays: make(map[string]float64),
	}

	// ユーザー情報取得
	var user model.User
	if err := r.db.WithContext(ctx).First(&user, userID).Error; err != nil {
		return nil, err
	}
	userStats.UserName = user.Name

	// 休暇残日数取得
	var balances []*model.UserLeaveBalance
	balanceQuery := r.db.WithContext(ctx).Model(&model.UserLeaveBalance{}).
		Preload("LeaveType").
		Where("user_id = ?", userID)

	if filters.Year > 0 {
		balanceQuery = balanceQuery.Where("fiscal_year = ?", filters.Year)
	}

	if err := balanceQuery.Find(&balances).Error; err != nil {
		return nil, err
	}

	for _, balance := range balances {
		userStats.TotalUsedDays[balance.LeaveType.Code] = balance.UsedDays
		userStats.RemainingDays[balance.LeaveType.Code] = balance.RemainingDays
	}

	// 月別使用実績取得
	var requests []*model.LeaveRequest
	requestQuery := r.db.WithContext(ctx).Model(&model.LeaveRequest{}).
		Preload("LeaveType").
		Where("user_id = ? AND status = ?", userID, "approved")

	if filters.Year > 0 {
		startDate := time.Date(filters.Year, 1, 1, 0, 0, 0, 0, time.UTC)
		endDate := time.Date(filters.Year, 12, 31, 23, 59, 59, 999999999, time.UTC)
		requestQuery = requestQuery.Where("request_date BETWEEN ? AND ?", startDate, endDate)
	}

	if err := requestQuery.Find(&requests).Error; err != nil {
		return nil, err
	}

	// 月別集計
	monthlyMap := make(map[string]map[string]float64)
	for _, req := range requests {
		monthKey := fmt.Sprintf("%d-%02d", req.RequestDate.Year(), req.RequestDate.Month())
		if _, exists := monthlyMap[monthKey]; !exists {
			monthlyMap[monthKey] = make(map[string]float64)
		}
		monthlyMap[monthKey][req.LeaveType.Code] += req.TotalDays
	}

	// 月別データをスライスに変換
	for monthKey, usedDays := range monthlyMap {
		var year, month int
		fmt.Sscanf(monthKey, "%d-%d", &year, &month)
		userStats.MonthlyBreakdown = append(userStats.MonthlyBreakdown, UserMonthlyStatistic{
			Year:     year,
			Month:    month,
			UsedDays: usedDays,
		})
	}

	return userStats, nil
}
