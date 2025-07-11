# Monsteraプロジェクト固有の設定

このドキュメントはMonsteraプロジェクト特有の規約、慣習、設定を記録します。

## 更新履歴
- 2025-01-09: 初版作成

## プロジェクト固有の命名規則

### データベース関連
```sql
-- テーブル名: 複数形のsnake_case
users, weekly_reports, expense_categories

-- カラム名: snake_case
created_at, updated_at, deleted_at, user_id

-- インデックス名: idx_テーブル名_カラム名
idx_weekly_reports_user_id
idx_weekly_reports_status_deleted

-- 外部キー名: fk_子テーブル_親テーブル
fk_weekly_reports_user
fk_expenses_approver
```

### API関連
```
-- エンドポイント: kebab-case
/api/v1/weekly-reports
/api/v1/expense-categories
/api/v1/leave-requests

-- リクエスト/レスポンス: camelCase
{
  "userId": "123",
  "startDate": "2024-01-01",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### ファイル名
```
-- Go: snake_case
weekly_report_handler.go
expense_repository.go
auth_middleware.go

-- TypeScript/React: kebab-case
weekly-report-form.tsx
expense-list.tsx
use-auth.ts

-- コンポーネント名: PascalCase
WeeklyReportForm
ExpenseList
CommonTable
```

## ステータス管理の移行ルール

### 現在の移行状況
- 数値型（0,1,2,3）から文字列型（draft, submitted, approved, rejected）への移行中
- APIレスポンスでは移行期間中、両方の形式をサポート

### 実装パターン
```go
// 定数定義
const (
    WeeklyReportStatusDraft     = "draft"
    WeeklyReportStatusSubmitted = "submitted"
    WeeklyReportStatusApproved  = "approved"
    WeeklyReportStatusRejected  = "rejected"
)

// 移行用ヘルパー
func ConvertLegacyStatus(intStatus int) string {
    statusMap := map[int]string{
        0: WeeklyReportStatusDraft,
        1: WeeklyReportStatusSubmitted,
        2: WeeklyReportStatusApproved,
        3: WeeklyReportStatusRejected,
    }
    return statusMap[intStatus]
}
```

## エラーコード体系

### フォーマット
```
[カテゴリ]_[サブカテゴリ]_[連番]

例:
AUTH_LOGIN_001    - 認証: ログインエラー
BIZ_WEEKLY_001    - ビジネスロジック: 週報関連
VAL_REQUIRED_001  - バリデーション: 必須項目エラー
```

### カテゴリ一覧
- AUTH: 認証関連
- PERM: 権限関連
- VAL: バリデーション
- BIZ: ビジネスロジック
- SYS: システムエラー
- EXT: 外部サービス連携

## 環境別設定

### 環境の種類
1. **development** - ローカル開発環境
2. **staging** - ステージング環境
3. **production** - 本番環境

### 環境変数の管理
```bash
# 必須環境変数
DATABASE_URL      # PostgreSQL接続文字列
JWT_SECRET        # JWT署名キー
COGNITO_REGION    # AWS Cognito リージョン
COGNITO_USER_POOL # Cognito ユーザープールID

# 環境別切り替え
GO_ENV=development   # development/staging/production
NODE_ENV=development # development/production
```

### Cookie設定
```go
// 開発環境
c.SetCookie("access_token", token, 3600, "/", "", false, true)
// SameSite=Lax, Secure=false, HttpOnly=true

// 本番環境
c.SetCookie("access_token", token, 3600, "/", "", true, true)
// SameSite=Strict, Secure=true, HttpOnly=true
```

## 開発フロー

### 1. 機能開発の流れ
```
1. Issue作成
2. feature/issue-番号-簡潔な説明 ブランチ作成
3. 実装（TDD推奨）
4. ローカルテスト
5. PR作成
6. コードレビュー
7. developへマージ
```

### 2. コミットメッセージ規約
```
<type>(<scope>): <subject>

type:
- feat: 新機能
- fix: バグ修正
- docs: ドキュメントのみ
- style: フォーマット修正
- refactor: リファクタリング
- perf: パフォーマンス改善
- test: テスト追加/修正
- chore: ビルド関連、補助ツール

