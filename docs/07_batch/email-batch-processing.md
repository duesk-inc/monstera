# メール送信バッチ処理システム

## 概要

非同期でメール送信を行うキュー型バッチ処理システムです。再送制御、優先度設定、テンプレート機能、ブラックリスト管理を含む包括的なメール送信ソリューションを提供します。

## 主要機能

### 1. メール送信キュー

**特徴**:
- 非同期メール送信処理
- 優先度ベースの送信順序制御
- スケジュール送信（指定時刻での送信）
- バッチ処理による効率的な送信

**優先度レベル**:
- `urgent`: 緊急（即座に送信）
- `high`: 高優先度
- `normal`: 通常優先度（デフォルト）
- `low`: 低優先度

### 2. 再送制御システム

**再送ポリシー**:
- **最大再送回数**: 3回（設定可能）
- **再送間隔**: 指数バックオフ（5分 → 10分 → 20分 → 最大4時間）
- **ジッター**: ±25%のランダム遅延で負荷分散

**再送条件**:
- 一時的なネットワークエラー
- SMTPサーバーの一時的な障害
- レート制限による送信失敗

### 3. メールテンプレートシステム

**テンプレート機能**:
- 再利用可能なメールテンプレート
- 変数置換によるパーソナライゼーション
- HTML/テキスト両対応
- テンプレートのバージョン管理

**標準テンプレート**:
- `engineer_status_change`: ステータス変更通知
- `engineer_welcome`: 新規エンジニア歓迎メール
- `batch_process_notification`: バッチ処理完了通知

### 4. ブラックリスト管理

**機能**:
- 送信禁止メールアドレスの管理
- 理由とともに記録
- 一時的/永続的なブロック設定
- 自動ブロック解除（設定可能）

## データベース構造

### email_queue テーブル

