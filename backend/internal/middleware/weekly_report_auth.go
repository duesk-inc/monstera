package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/duesk/monstera/internal/message"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/internal/utils"
)

// WeeklyReportAuthMiddleware 週報関連の認証・権限チェックミドルウェア
type WeeklyReportAuthMiddleware struct {
	logger                     *zap.Logger
	errorHandler               *utils.ErrorHandler
	weeklyReportRepo           repository.WeeklyReportRepository
	weeklyReportRefactoredRepo repository.WeeklyReportRefactoredRepository
	userRepo                   repository.UserRepository
	departmentRepo             repository.DepartmentRepository
	authMiddleware             *CognitoAuthMiddleware
}

// NewWeeklyReportAuthMiddleware WeeklyReportAuthMiddlewareのインスタンスを作成
func NewWeeklyReportAuthMiddleware(
	logger *zap.Logger,
	weeklyReportRepo repository.WeeklyReportRepository,
	weeklyReportRefactoredRepo repository.WeeklyReportRefactoredRepository,
	userRepo repository.UserRepository,
	departmentRepo repository.DepartmentRepository,
	authMiddleware *CognitoAuthMiddleware,
) *WeeklyReportAuthMiddleware {
	return &WeeklyReportAuthMiddleware{
		logger:                     logger,
		errorHandler:               utils.NewErrorHandler(),
		weeklyReportRepo:           weeklyReportRepo,
		weeklyReportRefactoredRepo: weeklyReportRefactoredRepo,
		userRepo:                   userRepo,
		departmentRepo:             departmentRepo,
		authMiddleware:             authMiddleware,
	}
}