例:
feat(frontend): 週報一覧にフィルター機能を追加
fix(backend): 週報提出時の権限チェックを修正
```

### 3. PR作成時の注意点
- 関連Issueを必ずリンク
- スクリーンショットを添付（UI変更時）
- テスト結果を記載
- レビュー観点を明記

## テスト戦略

### カバレッジ目標
- 全体: 80%以上
- 重要なビジネスロジック: 90%以上
- ユーティリティ関数: 100%

### テストの種類と実行
```bash
# バックエンド
make test               # 全テスト
go test ./... -cover   # カバレッジ付き
go test -run TestName  # 特定のテスト

# フロントエンド
npm test               # 全テスト
npm run test:coverage  # カバレッジ付き
npm test -- --watch    # ウォッチモード
```

## デプロイメント

### Blue-Greenデプロイメント戦略
1. Green環境に新バージョンをデプロイ
2. ヘルスチェック実施
3. 一部トラフィックをGreenに切り替え
4. 問題なければ全トラフィック切り替え
5. Blue環境を次回用に保持

### ロールバック手順
```bash
# ECSの場合
aws ecs update-service --service monstera-backend --task-definition monstera-backend:前のバージョン

# データベースマイグレーション
migrate -path migrations -database $DATABASE_URL down 1
```

## モニタリング

### 監視項目
- レスポンスタイム: 95%tile < 500ms
- エラー率: < 0.1%
- CPU使用率: < 70%
- メモリ使用率: < 80%

### アラート設定
```yaml
# 緊急度: Critical
- エラー率 > 1%
- レスポンスタイム > 1s (5分間)
- サービスダウン

# 緊急度: Warning
- エラー率 > 0.5%
- CPU使用率 > 80%
- ディスク使用率 > 90%
```

## セキュリティ規約

### 認証・認可
- 全APIエンドポイントはデフォルトで認証必須
- 公開エンドポイントはホワイトリスト方式
- ロールベースアクセス制御（RBAC）を適用

### データ保護
- 個人情報はログに出力しない
- パスワードは必ずハッシュ化（bcrypt使用）
- 機密情報は環境変数で管理

### 入力検証
- フロントエンド・バックエンド両方で実装
- SQLインジェクション対策（プレースホルダ使用）
- XSS対策（HTMLエスケープ）

## チーム固有のルール

### コードレビュー基準
- 最低1名の承認が必要
- セキュリティ関連は2名の承認
- パフォーマンス影響がある場合は計測結果を提示

### ドキュメント更新
- API変更時は必ずドキュメント更新
- 破壊的変更は事前に周知
- CHANGELOG.mdを更新

### 会議・コミュニケーション
- 日次スタンドアップ: 10:00
- スプリントプランニング: 隔週月曜
- レトロスペクティブ: 隔週金曜

## フロントエンドディレクトリ構造

```
app/              # Next.js App Router（認証別、権限別）
components/       # common/（共通）、features/（機能別）
hooks/           # カスタムフック
lib/             # API、ユーティリティ、設定
types/           # 型定義
constants/       # 定数定義
```

## 共通コンポーネント使用例

```typescript
// CommonTableの使用
import { CommonTable } from '@/components/common/CommonTable';

const columns = [
  { key: 'title', label: 'タイトル', sortable: true },
  { key: 'status', label: 'ステータス', render: (value) => <StatusBadge status={value} /> },
  { key: 'createdAt', label: '作成日', sortable: true },
];

<CommonTable
  data={weeklyReports}
  columns={columns}
  onRowClick={(row) => router.push(`/weekly-reports/${row.id}`)}
  loading={isLoading}
  pagination={{
    page: currentPage,
    pageSize: 20,
    total: totalCount,
    onChange: setCurrentPage,
  }}
/>

// CommonDialogの使用
<CommonDialog
  open={isOpen}
  onClose={handleClose}
  title="週報を提出"
  actions={[
    { label: 'キャンセル', onClick: handleClose },
    { label: '提出', onClick: handleSubmit, variant: 'primary' },
  ]}
>
  <p>この週報を提出してもよろしいですか？</p>
</CommonDialog>
```

## パフォーマンス監視

```yaml
# Prometheusメトリクス: HTTPレスポンス、ビジネスイベント、DB接続
# アラート: エラー率、レスポンス遅延、メモリ使用率
```

---

*このドキュメントはプロジェクト固有のルールが追加・変更された際に更新してください。*