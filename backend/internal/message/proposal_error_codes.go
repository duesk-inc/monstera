package message

import "net/http"

// 提案機能エラーコード定義 (P001xxx - P999xxx)
// P001xxx: 提案基本操作
// P002xxx: 提案ステータス管理
// P003xxx: 質問機能
// P004xxx: 営業担当者機能
// P005xxx: 統計・分析
// P006xxx: 通知・アラート
// P007xxx: データ連携
// P008xxx: 権限管理
// P009xxx: 一括操作

const (
	// 提案基本操作 (P001xxx)
	ErrCodeProposalNotFound         ErrorCode = "P001R001" // 提案が見つかりません
	ErrCodeProposalAlreadyExists    ErrorCode = "P001R002" // 提案が既に存在します
	ErrCodeProposalInvalidID        ErrorCode = "P001V001" // 無効な提案IDです
	ErrCodeProposalInvalidProjectID ErrorCode = "P001V002" // 無効なプロジェクトIDです
	ErrCodeProposalInvalidUserID    ErrorCode = "P001V003" // 無効なユーザーIDです
	ErrCodeProposalInvalidStatus    ErrorCode = "P001V004" // 無効な提案ステータスです
	ErrCodeProposalInvalidPeriod    ErrorCode = "P001V005" // 無効な期間指定です
	ErrCodeProposalDataCorruption   ErrorCode = "P001D001" // 提案データが破損しています
	ErrCodeProposalCreationFailed   ErrorCode = "P001S001" // 提案の作成に失敗しました
	ErrCodeProposalUpdateFailed     ErrorCode = "P001S002" // 提案の更新に失敗しました
	ErrCodeProposalDeleteFailed     ErrorCode = "P001S003" // 提案の削除に失敗しました

	// 提案ステータス管理 (P002xxx)
	ErrCodeProposalAlreadyResponded      ErrorCode = "P002B001" // この提案は既に回答済みです
	ErrCodeProposalNotRespondable        ErrorCode = "P002B002" // この提案は回答できません
	ErrCodeProposalExpired               ErrorCode = "P002B003" // 提案の有効期限が切れています
	ErrCodeProposalInvalidTransition     ErrorCode = "P002B004" // 無効なステータス遷移です
	ErrCodeProposalRespondDeadlinePassed ErrorCode = "P002B005" // 回答期限を過ぎています
	ErrCodeProposalStatusConflict        ErrorCode = "P002C001" // ステータスの競合が発生しました
	ErrCodeProposalVersionConflict       ErrorCode = "P002C002" // データが他のユーザーによって更新されています
	ErrCodeProposalStatusUpdateFailed    ErrorCode = "P002S001" // ステータス更新に失敗しました
	ErrCodeProposalResponseRequired      ErrorCode = "P002V001" // 回答が必要です
	ErrCodeProposalInvalidResponseData   ErrorCode = "P002V002" // 無効な回答データです

	// 質問機能 (P003xxx)
	ErrCodeQuestionNotFound         ErrorCode = "P003R001" // 質問が見つかりません
	ErrCodeQuestionAlreadyExists    ErrorCode = "P003R002" // 質問が既に存在します
	ErrCodeQuestionInvalidID        ErrorCode = "P003V001" // 無効な質問IDです
	ErrCodeQuestionInvalidText      ErrorCode = "P003V002" // 無効な質問内容です
	ErrCodeQuestionTextTooLong      ErrorCode = "P003V003" // 質問文が長すぎます（最大2000文字）
	ErrCodeQuestionTextEmpty        ErrorCode = "P003V004" // 質問文が空です
	ErrCodeQuestionAlreadyAnswered  ErrorCode = "P003B001" // この質問は既に回答済みです
	ErrCodeQuestionNotAnswerable    ErrorCode = "P003B002" // この質問は回答できません
	ErrCodeQuestionResponseRequired ErrorCode = "P003V005" // 回答が必要です
	ErrCodeQuestionResponseTooLong  ErrorCode = "P003V006" // 回答文が長すぎます（最大2000文字）
	ErrCodeQuestionCreationFailed   ErrorCode = "P003S001" // 質問の投稿に失敗しました
	ErrCodeQuestionUpdateFailed     ErrorCode = "P003S002" // 質問の更新に失敗しました
	ErrCodeQuestionDeleteFailed     ErrorCode = "P003S003" // 質問の削除に失敗しました
	ErrCodeQuestionResponseFailed   ErrorCode = "P003S004" // 質問への回答に失敗しました
	ErrCodeQuestionMaxLimitExceeded ErrorCode = "P003R003" // 質問数の上限を超えています
	ErrCodeQuestionEditTimeExpired  ErrorCode = "P003B003" // 質問の編集期限が過ぎています

	// 営業担当者機能 (P004xxx)
	ErrCodeSalesUserNotFound           ErrorCode = "P004R001" // 営業担当者が見つかりません
	ErrCodeSalesUserNotAssigned        ErrorCode = "P004R002" // 営業担当者が割り当てられていません
	ErrCodeSalesUserInvalidRole        ErrorCode = "P004A001" // 営業担当者の権限がありません
	ErrCodeSalesUserAccessDenied       ErrorCode = "P004A002" // この営業担当者にはアクセス権限がありません
	ErrCodeSalesUserAssignmentFailed   ErrorCode = "P004S001" // 営業担当者の割り当てに失敗しました
	ErrCodeSalesUserMultipleAssignment ErrorCode = "P004B001" // 複数の営業担当者が割り当てられています
	ErrCodeSalesUserResponseOverdue    ErrorCode = "P004B002" // 営業担当者の回答が遅延しています
	ErrCodeSalesUserInvalidAction      ErrorCode = "P004V001" // 無効な営業担当者アクションです

	// 統計・分析 (P005xxx)
	ErrCodeStatsProposalCalculationFailed ErrorCode = "P005S001" // 提案統計の計算に失敗しました
	ErrCodeStatsProposalInvalidPeriod     ErrorCode = "P005V001" // 統計期間が無効です
	ErrCodeStatsProposalDataNotFound      ErrorCode = "P005R001" // 統計データが見つかりません
	ErrCodeStatsProposalExportFailed      ErrorCode = "P005S002" // 統計データのエクスポートに失敗しました
	ErrCodeStatsQuestionAnalysisFailed    ErrorCode = "P005S003" // 質問分析に失敗しました
	ErrCodeStatsResponseTimeCalculation   ErrorCode = "P005S004" // 回答時間の計算に失敗しました
	ErrCodeStatsUserRankingFailed         ErrorCode = "P005S005" // ユーザーランキングの生成に失敗しました
	ErrCodeStatsInvalidMetric             ErrorCode = "P005V002" // 無効な統計指標です

	// 通知・アラート (P006xxx)
	ErrCodeNotificationProposalSendFailed  ErrorCode = "P006S001" // 提案通知の送信に失敗しました
	ErrCodeNotificationQuestionSendFailed  ErrorCode = "P006S002" // 質問通知の送信に失敗しました
	ErrCodeNotificationInvalidRecipient    ErrorCode = "P006V001" // 無効な通知受信者です
	ErrCodeNotificationTemplateFailed      ErrorCode = "P006S003" // 通知テンプレートの処理に失敗しました
	ErrCodeNotificationPreferenceNotFound  ErrorCode = "P006R001" // 通知設定が見つかりません
	ErrCodeNotificationPreferenceInvalid   ErrorCode = "P006V002" // 無効な通知設定です
	ErrCodeNotificationSettingUpdateFailed ErrorCode = "P006S004" // 通知設定の更新に失敗しました
	ErrCodeAlertProposalOverdue            ErrorCode = "P006A001" // 提案の期限切れアラート
	ErrCodeAlertQuestionUnanswered         ErrorCode = "P006A002" // 未回答質問のアラート
	ErrCodeAlertSalesResponseDelay         ErrorCode = "P006A003" // 営業回答遅延アラート

	// データ連携 (P007xxx)
	ErrCodePocProjectSyncFailed     ErrorCode = "P007S001" // POCプロジェクトとの同期に失敗しました
	ErrCodePocProjectNotFound       ErrorCode = "P007R001" // POCプロジェクトが見つかりません
	ErrCodePocProjectDataInvalid    ErrorCode = "P007V001" // POCプロジェクトデータが無効です
	ErrCodePocProjectAccessDenied   ErrorCode = "P007A001" // POCプロジェクトへのアクセスが拒否されました
	ErrCodePocSkillDataSyncFailed   ErrorCode = "P007S002" // スキルデータの同期に失敗しました
	ErrCodePocConnectionFailed      ErrorCode = "P007S003" // POCシステムとの接続に失敗しました
	ErrCodePocDataIntegrityError    ErrorCode = "P007D001" // POCデータの整合性エラー
	ErrCodePocSchemaVersionMismatch ErrorCode = "P007D002" // POCスキーマのバージョン不整合

	// 権限管理 (P008xxx)
	ErrCodeProposalAccessDenied            ErrorCode = "P008A001" // 提案へのアクセスが拒否されました
	ErrCodeProposalViewPermissionDenied    ErrorCode = "P008A002" // 提案の閲覧権限がありません
	ErrCodeProposalEditPermissionDenied    ErrorCode = "P008A003" // 提案の編集権限がありません
	ErrCodeQuestionAccessDenied            ErrorCode = "P008A004" // 質問へのアクセスが拒否されました
	ErrCodeQuestionEditPermissionDenied    ErrorCode = "P008A005" // 質問の編集権限がありません
	ErrCodeQuestionRespondPermissionDenied ErrorCode = "P008A006" // 質問への回答権限がありません
	ErrCodeEngineerRoleRequired            ErrorCode = "P008A007" // エンジニア権限が必要です
	ErrCodeSalesRoleRequired               ErrorCode = "P008A008" // 営業権限が必要です
	ErrCodeAdminRoleRequired               ErrorCode = "P008A009" // 管理者権限が必要です
	ErrCodeCrossUserAccessDenied           ErrorCode = "P008A010" // 他ユーザーのデータにアクセスできません

	// 一括操作 (P009xxx)
	ErrCodeBulkOperationNotSupported     ErrorCode = "P009B001" // 一括操作はサポートされていません
	ErrCodeBulkOperationLimitExceeded    ErrorCode = "P009R001" // 一括操作の上限を超えています
	ErrCodeBulkOperationPartialFailure   ErrorCode = "P009S001" // 一括操作が部分的に失敗しました
	ErrCodeBulkOperationInvalidSelection ErrorCode = "P009V001" // 無効な選択です
	ErrCodeBulkOperationForbidden        ErrorCode = "P009A001" // 一括操作の権限がありません
	ErrCodeBulkQuestionAssignmentFailed  ErrorCode = "P009S002" // 質問の一括割り当てに失敗しました
	ErrCodeBulkNotificationSendFailed    ErrorCode = "P009S003" // 一括通知の送信に失敗しました
	ErrCodeBulkExportFailed              ErrorCode = "P009S004" // 一括エクスポートに失敗しました
)

