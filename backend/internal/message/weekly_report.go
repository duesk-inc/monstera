package message

// 週報関連のメッセージ定義

// 成功メッセージ
const (
	// 週報操作
	MsgWeeklyReportCreated   = "週報が作成されました"
	MsgWeeklyReportUpdated   = "週報が更新されました"
	MsgWeeklyReportDeleted   = "週報が削除されました"
	MsgWeeklyReportSubmitted = "週報が提出されました"
	MsgWeeklyReportSaved     = "週報が保存されました"
	MsgWeeklyReportTempSaved = "週報が一時保存されました"
	MsgWeeklyReportApproved  = "週報が承認されました"
	MsgWeeklyReportRejected  = "週報が差し戻されました"
	MsgWeeklyReportExported  = "週報がエクスポートされました"

	// 日報操作
	MsgDailyRecordCreated = "日報が作成されました"
	MsgDailyRecordUpdated = "日報が更新されました"
	MsgDailyRecordDeleted = "日報が削除されました"
	MsgDailyRecordSaved   = "日報が保存されました"
	MsgDailyRecordCopied  = "日報がコピーされました"

	// 勤務時間関連
	MsgWorkHoursRecorded   = "勤務時間が記録されました"
	MsgWorkHoursUpdated    = "勤務時間が更新されました"
	MsgOvertimeRecorded    = "残業時間が記録されました"
	MsgHolidayWorkRecorded = "休日出勤が記録されました"
	MsgBreakTimeRecorded   = "休憩時間が記録されました"

	// デフォルト設定
	MsgDefaultSettingsApplied   = "デフォルト設定が適用されました"
	MsgDefaultSettingsUpdated   = "デフォルト設定が更新されました"
	MsgDefaultSettingsSaved     = "デフォルト設定が保存されました"
	MsgDefaultWorkSettingsSaved = "デフォルト勤務時間設定を保存しました"

	// コメント・フィードバック
	MsgCommentAdded     = "コメントが追加されました"
	MsgFeedbackProvided = "フィードバックが送信されました"
	MsgMoodRecorded     = "今週の気分が記録されました"
)

