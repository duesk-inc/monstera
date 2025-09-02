% Weekly Reports API（Draft）

ベース: `/api/v1/weekly-reports`
（実装参照: `backend/cmd/server/main.go:699`）

エンドポイント
- `GET /` 一覧
- `GET /by-date-range` 期間指定取得
- `GET /:id` 取得
- `POST /` 作成
- `PUT //:id` 更新
- `DELETE //:id` 削除
- `POST /:id/submit` 提出
- `POST /:id/copy` コピー
- `POST /draft` 下書き保存（統合）
- `POST /submit` 保存して提出（統合）

デフォルト勤務時間
- `GET /default-settings` 取得
- `POST /default-settings` 保存

リクエスト/レスポンス例
- 一覧 `GET /api/v1/weekly-reports?page=1&limit=10&status=submitted`
  - Response 200
  ```json
  {
    "reports": [
      {
        "id": "wr1",
        "start_date": "2025-08-18",
        "end_date": "2025-08-24",
        "status": "submitted",
        "weekly_remarks": "…",
        "total_work_hours": 40.0,
        "client_total_work_hours": 0
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
  ```

- 作成 `POST /api/v1/weekly-reports`
  - Request（camel→snake に変換して送信）
  ```json
  {
    "startDate": "2025-08-18",
    "endDate": "2025-08-24",
    "status": "draft",
    "weeklyRemarks": "…",
    "dailyRecords": [
      { "date": "2025-08-18", "startTime": "09:00", "endTime": "18:00", "breakTime": 1, "remarks": "", "isHolidayWork": false }
    ]
  }
  ```
  - Response 200（抜粋）
  ```json
  { "id": "wr1", "start_date": "2025-08-18", "end_date": "2025-08-24", "status": "draft" }
  ```

- 更新 `PUT /api/v1/weekly-reports/:id`
  - Request/Response は作成と同等（ID 指定）

- 提出 `POST /api/v1/weekly-reports/:id/submit`
  - Response 200（抜粋）
  ```json
  { "id": "wr1", "status": "submitted" }
  ```

- 期間取得 `GET /api/v1/weekly-reports/by-date-range?start_date=2025-08-18&end_date=2025-08-24`
  - Response 200（単一）
  ```json
  {
    "id": "wr1",
    "start_date": "2025-08-18",
    "end_date": "2025-08-24",
    "status": "draft",
    "daily_records": [ /* 日別 */ ]
  }
  ```
  - Response 404: 該当が無い場合（新規作成モードで扱う）

- デフォルト勤務時間
  - `GET /api/v1/weekly-reports/default-settings`
    - Response 200（いずれかの形式）
    ```json
    { "weekday_start_time": "09:00", "weekday_end_time": "18:00", "weekday_break_time": 1 }
    ```
  - `POST /api/v1/weekly-reports/default-settings`
    - Request
    ```json
    { "weekday_start_time": "09:00", "weekday_end_time": "18:00", "weekday_break_time": 1 }
    ```

エラー/備考
- 日付は `YYYY-MM-DD`、時間は `HH:mm` 文字列
- camelCase/snake_case の変換はフロントで吸収
- 404（by-date-range）は「未作成として扱う」フローあり
 - エラーフォーマットは標準のエラーモデルを参照（`docs/spec/api/errors.md`）

状態遷移（ユーザー側）
- ステータス: `draft` → `submitted` → `approved|rejected|returned`
- 画面操作:
  - 作成/更新は `draft` のみ（`submitted` 以降は原則編集不可）
  - `submitted` はユーザーの提出操作で遷移（`POST /:id/submit` または統合 `/submit`）
  - `approved|rejected|returned` は管理画面の承認系で遷移（管理 API 側）
  - `returned` の場合は編集再開→再提出可

状態遷移（管理側・提案）
- 管理 API: `/api/v1/admin/engineers/weekly-reports/:id/{approve|reject|return}`
- 権限: 管理者/マネージャー
- 入力: `{ "comment": string }`（reject/return は必須）
- エラー: 状態不整合（422/409）、存在なし（404）、認可（403/401）

バリデーション（抜粋）
- 期間: `start_date <= end_date`、7日範囲（月→日）
- 未来/過去制限: 未来週不可、古すぎる週不可（運用設定に従う）
- 必須: 勤務時間/内容（UI 側 Required 参照）、不完全データはエラー
- 時間: 1日最大16時間、週合計80時間、フォーマット `HH:mm`
- 提出条件: 提出期限超過は不可、提出可能状態でのみ遷移


TODO
- ステータス遷移/検証ルール
- 集計ロジックの仕様化（UI と整合）
