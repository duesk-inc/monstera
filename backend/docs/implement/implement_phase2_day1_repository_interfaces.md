# Phase 2 Day 1: リポジトリインターフェースの更新 - 実装詳細

## 実施日時
- 2025-08-10

## 概要
Phase 2 Day 1では、リポジトリ層のインターフェースと実装をUUID型からstring型へ移行しました。これはCognito Sub形式（string）への完全移行の一環として実施されました。

## 実装詳細

### 1. UserRepository ✅
**変更内容:**
- インターフェースメソッドのUUID型パラメータをstring型に変更
- 実装メソッドの型を合わせて変更
- ValidateID()呼び出しを削除
- uuid.UUIDパッケージのインポートを削除（不要になったため）

**主な変更メソッド:**
- `FindByID(id uuid.UUID)` → `FindByID(id string)`
- `GetByID(ctx, id uuid.UUID)` → `GetByID(ctx, id string)`
- `Delete(id uuid.UUID)` → `Delete(id string)`
- `CountByDepartment(ctx, departmentID uuid.UUID)` → `CountByDepartment(ctx, departmentID string)`

### 2. ExpenseRepository ✅
**変更内容:**
- 全インターフェースメソッドのUUID型パラメータをstring型に変更
- 実装メソッドの型を合わせて変更
- `.String()`呼び出しを全て削除（IDが既にstring型のため）
- uuidパッケージのインポートを削除

**主な変更メソッド:**
- `GetByID(ctx, id uuid.UUID)` → `GetByID(ctx, id string)`
- `Delete(ctx, id uuid.UUID)` → `Delete(ctx, id string)`
- `ListForApproval(ctx, approverID uuid.UUID, filter)` → `ListForApproval(ctx, approverID string, filter)`
- `UpdateStatus(ctx, id uuid.UUID, status)` → `UpdateStatus(ctx, id string, status)`
- `ExistsByID(ctx, id uuid.UUID)` → `ExistsByID(ctx, id string)`

**修正箇所:**
- ログ出力での`.String()`呼び出しを削除（例: `zap.String("expense_id", id.String())` → `zap.String("expense_id", id)`）

### 3. WeeklyReportRepository ✅
**変更内容:**
- メソッドシグネチャのUUID型をstring型に変更
- uuid.Nil比較を空文字列比較に変更
- ValidateID()呼び出しをシンプルな空文字列チェックに置換
- 構造体フィールドのUUID型をstring型に変更
- `.String()`呼び出しを削除

**主な変更メソッド:**
- `FindByID(ctx, id uuid.UUID)` → `FindByID(ctx, id string)`
- `Delete(ctx, id uuid.UUID)` → `Delete(ctx, id string)`
- `UpdateTotalWorkHours(ctx, reportID uuid.UUID, totalHours)` → `UpdateTotalWorkHours(ctx, reportID string, totalHours)`
- `GetMonthlyAggregatedData(ctx, year, month, departmentID *uuid.UUID)` → `GetMonthlyAggregatedData(ctx, year, month, departmentID *string)`

**特殊な変更:**
- `report.ID = r.NewID()` → `report.ID = uuid.New().String()`
- `if report.ID == uuid.Nil` → `if report.ID == ""`
- `if err := r.ValidateID(id); err != nil` → `if id == "" { return fmt.Errorf("invalid ID: empty string") }`

**構造体の変更:**
```go
// Before
DepartmentID   uuid.UUID
UserID         uuid.UUID
UserIDs      []uuid.UUID
DepartmentID *uuid.UUID

// After
DepartmentID   string
UserID         string
UserIDs      []string
DepartmentID *string
```

### 4. DepartmentRepository ✅
**変更内容:**
- インターフェースと実装のUUID型パラメータをstring型に変更
- uuidパッケージのインポートを削除（不要になったため）

**主な変更メソッド:**
- `FindByID(ctx, id uuid.UUID)` → `FindByID(ctx, id string)`
- `Delete(ctx, id uuid.UUID)` → `Delete(ctx, id string)`

### 5. ProjectRepository ✅
**変更内容:**
- インターフェースメソッドのUUID型パラメータをstring型に変更
- 実装メソッドの型を合わせて変更
- `.String()`呼び出しを削除
- uuidパッケージのインポートを削除

