# エンジニアステータス自動更新バッチ処理

## 概要

エンジニアのプロジェクト終了時や長期待機時に、ステータスを自動更新するバッチ処理システムです。

## バッチ処理の種類

### 1. プロジェクト終了時ステータス更新バッチ

**目的**: プロジェクトが終了したエンジニアのステータスを「プロジェクト中」から「待機中」に自動更新

**実行条件**:
- `engineer_status = "on_project"` のエンジニア
- プロジェクト履歴で `end_date` が当日以前
- 現在進行中のプロジェクトがない

**処理内容**:
1. 対象エンジニアの検索
2. ステータスを `"standby"` に更新
3. ステータス履歴に記録（理由: "プロジェクト終了による自動ステータス更新"）

### 2. 長期待機ステータス更新バッチ

**目的**: 長期間待機中のエンジニアを「長期休暇」ステータスに更新

**実行条件**:
- `engineer_status = "standby"` のエンジニア
- 指定日数以上待機状態が継続

**処理内容**:
1. 待機期間が閾値を超えるエンジニアの検索
2. ステータスを `"long_leave"` に更新
3. ステータス履歴に記録（理由: "N日以上待機による自動ステータス更新"）

## 実行方法

### 1. CLIコマンドによる実行

```bash
# プロジェクト終了バッチ実行
./engineer_status_update -type=project-end

# 長期待機バッチ実行（30日閾値）
./engineer_status_update -type=long-standby -standby-days=30

# ドライラン（実際の更新は行わない）
./engineer_status_update -type=project-end -dry-run

# 統計情報表示
./engineer_status_update -type=stats

# 詳細ログ出力
./engineer_status_update -type=project-end -verbose
```

### 2. APIによる実行

```bash
# プロジェクト終了バッチ実行
curl -X POST http://localhost:8080/api/v1/admin/batch/project-end \
  -H "Authorization: Bearer <token>"

# 長期待機バッチ実行（45日閾値）
curl -X POST "http://localhost:8080/api/v1/admin/batch/long-standby?days=45" \
  -H "Authorization: Bearer <token>"

# 統計情報取得
curl -X GET http://localhost:8080/api/v1/admin/batch/stats \
  -H "Authorization: Bearer <token>"

# ヘルスチェック
curl -X GET http://localhost:8080/api/v1/admin/batch/health \
  -H "Authorization: Bearer <token>"
```

### 3. スケジューラーによる自動実行

```go
// バッチスケジューラーの設定例
config := &services.BatchConfig{
    ProjectEndCheckInterval:    24 * time.Hour,      // 毎日実行
    LongStandbyCheckInterval:   7 * 24 * time.Hour,  // 週1回実行
    LongStandbyThresholdDays:   30,                  // 30日閾値
    EnableProjectEndBatch:      true,
    EnableLongStandbyBatch:     true,
}

scheduler := services.NewBatchSchedulerService(db, logger)
scheduler.Start(config)
```

## 設定項目

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `BATCH_PROJECT_END_INTERVAL` | プロジェクト終了チェック間隔（時間） | 24 |
| `BATCH_LONG_STANDBY_INTERVAL` | 長期待機チェック間隔（時間） | 168 (1週間) |
| `BATCH_LONG_STANDBY_THRESHOLD` | 長期待機の閾値（日数） | 30 |
| `BATCH_ENABLE_PROJECT_END` | プロジェクト終了バッチ有効化 | true |
| `BATCH_ENABLE_LONG_STANDBY` | 長期待機バッチ有効化 | true |

### 実行時オプション

| オプション | 説明 | 例 |
|-----------|------|-----|
| `-type` | バッチタイプ | `project-end`, `long-standby`, `stats` |
| `-standby-days` | 長期待機の閾値日数 | `30`, `45`, `60` |
| `-dry-run` | ドライラン実行 | `true`, `false` |
| `-verbose` | 詳細ログ出力 | `true`, `false` |
| `-config` | 設定ファイルパス | `.env`, `config/prod.env` |

## ログ出力

### 正常処理時のログ例

```
INFO  Starting project end status update batch process
INFO  Found engineers for status update  {"count": 3}
INFO  Successfully updated engineer status to standby  {"engineer_id": "uuid", "name": "山田 太郎"}
INFO  Project end status update batch process completed  {"updated_count": 3, "error_count": 0, "duration": "1.2s"}
```

### エラー処理時のログ例

```
ERROR Failed to update engineer status  {"engineer_id": "uuid", "name": "田中 花子", "error": "database connection lost"}
ERROR Batch process completed with 1 errors
```

## 統計情報

バッチ処理では以下の統計情報を提供します：

```json
{
  "status_distribution": {
    "on_project": 25,
    "standby": 8,
    "long_leave": 2,
    "resigned": 1
  },
  "engineers_with_ended_projects": 3,
  "long_term_standby_engineers": 2,
  "scheduler_running": true,
  "last_check_time": "2024-01-15T10:30:00Z"
}
```

## エラーハンドリング

### トランザクション管理
- 各エンジニアの更新は個別のトランザクションで実行
- 一部の更新が失敗しても他の処理は継続
- 失敗したケースはログに記録

### リトライ機能
- データベース接続エラー時は自動リトライ（最大3回）
- 一時的なエラーに対する耐性を確保

### 監視とアラート
- バッチ実行失敗時のログ出力
- 統計情報による処理状況の監視
- ヘルスチェックエンドポイントによる死活監視

## セキュリティ

### 権限管理
- バッチ実行APIは管理者権限が必要
- CLIコマンドはサーバー管理者のみ実行可能

### 監査ログ
- 全てのステータス変更は履歴として記録
- 変更理由と実行時刻を含む詳細な記録

## トラブルシューティング

### よくある問題

1. **バッチが実行されない**
   - スケジューラーの起動状態確認
   - データベース接続状態確認
   - 設定ファイルの内容確認

2. **更新対象が見つからない**
   - データの整合性確認
   - プロジェクト履歴の設定確認
   - 日付計算のロジック確認

3. **パフォーマンスの問題**
   - インデックスの設定確認
   - バッチサイズの調整
   - 実行間隔の見直し

### デバッグ方法

```bash
# 詳細ログでバッチ実行
./engineer_status_update -type=project-end -verbose

# 統計情報で現状確認
./engineer_status_update -type=stats

# ドライランで対象確認
./engineer_status_update -type=project-end -dry-run
```

## 運用ガイドライン

### 推奨スケジュール
- **プロジェクト終了バッチ**: 毎日午前2時実行
- **長期待機バッチ**: 毎週月曜日午前3時実行

### 監視ポイント
- バッチ実行の成功/失敗状況
- 処理時間の監視
- 更新対象エンジニア数の推移
- エラー発生率の監視

### メンテナンス
- 月次でバッチログの確認
- 四半期でパフォーマンス見直し
- 半年でビジネスルールの見直し