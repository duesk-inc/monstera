# UUID to String型移行 実装詳細 - Phase 1 Day 2

作成日: 2025-08-10 15:25:00
実施者: Claude AI

## 概要

リファクタリング計画（`refactor-plan_20250810_122032.md`）に基づき、Phase 1 Day 2として業務モデルのUUID型からstring型への移行を実施しました。

## 実施内容

### Phase 1 Day 2: 業務モデルの移行

#### 1. 移行対象モデル

以下の業務モデルでID関連フィールドをuuid.UUID型からstring型に移行：

##### Expense関連モデル（9ファイル）
1. **Expense** (`expense.go`)
   - `ID`: uuid.UUID → string
   - `CategoryID`: uuid.UUID → string
   - `ApproverID`: *uuid.UUID → *string
   - 関連構造体: MonthlyCloseStatus, MonthlyCloseSummary, UserExpenseSummary, CategoryExpenseSummary

2. **ExpenseApproval** (`expense_approval.go`)
   - `ID`: uuid.UUID → string
   - `ExpenseID`: uuid.UUID → string
   - `ApproverID`: uuid.UUID → string

3. **ExpenseApproverSetting** (`expense_approver_setting.go`)
   - `ID`: uuid.UUID → string
   - `ApproverID`: uuid.UUID → string
   - `CreatedBy`: uuid.UUID → string
   - 関連構造体: ExpenseApproverSettingHistory

4. **ExpenseDeadlineSetting** (`expense_deadline_setting.go`)
   - `ID`: uuid.UUID → string
   - `ScopeID`: *uuid.UUID → *string
   - `CreatedBy`: uuid.UUID → string

5. **ExpenseReceipt** (`expense_receipt.go`)
   - `ID`: uuid.UUID → string
   - `ExpenseID`: uuid.UUID → string
   - 関連構造体: ExpenseReceiptUpdateOrderInput

6. **ExpenseCategoryMaster** (`expense_category.go`)
   - `ID`: uuid.UUID → string

7. **ExpenseDraft** (`expense_draft.go`)
   - `ID`: uuid.UUID → string
   - 関連構造体: DraftData.CategoryID: *uuid.UUID → *string

8. **ExpenseLimit** (`expense_limit.go`)
   - `ID`: uuid.UUID → string
   - `DepartmentID`: *uuid.UUID → *string
   - 関連関数の引数も更新

9. **ExpenseSummary** (`expense_summary.go`)
   - `ID`: uuid.UUID → string

##### WeeklyReport/DailyRecord関連モデル（3ファイル）
1. **WeeklyReport** (`weekly_report.go`)
   - `ID`: uuid.UUID → string
   - `CommentedBy`: *uuid.UUID → *string

2. **DailyRecord** (`daily_record.go`)
   - `ID`: uuid.UUID → string
   - `WeeklyReportID`: uuid.UUID → string

3. **WeeklyReportRefactored** (`weekly_report_refactored.go`)
   - `ID`: uuid.UUID → string
   - `CommentedBy`: *uuid.UUID → *string
   - `DepartmentID`: *uuid.UUID → *string
   - `ManagerID`: *uuid.UUID → *string
   - 関連構造体: WeeklyReportSummary
   - メソッドの引数も更新

##### Leave関連モデル（7ファイル）
1. **LeaveRequest** (`leave_request.go`)
   - `ID`: uuid.UUID → string
   - `LeaveTypeID`: uuid.UUID → string
   - `ApproverID`: *uuid.UUID → *string
   - BeforeCreateメソッドを追加

2. **LeaveRequestDetail** (`leave_request_detail.go`)
   - `ID`: uuid.UUID → string
   - `LeaveRequestID`: uuid.UUID → string
   - BeforeCreateメソッドを追加

3. **LeaveType** (`leave_type.go`)
   - `ID`: uuid.UUID → string
   - BeforeCreateメソッドを追加

4. **LeavePeriodUsage** (`leave_period_usage.go`)
   - `ID`: uuid.UUID → string
   - `RecommendedLeavePeriodID`: uuid.UUID → string
   - `LeaveRequestID`: uuid.UUID → string

5. **RecommendedLeavePeriod** (`recommended_leave_period.go`)
   - `ID`: uuid.UUID → string
   - `CreatedBy`: uuid.UUID → string
   - `UpdatedBy`: *uuid.UUID → *string
   - `TargetLeaveTypes`: UUIDSlice → StringSlice（新規型定義）

6. **SubstituteLeaveGrant** (`substitute_leave_grant.go`)
   - `ID`: uuid.UUID → string
   - BeforeCreateメソッドを追加

