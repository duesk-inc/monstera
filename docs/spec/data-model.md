% データモデル（Draft）

目的
- 主要エンティティ/状態/関連の把握。詳細はモデル/マイグレーションを参照。

参照（モデル）
- 週報: `backend/internal/model/work_hour.go:1`, `backend/internal/model/daily_record.go:1`, `backend/internal/dto/weekly_report_dto.go:1`
- 休暇: `backend/internal/model/leave_request.go:1`, `backend/internal/model/user_leave_balance.go:1`, `backend/internal/model/leave_type.go:1`
- 経費: `backend/internal/model/expense.go:1`
- プロフィール/職務経歴: `backend/internal/model/profile.go:1`, `backend/internal/model/work_history.go:1`
- 通知: `backend/internal/model/notification.go:1`

参照（マイグレーション）
- `backend/migrations/*.sql`

列挙/状態（例）
- 週報ステータス: 未提出/下書き/提出/承認/差戻し（UI 定数: `frontend/src/constants/weeklyReport.ts:1`）
- 休暇種別/ステータス: 実装/UI 定数を突合

TODO
- ER 図（主要テーブル）
- 状態遷移図（週報/休暇/経費）

