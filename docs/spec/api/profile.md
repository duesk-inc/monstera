% Profile API（Draft）

ベース: `/api/v1/profile`
（実装参照: `backend/cmd/server/main.go:643`）

エンドポイント
- `GET /` プロフィール取得
- `GET /with-work-history` 職務経歴付きプロフィール取得
- `POST /` プロフィール保存
- `POST /temp-save` 一時保存
- `GET /history` 履歴一覧
- `GET /history/latest` 最新履歴取得
- `GET /common-certifications` 共通資格一覧
- `GET /technology-categories` 技術カテゴリ一覧

レスポンス例
- `GET /api/v1/profile`
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "email": "user@example.com",
    "first_name": "太郎",
    "last_name": "山田",
    "education": "xxx大学",
    "nearest_station": "渋谷",
    "can_travel": 3,
    "appeal_points": "xxxxx",
    "certifications": [ { "id": "c1", "name": "基本情報", "acquired_date": "2023-04" } ]
  }
  ```

- `GET /api/v1/profile/with-work-history`
  ```json
  {
    "profile": { /* 上記 profile と同等 */ },
    "work_histories": [
      {
        "id": "wh1",
        "project_name": "案件A",
        "start_date": "2024-01-01",
        "end_date": null,
        "industry": 1,
        "project_overview": "...",
        "role": "SE",
        "team_size": 5,
        "processes": [1,2,3]
      }
    ]
  }
  ```

リクエスト例
- `POST /api/v1/profile`（更新）
  - Body（camel→snake に変換して送信）
  ```json
  {
    "education": "xxx大学",
    "nearestStation": "渋谷",
    "canTravel": 3,
    "certifications": [ { "name": "基本情報", "acquiredAt": "2023-04" } ],
    "appealPoints": "xxxxx",
    "workHistory": []
  }
  ```

- `POST /api/v1/profile/temp-save`
  ```json
  {
    "education": "xxx大学",
    "nearestStation": "渋谷",
    "canTravel": 3,
    "certifications": [ { "name": "基本情報", "acquiredAt": "2023-04" } ],
    "appealPoints": "xxxxx",
    "workHistory": [],
    "isTempSaved": true
  }
  ```

エラー/備考
- フロントは camelCase、API は snake_case 基本。送受信時に変換
- `canTravel` は数値（1=可能, 2=不可, 3=要相談）
- 履歴 API は `version` クエリ必須（`/history?version=2`）
 - エラーフォーマットは標準のエラーモデルを参照（`docs/spec/api/errors.md`）

バリデーション
- 必須: `education`, `nearest_station`, `can_travel`
- `certifications[].acquired_at`: `YYYY-MM` 形式
- 文字数/範囲: `appeal_points`（UI 制限あり）、`can_travel` は `1..3`

TODO
- スキーマ/DTO の明記
- バリデーション/権限