// ProposalErrorCodeMapping 提案機能エラーコードとHTTPステータスコードのマッピング
var ProposalErrorCodeMapping = map[ErrorCode]int{
	// 提案基本操作
	ErrCodeProposalNotFound:         http.StatusNotFound,
	ErrCodeProposalAlreadyExists:    http.StatusConflict,
	ErrCodeProposalInvalidID:        http.StatusBadRequest,
	ErrCodeProposalInvalidProjectID: http.StatusBadRequest,
	ErrCodeProposalInvalidUserID:    http.StatusBadRequest,
	ErrCodeProposalInvalidStatus:    http.StatusBadRequest,
	ErrCodeProposalInvalidPeriod:    http.StatusBadRequest,
	ErrCodeProposalDataCorruption:   http.StatusInternalServerError,
	ErrCodeProposalCreationFailed:   http.StatusInternalServerError,
	ErrCodeProposalUpdateFailed:     http.StatusInternalServerError,
	ErrCodeProposalDeleteFailed:     http.StatusInternalServerError,

	// 提案ステータス管理
	ErrCodeProposalAlreadyResponded:      http.StatusConflict,
	ErrCodeProposalNotRespondable:        http.StatusUnprocessableEntity,
	ErrCodeProposalExpired:               http.StatusGone,
	ErrCodeProposalInvalidTransition:     http.StatusUnprocessableEntity,
	ErrCodeProposalRespondDeadlinePassed: http.StatusRequestTimeout,
	ErrCodeProposalStatusConflict:        http.StatusConflict,
	ErrCodeProposalVersionConflict:       http.StatusConflict,
	ErrCodeProposalStatusUpdateFailed:    http.StatusInternalServerError,
	ErrCodeProposalResponseRequired:      http.StatusBadRequest,
	ErrCodeProposalInvalidResponseData:   http.StatusBadRequest,

	// 質問機能
	ErrCodeQuestionNotFound:         http.StatusNotFound,
	ErrCodeQuestionAlreadyExists:    http.StatusConflict,
	ErrCodeQuestionInvalidID:        http.StatusBadRequest,
	ErrCodeQuestionInvalidText:      http.StatusBadRequest,
	ErrCodeQuestionTextTooLong:      http.StatusBadRequest,
	ErrCodeQuestionTextEmpty:        http.StatusBadRequest,
	ErrCodeQuestionAlreadyAnswered:  http.StatusConflict,
	ErrCodeQuestionNotAnswerable:    http.StatusUnprocessableEntity,
	ErrCodeQuestionResponseRequired: http.StatusBadRequest,
	ErrCodeQuestionResponseTooLong:  http.StatusBadRequest,
	ErrCodeQuestionCreationFailed:   http.StatusInternalServerError,
	ErrCodeQuestionUpdateFailed:     http.StatusInternalServerError,
	ErrCodeQuestionDeleteFailed:     http.StatusInternalServerError,
	ErrCodeQuestionResponseFailed:   http.StatusInternalServerError,
	ErrCodeQuestionMaxLimitExceeded: http.StatusTooManyRequests,
	ErrCodeQuestionEditTimeExpired:  http.StatusRequestTimeout,

	// 営業担当者機能
	ErrCodeSalesUserNotFound:           http.StatusNotFound,
	ErrCodeSalesUserNotAssigned:        http.StatusNotFound,
	ErrCodeSalesUserInvalidRole:        http.StatusForbidden,
	ErrCodeSalesUserAccessDenied:       http.StatusForbidden,
	ErrCodeSalesUserAssignmentFailed:   http.StatusInternalServerError,
	ErrCodeSalesUserMultipleAssignment: http.StatusConflict,
	ErrCodeSalesUserResponseOverdue:    http.StatusRequestTimeout,
	ErrCodeSalesUserInvalidAction:      http.StatusBadRequest,

	// 統計・分析
	ErrCodeStatsProposalCalculationFailed: http.StatusInternalServerError,
	ErrCodeStatsProposalInvalidPeriod:     http.StatusBadRequest,
	ErrCodeStatsProposalDataNotFound:      http.StatusNotFound,
	ErrCodeStatsProposalExportFailed:      http.StatusInternalServerError,
	ErrCodeStatsQuestionAnalysisFailed:    http.StatusInternalServerError,
	ErrCodeStatsResponseTimeCalculation:   http.StatusInternalServerError,
	ErrCodeStatsUserRankingFailed:         http.StatusInternalServerError,
	ErrCodeStatsInvalidMetric:             http.StatusBadRequest,

	// 通知・アラート
	ErrCodeNotificationProposalSendFailed:  http.StatusInternalServerError,
	ErrCodeNotificationQuestionSendFailed:  http.StatusInternalServerError,
	ErrCodeNotificationInvalidRecipient:    http.StatusBadRequest,
	ErrCodeNotificationTemplateFailed:      http.StatusInternalServerError,
	ErrCodeNotificationPreferenceNotFound:  http.StatusNotFound,
	ErrCodeNotificationPreferenceInvalid:   http.StatusBadRequest,
	ErrCodeNotificationSettingUpdateFailed: http.StatusInternalServerError,
	ErrCodeAlertProposalOverdue:            http.StatusOK, // アラート（情報）
	ErrCodeAlertQuestionUnanswered:         http.StatusOK, // アラート（情報）
	ErrCodeAlertSalesResponseDelay:         http.StatusOK, // アラート（情報）

	// データ連携
	ErrCodePocProjectSyncFailed:     http.StatusBadGateway,
	ErrCodePocProjectNotFound:       http.StatusNotFound,
	ErrCodePocProjectDataInvalid:    http.StatusBadRequest,
	ErrCodePocProjectAccessDenied:   http.StatusForbidden,
	ErrCodePocSkillDataSyncFailed:   http.StatusBadGateway,
	ErrCodePocConnectionFailed:      http.StatusBadGateway,
	ErrCodePocDataIntegrityError:    http.StatusInternalServerError,
	ErrCodePocSchemaVersionMismatch: http.StatusInternalServerError,

	// 権限管理
	ErrCodeProposalAccessDenied:            http.StatusForbidden,
	ErrCodeProposalViewPermissionDenied:    http.StatusForbidden,
	ErrCodeProposalEditPermissionDenied:    http.StatusForbidden,
	ErrCodeQuestionAccessDenied:            http.StatusForbidden,
	ErrCodeQuestionEditPermissionDenied:    http.StatusForbidden,
	ErrCodeQuestionRespondPermissionDenied: http.StatusForbidden,
	ErrCodeEngineerRoleRequired:            http.StatusForbidden,
	ErrCodeSalesRoleRequired:               http.StatusForbidden,
	ErrCodeAdminRoleRequired:               http.StatusForbidden,
	ErrCodeCrossUserAccessDenied:           http.StatusForbidden,

	// 一括操作
	ErrCodeBulkOperationNotSupported:     http.StatusMethodNotAllowed,
	ErrCodeBulkOperationLimitExceeded:    http.StatusTooManyRequests,
	ErrCodeBulkOperationPartialFailure:   http.StatusMultiStatus,
	ErrCodeBulkOperationInvalidSelection: http.StatusBadRequest,
	ErrCodeBulkOperationForbidden:        http.StatusForbidden,
	ErrCodeBulkQuestionAssignmentFailed:  http.StatusInternalServerError,
	ErrCodeBulkNotificationSendFailed:    http.StatusInternalServerError,
	ErrCodeBulkExportFailed:              http.StatusInternalServerError,
}

