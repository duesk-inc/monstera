# DB-OPTIMIZATION フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
データベースのパフォーマンスを分析し、クエリ最適化、インデックス設計、スキーマ改善を通じてシステム全体の性能を向上させる。

## 注意事項
- **Model: Opus** - DB最適化は影響範囲が広いため、必ず**ultrathink**で深く検討すること
- 本番環境への影響を最小限に抑えるため、段階的な適用を計画すること
- バックアップとロールバック計画を必ず用意すること
- Serenaでコード内のクエリパターンを網羅的に分析すること

## 必要な入力
- パフォーマンス問題の症状（遅いクエリ、高負荷など）
- 対象テーブル/機能（指定がある場合）
- 許容ダウンタイム

## Serena活用ポイント
```bash
# 1. クエリパターンの分析
search_for_pattern("db\.Query|db\.Exec")  # Goの場合
search_for_pattern("SELECT|INSERT|UPDATE|DELETE")
find_symbol("Repository", depth=2)

# 2. トランザクション範囲の確認
search_for_pattern("BeginTx|Commit|Rollback")
search_for_pattern("transaction|tx")

# 3. N+1問題の検出
search_for_pattern("for.*{.*Query")
find_referencing_symbols("データ取得関数")
```

## タスクに含まれるべきTODO
1. ユーザの問題を理解し、最適化作業開始をコンソールで通知
2. 現在のブランチを確認し、`optimization/db-<対象>` ブランチを作成
3. 現在のDB構造とパフォーマンス状況を確認
4. **ultrathinkで問題の根本原因を深く分析**
5. **現状分析**
   - スロークエリログの確認
   - `EXPLAIN ANALYZE` での実行計画確認
   - テーブルサイズとレコード数の確認
   - 既存インデックスの確認
6. **コード内のクエリパターン分析**
   - Serenaで全クエリを抽出
   - N+1問題の検出
   - 不要なフルテーブルスキャン
   - 非効率なJOIN
7. **インデックス分析**
   - 使用されていないインデックスの特定
   - 不足しているインデックスの特定
   - 複合インデックスの最適化
8. **スキーマ設計の見直し**
   - 正規化/非正規化の検討
   - パーティショニングの検討
   - データ型の最適化
9. **クエリ最適化**
   - 複雑なクエリの書き換え
   - サブクエリの最適化
   - バッチ処理への変更検討
10. **キャッシュ戦略**
    - Redisキャッシュの活用
    - マテリアライズドビューの検討
11. **最適化計画の作成**
    - 優先順位付け
    - 影響分析
    - 段階的適用計画
12. **テスト計画**
    - パフォーマンステスト
    - 負荷テスト
    - ロールバック手順
13. マイグレーションファイルの作成
14. 最適化前後のベンチマーク結果記録
15. 最適化詳細を `docs/optimization/db-optimization_{TIMESTAMP}.md` に保存
16. 最適化パターンをSerenaメモリに保存
17. Draft PRの作成または更新
18. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
19. 最適化結果、改善率、ブランチ名をコンソール出力

## 分析チェックリスト
- [ ] スロークエリの特定
- [ ] インデックスの利用状況
- [ ] テーブル統計情報の更新状況
- [ ] ロック競合の有無
- [ ] コネクションプールの設定
- [ ] クエリキャッシュの有効性
- [ ] パーティショニングの必要性

## パフォーマンス測定コマンド
```bash
# PostgreSQLの場合
# スロークエリの確認
docker-compose exec postgres psql -U postgres -d monstera -c "
SELECT query, calls, mean_exec_time, total_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"

# テーブルサイズの確認
docker-compose exec postgres psql -U postgres -d monstera -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# インデックス利用状況
docker-compose exec postgres psql -U postgres -d monstera -c "
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan;"
```

## 出力ファイル
- `docs/optimization/db-optimization_{TIMESTAMP}.md`
- `backend/migrations/xxx_optimization.sql`（必要に応じて）

## 最終出力形式
### 最適化完了の場合
status: SUCCESS
next: TEST
details: "DB最適化完了。db-optimization_{TIMESTAMP}.mdに詳細記録。パフォーマンス改善率: XX%。テストフェーズへ移行。"

### 段階的最適化の場合
status: PHASE_COMPLETE
next: DB-OPTIMIZATION
details: "Phase 1最適化完了。db-optimization_{TIMESTAMP}.mdに詳細記録。次フェーズ: インデックス最適化。"

### 大規模な変更が必要な場合
status: NEED_ARCHITECTURE_CHANGE
next: IMPLEMENTATION-PROPOSAL
details: "スキーマの大幅な見直しが必要。db-optimization_{TIMESTAMP}.mdに詳細記録。アーキテクチャ提案へ移行。"