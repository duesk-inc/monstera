# Performance Scripts

このディレクトリには、PostgreSQL移行に関連するパフォーマンステストとベンチマークスクリプトが含まれます。

## 目的

PostgreSQL環境でのパフォーマンス測定、最適化、ベンチマークテストを実行し、移行前後の性能比較を行います。

## 含まれるファイル

### SQLパフォーマンステスト
- `postgresql_index_performance_test.sql` - インデックス性能テストクエリ

## 使用方法

### 1. パフォーマンステストの実行

```bash
# PostgreSQL環境でのパフォーマンステスト
psql -U username -d database_name -f postgresql_index_performance_test.sql

# 実行時間の測定
\timing on
\i postgresql_index_performance_test.sql
```

### 2. Docker環境での実行

```bash
# Docker PostgreSQLコンテナでの実行
docker-compose exec postgres psql -U monstera -d monstera -f /path/to/postgresql_index_performance_test.sql
```

### 3. ベンチマーク比較

```bash
# MySQL vs PostgreSQL性能比較
./compare_mysql_postgresql_performance.sh
```

## テスト項目

### インデックス性能テスト
- SELECT クエリのパフォーマンス測定
- JOIN 操作の最適化確認
- WHERE句の条件検索性能
- ORDER BY句のソート性能

### 測定指標
- 実行時間 (execution time)
- プランニング時間 (planning time)  
- バッファヒット率 (buffer hit ratio)
- インデックススキャン効率

## 実行環境

### 前提条件
- PostgreSQLサーバーが起動していること
- 適切なデータベース権限があること
- 十分なテストデータが存在すること

### 推奨設定
```sql
-- パフォーマンス測定用設定
SET shared_preload_libraries = 'pg_stat_statements';
SET track_activity_query_size = 2048;
SET log_min_duration_statement = 1000;
```

## 結果の分析

### EXPLAIN ANALYZE の読み方
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```

### 重要な指標
- Execution Time: 実際の実行時間
- Planning Time: クエリプランの作成時間
- Shared Hit Blocks: バッファプールからの読み取りブロック数
- Shared Read Blocks: ディスクからの読み取りブロック数

## 注意事項

- パフォーマンステストは本番データに影響を与えないテスト環境で実行してください
- 大量のテストデータを使用する場合は、十分なディスク容量を確保してください
- ベンチマーク実行中は他のプロセスの影響を最小限に抑えてください
- MySQL環境と条件を揃えて比較測定を行ってください

## トラブルシューティング

### よくある問題
- メモリ不足によるパフォーマンス低下
- インデックスが適切に使用されない
- 統計情報の更新不足

### 対処方法
```sql
-- 統計情報の更新
ANALYZE;

-- インデックスの再構築
REINDEX INDEX index_name;

-- バキューム実行
VACUUM ANALYZE table_name;
```
EOF < /dev/null