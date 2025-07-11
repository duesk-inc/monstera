package message

import (
	"net/http"
	"time"
)

// ErrorCode エラーコードの型定義
type ErrorCode string

// エラーコード定義
const (
	// 認証・認可関連 (AUTH_XXX)
	ErrCodeUnauthorized       ErrorCode = "AUTH_001" // 認証が必要
	ErrCodeInvalidCredentials ErrorCode = "AUTH_002" // 認証情報が無効
	ErrCodeTokenExpired       ErrorCode = "AUTH_003" // トークン期限切れ
	ErrCodeInvalidToken       ErrorCode = "AUTH_004" // 無効なトークン
	ErrCodeForbidden          ErrorCode = "AUTH_005" // アクセス権限なし
	ErrCodeAccountDisabled    ErrorCode = "AUTH_006" // アカウント無効
	ErrCodeInsufficientRole   ErrorCode = "AUTH_007" // ロール権限不足
	ErrCodeSessionExpired     ErrorCode = "AUTH_008" // セッション期限切れ
	ErrCodeDuplicateLogin     ErrorCode = "AUTH_009" // 重複ログイン

	// バリデーション関連 (VAL_XXX)
	ErrCodeInvalidRequest     ErrorCode = "VAL_001" // 無効なリクエスト
	ErrCodeInvalidFormat      ErrorCode = "VAL_002" // フォーマットエラー
	ErrCodeRequiredField      ErrorCode = "VAL_003" // 必須項目未入力
	ErrCodeInvalidLength      ErrorCode = "VAL_004" // 文字数制限エラー
	ErrCodeInvalidRange       ErrorCode = "VAL_005" // 範囲外の値
	ErrCodeInvalidEmail       ErrorCode = "VAL_006" // メールアドレス形式エラー
	ErrCodeInvalidDate        ErrorCode = "VAL_007" // 日付形式エラー
	ErrCodeInvalidTime        ErrorCode = "VAL_008" // 時刻形式エラー
	ErrCodeInvalidUUID        ErrorCode = "VAL_009" // UUID形式エラー
	ErrCodeInvalidPassword    ErrorCode = "VAL_010" // パスワード形式エラー
	ErrCodeInvalidPhoneNumber ErrorCode = "VAL_011" // 電話番号形式エラー
	ErrCodeInvalidPostalCode  ErrorCode = "VAL_012" // 郵便番号形式エラー
	ErrCodeInvalidURL         ErrorCode = "VAL_013" // URL形式エラー
	ErrCodeInvalidFileType    ErrorCode = "VAL_014" // ファイル形式エラー
	ErrCodeFileSizeExceeded   ErrorCode = "VAL_015" // ファイルサイズ超過
	ErrCodeValidation         ErrorCode = "VAL_000" // 一般的なバリデーションエラー

	// リソース関連 (RES_XXX)
	ErrCodeNotFound            ErrorCode = "RES_001" // リソースが見つからない
	ErrCodeAlreadyExists       ErrorCode = "RES_002" // リソースが既に存在
	ErrCodeConflict            ErrorCode = "RES_003" // リソースの競合
	ErrCodeDependencyExists    ErrorCode = "RES_004" // 依存関係が存在
	ErrCodeResourceLocked      ErrorCode = "RES_005" // リソースがロック中
	ErrCodeResourceExpired     ErrorCode = "RES_006" // リソースの有効期限切れ
	ErrCodeQuotaExceeded       ErrorCode = "RES_007" // リソースの割り当て超過
	ErrCodeResourceUnavailable ErrorCode = "RES_008" // リソースが利用不可

	// ビジネスロジック関連 (BIZ_XXX)
	ErrCodeInvalidOperation      ErrorCode = "BIZ_001" // 無効な操作
	ErrCodeOperationNotAllowed   ErrorCode = "BIZ_002" // 許可されていない操作
	ErrCodeInvalidState          ErrorCode = "BIZ_003" // 無効な状態
	ErrCodePreconditionFailed    ErrorCode = "BIZ_004" // 前提条件を満たしていない
	ErrCodeBusinessRuleViolation ErrorCode = "BIZ_005" // ビジネスルール違反
	ErrCodeWorkflowError         ErrorCode = "BIZ_006" // ワークフローエラー
	ErrCodeApprovalRequired      ErrorCode = "BIZ_007" // 承認が必要
	ErrCodeDeadlineExceeded      ErrorCode = "BIZ_008" // 期限超過

	// システムエラー (SYS_XXX)
	ErrCodeInternalError       ErrorCode = "SYS_001" // 内部エラー
	ErrCodeDatabaseError       ErrorCode = "SYS_002" // データベースエラー
	ErrCodeNetworkError        ErrorCode = "SYS_003" // ネットワークエラー
	ErrCodeTimeout             ErrorCode = "SYS_004" // タイムアウト
	ErrCodeServiceUnavailable  ErrorCode = "SYS_005" // サービス利用不可
	ErrCodeExternalAPIError    ErrorCode = "SYS_006" // 外部APIエラー
	ErrCodeConfigurationError  ErrorCode = "SYS_007" // 設定エラー
	ErrCodeInitializationError ErrorCode = "SYS_008" // 初期化エラー
	ErrCodeTransactionError    ErrorCode = "SYS_009" // トランザクションエラー
	ErrCodeConcurrencyError    ErrorCode = "SYS_010" // 並行処理エラー
	ErrCodeInternal            ErrorCode = "SYS_000" // 内部エラー（エイリアス）

	// データ関連 (DAT_XXX)
	ErrCodeDataCorruption     ErrorCode = "DAT_001" // データ破損
	ErrCodeDataInconsistency  ErrorCode = "DAT_002" // データ不整合
	ErrCodeDataMigrationError ErrorCode = "DAT_003" // データ移行エラー
	ErrCodeDataSyncError      ErrorCode = "DAT_004" // データ同期エラー
	ErrCodeDataIntegrityError ErrorCode = "DAT_005" // データ整合性エラー

	// PostgreSQL専用エラーコード (DB_XXX)
	ErrCodeDatabase             ErrorCode = "SYS_002"  // データベースエラー（既存との互換性）
	ErrCodeDeadlock             ErrorCode = "DB_001"   // デッドロック検出
	ErrCodeLockTimeout          ErrorCode = "DB_002"   // ロックタイムアウト
	ErrCodeConnectionTimeout    ErrorCode = "DB_003"   // 接続タイムアウト
	ErrCodeConnectionClosed     ErrorCode = "DB_004"   // 接続クローズ
	ErrCodeConnectionFailed     ErrorCode = "DB_005"   // 接続失敗
	ErrCodeTooManyConnections   ErrorCode = "DB_006"   // 接続数超過
	ErrCodeConstraintViolation  ErrorCode = "DB_007"   // 制約違反（一般）
	ErrCodeDataException        ErrorCode = "DB_008"   // データ例外
	ErrCodeSyntaxError          ErrorCode = "DB_009"   // SQL構文エラー
	ErrCodeResourceExhausted    ErrorCode = "DB_010"   // リソース枯渇
	ErrCodeStorageFull          ErrorCode = "DB_011"   // ストレージ満杯
	ErrCodeMemoryExhausted      ErrorCode = "DB_012"   // メモリ枯渇
	ErrCodeLimitExceeded        ErrorCode = "DB_013"   // 制限超過
	ErrCodeResourceBusy         ErrorCode = "DB_014"   // リソース使用中
	ErrCodeCanceled             ErrorCode = "DB_015"   // キャンセル
	ErrCodeIOError              ErrorCode = "DB_016"   // I/Oエラー
	ErrCodeDataTooLong          ErrorCode = "DB_017"   // データが長すぎる
	ErrCodeValueOutOfRange      ErrorCode = "DB_018"   // 値が範囲外
	ErrCodeInvalidQuery         ErrorCode = "DB_019"   // 無効なクエリ
	ErrCodeInvalidField         ErrorCode = "DB_020"   // 無効なフィールド
	ErrCodeInvalidTable         ErrorCode = "DB_021"   // 無効なテーブル
	ErrCodeInvalidFunction      ErrorCode = "DB_022"   // 無効な関数
	ErrCodeAuthenticationFailed ErrorCode = "AUTH_011" // 認証失敗
	ErrCodePermissionDenied     ErrorCode = "AUTH_012" // 権限拒否

	// 週報管理関連 (W001xxx - 基本操作)
	ErrCodeWeeklyReportNotFound      ErrorCode = "W001V001" // 週報が見つかりません
	ErrCodeWeeklyReportAlreadyExists ErrorCode = "W001V002" // 指定された週の週報は既に存在します
	ErrCodeWeeklyReportInvalidPeriod ErrorCode = "W001V003" // 無効な週報期間です
	ErrCodeWeeklyReportInvalidStatus ErrorCode = "W001V004" // 無効な週報ステータスです
	ErrCodeWeeklyReportDuplicateWeek ErrorCode = "W001V005" // 同じ週の週報が既に存在します
	ErrCodeWeeklyReportInvalidDates  ErrorCode = "W001V006" // 週報の日付範囲が無効です（開始日が終了日より後）
	ErrCodeWeeklyReportFutureWeek    ErrorCode = "W001V007" // 未来の週の週報は作成できません
	ErrCodeWeeklyReportTooOldWeek    ErrorCode = "W001V008" // 指定された週は古すぎるため作成できません

	// 週報提出関連 (W002xxx)
	ErrCodeWeeklyReportAlreadySubmitted ErrorCode = "W002B001" // この週報は既に提出済みです
	ErrCodeWeeklyReportNotSubmittable   ErrorCode = "W002B002" // この週報は提出できない状態です
	ErrCodeWeeklyReportRequiredFields   ErrorCode = "W002V001" // 必須項目が未入力です
	ErrCodeWeeklyReportInvalidMood      ErrorCode = "W002V002" // 気分の値が無効です（1-5の範囲で入力してください）
	ErrCodeWeeklyReportInvalidWorkHours ErrorCode = "W002V003" // 勤務時間が無効です（0以上の値を入力してください）
	ErrCodeWeeklyReportDeadlinePassed   ErrorCode = "W002B003" // 提出期限を過ぎています
	ErrCodeWeeklyReportIncompleteData   ErrorCode = "W002V004" // 週報データが不完全です

	// 週報編集関連 (W003xxx)
	ErrCodeWeeklyReportNotEditable     ErrorCode = "W003B001" // この週報は編集できません（既に提出済み）
	ErrCodeWeeklyReportEditForbidden   ErrorCode = "W003A001" // この週報を編集する権限がありません
	ErrCodeWeeklyReportConcurrentEdit  ErrorCode = "W003C001" // 他のユーザーが編集中です
	ErrCodeWeeklyReportVersionConflict ErrorCode = "W003C002" // データが他のユーザーによって更新されています

	// 週報承認・コメント関連 (W004xxx)
	ErrCodeWeeklyReportNotApprovable     ErrorCode = "W004B001" // この週報は承認できません
	ErrCodeWeeklyReportInvalidComment    ErrorCode = "W004V001" // コメントの内容が無効です
	ErrCodeWeeklyReportCommentRequired   ErrorCode = "W004V002" // 却下時はコメントが必須です
	ErrCodeWeeklyReportApprovalForbidden ErrorCode = "W004A001" // 週報を承認する権限がありません

	// 未提出者管理関連 (W005xxx)
	ErrCodeUnsubmittedUsersNotFound  ErrorCode = "W005R001" // 未提出者が見つかりません
	ErrCodeReminderSendFailed        ErrorCode = "W005S001" // リマインドの送信に失敗しました
	ErrCodeReminderAlreadySent       ErrorCode = "W005B001" // 本日既にリマインドを送信済みです
	ErrCodeReminderInvalidRecipients ErrorCode = "W005V001" // 送信対象のユーザーが無効です
	ErrCodeBulkReminderLimitExceeded ErrorCode = "W005R002" // 一括送信の上限（100件）を超えています

	// 統計・分析関連 (W006xxx)
	ErrCodeStatsCalculationFailed ErrorCode = "W006S001" // 統計の計算に失敗しました
	ErrCodeStatsInvalidPeriod     ErrorCode = "W006V001" // 統計期間が無効です
	ErrCodeStatsDataNotFound      ErrorCode = "W006R001" // 統計データが見つかりません
	ErrCodeStatsExportFailed      ErrorCode = "W006S002" // 統計データのエクスポートに失敗しました

	// 通知関連 (W007xxx)
	ErrCodeNotificationSendFailed       ErrorCode = "W007S001" // 通知の送信に失敗しました
	ErrCodeNotificationInvalidType      ErrorCode = "W007V001" // 通知タイプが無効です
	ErrCodeNotificationHistoryNotFound  ErrorCode = "W007R001" // 通知履歴が見つかりません
	ErrCodeNotificationPermissionDenied ErrorCode = "W007A001" // 通知を送信する権限がありません

	// アラート関連 (W008xxx)
	ErrCodeAlertSettingNotFound  ErrorCode = "W008R001" // アラート設定が見つかりません
	ErrCodeAlertSettingInvalid   ErrorCode = "W008V001" // アラート設定が無効です
	ErrCodeAlertThresholdInvalid ErrorCode = "W008V002" // アラート閾値が無効です
	ErrCodeAlertAlreadyProcessed ErrorCode = "W008B001" // このアラートは既に処理済みです

	// エクスポート関連 (W009xxx)
	ErrCodeExportInvalidFormat           ErrorCode = "W009V001" // エクスポート形式が無効です
	ErrCodeExportInvalidPeriod           ErrorCode = "W009V002" // エクスポート期間が無効です
	ErrCodeExportFileGenerationFailed    ErrorCode = "W009S001" // ファイルの生成に失敗しました
	ErrCodeExportGoogleDriveUploadFailed ErrorCode = "W009S002" // Google Driveへのアップロードに失敗しました
	ErrCodeExportDataTooLarge            ErrorCode = "W009R001" // エクスポートデータが大きすぎます
	ErrCodeExportJobNotFound             ErrorCode = "W009R002" // エクスポートジョブが見つかりません

	// 部署・ユーザー管理関連 (W010xxx)
	ErrCodeDepartmentNotFound         ErrorCode = "W010R001" // 部署が見つかりません
	ErrCodeManagerNotFound            ErrorCode = "W010R002" // 管理者が見つかりません
	ErrCodeUserNotInDepartment        ErrorCode = "W010B001" // ユーザーは指定された部署に所属していません
	ErrCodeInvalidDepartmentHierarchy ErrorCode = "W010V001" // 部署階層が無効です
)

