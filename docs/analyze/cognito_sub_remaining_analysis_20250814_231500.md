# cognito_sub残存箇所調査結果

## 調査日時
2025-08-14 23:15:00

## 調査対象
Grep検索で発見された`cognito_sub`参照箇所の詳細調査

## 調査結果

### 1. cognito_auth_test.go (3箇所)
**ファイル**: `backend/internal/middleware/cognito_auth_test.go`

**問題箇所**:
- 136行目: `c.Set("cognito_sub", "test-cognito-sub")`
- 157-159行目: テストでcognito_subの存在を確認

**評価**: ⚠️ **修正推奨**
- テストコード内でコンテキストに`cognito_sub`を設定
- 実際のコードの挙動と一致させるべき

### 2. cognito_auth.go (4箇所)
**ファイル**: `backend/internal/middleware/cognito_auth.go`

**問題箇所**:
1. 122行目: `c.Set("cognito_sub", claims["sub"])`（RequireAuth内）
2. 168行目: `c.Set("cognito_sub", claims["sub"])`（OptionalAuth内）
3. 503行目: `c.Set("cognito_sub", user.ID)`（開発モード）
4. 539行目: `c.Set("cognito_sub", user.ID)`（開発モード）

**評価**: ✅ **問題なし（コンテキスト用）**
- Ginコンテキストに`cognito_sub`として値を設定
- ハンドラーで使用するための情報提供
- データベースカラムとは無関係

### 3. user_repository.go (3箇所)
**ファイル**: `backend/internal/repository/user_repository.go`

**問題箇所**:
- 109行目: コメント（正しい説明）
- 116行目: ログ出力のパラメータ名
- 121行目: エラーログのパラメータ名

**評価**: ✅ **問題なし（ログ用）**
- メソッド実装は既に修正済み（`id = ?`を使用）
- ログのパラメータ名として使用（分かりやすさのため）

### 4. cognito_auth_service.go (3箇所)
**ファイル**: `backend/internal/service/cognito_auth_service.go`

**問題箇所**:
- 471行目: ログ出力のパラメータ名
- 480行目: ログ出力のパラメータ名
- 491行目: エラーメッセージ内の説明

**評価**: ✅ **問題なし（ログ用）**
- 実装は正しく`GetByCognitoSub`を使用
- ログとエラーメッセージでの説明用

## 修正が必要な箇所

### 優先度: 低
1. **cognito_auth_test.go**
   - テストコードの一貫性のため修正推奨
   - 実際の動作には影響なし

## 修正が不要な箇所

### Ginコンテキスト用（cognito_auth.go）
- `c.Set("cognito_sub", ...)`はAPIハンドラーで参照するための情報
- データベースカラムとは無関係
- 既存のハンドラーが依存している可能性あり

### ログ・コメント用
- user_repository.go: ログパラメータ名として使用
- cognito_auth_service.go: ログとエラーメッセージ用
- 可読性のために残しておく方が良い

## 推奨アクション

### Option 1: 最小限の修正（推奨）
- **cognito_auth_test.go**のみ修正
- テストと実装の一貫性を保つ
- 影響範囲: テストコードのみ

### Option 2: 現状維持
- 全て問題なく動作している
- `cognito_sub`という名前は概念として正しい
- Ginコンテキストのキー名は自由

### Option 3: 完全な名前変更
- Ginコンテキストのキーを`user_sub`や`auth_sub`に変更
- 全てのハンドラーを確認・修正が必要
- リスク: 高、メリット: 低

## 結論

現在の`cognito_sub`参照は以下の3カテゴリに分類される：

1. **テストコード**: 1ファイル（修正推奨）
2. **Ginコンテキスト**: 正常な使用（修正不要）
3. **ログ・コメント**: 説明用（修正不要）

データベースのcognito_subカラムは完全に削除済みで、実装上の問題はない。