// エラーメッセージ
const (
	// 週報エラー
	MsgWeeklyReportNotFound     = "週報が見つかりません"
	MsgWeeklyReportDuplicate    = "指定週の週報は既に存在します"
	MsgWeeklyReportCreateFailed = "週報の作成に失敗しました"
	MsgWeeklyReportUpdateFailed = "週報の更新に失敗しました"
	MsgWeeklyReportDeleteFailed = "週報の削除に失敗しました"
	MsgWeeklyReportLoadFailed   = "週報の読み込みに失敗しました"
	MsgWeeklyReportExportFailed = "週報のエクスポートに失敗しました"

	// 日報エラー
	MsgDailyRecordNotFound     = "日報が見つかりません"
	MsgDailyRecordDuplicate    = "指定日の日報は既に存在します"
	MsgDailyRecordCreateFailed = "日報の作成に失敗しました"
	MsgDailyRecordUpdateFailed = "日報の更新に失敗しました"
	MsgDailyRecordIncomplete   = "日報が未完成です"

	// 勤務時間エラー
	MsgInvalidWorkHours       = "勤務時間が無効です"
	MsgWorkHoursExceeded      = "勤務時間が上限を超えています"
	MsgInvalidStartTime       = "開始時刻が無効です"
	MsgInvalidEndTime         = "終了時刻が無効です"
	MsgEndTimeBeforeStartTime = "終了時刻は開始時刻より後にしてください"
	MsgInvalidBreakTime       = "休憩時間が無効です"
	MsgBreakTimeExceeded      = "休憩時間が勤務時間を超えています"
	MsgOvertimeNotAllowed     = "残業時間の記録は許可されていません"
	MsgHolidayWorkNotAllowed  = "休日出勤の記録は許可されていません"

	// プロジェクト関連エラー
	MsgProjectNotFound      = "プロジェクトが見つかりません"
	MsgProjectNotAssigned   = "このプロジェクトには割り当てられていません"
	MsgInvalidProjectHours  = "プロジェクト時間が無効です"
	MsgProjectHoursExceeded = "プロジェクト時間の合計が勤務時間を超えています"
	MsgClientTimeRequired   = "クライアント先作業時間の入力が必要です"
	MsgCompanyTimeRequired  = "自社作業時間の入力が必要です"

	// 期間・日付エラー
	MsgInvalidWeek          = "無効な週が指定されています"
	MsgInvalidDate          = "無効な日付が指定されています"
	MsgFutureDateNotAllowed = "未来の日付は指定できません"
	MsgPastWeekLocked       = "過去の週報は編集できません"
	MsgDeadlineExceeded     = "提出期限を過ぎています"
	MsgWeekNotStarted       = "指定された週はまだ開始していません"

	// 承認・ステータスエラー
	MsgCannotEditSubmitted   = "提出済みの週報は編集できません"
	MsgCannotEditApproved    = "承認済みの週報は編集できません"
	MsgCannotDeleteSubmitted = "提出済みの週報は削除できません"
	MsgCannotApproveOwn      = "自分の週報は承認できません"
	MsgAlreadySubmitted      = "既に提出されています"
	MsgNotYetSubmitted       = "まだ提出されていません"
	MsgApprovalRequired      = "承認が必要です"

	// バリデーションエラー
	MsgWorkContentRequired  = "作業内容の入力は必須です"
	MsgWorkContentTooLong   = "作業内容が長すぎます"
	MsgRemarksToolong       = "備考が長すぎます"
	MsgInvalidMoodSelection = "無効な気分が選択されています"
	MsgCommentTooLong       = "コメントが長すぎます"
	MsgInvalidFormat        = "入力形式が正しくありません"

	// 権限エラー
	MsgCannotViewOthersReport = "他のユーザーの週報は閲覧できません"
	MsgCannotEditOthersReport = "他のユーザーの週報は編集できません"
	MsgNoApprovalPermission   = "週報を承認する権限がありません"

	// システムエラー
	MsgWeeklyReportSystemError = "週報システムでエラーが発生しました"
	MsgCalculationError        = "時間計算でエラーが発生しました"
	MsgDataInconsistency       = "データの不整合が検出されました"

	// リクエスト処理エラー
	MsgRequestBodyReadFailed    = "リクエストボディの読み取りに失敗しました"
	MsgReportAccessDenied       = "この週報にアクセスする権限がありません"
	MsgReportEditDenied         = "この週報を編集する権限がありません"
	MsgReportDeleteDenied       = "この週報を削除する権限がありません"
	MsgReportSubmitDenied       = "この週報を提出する権限がありません"
	MsgStartDateFormatInvalid   = "開始日のフォーマットが無効です"
	MsgEndDateFormatInvalid     = "終了日のフォーマットが無効です"
	MsgDateRangeRequired        = "開始日と終了日は必須です"
	MsgDateFormatInvalid        = "無効な日付フォーマットです: %s"
	MsgUpdatedReportGetFailed   = "更新後の週報取得に失敗しました"
	MsgWeeklyReportCopyFailed   = "週報のコピーに失敗しました"
	MsgWeeklyReportSaveFailed   = "週報の保存に失敗しました"
	MsgWeeklyReportSubmitFailed = "週報の提出に失敗しました"
	MsgWeeklyReportGetFailed    = "週報の取得に失敗しました"
	MsgDateRangeReportNotFound  = "指定された期間の週報が見つかりません"
	MsgReportNotFoundByID       = "指定されたIDの週報が見つかりません"

	// 詳細データ関連エラー
	MsgDailyRecordDeleteFailed         = "日次勤怠記録の削除に失敗しました"
	MsgExistingDailyRecordDeleteFailed = "既存の日次勤怠記録の削除に失敗しました"
	MsgDailyRecordGetFailed            = "日次勤怠記録の取得に失敗しました"
	MsgWorkHoursCalculationFailed      = "合計稼働時間の計算に失敗しました"
	MsgWorkHoursDeleteFailed           = "作業時間の削除に失敗しました"
	MsgWorkHoursGetFailed              = "作業時間の取得に失敗しました"
	MsgTotalWorkHoursUpdateFailed      = "週報の合計稼働時間の更新に失敗しました"

	// 検索・統計関連エラー
	MsgWeeklyReportListGetFailed       = "週報一覧の取得に失敗しました"
	MsgDateRangeReportGetFailed        = "期間内の週報取得に失敗しました"
	MsgStatusReportGetFailed           = "ステータス指定の週報取得に失敗しました"
	MsgUserReportStatsGetFailed        = "ユーザーの週報統計取得に失敗しました"
	MsgUserDateRangeReportSearchFailed = "ユーザーIDと日付範囲での週報の検索に失敗しました"

	// デフォルト設定関連エラー
	MsgDefaultWorkSettingsGetFailed  = "デフォルト勤務時間設定の取得に失敗しました"
	MsgDefaultWorkSettingsSaveFailed = "デフォルト勤務時間設定の保存に失敗しました"
	MsgWeekdayStartTimeRequired      = "weekday_start_timeは必須です"
	MsgWeekdayEndTimeRequired        = "weekday_end_timeは必須です"
	MsgWeekdayBreakTimeRequired      = "weekday_break_timeは必須です"
)

// 確認メッセージ
const (
	MsgConfirmWeeklySubmit = "この内容で週報を提出してもよろしいですか？"
	MsgConfirmWeeklyDelete = "週報を削除してもよろしいですか？"
	MsgConfirmDailyDelete  = "日報を削除してもよろしいですか？"
	MsgConfirmOverwrite    = "既存のデータを上書きしてもよろしいですか？"
	MsgConfirmApprove      = "この週報を承認してもよろしいですか？"
	MsgConfirmReject       = "この週報を差し戻してもよろしいですか？"
)

// 通知メッセージ
const (
	MsgWeeklyReportReminder = "週報の提出期限が近づいています"
	MsgWeeklyReportOverdue  = "週報の提出期限を過ぎています"
	MsgDailyRecordReminder  = "本日の日報をまだ入力していません"
	MsgApprovalPending      = "承認待ちの週報があります"
	MsgWeeklyReportFeedback = "週報にフィードバックがあります"
)

// 情報メッセージ
const (
	MsgNoReportsThisWeek   = "今週の週報はまだ作成されていません"
	MsgNoDailyRecordsToday = "本日の日報はまだ作成されていません"
	MsgDefaultHoursApplied = "デフォルトの勤務時間が適用されました"
	MsgHolidayDetected     = "祝日が検出されました"
	MsgWeekendDetected     = "週末の日付です"
)