// IsProposalError 提案機能エラーかどうかを判定
func IsProposalError(code ErrorCode) bool {
	codeStr := string(code)
	return len(codeStr) >= 4 && codeStr[:4] == "P001" ||
		len(codeStr) >= 4 && codeStr[:4] == "P002" ||
		len(codeStr) >= 4 && codeStr[:4] == "P003" ||
		len(codeStr) >= 4 && codeStr[:4] == "P004" ||
		len(codeStr) >= 4 && codeStr[:4] == "P005" ||
		len(codeStr) >= 4 && codeStr[:4] == "P006" ||
		len(codeStr) >= 4 && codeStr[:4] == "P007" ||
		len(codeStr) >= 4 && codeStr[:4] == "P008" ||
		len(codeStr) >= 4 && codeStr[:4] == "P009"
}

// GetProposalErrorCategory 提案機能エラーのカテゴリを取得
func GetProposalErrorCategory(code ErrorCode) string {
	codeStr := string(code)
	if len(codeStr) >= 4 {
		switch codeStr[:4] {
		case "P001":
			return "提案基本操作"
		case "P002":
			return "提案ステータス管理"
		case "P003":
			return "質問機能"
		case "P004":
			return "営業担当者機能"
		case "P005":
			return "統計・分析"
		case "P006":
			return "通知・アラート"
		case "P007":
			return "データ連携"
		case "P008":
			return "権限管理"
		case "P009":
			return "一括操作"
		}
	}
	return "不明"
}

