package model

// FreeSyncStatus フリー同期ステータス
type FreeSyncStatus string

const (
	// FreeSyncStatusNotSynced 未同期
	FreeSyncStatusNotSynced FreeSyncStatus = "not_synced"
	// FreeSyncStatusSynced 同期済み
	FreeSyncStatusSynced FreeSyncStatus = "synced"
	// FreeSyncStatusFailed 同期失敗
	FreeSyncStatusFailed FreeSyncStatus = "failed"
	// FreeSyncStatusPending 同期中
	FreeSyncStatusPending FreeSyncStatus = "pending"
)
