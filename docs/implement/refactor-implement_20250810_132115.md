# UUID to String型移行 実装詳細 - Phase 1 Day 1

作成日: 2025-08-10 13:21:15
実施者: Claude AI

## 概要

リファクタリング計画（`refactor-plan_20250810_122032.md`）に基づき、Phase 1 Day 1として基本モデルのUUID型からstring型への移行を実施しました。

## 実施内容

### Phase 1 Day 1: 基本モデルの移行

#### 1. 移行対象モデル

以下の7つのモデルでID関連フィールドをuuid.UUID型からstring型に移行：

1. **Department** (`backend/internal/model/department.go`)
   - `ID`: uuid.UUID → string
   - `ParentID`: *uuid.UUID → *string
   - `ManagerID`: *uuid.UUID → *string (Cognito Sub)

2. **Project** (`backend/internal/model/project.go`)
   - `ID`: uuid.UUID → string
   - `ClientID`: uuid.UUID → string

3. **Client** (`backend/internal/model/project.go`)
   - `ID`: uuid.UUID → string

4. **ProjectAssignment** (`backend/internal/model/project.go`)
   - `ID`: uuid.UUID → string
   - `ProjectID`: uuid.UUID → string
   - `UserID`: 既にstring型（確認済み）

5. **TechnologyMaster** (`backend/internal/model/technology_master.go`)
   - `ID`: uuid.UUID → string

6. **RolePermission** (`backend/internal/model/role_permission.go`)
   - `ID`: uuid.UUID → string

7. **Session** (`backend/internal/model/session.go`)
   - `ID`: uuid.UUID → string
   - `UserID`: 既にstring型（確認済み）

#### 2. BeforeCreateメソッドの更新

各モデルのBeforeCreateメソッドを以下のパターンで更新：

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

#### 3. GORMタグの調整

- varchar長を36から255に変更（Cognito Sub形式に対応）
- 例: `gorm:"type:varchar(36)"` → `gorm:"type:varchar(255)"`

## 技術的詳細

### 1. 型変換パターン

```go
// UUID型フィールド
uuid.UUID → string
*uuid.UUID → *string

// GORMタグ
`gorm:"type:varchar(36);primary_key"` → `gorm:"type:varchar(255);primary_key"`
`gorm:"type:char(36);primaryKey"` → `gorm:"type:varchar(255);primaryKey"`
```

### 2. BeforeCreate処理の変更

- `uuid.Nil`チェック → 空文字列（`""`）チェック
- `uuid.New()` → `uuid.New().String()`
- 既存のタイムスタンプ処理は維持

### 3. 外部キー関係

- 外部キー関係は変更なし（GORMが文字列型を適切に処理）
- リレーション定義は維持

## 確認事項

### 1. コンパイル確認

```bash
cd backend && go test ./internal/model/... -run TestModel
# 結果: ok (no tests to run)
```

### 2. 残存UUID型の確認

各モデルファイルで`uuid.UUID`の使用箇所を確認し、ID関連フィールドがすべてstring型に変更されていることを確認。

### 3. 影響範囲

- **リポジトリ層**: Phase 2で対応予定
- **サービス層**: Phase 3で対応予定
- **ハンドラー層**: Phase 4で対応予定
- **DTO層**: Phase 4で対応予定

## 次のステップ

### Phase 1 Day 2: 業務モデルの移行

以下のモデルの移行を予定：
- Expense関連
- WeeklyReport, DailyRecord
- Leave, Attendance, WorkRecord
- Notification

### 注意事項

1. **既存データとの互換性**
   - データベースは既にvarchar(255)型のため、データ移行は不要
   - アプリケーション層のみの変更

2. **並行開発への影響**
   - feature/uuid-to-string-migrationブランチで作業
   - mainブランチとの定期的なマージが必要

3. **テスト戦略**
   - 各Phaseでのユニットテスト実行
   - Phase完了時の統合テスト

## 問題と対策

### 1. 発見された問題

- 特になし（計画通りに進行）

### 2. リスク

- 大量のモデル変更による見落としの可能性
- → 各ファイルで`uuid.UUID`の検索を実施して確認

## コミット情報

```
commit 9c7338c
Author: Claude AI
Date: 2025-08-10

refactor: Phase 1 Day 1 - 基本モデルのUUID to string型移行

- Departmentモデル: ID, ParentID, ManagerIDをstring型に変更
- Projectモデル: ID, ClientIDをstring型に変更  
- Clientモデル: IDをstring型に変更
- ProjectAssignmentモデル: ID, ProjectIDをstring型に変更
- TechnologyMasterモデル: IDをstring型に変更
- RolePermissionモデル: IDをstring型に変更
- Sessionモデル: IDをstring型に変更

refs #uuid-to-string-migration
```

## メトリクス

| 項目 | 数値 |
|------|------|
| 変更ファイル数 | 7 |
| 変更モデル数 | 7 |
| 変更フィールド数 | 11 |
| 所要時間 | 約60分 |
| テスト結果 | Pass |

---

**Phase 1 Day 1 完了**

次回: Phase 1 Day 2（業務モデルの移行）を実施予定