# CORS設定の落とし穴

## 問題パターン
フロントエンドで新しいカスタムヘッダーを追加したが、バックエンドのCORS設定を更新し忘れることで発生するCORSエラー。

## 症状
- ブラウザコンソールに「Request header field XXX is not allowed by Access-Control-Allow-Headers」エラーが表示
- APIリクエストがCORSポリシーによりブロックされる
- NETWORK_ERRORとして処理される

## 確認箇所
1. **フロントエンド**: APIクライアントの設定でカスタムヘッダーを確認
   - `frontend/src/lib/api/config/unified.ts`
   - `frontend/src/lib/api/factory/index.ts`

2. **バックエンド**: CORS設定を確認（2箇所）
   - `backend/internal/config/config.go` - AllowHeaders設定
   - `backend/internal/middleware/api_security.go` - Access-Control-Allow-Headersヘッダー

## 修正方法
バックエンドの両方のCORS設定にカスタムヘッダーを追加する。

## 予防策
- フロントエンドで新しいヘッダーを追加する際は、必ずバックエンドのCORS設定も更新する
- CORS設定を一箇所で管理することを検討
- テストでCORSプリフライトリクエストを確認する