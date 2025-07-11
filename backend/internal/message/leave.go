package message

// 休暇関連のメッセージ定義

// 成功メッセージ
const (
	// 休暇申請関連
	MsgLeaveRequestCreated   = "休暇申請が作成されました"
	MsgLeaveRequestUpdated   = "休暇申請が更新されました"
	MsgLeaveRequestDeleted   = "休暇申請が削除されました"
	MsgLeaveRequestSubmitted = "休暇申請が提出されました"
	MsgLeaveRequestApproved  = "休暇申請が承認されました"
	MsgLeaveRequestRejected  = "休暇申請が却下されました"
	MsgLeaveRequestCancelled = "休暇申請がキャンセルされました"
	MsgLeaveRequestWithdrawn = "休暇申請が取り下げられました"

	// 休暇残日数関連
	MsgLeaveBalanceRetrieved = "休暇残日数を取得しました"
	MsgLeaveBalanceUpdated   = "休暇残日数が更新されました"
	MsgLeaveBalanceGranted   = "休暇日数が付与されました"
	MsgLeaveBalanceConsumed  = "休暇日数が消費されました"
	MsgLeaveBalanceRestored  = "休暇日数が復元されました"

	// 休暇種別関連
	MsgLeaveTypesRetrieved = "休暇種別一覧を取得しました"
	MsgLeaveTypeCreated    = "休暇種別が作成されました"
	MsgLeaveTypeUpdated    = "休暇種別が更新されました"
	MsgLeaveTypeDeleted    = "休暇種別が削除されました"

	// 振替特別休暇関連
	MsgSubstituteLeaveGranted      = "振替特別休暇が付与されました"
	MsgSubstituteLeaveUsed         = "振替特別休暇を使用しました"
	MsgSubstituteLeaveExpired      = "振替特別休暇の有効期限が切れました"
	MsgSubstituteLeaveGrantDeleted = "振替特別休暇付与履歴が削除されました"

	// 祝日関連
	MsgHolidaysRetrieved = "祝日一覧を取得しました"
	MsgHolidayCreated    = "祝日が登録されました"
	MsgHolidayUpdated    = "祝日情報が更新されました"
	MsgHolidayDeleted    = "祝日が削除されました"
)

