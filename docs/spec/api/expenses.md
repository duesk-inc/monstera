% Expenses API（Draft）

ベース: `/api/v1/expenses`
（実装参照: `backend/cmd/server/main.go:720` 付近）

エンドポイント
- 基本
  - `POST /` 作成
  - `GET /categories` カテゴリ一覧
  - `GET /` 一覧
  - `GET /:id` 取得
  - `PUT /:id` 更新
  - `DELETE /:id` 削除
- 申請提出/取消
  - `POST /:id/submit` 提出
  - `POST /:id/cancel` 取消
- ファイルアップロード（S3/MinIO）
  - `POST /upload-url` 直アップロードURL発行
  - `POST /upload-complete` 完了通知
  - `DELETE /upload` アップロード取消
  - 複数領収書（初期スコープ外）: `POST /receipts/upload-url`, `GET /:id/receipts`, `DELETE /:id/receipts/:receipt_id`, `PUT /:id/receipts/order`
- 上限チェック/集計/出力
  - `GET /check-limits` 上限チェック
  - `GET /summary` 集計
  - `GET /export` CSV エクスポート（管理者版は `/api/v1/admin/expenses/export`）
  - PDF（初期スコープ外）: `GET /:id/pdf`, `GET /pdf`

作成例（抜粋）
```json
{
  "date": "2025-08-24",
  "category_id": "transport",
  "amount": 1200,
  "description": "電車移動",
  "receipts": [ { "file_name": "receipt1.jpg", "object_key": "..." } ]
}
```

バリデーション/備考
- 金額/日付/カテゴリ 必須、金額は数値・上限チェック対象
- ファイル: 種類/サイズ検証、直アップロード完了後に確定
- ステータス: `draft → submitted → approved|rejected`（承認は管理側）
- エラーフォーマット: 標準エラーモデル（`docs/spec/api/errors.md`）

初期スコープ外（v0）
- 複数領収書フロー（順序入替/取り消し含む）
- PDF出力（一覧/明細）

TODO
- カテゴリスキーマ、上限ロジック、承認フローの詳細
