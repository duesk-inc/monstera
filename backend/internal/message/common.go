package message

import "fmt"

// 共通エラーメッセージ
const (
	// 認証・認可関連
	MsgUnauthorized       = "認証が必要です"
	MsgInvalidCredentials = "認証情報が正しくありません"
	MsgTokenExpired       = "認証トークンの有効期限が切れています"
	MsgInvalidToken       = "無効な認証トークンです"
	MsgForbidden          = "この操作を実行する権限がありません"
	MsgAccountDisabled    = "このアカウントは現在無効化されています"

	// バリデーション関連
	MsgInvalidRequest       = "無効なリクエストデータです"
	MsgInvalidInput         = "無効な入力です"
	MsgInvalidIDFormat      = "無効なIDフォーマットです"
	MsgValidationError      = "入力値に誤りがあります"
	MsgRequiredField        = "必須項目です"
	MsgInvalidEmailFormat   = "有効なメールアドレスを入力してください"
	MsgInvalidDateFormat    = "日付の形式が正しくありません"
	MsgInvalidUserID        = "無効なユーザーIDです"
	MsgInvalidRequestBody   = "リクエストボディが不正です"
	MsgInvalidRequestFormat = "無効なリクエスト形式: %s"
	MsgInvalidRoleFormat    = "ロールが不正な形式です"

	// リソース関連
	MsgNotFound         = "リソースが見つかりません"
	MsgAlreadyExists    = "既に存在します"
	MsgNoData           = "データがありません"
	MsgConflict         = "データの競合が発生しました"
	MsgDependencyExists = "依存関係があるため削除できません"

	// サーバーエラー
	MsgInternalServerError = "サーバー内部エラーが発生しました"
	MsgDatabaseError       = "データベースエラーが発生しました"
	MsgServiceUnavailable  = "サービスが一時的に利用できません"
	MsgTimeout             = "処理がタイムアウトしました"
	MsgTransactionError    = "トランザクション処理中にエラーが発生しました"

	// 成功メッセージ
	MsgSuccess       = "正常に処理されました"
	MsgCreated       = "正常に作成されました"
	MsgUpdated       = "正常に更新されました"
	MsgDeleted       = "正常に削除されました"
	MsgRegistered    = "正常に登録されました"
	MsgSaved         = "正常に保存されました"
	MsgApproved      = "正常に承認されました"
	MsgRejected      = "正常に却下されました"
	MsgSent          = "正常に送信されました"
	MsgCompleted     = "正常に完了しました"
	MsgLoggedOut     = "ログアウトしました"

	// 一般的な操作メッセージ
	MsgProcessing    = "処理中です"
	MsgLoading       = "読み込み中です"
	MsgSaving        = "保存中です"
	MsgDeleting      = "削除中です"
	MsgConfirmAction = "この操作を実行してもよろしいですか？"
	MsgNoPermission  = "権限がありません"
)

// フォーマット関数

// FormatNotFound リソースが見つからない場合のメッセージを生成
func FormatNotFound(resource string) string {
	return fmt.Sprintf("%sが見つかりません", resource)
}

// FormatCreated リソースが作成された場合のメッセージを生成
func FormatCreated(resource string) string {
	return fmt.Sprintf("%sが正常に作成されました", resource)
}

// FormatUpdated リソースが更新された場合のメッセージを生成
func FormatUpdated(resource string) string {
	return fmt.Sprintf("%sが正常に更新されました", resource)
}

// FormatDeleted リソースが削除された場合のメッセージを生成
func FormatDeleted(resource string) string {
	return fmt.Sprintf("%sが正常に削除されました", resource)
}

// FormatAlreadyExists リソースが既に存在する場合のメッセージを生成
func FormatAlreadyExists(resource string) string {
	return fmt.Sprintf("%sは既に存在します", resource)
}

// FormatInvalidField フィールドが無効な場合のメッセージを生成
func FormatInvalidField(field string) string {
	return fmt.Sprintf("%sが無効です", field)
}

// FormatRequiredField 必須フィールドが未入力の場合のメッセージを生成
func FormatRequiredField(field string) string {
	return fmt.Sprintf("%sは必須項目です", field)
}

// FormatMinLength 最小文字数エラーのメッセージを生成
func FormatMinLength(field string, min int) string {
	return fmt.Sprintf("%sは%d文字以上入力してください", field, min)
}

// FormatMaxLength 最大文字数エラーのメッセージを生成
func FormatMaxLength(field string, max int) string {
	return fmt.Sprintf("%sは%d文字以下で入力してください", field, max)
}

// FormatOutOfRange 範囲外エラーのメッセージを生成
func FormatOutOfRange(field string, min, max interface{}) string {
	return fmt.Sprintf("%sは%vから%vの範囲で入力してください", field, min, max)
}

// FormatDuplicateEntry 重複エラーのメッセージを生成
func FormatDuplicateEntry(field string) string {
	return fmt.Sprintf("この%sは既に使用されています", field)
}

// FormatInvalidFormat フォーマットエラーのメッセージを生成
func FormatInvalidFormat(field, expectedFormat string) string {
	return fmt.Sprintf("%sの形式が正しくありません。%s形式で入力してください", field, expectedFormat)
}

// FormatPermissionDenied 権限エラーのメッセージを生成
func FormatPermissionDenied(action string) string {
	return fmt.Sprintf("%sする権限がありません", action)
}

// FormatOperationFailed 操作失敗のメッセージを生成
func FormatOperationFailed(operation string) string {
	return fmt.Sprintf("%sに失敗しました", operation)
}

// FormatOperationSuccess 操作成功のメッセージを生成
func FormatOperationSuccess(operation string) string {
	return fmt.Sprintf("%sが完了しました", operation)
}

// FormatConfirmation 確認メッセージを生成
func FormatConfirmation(action string) string {
	return fmt.Sprintf("%sしてもよろしいですか？", action)
}

// FormatProcessing 処理中メッセージを生成
func FormatProcessing(action string) string {
	return fmt.Sprintf("%s中です...", action)
}

// FormatCount 件数メッセージを生成
func FormatCount(resource string, count int) string {
	return fmt.Sprintf("%d件の%sがあります", count, resource)
}

// FormatNoData データなしメッセージを生成
func FormatNoData(resource string) string {
	return fmt.Sprintf("%sがありません", resource)
}