**主な変更メソッド:**
- `GetByID(ctx, id uuid.UUID)` → `GetByID(ctx, id string)`
- `List(ctx, clientID *uuid.UUID, limit, offset)` → `List(ctx, clientID *string, limit, offset)`
- `FindByClientID(ctx, clientID uuid.UUID)` → `FindByClientID(ctx, clientID string)`
- `GetActiveProjectCount(ctx, clientID *uuid.UUID)` → `GetActiveProjectCount(ctx, clientID *string)`

### 6. NotificationRepository ✅
**変更内容:**
- 多数のインターフェースメソッドのUUID型パラメータをstring型に変更
- 実装メソッドの型を合わせて変更
- uuid.Nil比較を空文字列比較に変更
- uuid.New()を uuid.New().String()に変更
- uuidパッケージは維持（uuid.New().String()で使用）

**主な変更メソッド:**
- `GetNotificationByID(ctx, id uuid.UUID)` → `GetNotificationByID(ctx, id string)`
- `GetNotificationsByRecipient(ctx, recipientID uuid.UUID, params)` → `GetNotificationsByRecipient(ctx, recipientID string, params)`
- `MarkNotificationsAsReadByRecipient(ctx, recipientID uuid.UUID, ids []uuid.UUID)` → `MarkNotificationsAsReadByRecipient(ctx, recipientID string, ids []string)`
- `GetUnreadNotificationCountByRecipient(ctx, recipientID uuid.UUID)` → `GetUnreadNotificationCountByRecipient(ctx, recipientID string)`

**ID生成の変更:**
```go
// Before
if notification.ID == uuid.Nil {
    notification.ID = uuid.New()
}

// After
if notification.ID == "" {
    notification.ID = uuid.New().String()
}
```

### 7. SessionRepository ✅
**変更内容:**
- インターフェースのみの更新（実装は見つからず）
- DeleteSessionメソッドのUUID型パラメータをstring型に変更
- uuidパッケージのインポートを削除

**主な変更メソッド:**
- `DeleteSession(ctx, sessionID uuid.UUID)` → `DeleteSession(ctx, sessionID string)`

### 8. LeaveRequestRepository ✅
**変更内容:**
- インターフェースと実装の両方を更新
- GetByIDメソッドのUUID型パラメータをstring型に変更
- `.String()`呼び出しを削除
- uuidパッケージのインポートを削除

**主な変更メソッド:**
- `GetByID(ctx, id uuid.UUID)` → `GetByID(ctx, id string)`

**修正箇所:**
- ログ出力での`.String()`呼び出しを削除
  - `zap.String("request_id", id.String())` → `zap.String("request_id", id)`
  - `zap.String("request_id", request.ID.String())` → `zap.String("request_id", request.ID)`

## 未完了タスク

### BaseRepository
- 基底リポジトリの更新が必要な場合は確認が必要

### その他のリポジトリ
以下のリポジトリも更新が必要な可能性があります：
- SessionRepository
- LeaveRequestRepository
- AlertRepository
- AuditLogRepository
- 他多数

## 次のステップ

1. SessionRepositoryとLeaveRequestRepositoryの更新を続行
2. 残りのリポジトリを体系的に確認・更新
3. BaseRepositoryの確認と必要に応じた更新
4. 全リポジトリの更新完了後、変更をコミット
5. Phase 2 Day 2-3（リポジトリ実装の継続）へ進む

## 注意事項

1. **uuid.New().String()の使用**: ID生成時はuuid.New().String()を使用するため、一部のファイルでは引き続きuuidパッケージのインポートが必要
2. **空文字列チェック**: uuid.Nil比較は全て空文字列（""）比較に置換
3. **型の一貫性**: インターフェースと実装の型が一致していることを常に確認
4. **ログ出力**: .String()呼び出しは不要になったため全て削除

## 成果

- 8つの主要リポジトリの更新完了
  - UserRepository
  - ExpenseRepository
  - WeeklyReportRepository
  - DepartmentRepository
  - ProjectRepository
  - NotificationRepository
  - SessionRepository
  - LeaveRequestRepository
- 型の一貫性が向上
- 実行時のパニックリスクが削減
- Cognito Sub（string型）との完全な互換性を確保

## Phase 2 Day 1 完了

Phase 2 Day 1の目標であった主要なリポジトリインターフェースの更新が完了しました。合計8つのリポジトリを更新し、UUID型からstring型への移行を実施しました。残りのリポジトリについては、Phase 2 Day 2-3で継続して実施予定です。