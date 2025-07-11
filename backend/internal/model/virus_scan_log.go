package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VirusScanLog ウイルススキャンログ
type VirusScanLog struct {
	ID            uuid.UUID      `json:"id" gorm:"type:char(36);primaryKey;default:(UUID())"`
	FileID        uuid.UUID      `json:"file_id" gorm:"type:char(36);not null;index" comment:"スキャン対象ファイルID"`
	FileName      string         `json:"file_name" gorm:"type:varchar(255);not null" comment:"ファイル名"`
	FileSize      int64          `json:"file_size" gorm:"not null" comment:"ファイルサイズ（バイト）"`
	FilePath      *string        `json:"file_path" gorm:"type:varchar(500)" comment:"ファイルパス"`
	ScanStatus    string         `json:"scan_status" gorm:"type:enum('clean','infected','error','quarantined');not null;index" comment:"スキャンステータス"`
	VirusName     *string        `json:"virus_name" gorm:"type:varchar(255);index" comment:"検出されたウイルス名"`
	ScanEngine    string         `json:"scan_engine" gorm:"type:varchar(50);not null" comment:"使用したスキャンエンジン"`
	EngineVersion *string        `json:"engine_version" gorm:"type:varchar(50)" comment:"エンジンバージョン"`
	ScanDuration  int64          `json:"scan_duration" gorm:"not null" comment:"スキャン時間（ミリ秒）"`
	ErrorMessage  *string        `json:"error_message" gorm:"type:text" comment:"エラーメッセージ"`
	QuarantinedAt *time.Time     `json:"quarantined_at" gorm:"index" comment:"隔離日時"`
	DeletedAt     gorm.DeletedAt `json:"deleted_at" gorm:"index" comment:"削除日時"`
	CreatedAt     time.Time      `json:"created_at" gorm:"default:CURRENT_TIMESTAMP;index" comment:"作成日時"`
	UpdatedAt     time.Time      `json:"updated_at" gorm:"default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" comment:"更新日時"`

	// リレーション用フィールド（必要に応じて）
	UserID       *uuid.UUID `json:"user_id" gorm:"type:char(36);index" comment:"アップロードユーザーID"`
	ResourceType *string    `json:"resource_type" gorm:"type:varchar(50);index" comment:"リソースタイプ（expense_receipt等）"`
	ResourceID   *uuid.UUID `json:"resource_id" gorm:"type:char(36);index" comment:"リソースID"`
}

// TableName テーブル名を指定
func (VirusScanLog) TableName() string {
	return "virus_scan_logs"
}

// BeforeCreate GORM作成前フック
func (v *VirusScanLog) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

// VirusScanStatistics ウイルススキャン統計
type VirusScanStatistics struct {
	Date             time.Time `json:"date"`
	TotalScans       int64     `json:"total_scans"`
	CleanFiles       int64     `json:"clean_files"`
	InfectedFiles    int64     `json:"infected_files"`
	ErrorScans       int64     `json:"error_scans"`
	QuarantinedFiles int64     `json:"quarantined_files"`
}

// VirusThreat ウイルス脅威情報
type VirusThreat struct {
	VirusName   string    `json:"virus_name"`
	ThreatLevel string    `json:"threat_level"` // low, medium, high, critical
	FirstSeen   time.Time `json:"first_seen"`
	LastSeen    time.Time `json:"last_seen"`
	TotalCount  int64     `json:"total_count"`
	Description string    `json:"description"`
}

// ScanStatusType スキャンステータスタイプ
type ScanStatusType string

const (
	ScanStatusClean       ScanStatusType = "clean"
	ScanStatusInfected    ScanStatusType = "infected"
	ScanStatusError       ScanStatusType = "error"
	ScanStatusQuarantined ScanStatusType = "quarantined"
)

// IsClean ファイルがクリーンかどうか
func (v *VirusScanLog) IsClean() bool {
	return v.ScanStatus == string(ScanStatusClean)
}

// IsInfected ファイルが感染しているかどうか
func (v *VirusScanLog) IsInfected() bool {
	return v.ScanStatus == string(ScanStatusInfected)
}

// IsQuarantined ファイルが隔離されているかどうか
func (v *VirusScanLog) IsQuarantined() bool {
	return v.ScanStatus == string(ScanStatusQuarantined)
}

// NeedsQuarantine 隔離が必要かどうか
func (v *VirusScanLog) NeedsQuarantine() bool {
	return v.IsInfected() && v.QuarantinedAt == nil
}
