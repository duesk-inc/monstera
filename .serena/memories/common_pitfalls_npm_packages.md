# NPMパッケージ関連の共通問題

## 既存システムの確認
新しいパッケージを追加する前に、プロジェクトで既に使用されているシステムを確認する：

### 認証システム
- 使用中: AWS Cognito（バックエンド側で処理）
- 使用不可: next-auth（使用しない）

### トースト通知
- 使用中: `@/components/common/Toast/ToastProvider` の `useToast`フック
- 使用不可: react-hot-toast, react-toastify

### データフェッチング
- 使用中: React Query（@tanstack/react-query）
- 使用不可: SWR

### ユーザー情報取得
- セッション情報はバックエンドAPIから取得
- フロントエンドでは直接Cognitoにアクセスしない

## 確認コマンド
```bash
# 既存のパッケージを確認
cat package.json | grep -E "(toast|auth|query|swr)"

# 既存のフックを検索
grep -r "useToast\|useAuth\|useQuery" src/
```