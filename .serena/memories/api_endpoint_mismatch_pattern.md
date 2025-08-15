# APIエンドポイント不一致パターン

## 問題パターン
フロントエンドとバックエンドでAPIエンドポイントの定義が異なることによる404エラー

## よくある原因
1. **定数定義の不一致**
   - フロントエンド: PROFILE_API定数などで誤ったパスを定義
   - バックエンド: 実際のルーティングと異なる

2. **エンドポイント命名規則の違い**
   - RESTfulな命名規則の解釈の違い
   - 例: `/profile` vs `/profile/update` for POST

## 調査方法
1. バックエンドのルーティング定義を確認
   - `backend/cmd/server/main.go`のsetupRouter関数
   - 各ハンドラーのルート定義

2. フロントエンドのAPI定数を確認
   - `frontend/src/constants/api.ts`
   - 各API定数の定義

3. 実際のAPI呼び出し箇所を確認
   - `frontend/src/lib/api/`配下の各ファイル

## 予防策
- API定数を定期的にバックエンドと照合
- OpenAPIなどのスキーマ定義から自動生成を検討
- E2Eテストでエンドポイントの疎通を確認