# パッケージ使用前の確認パターン

## アンチパターン
新しいパッケージをインポートする前に、既存システムを確認しない

## 正しいパターン

### 1. 既存システムの確認
```bash
# package.jsonで既存パッケージを確認
cat package.json | grep -E "(auth|toast|query)"

# 既存のフックやユーティリティを検索
grep -r "useToast\|useAuth\|useQuery" src/
```

### 2. プロジェクト固有のシステム

#### 認証
- ❌ next-auth/react
- ✅ AWS Cognito（バックエンド側）

#### トースト通知
- ❌ react-hot-toast
- ❌ react-toastify
- ✅ @/components/common/Toast/ToastProvider の useToast

#### データフェッチング
- ❌ SWR
- ✅ @tanstack/react-query

#### ユーザー情報
- ❌ useSession (next-auth)
- ✅ propsから取得またはバックエンドAPI

### 3. 修正例

#### Before（間違い）
```typescript
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { mutate } from 'swr'

const { data: session } = useSession()
toast.success('成功')
await mutate(cacheKey)
```

#### After（正しい）
```typescript
import { useToast } from '@/components/common'
import { useQueryClient } from '@tanstack/react-query'

const { showSuccess } = useToast()
const queryClient = useQueryClient()

showSuccess('成功')
await queryClient.invalidateQueries({ queryKey: [cacheKey] })
```