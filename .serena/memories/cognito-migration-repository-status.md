# リポジトリ層の移行状況

## 発見事項
1. **Cognito版リポジトリが既に存在**
   - user_repository_cognito.go: string型IDを使用するインターフェース
   - user_repository_cognito_impl.go: 実装

2. **既存のリポジトリ**
   - user_repository.go: UUID型を使用する旧インターフェース
   - 33個のリポジトリファイルがuuid.UUID型のuserIDを使用

## 移行戦略
1. **段階的アプローチ**
   - 各リポジトリファイルのuserID引数をstring型に変更
   - UUID.String()を使用して一時的に互換性を保つ
   - 最終的にUserRepositoryインターフェースを統合

2. **優先順位**
   - 依存関係の少ないリポジトリから開始
   - セッション、監査ログなど基本的なものから着手