// エラーメッセージ
const (
	// 休暇申請エラー
	MsgLeaveRequestNotFound       = "休暇申請が見つかりません"
	MsgLeaveRequestDuplicate      = "指定期間に既に休暇申請があります"
	MsgLeaveRequestCreateFailed   = "休暇申請の作成に失敗しました"
	MsgLeaveRequestUpdateFailed   = "休暇申請の更新に失敗しました"
	MsgLeaveRequestDeleteFailed   = "休暇申請の削除に失敗しました"
	MsgLeaveRequestLoadFailed     = "休暇申請の取得に失敗しました"
	MsgLeaveRequestListLoadFailed = "休暇申請一覧の取得に失敗しました"

	// 休暇日数エラー
	MsgInsufficientLeaveBalance   = "休暇残日数が不足しています"
	MsgLeaveBalanceNotFound       = "休暇残日数情報が見つかりません"
	MsgLeaveBalanceLoadFailed     = "休暇残日数の取得に失敗しました"
	MsgLeaveBalanceUpdateFailed   = "休暇残日数の更新に失敗しました"
	MsgLeaveBalanceExceeded       = "申請日数が残日数を超えています"
	MsgLeaveBalanceListLoadFailed = "休暇残日数一覧の取得に失敗しました"
	MsgLeaveBalanceExceededFormat = "残り日数（%.1f日）を超えています"

	// 日付・期間エラー
	MsgInvalidLeavePeriod         = "休暇期間が無効です"
	MsgStartDateAfterEndDate      = "開始日は終了日より前の日付にしてください"
	MsgPastDateNotAllowed         = "過去の日付は指定できません"
	MsgTooFarInFuture             = "指定された日付が遠すぎます"
	MsgWeekendNotAllowed          = "土日は休暇申請できません"
	MsgHolidayNotAllowed          = "祝日は休暇申請できません"
	MsgOverlappingPeriod          = "期間が重複する休暇申請があります"
	MsgHolidayListLoadFailed      = "休日情報の取得に失敗しました"
	MsgInvalidYear                = "無効な年: %s"
	MsgDuplicateLeaveDates        = "重複した日付が含まれています: %s"
	MsgLeaveDatesAlreadyRequested = "以下の日付は既に休暇申請されています: %s"
	MsgNoValidLeaveDates          = "有効な休暇申請日が含まれていません"
	MsgInvalidGrantDateFormat     = "無効な付与日フォーマット: %s"
	MsgInvalidWorkDateFormat      = "無効な出勤日フォーマット: %s"
	MsgInvalidExpireDateFormat    = "無効な有効期限フォーマット: %s"

	// 休暇種別エラー
	MsgLeaveTypeNotFound          = "休暇種別が見つかりません"
	MsgLeaveTypeInactive          = "この休暇種別は現在利用できません"
	MsgLeaveTypeNotApplicable     = "この休暇種別は適用できません"
	MsgHourlyLeaveNotAllowed      = "この休暇種別は時間単位での取得ができません"
	MsgReasonRequired             = "この休暇種別では理由の入力が必須です"
	MsgLeaveTypeListLoadFailed    = "休暇種別一覧の取得に失敗しました"
	MsgSpecifiedLeaveTypeNotFound = "指定された休暇種別が見つかりません"

	// 申請状態エラー
	MsgCannotEditApprovedRequest   = "承認済みの申請は編集できません"
	MsgCannotDeleteApprovedRequest = "承認済みの申請は削除できません"
	MsgCannotApproveOwnRequest     = "自分の申請は承認できません"
	MsgAlreadyProcessed            = "この申請は既に処理されています"
	MsgInvalidRequestStatus        = "申請のステータスが無効です"

	// 権限エラー
	MsgNoApprovalAuthority     = "承認権限がありません"
	MsgCannotEditOthersRequest = "他のユーザーの申請は編集できません"
	MsgCannotViewOthersRequest = "他のユーザーの申請は閲覧できません"

	// 振替特別休暇エラー
	MsgSubstituteLeaveNotFound               = "振替特別休暇が見つかりません"
	MsgSubstituteLeaveNotAvailable           = "振替特別休暇は利用できません"
	MsgInvalidSubstituteLeave                = "振替特別休暇の情報が無効です"
	MsgSubstituteLeaveAlreadyUsed            = "この振替特別休暇は既に使用されています"
	MsgSubstituteLeaveGrantListLoadFailed    = "振替特別休暇付与履歴一覧の取得に失敗しました"
	MsgSubstituteLeaveGrantSummaryLoadFailed = "振替特別休暇サマリーの取得に失敗しました"
	MsgSubstituteLeaveGrantCreateFailed      = "振替特別休暇付与履歴の作成に失敗しました"
	MsgSubstituteLeaveGrantUpdateFailed      = "振替特別休暇付与履歴の更新に失敗しました"
	MsgSubstituteLeaveGrantDeleteFailed      = "振替特別休暇付与履歴の削除に失敗しました"
	MsgSubstituteLeaveGrantNotFound          = "指定された振替特別休暇付与履歴が見つかりません"
	MsgSubstituteLeaveInsufficientBalance    = "振替特別休暇の残日数が不足しています"
	MsgSubstituteLeaveTypeNotFound           = "振替特別休暇の種別が見つかりません"
	MsgSubstituteLeaveCannotDelete           = "既に使用されている振替特別休暇は削除できません"
	MsgGrantedDaysLessThanUsed               = "付与日数を使用済日数よりも少なく設定することはできません"

	// バリデーションエラー
	MsgInvalidLeaveHours      = "休暇時間が無効です"
	MsgInvalidLeaveReason     = "休暇理由が無効です"
	MsgLeaveReasonTooLong     = "休暇理由が長すぎます"
	MsgInvalidApprovalComment = "承認コメントが無効です"

	// 業務関連エラー
	MsgBusinessDayRequired    = "営業日を指定してください"
	MsgMinimumLeaveHours      = "最低取得時間を満たしていません"
	MsgMaximumConsecutiveDays = "連続取得可能日数を超えています"
	MsgAdvanceNoticeRequired  = "事前申請期限を過ぎています"

	// システムエラー
	MsgLeaveCalculationError = "休暇日数の計算でエラーが発生しました"
	MsgLeaveSystemError      = "休暇システムでエラーが発生しました"
)

// 確認メッセージ
const (
	MsgConfirmLeaveSubmit  = "この内容で休暇申請を提出してもよろしいですか？"
	MsgConfirmLeaveCancel  = "休暇申請をキャンセルしてもよろしいですか？"
	MsgConfirmLeaveDelete  = "休暇申請を削除してもよろしいですか？"
	MsgConfirmLeaveApprove = "この休暇申請を承認してもよろしいですか？"
	MsgConfirmLeaveReject  = "この休暇申請を却下してもよろしいですか？"
)

// 通知メッセージ
const (
	MsgLeaveRequestPending  = "休暇申請が承認待ちです"
	MsgLeaveRequestReminder = "休暇申請の処理をお願いします"
	MsgLeaveBalanceLow      = "休暇残日数が少なくなっています"
	MsgLeaveExpiringSoon    = "有効期限が近い休暇があります"
)