// AppError アプリケーションエラー構造体
type AppError struct {
	Code       ErrorCode         `json:"code"`                 // エラーコード
	Message    string            `json:"message"`              // エラーメッセージ
	StatusCode int               `json:"-"`                    // HTTPステータスコード
	Details    map[string]string `json:"details,omitempty"`    // 詳細情報
	Timestamp  string            `json:"timestamp"`            // エラー発生時刻
	RequestID  string            `json:"request_id,omitempty"` // リクエストID（トレース用）
}

// Error エラーインターフェースの実装
func (e *AppError) Error() string {
	return e.Message
}

// ErrorCodeMapping エラーコードとHTTPステータスコードのマッピング
var ErrorCodeMapping = map[ErrorCode]int{
	// 認証・認可関連
	ErrCodeUnauthorized:         http.StatusUnauthorized,
	ErrCodeInvalidCredentials:   http.StatusUnauthorized,
	ErrCodeTokenExpired:         http.StatusUnauthorized,
	ErrCodeInvalidToken:         http.StatusUnauthorized,
	ErrCodeForbidden:            http.StatusForbidden,
	ErrCodeAccountDisabled:      http.StatusForbidden,
	ErrCodeInsufficientRole:     http.StatusForbidden,
	ErrCodeSessionExpired:       http.StatusUnauthorized,
	ErrCodeDuplicateLogin:       http.StatusConflict,
	ErrCodeAuthenticationFailed: http.StatusUnauthorized,
	ErrCodePermissionDenied:     http.StatusForbidden,

	// バリデーション関連
	ErrCodeInvalidRequest:     http.StatusBadRequest,
	ErrCodeInvalidFormat:      http.StatusBadRequest,
	ErrCodeRequiredField:      http.StatusBadRequest,
	ErrCodeInvalidLength:      http.StatusBadRequest,
	ErrCodeInvalidRange:       http.StatusBadRequest,
	ErrCodeInvalidEmail:       http.StatusBadRequest,
	ErrCodeInvalidDate:        http.StatusBadRequest,
	ErrCodeInvalidTime:        http.StatusBadRequest,
	ErrCodeInvalidUUID:        http.StatusBadRequest,
	ErrCodeInvalidPassword:    http.StatusBadRequest,
	ErrCodeInvalidPhoneNumber: http.StatusBadRequest,
	ErrCodeInvalidPostalCode:  http.StatusBadRequest,
	ErrCodeInvalidURL:         http.StatusBadRequest,
	ErrCodeInvalidFileType:    http.StatusBadRequest,
	ErrCodeFileSizeExceeded:   http.StatusBadRequest,
	ErrCodeValidation:         http.StatusBadRequest,

	// リソース関連
	ErrCodeNotFound:            http.StatusNotFound,
	ErrCodeAlreadyExists:       http.StatusConflict,
	ErrCodeConflict:            http.StatusConflict,
	ErrCodeDependencyExists:    http.StatusConflict,
	ErrCodeResourceLocked:      http.StatusLocked,
	ErrCodeResourceExpired:     http.StatusGone,
	ErrCodeQuotaExceeded:       http.StatusTooManyRequests,
	ErrCodeResourceUnavailable: http.StatusServiceUnavailable,

	// ビジネスロジック関連
	ErrCodeInvalidOperation:      http.StatusBadRequest,
	ErrCodeOperationNotAllowed:   http.StatusMethodNotAllowed,
	ErrCodeInvalidState:          http.StatusConflict,
	ErrCodePreconditionFailed:    http.StatusPreconditionFailed,
	ErrCodeBusinessRuleViolation: http.StatusUnprocessableEntity,
	ErrCodeWorkflowError:         http.StatusUnprocessableEntity,
	ErrCodeApprovalRequired:      http.StatusAccepted,
	ErrCodeDeadlineExceeded:      http.StatusRequestTimeout,

	// システムエラー
	ErrCodeInternalError:       http.StatusInternalServerError,
	ErrCodeDatabaseError:       http.StatusInternalServerError,
	ErrCodeNetworkError:        http.StatusBadGateway,
	ErrCodeTimeout:             http.StatusGatewayTimeout,
	ErrCodeServiceUnavailable:  http.StatusServiceUnavailable,
	ErrCodeExternalAPIError:    http.StatusBadGateway,
	ErrCodeConfigurationError:  http.StatusInternalServerError,
	ErrCodeInitializationError: http.StatusInternalServerError,
	ErrCodeTransactionError:    http.StatusInternalServerError,
	ErrCodeConcurrencyError:    http.StatusConflict,
	ErrCodeInternal:            http.StatusInternalServerError,

	// データ関連
	ErrCodeDataCorruption:     http.StatusInternalServerError,
	ErrCodeDataInconsistency:  http.StatusInternalServerError,
	ErrCodeDataMigrationError: http.StatusInternalServerError,
	ErrCodeDataSyncError:      http.StatusInternalServerError,
	ErrCodeDataIntegrityError: http.StatusInternalServerError,

	// PostgreSQL専用エラーコード
	ErrCodeDeadlock:            http.StatusConflict,
	ErrCodeLockTimeout:         http.StatusRequestTimeout,
	ErrCodeConnectionTimeout:   http.StatusGatewayTimeout,
	ErrCodeConnectionClosed:    http.StatusServiceUnavailable,
	ErrCodeConnectionFailed:    http.StatusServiceUnavailable,
	ErrCodeTooManyConnections:  http.StatusServiceUnavailable,
	ErrCodeConstraintViolation: http.StatusConflict,
	ErrCodeDataException:       http.StatusBadRequest,
	ErrCodeSyntaxError:         http.StatusBadRequest,
	ErrCodeResourceExhausted:   http.StatusServiceUnavailable,
	ErrCodeStorageFull:         http.StatusInsufficientStorage,
	ErrCodeMemoryExhausted:     http.StatusServiceUnavailable,
	ErrCodeLimitExceeded:       http.StatusRequestEntityTooLarge,
	ErrCodeResourceBusy:        http.StatusLocked,
	ErrCodeCanceled:            499, // Client Closed Request
	ErrCodeIOError:             http.StatusInternalServerError,
	ErrCodeDataTooLong:         http.StatusRequestEntityTooLarge,
	ErrCodeValueOutOfRange:     http.StatusBadRequest,
	ErrCodeInvalidQuery:        http.StatusBadRequest,
	ErrCodeInvalidField:        http.StatusBadRequest,
	ErrCodeInvalidTable:        http.StatusBadRequest,
	ErrCodeInvalidFunction:     http.StatusBadRequest,

	// 週報管理関連 - 基本操作
	ErrCodeWeeklyReportNotFound:      http.StatusNotFound,
	ErrCodeWeeklyReportAlreadyExists: http.StatusConflict,
	ErrCodeWeeklyReportInvalidPeriod: http.StatusBadRequest,
	ErrCodeWeeklyReportInvalidStatus: http.StatusBadRequest,
	ErrCodeWeeklyReportDuplicateWeek: http.StatusConflict,
	ErrCodeWeeklyReportInvalidDates:  http.StatusBadRequest,
	ErrCodeWeeklyReportFutureWeek:    http.StatusBadRequest,
	ErrCodeWeeklyReportTooOldWeek:    http.StatusBadRequest,

	// 週報提出関連
	ErrCodeWeeklyReportAlreadySubmitted: http.StatusConflict,
	ErrCodeWeeklyReportNotSubmittable:   http.StatusUnprocessableEntity,
	ErrCodeWeeklyReportRequiredFields:   http.StatusBadRequest,
	ErrCodeWeeklyReportInvalidMood:      http.StatusBadRequest,
	ErrCodeWeeklyReportInvalidWorkHours: http.StatusBadRequest,
	ErrCodeWeeklyReportDeadlinePassed:   http.StatusRequestTimeout,
	ErrCodeWeeklyReportIncompleteData:   http.StatusBadRequest,

	// 週報編集関連
	ErrCodeWeeklyReportNotEditable:     http.StatusUnprocessableEntity,
	ErrCodeWeeklyReportEditForbidden:   http.StatusForbidden,
	ErrCodeWeeklyReportConcurrentEdit:  http.StatusConflict,
	ErrCodeWeeklyReportVersionConflict: http.StatusConflict,

	// 週報承認・コメント関連
	ErrCodeWeeklyReportNotApprovable:     http.StatusUnprocessableEntity,
	ErrCodeWeeklyReportInvalidComment:    http.StatusBadRequest,
	ErrCodeWeeklyReportCommentRequired:   http.StatusBadRequest,
	ErrCodeWeeklyReportApprovalForbidden: http.StatusForbidden,

	// 未提出者管理関連
	ErrCodeUnsubmittedUsersNotFound:  http.StatusNotFound,
	ErrCodeReminderSendFailed:        http.StatusInternalServerError,
	ErrCodeReminderAlreadySent:       http.StatusConflict,
	ErrCodeReminderInvalidRecipients: http.StatusBadRequest,
	ErrCodeBulkReminderLimitExceeded: http.StatusTooManyRequests,

	// 統計・分析関連
	ErrCodeStatsCalculationFailed: http.StatusInternalServerError,
	ErrCodeStatsInvalidPeriod:     http.StatusBadRequest,
	ErrCodeStatsDataNotFound:      http.StatusNotFound,
	ErrCodeStatsExportFailed:      http.StatusInternalServerError,

	// 通知関連
	ErrCodeNotificationSendFailed:       http.StatusInternalServerError,
	ErrCodeNotificationInvalidType:      http.StatusBadRequest,
	ErrCodeNotificationHistoryNotFound:  http.StatusNotFound,
	ErrCodeNotificationPermissionDenied: http.StatusForbidden,

	// アラート関連
	ErrCodeAlertSettingNotFound:  http.StatusNotFound,
	ErrCodeAlertSettingInvalid:   http.StatusBadRequest,
	ErrCodeAlertThresholdInvalid: http.StatusBadRequest,
	ErrCodeAlertAlreadyProcessed: http.StatusConflict,

	// エクスポート関連
	ErrCodeExportInvalidFormat:           http.StatusBadRequest,
	ErrCodeExportInvalidPeriod:           http.StatusBadRequest,
	ErrCodeExportFileGenerationFailed:    http.StatusInternalServerError,
	ErrCodeExportGoogleDriveUploadFailed: http.StatusBadGateway,
	ErrCodeExportDataTooLarge:            http.StatusRequestEntityTooLarge,
	ErrCodeExportJobNotFound:             http.StatusNotFound,

	// 部署・ユーザー管理関連
	ErrCodeDepartmentNotFound:         http.StatusNotFound,
	ErrCodeManagerNotFound:            http.StatusNotFound,
	ErrCodeUserNotInDepartment:        http.StatusUnprocessableEntity,
	ErrCodeInvalidDepartmentHierarchy: http.StatusBadRequest,
}