// GetProposalErrorType 提案機能エラーのタイプを取得
// V:バリデーション、B:ビジネス、A:認証・権限、S:システム、R:リソース、C:競合、D:データ
func GetProposalErrorType(code ErrorCode) string {
	codeStr := string(code)
	if len(codeStr) >= 5 {
		return string(codeStr[4]) // 5文字目がエラータイプ
	}
	return "U" // Unknown
}

// GetProposalHTTPStatusCode 提案機能エラーコードからHTTPステータスコードを取得
func GetProposalHTTPStatusCode(code ErrorCode) int {
	if status, ok := ProposalErrorCodeMapping[code]; ok {
		return status
	}
	// 提案機能エラーでない場合は共通エラーコードマッピングを使用
	return GetHTTPStatusCode(code)
}

// IsProposalValidationError 提案機能バリデーションエラーかどうかを判定
func IsProposalValidationError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "V"
}

// IsProposalBusinessError 提案機能ビジネスロジックエラーかどうかを判定
func IsProposalBusinessError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "B"
}

// IsProposalAuthError 提案機能認証・権限エラーかどうかを判定
func IsProposalAuthError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "A"
}

// IsProposalSystemError 提案機能システムエラーかどうかを判定
func IsProposalSystemError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "S"
}

// IsProposalResourceError 提案機能リソースエラーかどうかを判定
func IsProposalResourceError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "R"
}