// RequireWeeklyReportAccess 週報へのアクセス権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireWeeklyReportAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		reportID := c.Param("id")
		if reportID == "" {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
			c.Abort()
			return
		}

		reportUUID, err := uuid.Parse(reportID)
		if err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
			c.Abort()
			return
		}

		// 週報の存在確認と権限チェック
		hasAccess, err := w.checkWeeklyReportAccess(c, reportUUID)
		if err != nil {
			w.errorHandler.HandleInternalError(c, err, "weekly_report_access_check")
			c.Abort()
			return
		}

		if !hasAccess {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportEditForbidden, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireWeeklyReportEdit 週報編集権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireWeeklyReportEdit() gin.HandlerFunc {
	return func(c *gin.Context) {
		reportID := c.Param("id")
		if reportID == "" {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
			c.Abort()
			return
		}

		reportUUID, err := uuid.Parse(reportID)
		if err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
			c.Abort()
			return
		}

		// 週報の編集権限をチェック
		canEdit, reason, err := w.checkWeeklyReportEditPermission(c, reportUUID)
		if err != nil {
			w.errorHandler.HandleInternalError(c, err, "weekly_report_edit_check")
			c.Abort()
			return
		}

		if !canEdit {
			// 編集できない理由に応じてエラーコードを分ける
			var errorCode message.ErrorCode
			switch reason {
			case "already_submitted":
				errorCode = message.ErrCodeWeeklyReportNotEditable
			case "not_owner":
				errorCode = message.ErrCodeWeeklyReportEditForbidden
			case "deadline_passed":
				errorCode = message.ErrCodeWeeklyReportDeadlinePassed
			default:
				errorCode = message.ErrCodeWeeklyReportNotEditable
			}

			w.errorHandler.HandleWeeklyReportError(c, errorCode, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireWeeklyReportApproval 週報承認権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireWeeklyReportApproval() gin.HandlerFunc {
	return func(c *gin.Context) {
		reportID := c.Param("id")
		if reportID == "" {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
			c.Abort()
			return
		}

		reportUUID, err := uuid.Parse(reportID)
		if err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportNotFound, nil)
			c.Abort()
			return
		}

		// 承認権限をチェック
		canApprove, err := w.checkWeeklyReportApprovalPermission(c, reportUUID)
		if err != nil {
			w.errorHandler.HandleInternalError(c, err, "weekly_report_approval_check")
			c.Abort()
			return
		}

		if !canApprove {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportApprovalForbidden, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireDepartmentManagement 部署管理権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireDepartmentManagement() gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID := w.getCurrentUserID(c)
		if currentUserID == "" {
			w.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// 管理者は全部署を管理可能
		if w.isAdmin(c) {
			c.Next()
			return
		}

		// 部署IDを取得
		departmentID := w.getDepartmentID(c)
		if departmentID == "" {
			w.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "部署IDが指定されていません。", nil)
			c.Abort()
			return
		}

		// 部署管理権限をチェック
		canManage, err := w.checkDepartmentManagementPermission(c.Request.Context(), currentUserID, departmentID)
		if err != nil {
			w.errorHandler.HandleInternalError(c, err, "department_management_check")
			c.Abort()
			return
		}

		if !canManage {
			w.errorHandler.HandleError(c, message.ErrCodeUserNotInDepartment, "この部署を管理する権限がありません。", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireUnsubmittedUsersAccess 未提出者管理権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireUnsubmittedUsersAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID := w.getCurrentUserID(c)
		if currentUserID == "" {
			w.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// 管理者またはマネージャーのみアクセス可能
		if !w.isAdminOrManager(c) {
			w.errorHandler.HandleError(c, message.ErrCodeInsufficientRole, "未提出者管理機能にアクセスする権限がありません。", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireReminderSend リマインド送信権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireReminderSend() gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID := w.getCurrentUserID(c)
		if currentUserID == "" {
			w.errorHandler.HandleError(c, message.ErrCodeUnauthorized, "認証が必要です。", nil)
			c.Abort()
			return
		}

		// 管理者またはマネージャーのみリマインド送信可能
		if !w.isAdminOrManager(c) {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeNotificationPermissionDenied, nil)
			c.Abort()
			return
		}

		// リマインド送信のレート制限をチェック
		if err := w.checkReminderRateLimit(c, currentUserID); err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeReminderAlreadySent, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireStatsAccess 統計情報アクセス権限をチェック
func (w *WeeklyReportAuthMiddleware) RequireStatsAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 管理者またはマネージャーのみ統計情報にアクセス可能
		if !w.isAdminOrManager(c) {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeStatsDataNotFound, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// ValidateWeekRange 週の範囲をバリデーション
func (w *WeeklyReportAuthMiddleware) ValidateWeekRange() gin.HandlerFunc {
	return func(c *gin.Context) {
		startDateStr := c.Query("start_date")
		endDateStr := c.Query("end_date")

		if startDateStr == "" || endDateStr == "" {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidPeriod, nil)
			c.Abort()
			return
		}

		// 日付パース
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidDates, nil)
			c.Abort()
			return
		}

		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidDates, nil)
			c.Abort()
			return
		}

		// 週の範囲をバリデーション
		weeklyUtils := utils.NewWeeklyReportUtils()
		if err := weeklyUtils.ValidateWeekRange(startDate, endDate); err != nil {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportInvalidDates, nil)
			c.Abort()
			return
		}

		// 未来の週をチェック
		if startDate.After(time.Now().AddDate(0, 0, 7)) {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportFutureWeek, nil)
			c.Abort()
			return
		}

		// 古すぎる週をチェック（1年以上前）
		if endDate.Before(time.Now().AddDate(-1, 0, 0)) {
			w.errorHandler.HandleWeeklyReportError(c, message.ErrCodeWeeklyReportTooOldWeek, nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// checkWeeklyReportAccess 週報アクセス権限をチェック
func (w *WeeklyReportAuthMiddleware) checkWeeklyReportAccess(c *gin.Context, reportID uuid.UUID) (bool, error) {
	currentUserID := w.getCurrentUserID(c)
	if currentUserID == "" {
		return false, fmt.Errorf("user not authenticated")
	}

	// 管理者は全ての週報にアクセス可能
	if w.isAdmin(c) {
		return true, nil
	}

	// 週報を取得
	report, err := w.weeklyReportRepo.GetByID(c.Request.Context(), reportID.String())
	if err != nil {
		return false, err
	}

	// 自分の週報かチェック
	if report.UserID.String() == currentUserID {
		return true, nil
	}

	// マネージャーは部下の週報にアクセス可能
	if w.isManager(c) {
		return w.isSubordinate(c.Request.Context(), currentUserID, report.UserID.String())
	}

	return false, nil
}

// checkWeeklyReportEditPermission 週報編集権限をチェック
func (w *WeeklyReportAuthMiddleware) checkWeeklyReportEditPermission(c *gin.Context, reportID uuid.UUID) (bool, string, error) {
	currentUserID := w.getCurrentUserID(c)
	if currentUserID == "" {
		return false, "not_authenticated", fmt.Errorf("user not authenticated")
	}

	// 週報を取得
	report, err := w.weeklyReportRepo.GetByID(c.Request.Context(), reportID.String())
	if err != nil {
		return false, "not_found", err
	}

	// 自分の週報以外は編集不可（管理者でも）
	if report.UserID.String() != currentUserID {
		return false, "not_owner", nil
	}

	// 提出済みの週報は編集不可
	if report.Status == model.WeeklyReportStatusSubmitted ||
		report.Status == model.WeeklyReportStatusApproved {
		return false, "already_submitted", nil
	}

	// 期限チェック（必要に応じて）
	// if report.SubmissionDeadline != nil && time.Now().After(*report.SubmissionDeadline) {
	//     return false, "deadline_passed", nil
	// }

	return true, "", nil
}

// checkWeeklyReportApprovalPermission 週報承認権限をチェック
func (w *WeeklyReportAuthMiddleware) checkWeeklyReportApprovalPermission(c *gin.Context, reportID uuid.UUID) (bool, error) {
	currentUserID := w.getCurrentUserID(c)
	if currentUserID == "" {
		return false, fmt.Errorf("user not authenticated")
	}

	// 管理者は全ての週報を承認可能
	if w.isAdmin(c) {
		return true, nil
	}

	// マネージャーは部下の週報のみ承認可能
	if w.isManager(c) {
		report, err := w.weeklyReportRepo.GetByID(c.Request.Context(), reportID.String())
		if err != nil {
			return false, err
		}

		return w.isSubordinate(c.Request.Context(), currentUserID, report.UserID.String())
	}

	return false, nil
}

// checkDepartmentManagementPermission 部署管理権限をチェック
func (w *WeeklyReportAuthMiddleware) checkDepartmentManagementPermission(ctx context.Context, userID, departmentID string) (bool, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return false, err
	}

	user, err := w.userRepo.GetByID(ctx, userUUID)
	if err != nil {
		return false, err
	}

	// ユーザーの所属部署と一致するかチェック
	if user.DepartmentID != nil && user.DepartmentID.String() == departmentID {
		return true, nil
	}

	// 管理対象部署かチェック（実装に応じて）
	// TODO: 部署階層管理ロジックを実装
	return false, nil
}

// checkReminderRateLimit リマインド送信のレート制限をチェック
func (w *WeeklyReportAuthMiddleware) checkReminderRateLimit(c *gin.Context, userID string) error {
	// 1日あたりの送信制限をチェック
	// TODO: Redisやキャッシュを使用した実装
	return nil
}

// isSubordinate 部下かどうかをチェック
func (w *WeeklyReportAuthMiddleware) isSubordinate(ctx context.Context, managerID, userID string) (bool, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return false, err
	}

	user, err := w.userRepo.GetByID(ctx, userUUID)
	if err != nil {
		return false, err
	}

	return user.ManagerID != nil && user.ManagerID.String() == managerID, nil
}

// Helper methods

func (w *WeeklyReportAuthMiddleware) getCurrentUserID(c *gin.Context) string {
	userID, _ := c.Get("user_id")
	if userIDStr, ok := userID.(string); ok {
		return userIDStr
	}
	return ""
}

func (w *WeeklyReportAuthMiddleware) isAdmin(c *gin.Context) bool {
	roles := w.getUserRoles(c)
	for _, role := range roles {
		if role == model.RoleAdmin || role == model.RoleSuperAdmin {
			return true
		}
	}
	return false
}

func (w *WeeklyReportAuthMiddleware) isManager(c *gin.Context) bool {
	roles := w.getUserRoles(c)
	for _, role := range roles {
		if role == model.RoleManager {
			return true
		}
	}
	return false
}

func (w *WeeklyReportAuthMiddleware) isAdminOrManager(c *gin.Context) bool {
	return w.isAdmin(c) || w.isManager(c)
}

func (w *WeeklyReportAuthMiddleware) getUserRoles(c *gin.Context) []model.Role {
	rolesValue, exists := c.Get("roles")
	if !exists {
		return nil
	}

	rolesStr, ok := rolesValue.([]string)
	if !ok {
		return nil
	}

	roles := make([]model.Role, 0, len(rolesStr))
	for _, roleStr := range rolesStr {
		if role, err := model.ParseRole(roleStr); err == nil {
			roles = append(roles, role)
		}
	}

	return roles
}

func (w *WeeklyReportAuthMiddleware) getDepartmentID(c *gin.Context) string {
	// URLパラメータから取得
	if deptID := c.Param("department_id"); deptID != "" {
		return deptID
	}

	// クエリパラメータから取得
	if deptID := c.Query("department_id"); deptID != "" {
		return deptID
	}

	return ""
}