7. **UserLeaveBalance** (`user_leave_balance.go`)
   - `ID`: uuid.UUID → string
   - `LeaveTypeID`: uuid.UUID → string
   - BeforeCreateメソッドを追加

##### Attendance/WorkRecord関連モデル（2ファイル）
1. **Attendance** (`attendance.go`)
   - `ID`: uuid.UUID → string

2. **WorkRecord** (`work_record.go`)
   - `ID`: uuid.UUID → string
   - `ProjectID`: uuid.UUID → string
   - `ApprovedBy`: *uuid.UUID → *string
   - Approve/Rejectメソッドの引数も更新

##### Notification関連モデル（1ファイル、6構造体）
1. **notification.go**
   - **NotificationMetadata**: UUID型フィールドを全てstring型に変更
   - **Notification**: ID, RecipientID, ReferenceIDを変更
   - **UserNotification**: ID, NotificationIDを変更、BeforeCreateメソッドを追加
   - **NotificationSetting**: IDを変更、BeforeCreateメソッドを追加
   - **NotificationHistory**: ID, OriginalID, RecipientIDを変更
   - **NotificationTemplate**: IDを変更

#### 2. BeforeCreateメソッドの更新パターン

```go
// Before
func (m *Model) BeforeCreate(tx *gorm.DB) error {
    if m.ID == uuid.Nil {
        m.ID = uuid.New()
    }
    return nil
}

// After
func (m *Model) BeforeCreate(tx *gorm.DB) error {
    if m.ID == "" {
        m.ID = uuid.New().String()
    }
    return nil
}
```

#### 3. 新規型定義

RecommendedLeavePeriodで使用するため、UUIDSliceからStringSliceへの型変換を実施：

```go
// StringSlice is a slice of strings that can be stored as JSON
type StringSlice []string

func (ss StringSlice) Value() (driver.Value, error) {
    return json.Marshal(ss)
}

func (ss *StringSlice) Scan(value interface{}) error {
    // 実装詳細...
}
```

## 技術的詳細

### 1. 型変換パターン

- `uuid.UUID` → `string`
- `*uuid.UUID` → `*string`
- `[]uuid.UUID` → `[]string`（カスタム型として実装）

### 2. GORMタグの調整

- `gorm:"type:varchar(36)"` → `gorm:"type:varchar(255)"`
- `gorm:"type:char(36)"` → `gorm:"type:varchar(255)"`
- `gorm:"type:uuid"` → `gorm:"type:varchar(255)"`

### 3. メソッドシグネチャの変更

関数やメソッドの引数でUUID型を使用している箇所も同時に更新：
- `func (w *WorkRecord) Approve(approverID uuid.UUID)` → `func (w *WorkRecord) Approve(approverID string)`
- `func (w *WeeklyReportRefactored) AddComment(commentedBy uuid.UUID, comment string)` → `func (w *WeeklyReportRefactored) AddComment(commentedBy string, comment string)`

## 確認事項

### 1. コンパイル確認

各モデルファイルの更新後、Go言語のコンパイルエラーがないことを確認。

### 2. BeforeCreateメソッドの追加

既存モデルでBeforeCreateメソッドが未定義だった以下のモデルに新規追加：
- LeaveRequest
- LeaveRequestDetail
- LeaveType
- SubstituteLeaveGrant
- UserLeaveBalance
- UserNotification
- NotificationSetting

### 3. 影響範囲

- **リポジトリ層**: Phase 2で対応予定
- **サービス層**: Phase 3で対応予定
- **ハンドラー層**: Phase 4で対応予定
- **DTO層**: Phase 4で対応予定

## 次のステップ

### Phase 1 Day 3: 拡張モデルの移行

以下のモデルの移行を予定：
- Sales関連
- Engineer関連
- Profile関連
- Archive関連
- Audit関連
- その他の残存モデル

## 問題と対策

### 1. 発見された問題

- WeeklyReportRefactoredで構文エラーが発生（余分な閉じ括弧）
- → 即座に修正完了

### 2. 注意点

- NotificationMetadataのようなJSON型フィールド内のUUID型も忘れずに更新
- カスタム型（UUIDSlice → StringSlice）の変換も必要

## メトリクス

| 項目 | 数値 |
|------|------|
| 変更ファイル数 | 22 |
| 変更モデル数 | 30+ |
| 変更フィールド数 | 60+ |
| 新規BeforeCreate追加数 | 7 |
| 所要時間 | 約120分 |

---

**Phase 1 Day 2 完了**

次回: Phase 1 Day 3（拡張モデルの移行）を実施予定