// GetHTTPStatusCode エラーコードからHTTPステータスコードを取得
func GetHTTPStatusCode(code ErrorCode) int {
	if status, ok := ErrorCodeMapping[code]; ok {
		return status
	}
	return http.StatusInternalServerError
}

// IsClientError クライアントエラー（4xx）かどうかを判定
func IsClientError(code ErrorCode) bool {
	status := GetHTTPStatusCode(code)
	return status >= 400 && status < 500
}

// IsServerError サーバーエラー（5xx）かどうかを判定
func IsServerError(code ErrorCode) bool {
	status := GetHTTPStatusCode(code)
	return status >= 500 && status < 600
}

// エラーコードのカテゴリを取得
func GetErrorCategory(code ErrorCode) string {
	codeStr := string(code)
	if len(codeStr) >= 3 {
		return codeStr[:3]
	}
	return "UNK"
}

// IsAuthError 認証関連エラーかどうかを判定
func IsAuthError(code ErrorCode) bool {
	return GetErrorCategory(code) == "AUTH"
}

// IsValidationError バリデーションエラーかどうかを判定
func IsValidationError(code ErrorCode) bool {
	return GetErrorCategory(code) == "VAL"
}

// IsResourceError リソース関連エラーかどうかを判定
func IsResourceError(code ErrorCode) bool {
	return GetErrorCategory(code) == "RES"
}

