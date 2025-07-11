package message

// 通知関連のメッセージ定義

// エラーメッセージ
const (
	MsgNotificationListGetError       = "通知一覧の取得に失敗しました"
	MsgNotificationMarkReadError      = "通知の既読化に失敗しました"
	MsgNotificationMarkAllReadError   = "通知の一括既読化に失敗しました"
	MsgNotificationCreateError        = "通知の作成に失敗しました"
	MsgNotificationSettingsGetError   = "通知設定の取得に失敗しました"
	MsgNotificationSettingUpdateError = "通知設定の更新に失敗しました"
	MsgInvalidNotificationID          = "不正な通知ID形式: %s"
	MsgNoUserIDSpecified              = "ユーザーIDが指定されていません"
	MsgAdminRightsRequired            = "この操作には管理者権限が必要です"
)

// 成功メッセージ
const (
	MsgNotificationMarkedAsRead     = "通知を既読にしました"
	MsgAllNotificationsMarkedAsRead = "すべての通知を既読にしました"
)
