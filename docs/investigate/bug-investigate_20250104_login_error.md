# ログイン認証エラーメッセージ調査報告書

## 調査日時
2025年1月4日

## 報告されたバグ
- **症状**: Cognitoに登録されていないユーザー（admin@duesk.co.jp）でログインした際、「ログインの取得に失敗しました: 不明なエラー」という不適切なエラーメッセージが表示される
- **期待される動作**: 適切なエラーメッセージ（例：「メールアドレスまたはパスワードが正しくありません」）が表示されるべき

## 調査結果

### 1. 問題の根本原因
`backend/internal/service/cognito_auth_service.go` の Login メソッドにおいて、Cognitoから返される詳細なエラー情報を無視して、汎用的なエラーメッセージ「認証に失敗しました」を返している。

```go
// 問題のコード（185-187行目）
if err != nil {
    s.logger.Error("Cognito認証エラー", zap.Error(err))
    return nil, fmt.Errorf("認証に失敗しました")
}
```

### 2. エラーフローの詳細

1. **フロントエンド** (`frontend/src/app/(auth)/login/page.tsx`)
   - ログインAPIを呼び出し
   - エラーレスポンスの `error` フィールドをそのまま表示

2. **バックエンドハンドラー** (`backend/internal/handler/auth_handler.go`)
   - `authService.Login` を呼び出し
   - エラー時は `HandleError` で401ステータスとエラーメッセージを返す

3. **Cognito認証サービス** (`backend/internal/service/cognito_auth_service.go`)
   - Cognitoの詳細なエラー（UserNotFoundException等）を「認証に失敗しました」に置き換え

4. **フロントエンドエラー処理** (`frontend/src/lib/api/error.ts`)
   - バックエンドからのエラーメッセージがない場合、「不明なエラー」を表示

### 3. 影響範囲
- すべてのCognito認証エラー（存在しないユーザー、パスワード間違い、アカウント無効化等）で同じ汎用的なメッセージが表示される
- ユーザーは何が問題なのか判断できない
- セキュリティ的には問題ないが、UXが悪い

### 4. 修正が必要な箇所

#### 主要修正箇所
1. `backend/internal/service/cognito_auth_service.go` - Login メソッド（185-187行目、156行目）
   - Cognitoエラーを適切に処理し、ユーザーフレンドリーなメッセージを返す

#### 追加で検討すべき箇所
1. エラーメッセージの多言語対応
2. セキュリティを考慮したエラーメッセージの設計（存在しないユーザーとパスワード間違いを区別しない）

### 5. 推奨される修正方法

#### 案1: セキュリティ重視（推奨）
```go
if err != nil {
    s.logger.Error("Cognito認証エラー", zap.Error(err))
    
    // セキュリティのため、詳細なエラー情報は返さない
    return nil, fmt.Errorf("メールアドレスまたはパスワードが正しくありません")
}
```

#### 案2: UX重視（Cognitoエラーを判別）
```go
if err != nil {
    s.logger.Error("Cognito認証エラー", zap.Error(err))
    
    // Cognitoのエラータイプを判別
    var awsErr smithy.APIError
    if errors.As(err, &awsErr) {
        switch awsErr.ErrorCode() {
        case "UserNotFoundException", "NotAuthorizedException":
            return nil, fmt.Errorf("メールアドレスまたはパスワードが正しくありません")
        case "UserNotConfirmedException":
            return nil, fmt.Errorf("アカウントが確認されていません。メールを確認してください")
        case "PasswordResetRequiredException":
            return nil, fmt.Errorf("パスワードのリセットが必要です")
        default:
            return nil, fmt.Errorf("ログインに失敗しました。しばらく待ってから再度お試しください")
        }
    }
    
    return nil, fmt.Errorf("ログインに失敗しました")
}
```

### 6. 追加の改善提案

1. **エラーコードの実装**
   - バックエンドでエラーコードを返し、フロントエンドで適切なメッセージに変換
   - 多言語対応が容易になる

2. **ログの改善**
   - 認証失敗の詳細な理由をログに記録（デバッグ用）
   - ただし、パスワードなどの機密情報は記録しない

3. **レート制限の実装**
   - ブルートフォース攻撃を防ぐため、ログイン試行回数の制限を実装

### 7. 次のステップ
1. セキュリティポリシーに基づいてエラーメッセージの方針を決定
2. `CognitoAuthService.Login` メソッドの修正実装
3. テストケースの追加（存在しないユーザー、パスワード間違い等）
4. フロントエンドのエラー表示の改善（必要に応じて）

## 調査完了
本調査により、ログイン時の不適切なエラーメッセージの原因が特定されました。修正は比較的簡単で、影響範囲も限定的です。