// IsBusinessError ビジネスロジックエラーかどうかを判定
func IsBusinessError(code ErrorCode) bool {
	return GetErrorCategory(code) == "BIZ"
}

// IsSystemError システムエラーかどうかを判定
func IsSystemError(code ErrorCode) bool {
	return GetErrorCategory(code) == "SYS"
}

// IsDataError データ関連エラーかどうかを判定
func IsDataError(code ErrorCode) bool {
	return GetErrorCategory(code) == "DAT"
}

// IsWeeklyReportError 週報管理関連エラーかどうかを判定
func IsWeeklyReportError(code ErrorCode) bool {
	codeStr := string(code)
	return len(codeStr) >= 4 && codeStr[:4] == "W001" ||
		len(codeStr) >= 4 && codeStr[:4] == "W002" ||
		len(codeStr) >= 4 && codeStr[:4] == "W003" ||
		len(codeStr) >= 4 && codeStr[:4] == "W004" ||
		len(codeStr) >= 4 && codeStr[:4] == "W005" ||
		len(codeStr) >= 4 && codeStr[:4] == "W006" ||
		len(codeStr) >= 4 && codeStr[:4] == "W007" ||
		len(codeStr) >= 4 && codeStr[:4] == "W008" ||
		len(codeStr) >= 4 && codeStr[:4] == "W009" ||
		len(codeStr) >= 4 && codeStr[:4] == "W010"
}

