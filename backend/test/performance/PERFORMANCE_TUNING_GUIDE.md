# パフォーマンスチューニングガイド

## 概要
500名規模の負荷に対応するためのパフォーマンスチューニングガイドラインです。

## パフォーマンス目標
- **レスポンスタイム**: 95パーセンタイルで2秒以内
- **スループット**: 100リクエスト/秒以上
- **エラー率**: 0.1%未満
- **同時接続数**: 500ユーザー

## データベース最適化

### 1. インデックス最適化
```sql
-- 週報検索の高速化
CREATE INDEX idx_weekly_reports_user_week ON weekly_reports(user_id, week_start, status);
CREATE INDEX idx_weekly_reports_status_week ON weekly_reports(status, week_start);

-- 日次記録検索の高速化
CREATE INDEX idx_daily_records_report_date ON daily_records(weekly_report_id, record_date);

-- 未提出者検索の高速化
CREATE INDEX idx_users_dept_status ON users(department_id, status);
```

### 2. クエリ最適化
- N+1問題の回避（Eager Loading）
- バッチ処理の活用
- 不要なJOINの削除

### 3. コネクションプール設定
```go
// backend/internal/config/database.go
db.SetMaxOpenConns(100)    // 最大接続数
db.SetMaxIdleConns(25)     // アイドル接続数
db.SetConnMaxLifetime(5 * time.Minute)
```

## アプリケーション最適化

### 1. キャッシュ戦略
```go
// Redis キャッシュの活用
- 週報一覧: 5分間キャッシュ
- 部署情報: 1時間キャッシュ
- ユーザー情報: 15分間キャッシュ
- 統計情報: 10分間キャッシュ
```

### 2. 非同期処理
```go
// リマインダー送信の非同期化
go func() {
    sendReminderEmail(user)
}()
```

### 3. バッチ処理
```go
// 一括更新の最適化
UPDATE weekly_reports 
SET status = 'submitted' 
WHERE id IN (?, ?, ?, ...)
```

## インフラ最適化

### 1. Nginxリバースプロキシ設定
```nginx
upstream backend {
    least_conn;
    server backend1:8080 weight=3;
    server backend2:8080 weight=2;
    server backend3:8080 weight=1;
}

location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    
    # キャッシュ設定
    proxy_cache_valid 200 302 10m;
    proxy_cache_valid 404 1m;
}
```

### 2. Docker リソース制限
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 2G
    reservations:
      cpus: '2'
      memory: 1G
```

### 3. MySQL チューニング
```ini
[mysqld]
# バッファプール（メモリの70-80%）
innodb_buffer_pool_size = 2G

# ログファイルサイズ
innodb_log_file_size = 256M

# 接続数
max_connections = 1000

# クエリキャッシュ
query_cache_size = 256M
query_cache_type = 1

# スレッドキャッシュ
thread_cache_size = 50

# ソートバッファ
sort_buffer_size = 4M
read_buffer_size = 4M
```

## モニタリング

### 1. アプリケーションメトリクス
- レスポンスタイム
- エラー率
- スループット
- 同時接続数

### 2. システムメトリクス
- CPU使用率
- メモリ使用率
- ディスクI/O
- ネットワークI/O

### 3. データベースメトリクス
- スロークエリ
- 接続数
- ロック待機時間
- バッファヒット率

## トラブルシューティング

### 症状: レスポンスタイムの増加
1. スロークエリログの確認
2. インデックスの確認
3. N+1問題の確認
4. キャッシュヒット率の確認

### 症状: 高いエラー率
1. 接続数の上限確認
2. タイムアウト設定の確認
3. メモリ不足の確認
4. ログファイルの確認

### 症状: メモリリーク
1. goroutineリークの確認
2. 大量データの保持確認
3. キャッシュサイズの確認
4. pprof でのプロファイリング

## ベストプラクティス

1. **段階的な負荷増加**
   - 本番環境への適用前に、段階的に負荷を増やしてテスト

2. **定期的なパフォーマンステスト**
   - リリース前には必ず負荷テストを実施
   - 月次でパフォーマンス劣化をチェック

3. **キャパシティプランニング**
   - ユーザー数の増加に合わせたリソース計画
   - ピーク時間帯の把握と対策

4. **継続的な最適化**
   - パフォーマンスメトリクスの継続的な監視
   - ボトルネックの早期発見と対処