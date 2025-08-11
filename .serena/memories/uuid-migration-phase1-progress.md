# UUID to String移行 Phase 1 進捗状況

最終更新: 2025-08-10 13:21

## Phase 1: モデル層の移行

### Day 1 完了 (2025-08-10)

**移行済みモデル:**
1. Department - ID, ParentID, ManagerID
2. Project - ID, ClientID  
3. Client - ID
4. ProjectAssignment - ID, ProjectID
5. TechnologyMaster - ID
6. RolePermission - ID
7. Session - ID

**技術的変更:**
- uuid.UUID → string
- BeforeCreate: uuid.Nil → "" / uuid.New() → uuid.New().String()
- GORMタグ: varchar(36) → varchar(255)

### Day 2 予定

**対象モデル:**
- Expense, ExpenseCategory, ExpenseApproval
- WeeklyReport, DailyRecord
- Leave関連 (LeaveRequest, LeaveBalance等)
- Attendance, WorkRecord
- Notification, UserNotification

### Day 3 予定

**対象モデル:**
- Sales関連
- Engineer関連  
- Profile関連
- Archive関連
- Audit関連
- その他残存モデル

## 注意点

- UserIDフィールドは既に多くのモデルでstring型に移行済み
- 各モデルのBeforeCreateメソッドの更新を忘れずに
- 外部キー関係の確認が必要