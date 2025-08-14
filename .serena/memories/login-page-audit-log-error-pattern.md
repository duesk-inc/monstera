# ログイン画面 audit_logs エラーパターン

## 問題パターン
- **エラー**: `audit_logs` テーブルの外部キー制約違反
- **発生箇所**: ログイン画面（/login）アクセス時
- **エラーメッセージ**: `insert or update on table "audit_logs" violates foreign key constraint "fk_audit_logs_user"`

## 根本原因
1. **開発用デフォルトユーザーの不在**: `user_id=00000000-0000-0000-0000-000000000099` がusersテーブルに存在しない
2. **ログイン画面での不要な認証チェック**: AuthContextが初期化時に自動的に /api/v1/auth/me を呼び出し
3. **認証ミドルウェアと監査ログの連携問題**: 仮想ユーザーIDが監査ログで制約違反を引き起こす

## 発生フロー
```
ログイン画面アクセス → AuthContext初期化 → refreshAuth() 実行 →
/api/v1/auth/me API呼び出し → 認証ミドルウェア処理 → 
開発用デフォルトユーザー設定 → authHandler.Me実行 →
監査ログミドルウェア → audit_logsテーブル挿入 → 外部キー制約違反
```

## 関連コード箇所
- **認証ミドルウェア**: `backend/internal/middleware/cognito_auth.go:535`
- **監査ログ**: `backend/internal/middleware/audit_log.go:88-110`
- **フロントエンド**: `frontend/src/context/AuthContext.tsx:67` (useEffect)
- **API呼び出し**: `frontend/src/lib/api/auth/index.ts:257`

## 修正方針
1. **推奨**: 開発用デフォルトユーザーをusersテーブルに追加
2. **代替**: ログイン画面での認証チェック無効化
3. **最終手段**: 監査ログの外部キー制約緩和

## 影響範囲
- 開発環境のみ（本番はCognito認証）
- ログイン画面アクセス時のユーザー体験低下
- デバッグログの汚染

## 回避策
特定のメールアドレス（super_admin@duesk.co.jp等）でのアクセスなら発生しない

## 関連メモリ
- dev-mode-login-fix-pattern: 開発モードでのログイン修正パターン
- cognito-auth-error-handling: Cognito認証エラーハンドリング