// GetWeeklyReportErrorCategory 週報管理エラーのカテゴリを取得
func GetWeeklyReportErrorCategory(code ErrorCode) string {
	codeStr := string(code)
	if len(codeStr) >= 4 {
		switch codeStr[:4] {
		case "W001":
			return "基本操作"
		case "W002":
			return "提出関連"
		case "W003":
			return "編集関連"
		case "W004":
			return "承認・コメント"
		case "W005":
			return "未提出者管理"
		case "W006":
			return "統計・分析"
		case "W007":
			return "通知"
		case "W008":
			return "アラート"
		case "W009":
			return "エクスポート"
		case "W010":
			return "部署・ユーザー管理"
		}
	}
	return "不明"
}

// GetWeeklyReportErrorType 週報管理エラーのタイプを取得（V:バリデーション、B:ビジネス、A:認証、S:システム、R:リソース、C:競合）
func GetWeeklyReportErrorType(code ErrorCode) string {
	codeStr := string(code)
	if len(codeStr) >= 6 {
		return string(codeStr[4]) // 5文字目がエラータイプ
	}
	return "U" // Unknown
}

// NewAppError AppErrorのインスタンスを作成
func NewAppError(code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: GetHTTPStatusCode(code),
		Timestamp:  time.Now().Format(time.RFC3339),
	}
}

// NewBusinessError ビジネスロジックエラーのAppErrorを作成
func NewBusinessError(code ErrorCode, message string) *AppError {
	return NewAppError(code, message)
}

// init関数で他のエラーコードマッピングを統合
func init() {
	// 提案機能エラーコードマッピングを統合
	for code, status := range ProposalErrorCodeMapping {
		ErrorCodeMapping[code] = status
	}
}
