# Phase 1 Day 3: 拡張モデルの移行 - 実装詳細

## 実施日時
- 2025-08-10

## 移行対象
Phase 1 Day 3では、システムの拡張機能に関連するモデルのUUID型からstring型への移行を実施しました。

## 実装詳細

### 1. Sales関連モデル

#### sales_extension.go
- **変更内容**: 既に移行済み（確認のみ）
- **対象モデル**: Proposal, ContractExtension, InterviewSchedule, PocProject, SalesTeam
- **フィールド**: 全てのID, EngineerID, ClientID, ProjectID等が既にstring型

#### sales_activity.go
- **変更内容**: 既に移行済み（確認のみ）
- **対象モデル**: SalesActivity
- **フィールド**: ID, ClientID, ProjectID, TargetUserID, SalesRepIDが既にstring型

#### sales_email.go
- **変更内容**: 既に移行済み（確認のみ）
- **対象モデル**: EmailTemplate, EmailCampaign, EmailSentHistory
- **フィールド**: 全てのIDフィールドが既にstring型

#### client_sales_extension.go
- **変更内容**: 既に移行済み（確認のみ）
- **対象モデル**: ClientSalesExtension
- **フィールド**: PrimarySalesRepIDが既に*string型

#### role_sales_extension.go
- **変更内容**: 対象外（ロール定義のみ）

### 2. Engineer関連モデル

#### engineer_project_history.go
- **変更前**: ID uuid.UUID, ProjectID uuid.UUID
- **変更後**: ID string, ProjectID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更

#### engineer_proposal.go
- **変更前**: ID uuid.UUID, ProjectID uuid.UUID
- **変更後**: ID string, ProjectID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更

#### engineer_proposal_question.go
- **変更前**: ID uuid.UUID, ProposalID uuid.UUID
- **変更後**: ID string, ProposalID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更
- **GORMタグ**: varchar(36) → varchar(255)に統一

#### engineer_skill.go
- **変更前**: 
  - EngineerSkillCategory: ID uuid.UUID, ParentID *uuid.UUID
  - EngineerSkill: ID uuid.UUID, SkillCategoryID uuid.UUID
- **変更後**: 
  - EngineerSkillCategory: ID string, ParentID *string
  - EngineerSkill: ID string, SkillCategoryID string
- **BeforeCreate**: 両モデルともuuid.Nil判定からempty string判定に変更
- **定数**: スキルカテゴリIDをUUID型からstring型に変更

#### engineer_status_history.go
- **変更前**: ID uuid.UUID
- **変更後**: ID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更

### 3. Profile関連モデル

#### profile.go（複数モデルを含む）
- **変更対象モデル**: 
  - Profile: ID uuid.UUID → string
  - ProfileHistory: ID uuid.UUID → string, ProfileID uuid.UUID → string
  - WorkHistoryHistory: ID, HistoryID, ProfileHistoryID 全て uuid.UUID → string
  - Skill: ID uuid.UUID → string
  - LanguageSkill: ID uuid.UUID → string, ProfileID uuid.UUID → string
  - FrameworkSkill: ID uuid.UUID → string, ProfileID uuid.UUID → string
  - BusinessExperience: ID uuid.UUID → string, ProfileID uuid.UUID → string
  - ProfileSkill: ProfileID uuid.UUID → string, SkillID uuid.UUID → string
  - ProfileCertification: ID uuid.UUID → string, ProfileID uuid.UUID → string, CertificationID *uuid.UUID → *string
- **BeforeCreate**: 全てuuid.Nil判定からempty string判定に変更

### 4. Archive関連モデル

#### archive.go
- **変更対象モデル**:
  - WeeklyReportArchive: ID, OriginalID, DepartmentID
  - DailyRecordArchive: ID, OriginalID, WeeklyReportArchiveID, OriginalWeeklyReportID
  - WorkHourArchive: ID, OriginalID, WeeklyReportArchiveID, OriginalWeeklyReportID
  - ArchiveStatistics: ID, ExecutedBy
  - ArchiveFilter: DepartmentID
- **BeforeCreate**: 全てuuid.Nil判定からempty string判定に変更

### 5. Audit関連モデル

#### audit_log.go
- **変更前**: ID uuid.UUID
- **変更後**: ID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更
- **GORMタグ**: default:(UUID())を削除

### 6. その他のモデル

#### skill_sheet.go
- **変更前**: ID uuid.UUID
- **変更後**: ID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更

#### user_it_experience.go
- **変更内容**: 既に移行済み（ViewモデルでBeforeCreateなし）

#### user_skill_summary.go
- **変更内容**: 既に移行済み（ViewモデルでBeforeCreateなし）

#### project.go
- **変更内容**: 既に移行済み（確認のみ）
- **対象モデル**: Project, Client, ProjectAssignment
- **状態**: 全てのIDフィールドが既にstring型

#### alert.go
- **変更対象モデル**:
  - AlertSettings: ID uuid.UUID → string
  - AlertHistory: ID, WeeklyReportID, ResolvedBy
- **BeforeCreate**: 両モデルともuuid.Nil判定からempty string判定に変更

#### freee_settings.go
- **変更前**: ID uuid.UUID
- **変更後**: ID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更

#### substitute_leave_grant.go
- **変更内容**: 既に移行済み（確認のみ）

#### export_job.go
- **変更前**: ID uuid.UUID
- **変更後**: ID string
- **BeforeCreate**: uuid.Nil判定からempty string判定に変更

#### session.go
- **変更内容**: 既に移行済み（確認のみ）

## 実装時の注意点

1. **既存データへの影響**: 全てのモデルでvarchar(255)を使用しているため、既存のUUID形式のデータも格納可能
2. **BeforeCreate共通変更**: uuid.Nil判定をempty string("")判定に変更、uuid.New()をuuid.New().String()に変更
3. **ポインタ型**: *uuid.UUIDは*stringに変更
4. **定数値**: UUIDの定数値（engineer_skill.goのスキルカテゴリID）は文字列リテラルに変更

## 次のステップ

Phase 1 Day 3の拡張モデル移行が完了しました。リファクタリング計画に従い、次のフェーズへ進みます。