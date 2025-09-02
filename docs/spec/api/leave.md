% Leave API（Draft）

ベース: `/api/v1/leave`
（実装参照: `backend/cmd/server/main.go:700` 付近）

エンドポイント
- `GET /types` 休暇種別一覧
- `GET /balances` ユーザー休暇残数
- `GET /requests` 休暇申請一覧
- `POST /requests` 休暇申請作成
- `GET /holidays` 休日一覧（`/leave/holidays` グループ）

作成例
```json
{
  "leave_type_id": "annual",
  "start_date": "2025-08-25",
  "end_date": "2025-08-25",
  "reason": "通院",
  "is_half_day": false
}
```

レスポンス例（抜粋）
```json
{
  "id": "lr-123",
  "status": "requested",
  "start_date": "2025-08-25",
  "end_date": "2025-08-25",
  "leave_type": { "id": "annual", "name": "有給" }
}
```

バリデーション/備考
- 期間: `start_date <= end_date`
- 残数: `balances` の範囲内（半休の扱い含む）
- 種別: `types` 由来のID/ポリシーに一致
- 休日: `holidays` を考慮（申請可否は運用設定に依存）
- エラーフォーマット: 標準エラーモデル（`docs/spec/api/errors.md`）

TODO
- ステータス遷移（承認/却下/取消）と管理 API の整理
- 申請詳細/更新/取消 API の有無を確認し追記