```sql
CREATE TABLE email_queue (
    id CHAR(36) PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    body_html LONGTEXT,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    
    -- Queue management
    status ENUM('pending', 'sending', 'sent', 'failed', 'cancelled'),
    priority ENUM('low', 'normal', 'high', 'urgent'),
    scheduled_at TIMESTAMP NULL,
    
    -- Retry mechanism
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    next_retry_at TIMESTAMP NULL,
    
    -- Error tracking
    last_error TEXT,
    error_history TEXT,
    
    -- Metadata
    message_type VARCHAR(100),
    related_entity_id CHAR(36),
    related_entity_type VARCHAR(100),
    
    -- Processing tracking
    processed_at TIMESTAMP NULL,
    processed_by VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### email_templates テーブル

```sql
CREATE TABLE email_templates (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    body_html LONGTEXT,
    variables TEXT, -- JSON array
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 実行方法

### 1. CLIコマンドによる実行

```bash
# 基本的な単発実行
./email_processor

# バッチサイズ指定
./email_processor -batch-size=100

# 連続実行（60秒間隔）
./email_processor -continuous -interval=60

# ドライラン（実際の送信なし）
./email_processor -dry-run

# クリーンアップ実行
./email_processor -cleanup -cleanup-days=7

# 詳細ログ出力
./email_processor -verbose

# カスタム設定
./email_processor \
  -batch-size=50 \
  -max-retries=5 \
  -retry-delay-min=10 \
  -retry-delay-max=480 \
  -timeout=60
```

### 2. プログラムからのメール送信

```go
// ステータス変更通知の送信
err := emailBatchService.EnqueueStatusChangeNotification(
    ctx,
    engineerID,
    "山田太郎",
    "yamada@duesk.co.jp",
    "standby",
    "on_project",
    "新プロジェクトへのアサイン",
    "管理者",
)

// ウェルカムメールの送信
err := emailBatchService.EnqueueWelcomeEmail(
    ctx,
    engineerID,
    "田中花子",
    "tanaka@duesk.co.jp",
    "EMP-2024-0001",
    "temp_password123",
)

// カスタムメールの送信
email := &models.EmailQueue{
    Subject:     "カスタム通知",
    Body:        "メッセージ本文",
    ToEmail:     "user@duesk.co.jp",
    FromEmail:   "noreply@monstera.com",
    Priority:    models.EmailPriorityHigh,
    MessageType: "custom",
    MaxAttempts: 3,
}
err := emailRepo.Enqueue(ctx, email)
```

### 3. スケジューラー連携

```bash
# crontabの設定例

# 5分ごとに実行
*/5 * * * * /path/to/email_processor -batch-size=50

# 毎時0分に大きなバッチで実行
0 * * * * /path/to/email_processor -batch-size=200

# 毎日午前2時にクリーンアップ
0 2 * * * /path/to/email_processor -cleanup -cleanup-days=7
```

## 設定項目

### 環境変数

| 変数名 | 説明 | デフォルト値 | 例 |
|--------|------|-------------|-----|
| `EMAIL_SMTP_HOST` | SMTPサーバーホスト | localhost | smtp.gmail.com |
| `EMAIL_SMTP_PORT` | SMTPサーバーポート | 587 | 587 |
| `EMAIL_SMTP_USERNAME` | SMTP認証ユーザー名 | - | user@duesk.co.jp |
| `EMAIL_SMTP_PASSWORD` | SMTP認証パスワード | - | password123 |
| `EMAIL_FROM_ADDRESS` | デフォルト送信者アドレス | noreply@monstera.com | system@company.com |
| `EMAIL_FROM_NAME` | デフォルト送信者名 | Monstera System | 会社システム |

### CLIオプション

| オプション | 説明 | デフォルト値 | 範囲 |
|-----------|------|-------------|------|
| `-batch-size` | 1回のバッチで処理するメール数 | 50 | 1-1000 |
| `-max-retries` | 最大再送回数 | 3 | 1-10 |
| `-retry-delay-min` | 最小再送間隔（分） | 5 | 1-60 |
| `-retry-delay-max` | 最大再送間隔（分） | 240 | 60-1440 |
| `-timeout` | 1メールあたりの処理タイムアウト（秒） | 30 | 5-300 |
| `-interval` | 連続実行時の間隔（秒） | 60 | 10-3600 |
| `-cleanup-days` | 処理済みメール保持日数 | 7 | 1-365 |

## 監視とログ

### ログレベル

**INFO**: 通常の処理状況
```
INFO  Starting email batch processing  {"worker_id": "email-worker-1234", "batch_size": 50}
INFO  Email sent successfully  {"email_id": "uuid", "to": "user@duesk.co.jp"}
INFO  Email batch processing completed  {"total_sent": 25, "total_failed": 2}
```

**WARN**: 注意が必要な状況
```
WARN  Email exceeded max retry attempts  {"email_id": "uuid", "to": "user@duesk.co.jp", "attempts": 3}
WARN  Attempted to queue blacklisted email  {"to_email": "blocked@duesk.co.jp"}
```

**ERROR**: エラー状況
```
ERROR Failed to send email  {"email_id": "uuid", "to": "user@duesk.co.jp", "error": "SMTP connection failed"}
ERROR Failed to connect to SMTP server  {"host": "smtp.example.com", "error": "connection timeout"}
```

### 統計情報

バッチ処理では以下の統計情報を提供：

```json
{
  "status_distribution": {
    "pending": 120,
    "sending": 5,
    "sent": 1500,
    "failed": 25,
    "cancelled": 2
  },
  "priority_distribution": {
    "urgent": 2,
    "high": 15,
    "normal": 100,
    "low": 8
  },
  "ready_to_send": 95,
  "retryable": 10
}
```

### メトリクス監視

重要なメトリクス：
- **送信成功率**: `sent / (sent + failed)`
- **平均処理時間**: バッチあたりの処理時間
- **キュー滞留時間**: 登録から送信までの時間
- **再送率**: `retried / total_attempts`

## エラーハンドリング

### 一時的エラー

**対象**:
- ネットワーク接続エラー
- SMTPサーバーの一時的障害
- レート制限

**処理**:
- 指数バックオフで再送スケジュール
- 最大再送回数まで自動リトライ
- 詳細なエラーログ記録

### 永続的エラー

**対象**:
- 無効なメールアドレス
- 認証エラー
- 設定エラー

**処理**:
- 即座に失敗としてマーク
- 管理者への通知
- 手動確認が必要

### 復旧手順

1. **SMTP接続問題**
   ```bash
   # 設定確認
   ./email_processor -dry-run -verbose
   
   # 接続テスト
   telnet smtp.example.com 587
   ```

2. **大量の失敗メール**
   ```bash
   # 失敗メールの統計確認
   ./email_processor -verbose
   
   # 特定期間の失敗メールを再送
   # (データベースで直接ステータスを更新)
   ```

3. **キューの詰まり**
   ```bash
   # バッチサイズを大きくして処理
   ./email_processor -batch-size=200
   
   # 並列処理（複数プロセス起動）
   ./email_processor -continuous &
   ./email_processor -continuous &
   ```

## セキュリティ

### 認証情報の管理

- SMTP認証情報は環境変数で管理
- パスワードは暗号化して保存
- 定期的なパスワード変更

### メール内容の検証

- HTMLメールのサニタイゼーション
- スパムフィルター対策
- フィッシング対策の検証

### アクセス制御

- バッチ処理の実行権限制限
- テンプレート変更の承認フロー
- ブラックリスト管理の権限制御

## パフォーマンス最適化

### データベース最適化

**インデックス設定**:
```sql
-- 送信対象の高速検索
INDEX idx_email_queue_pending_ready (status, scheduled_at, next_retry_at);

-- 優先度順ソート
INDEX idx_email_queue_status_priority (status, priority);

-- クリーンアップ用
INDEX idx_email_queue_processed_at (processed_at);
```

### バッチサイズの調整

**推奨設定**:
- **小規模環境**: batch-size=25, interval=60秒
- **中規模環境**: batch-size=50, interval=30秒
- **大規模環境**: batch-size=100, interval=15秒

### 並列処理

複数ワーカーでの並列処理：
```bash
# ワーカー1: 高優先度メール
./email_processor -continuous -interval=30 &

# ワーカー2: 通常優先度メール
./email_processor -continuous -interval=60 &

# ワーカー3: 低優先度メール
./email_processor -continuous -interval=300 &
```

## トラブルシューティング

### よくある問題

1. **メールが送信されない**
   - SMTP設定の確認
   - ネットワーク接続の確認
   - 認証情報の確認

2. **大量の失敗メール**
   - レート制限の確認
   - ブラックリスト状況の確認
   - SMTPサーバー状態の確認

3. **処理が遅い**
   - バッチサイズの調整
   - 並列処理の検討
   - データベースパフォーマンスの確認

### ログ分析

```bash
# エラーメールの分析
grep "Failed to send email" /var/log/email_processor.log | wc -l

# 成功率の計算
grep "Email sent successfully" /var/log/email_processor.log | wc -l

# 再送が多いメールの特定
grep "Scheduled email retry" /var/log/email_processor.log
```

### 緊急時の対応

**全メール送信停止**:
```sql
UPDATE email_queue 
SET status = 'cancelled' 
WHERE status IN ('pending', 'failed');
```

**特定タイプのメール停止**:
```sql
UPDATE email_queue 
SET status = 'cancelled' 
WHERE message_type = 'welcome' AND status = 'pending';
```

**緊急メールの優先送信**:
```sql
UPDATE email_queue 
SET priority = 'urgent', scheduled_at = NULL 
WHERE message_type = 'urgent_notification';
```