package constants

// Expense error codes - 経費申請関連エラーコード

// 経費申請基本操作 (E001)
const (
	// バリデーションエラー
	ErrExpenseTitleRequired      = "E001V001" // 件名は必須です
	ErrExpenseAmountInvalid      = "E001V002" // 金額は1円以上1000万円以下で入力してください
	ErrExpenseDateRequired       = "E001V003" // 使用日は必須です
	ErrExpenseDescriptionInvalid = "E001V004" // 使用理由は10文字以上1000文字以内で入力してください
	ErrExpenseReceiptRequired    = "E001V005" // 領収書URLは必須です

	// ビジネスロジックエラー
	ErrExpenseAlreadySubmitted = "E001B001" // 既に提出済みの申請は編集できません
	ErrExpenseAlreadyApproved  = "E001B002" // 承認済みの申請は取り消しできません
	ErrExpenseExpired          = "E001B003" // 申請期限を過ぎた経費は申請できません

	// NotFoundエラー
	ErrExpenseNotFound = "E001N001" // 指定された経費申請が見つかりません

	// システムエラー
	ErrExpenseSaveFailed = "E001S001" // 経費申請の保存に失敗しました

	// 承認者設定エラー
	ErrExpenseApproverNotConfigured = "E001C001" // 承認者が設定されていません

	// ステータスエラー
	ErrExpenseInvalidStatus = "E001S002" // 無効なステータスです
)

// 承認フロー管理 (E002)
const (
	// バリデーションエラー
	ErrApprovalCommentTooLong  = "E002V001" // 承認コメントは500文字以内で入力してください
	ErrRejectionReasonRequired = "E002V002" // 却下理由は必須です

	// ビジネスロジックエラー
	ErrAlreadyApproved     = "E002B001" // この申請は既に承認済みです
	ErrAlreadyRejected     = "E002B002" // この申請は既に却下済みです
	ErrNoApprovalAuthority = "E002B003" // 承認権限がありません

	// 権限エラー
	ErrApprovalPermissionDenied = "E002P001" // 他のユーザーの申請を承認する権限がありません

	// NotFoundエラー
	ErrApprovalTargetNotFound = "E002N001" // 承認対象の申請が見つかりません

	// システムエラー
	ErrApprovalProcessFailed = "E002S001" // 承認処理に失敗しました
)

// 上限管理 (E003)
const (
	// バリデーションエラー
	ErrLimitAmountInvalid         = "E003V001" // 上限金額は1円以上1億円以下で入力してください
	ErrLimitEffectiveDateRequired = "E003V002" // 有効開始日は必須です
	ErrLimitScopeTargetRequired   = "E003V003" // 適用範囲に応じた対象IDが必要です

	// ビジネスロジックエラー
	ErrMonthlyLimitExceeded = "E003B001" // 月次上限額を超過しています
	ErrYearlyLimitExceeded  = "E003B002" // 年次上限額を超過しています
	ErrLimitAlreadyExists   = "E003B003" // 既に有効な上限設定が存在します

	// 権限エラー
	ErrLimitChangePermissionDenied = "E003P001" // 上限設定の変更権限がありません

	// NotFoundエラー
	ErrLimitNotFound = "E003N001" // 指定された上限設定が見つかりません

	// システムエラー
	ErrLimitSaveFailed = "E003S001" // 上限設定の保存に失敗しました
)

// カテゴリ管理 (E004)
const (
	// バリデーションエラー
	ErrCategoryCodeInvalid  = "E004V001" // カテゴリコードは英数字とアンダースコアのみ使用できます
	ErrCategoryNameRequired = "E004V002" // カテゴリ名は必須です

	// ビジネスロジックエラー
	ErrDefaultCategoryDelete = "E004B001" // デフォルトカテゴリは削除できません
	ErrCategoryCodeDuplicate = "E004B002" // このカテゴリコードは既に使用されています
	ErrCategoryInUse         = "E004B003" // 使用中のカテゴリは削除できません

	// 権限エラー
	ErrCategoryPermissionDenied = "E004P001" // カテゴリ管理の権限がありません

	// NotFoundエラー
	ErrCategoryNotFound = "E004N001" // 指定されたカテゴリが見つかりません

	// システムエラー
	ErrCategorySaveFailed = "E004S001" // カテゴリの保存に失敗しました
)