// IsProposalConflictError 提案機能競合エラーかどうかを判定
func IsProposalConflictError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "C"
}

// IsProposalDataError 提案機能データエラーかどうかを判定
func IsProposalDataError(code ErrorCode) bool {
	return IsProposalError(code) && GetProposalErrorType(code) == "D"
}

// GetProposalErrorSeverity エラーの重要度を取得
func GetProposalErrorSeverity(code ErrorCode) string {
	if IsProposalSystemError(code) || IsProposalDataError(code) {
		return "高"
	} else if IsProposalBusinessError(code) || IsProposalConflictError(code) {
		return "中"
	} else if IsProposalValidationError(code) || IsProposalAuthError(code) {
		return "低"
	}
	return "不明"
}

// GetProposalErrorJapaneseMessage 提案機能エラーコードの日本語メッセージを取得
func GetProposalErrorJapaneseMessage(code ErrorCode) string {
	switch code {
	// 提案基本操作
	case ErrCodeProposalNotFound:
		return "指定された提案が見つかりません"
	case ErrCodeProposalAlreadyExists:
		return "提案が既に存在します"
	case ErrCodeProposalInvalidID:
		return "無効な提案IDです"
	case ErrCodeProposalInvalidProjectID:
		return "無効なプロジェクトIDです"
	case ErrCodeProposalInvalidUserID:
		return "無効なユーザーIDです"
	case ErrCodeProposalInvalidStatus:
		return "無効な提案ステータスです"
	case ErrCodeProposalInvalidPeriod:
		return "無効な期間指定です"
	case ErrCodeProposalDataCorruption:
		return "提案データが破損しています。管理者にお問い合わせください"
	case ErrCodeProposalCreationFailed:
		return "提案の作成に失敗しました"
	case ErrCodeProposalUpdateFailed:
		return "提案の更新に失敗しました"
	case ErrCodeProposalDeleteFailed:
		return "提案の削除に失敗しました"

	// 提案ステータス管理
	case ErrCodeProposalAlreadyResponded:
		return "この提案は既に回答済みです"
	case ErrCodeProposalNotRespondable:
		return "この提案は回答できません"
	case ErrCodeProposalExpired:
		return "提案の有効期限が切れています"
	case ErrCodeProposalInvalidTransition:
		return "無効なステータス遷移です"
	case ErrCodeProposalRespondDeadlinePassed:
		return "回答期限を過ぎています"
	case ErrCodeProposalStatusConflict:
		return "ステータスの競合が発生しました。画面を更新してから再度お試しください"
	case ErrCodeProposalVersionConflict:
		return "データが他のユーザーによって更新されています。画面を更新してから再度お試しください"
	case ErrCodeProposalStatusUpdateFailed:
		return "ステータス更新に失敗しました"
	case ErrCodeProposalResponseRequired:
		return "回答が必要です"
	case ErrCodeProposalInvalidResponseData:
		return "無効な回答データです"

	// 質問機能
	case ErrCodeQuestionNotFound:
		return "指定された質問が見つかりません"
	case ErrCodeQuestionAlreadyExists:
		return "質問が既に存在します"
	case ErrCodeQuestionInvalidID:
		return "無効な質問IDです"
	case ErrCodeQuestionInvalidText:
		return "無効な質問内容です"
	case ErrCodeQuestionTextTooLong:
		return "質問文が長すぎます（最大2000文字）"
	case ErrCodeQuestionTextEmpty:
		return "質問文を入力してください"
	case ErrCodeQuestionAlreadyAnswered:
		return "この質問は既に回答済みです"
	case ErrCodeQuestionNotAnswerable:
		return "この質問は回答できません"
	case ErrCodeQuestionResponseRequired:
		return "回答を入力してください"
	case ErrCodeQuestionResponseTooLong:
		return "回答文が長すぎます（最大2000文字）"
	case ErrCodeQuestionCreationFailed:
		return "質問の投稿に失敗しました"
	case ErrCodeQuestionUpdateFailed:
		return "質問の更新に失敗しました"
	case ErrCodeQuestionDeleteFailed:
		return "質問の削除に失敗しました"
	case ErrCodeQuestionResponseFailed:
		return "質問への回答に失敗しました"
	case ErrCodeQuestionMaxLimitExceeded:
		return "質問数の上限を超えています"
	case ErrCodeQuestionEditTimeExpired:
		return "質問の編集期限が過ぎています"

	// 営業担当者機能
	case ErrCodeSalesUserNotFound:
		return "営業担当者が見つかりません"
	case ErrCodeSalesUserNotAssigned:
		return "営業担当者が割り当てられていません"
	case ErrCodeSalesUserInvalidRole:
		return "営業担当者の権限がありません"
	case ErrCodeSalesUserAccessDenied:
		return "この営業担当者にはアクセス権限がありません"
	case ErrCodeSalesUserAssignmentFailed:
		return "営業担当者の割り当てに失敗しました"
	case ErrCodeSalesUserMultipleAssignment:
		return "複数の営業担当者が割り当てられています"
	case ErrCodeSalesUserResponseOverdue:
		return "営業担当者の回答が遅延しています"
	case ErrCodeSalesUserInvalidAction:
		return "無効な営業担当者アクションです"

	// 権限管理
	case ErrCodeProposalAccessDenied:
		return "提案へのアクセスが拒否されました"
	case ErrCodeProposalViewPermissionDenied:
		return "提案の閲覧権限がありません"
	case ErrCodeProposalEditPermissionDenied:
		return "提案の編集権限がありません"
	case ErrCodeQuestionAccessDenied:
		return "質問へのアクセスが拒否されました"
	case ErrCodeQuestionEditPermissionDenied:
		return "質問の編集権限がありません"
	case ErrCodeQuestionRespondPermissionDenied:
		return "質問への回答権限がありません"
	case ErrCodeEngineerRoleRequired:
		return "エンジニア権限が必要です"
	case ErrCodeSalesRoleRequired:
		return "営業権限が必要です"
	case ErrCodeAdminRoleRequired:
		return "管理者権限が必要です"
	case ErrCodeCrossUserAccessDenied:
		return "他ユーザーのデータにアクセスできません"

	default:
		return "不明なエラーが発生しました"
	}
}