// 集計・レポート (E005)
const (
	// バリデーションエラー
	ErrSummaryYearInvalid  = "E005V001" // 年は有効な値で入力してください
	ErrSummaryMonthInvalid = "E005V002" // 月は1〜12の範囲で入力してください
	ErrFiscalYearInvalid   = "E005V003" // 会計年度は有効な値で入力してください

	// ビジネスロジックエラー
	ErrSummaryDataNotFound = "E005B001" // 指定された期間のデータが存在しません

	// 権限エラー
	ErrSummaryPermissionDenied = "E005P001" // 他のユーザーの集計データを閲覧する権限がありません

	// システムエラー
	ErrSummaryProcessFailed = "E005S001" // 集計データの取得に失敗しました
)

// エラーメッセージマップ
var ErrorMessages = map[string]string{
	// 経費申請基本操作
	ErrExpenseTitleRequired:         "件名は必須です",
	ErrExpenseAmountInvalid:         "金額は1円以上1000万円以下で入力してください",
	ErrExpenseDateRequired:          "使用日は必須です",
	ErrExpenseDescriptionInvalid:    "使用理由は10文字以上1000文字以内で入力してください",
	ErrExpenseReceiptRequired:       "領収書URLは必須です",
	ErrExpenseAlreadySubmitted:      "既に提出済みの申請は編集できません",
	ErrExpenseAlreadyApproved:       "承認済みの申請は取り消しできません",
	ErrExpenseExpired:               "申請期限を過ぎた経費は申請できません",
	ErrExpenseNotFound:              "指定された経費申請が見つかりません",
	ErrExpenseSaveFailed:            "経費申請の保存に失敗しました",
	ErrExpenseApproverNotConfigured: "承認者が設定されていません。システム管理者に承認者の設定を依頼してください",
	ErrExpenseInvalidStatus:         "この経費申請は現在のステータスでは実行できません",

	// 承認フロー管理
	ErrApprovalCommentTooLong:   "承認コメントは500文字以内で入力してください",
	ErrRejectionReasonRequired:  "却下理由は必須です",
	ErrAlreadyApproved:          "この申請は既に承認済みです",
	ErrAlreadyRejected:          "この申請は既に却下済みです",
	ErrNoApprovalAuthority:      "承認権限がありません",
	ErrApprovalPermissionDenied: "他のユーザーの申請を承認する権限がありません",
	ErrApprovalTargetNotFound:   "承認対象の申請が見つかりません",
	ErrApprovalProcessFailed:    "承認処理に失敗しました",

	// 上限管理
	ErrLimitAmountInvalid:          "上限金額は1円以上1億円以下で入力してください",
	ErrLimitEffectiveDateRequired:  "有効開始日は必須です",
	ErrLimitScopeTargetRequired:    "適用範囲に応じた対象IDが必要です",
	ErrMonthlyLimitExceeded:        "月次上限額を超過しています",
	ErrYearlyLimitExceeded:         "年次上限額を超過しています",
	ErrLimitAlreadyExists:          "既に有効な上限設定が存在します",
	ErrLimitChangePermissionDenied: "上限設定の変更権限がありません",
	ErrLimitNotFound:               "指定された上限設定が見つかりません",
	ErrLimitSaveFailed:             "上限設定の保存に失敗しました",

	// カテゴリ管理
	ErrCategoryCodeInvalid:      "カテゴリコードは英数字とアンダースコアのみ使用できます",
	ErrCategoryNameRequired:     "カテゴリ名は必須です",
	ErrDefaultCategoryDelete:    "デフォルトカテゴリは削除できません",
	ErrCategoryCodeDuplicate:    "このカテゴリコードは既に使用されています",
	ErrCategoryInUse:            "使用中のカテゴリは削除できません",
	ErrCategoryPermissionDenied: "カテゴリ管理の権限がありません",
	ErrCategoryNotFound:         "指定されたカテゴリが見つかりません",
	ErrCategorySaveFailed:       "カテゴリの保存に失敗しました",

	// 集計・レポート
	ErrSummaryYearInvalid:      "年は有効な値で入力してください",
	ErrSummaryMonthInvalid:     "月は1〜12の範囲で入力してください",
	ErrFiscalYearInvalid:       "会計年度は有効な値で入力してください",
	ErrSummaryDataNotFound:     "指定された期間のデータが存在しません",
	ErrSummaryPermissionDenied: "他のユーザーの集計データを閲覧する権限がありません",
	ErrSummaryProcessFailed:    "集計データの取得に失敗しました",
}

// GetErrorMessage エラーコードからメッセージを取得
func GetErrorMessage(code string) string {
	if msg, ok := ErrorMessages[code]; ok {
		return msg
	}
	return "不明なエラーが発生しました"
}
