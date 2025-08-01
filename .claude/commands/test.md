# TEST フェーズ

# ユーザの入力
#$ARGUMENTS

## 目的
実装・修正・最適化されたコードを包括的にテストし、品質を保証する。開発タイプに応じた適切なテスト戦略を適用する。

## 注意事項
- **Model: Sonnet** - 通常のテスト実行はSonnetで十分
- ただし、パフォーマンステストの分析や複雑な問題の診断には**ultrathink**を使用
- Serenaを活用して、変更の影響範囲に基づいた効率的なテストを実施すること

## 必要な入力
- 開発タイプ（新規機能/バグ修正/リファクタリング/DB最適化/機能削除）
- 関連するドキュメント（plan/implement/fix等）
- テストの重点項目

## Serena活用ポイント
```bash
# 1. 変更箇所の特定
find_referencing_symbols("変更されたシンボル")  # 影響範囲の確認

# 2. 既存テストの確認
search_for_pattern("test.*変更対象")
find_symbol("Test変更対象", depth=1)

# 3. テストカバレッジの確認
search_for_pattern("func Test|test_|describe")
```

## 開発タイプ別テスト戦略

### 新規機能開発
- **重点**: 機能の正常動作、エッジケース、エラーハンドリング
- **必須**: 単体テスト、統合テスト、E2Eテスト
- **確認項目**: API仕様準拠、UI/UX要件充足

### バグ修正
- **重点**: バグの解消確認、リグレッション防止
- **必須**: バグ再現テスト、修正確認テスト、リグレッションテスト
- **確認項目**: 根本原因の解決、副作用なし

### リファクタリング
- **重点**: 機能の維持、パフォーマンス改善
- **必須**: 全既存テスト、パフォーマンステスト、統合テスト
- **確認項目**: 外部仕様の維持、性能指標の改善

### DB最適化
- **重点**: クエリパフォーマンス、データ整合性
- **必須**: パフォーマンステスト、負荷テスト、データ整合性テスト
- **確認項目**: 応答時間短縮、スループット向上

### 機能削除
- **重点**: 関連機能への影響、データ整合性
- **必須**: 影響範囲テスト、リグレッションテスト、E2Eテスト
- **確認項目**: 削除後の正常動作、エラーなし

## テスト種別と実行方法

### 1. 単体テスト
```bash
# バックエンド
cd backend && go test ./... -v -cover

# フロントエンド
cd frontend && npm test -- --coverage
```

### 2. 統合テスト
```bash
# Docker環境で実行
docker-compose up -d
make test-integration
```

### 3. E2Eテスト
```bash
# Playwrightを使用
cd frontend && npm run test:e2e
```

### 4. パフォーマンステスト
```bash
# 負荷テストツール使用
make test-performance
# ベンチマーク結果の比較
```

### 5. リグレッションテスト
```bash
# 全テストスイート実行
make test-all
```

## タスクに含まれるべきTODO
1. ユーザの指示を理解し、テスト戦略を決定
2. 開発タイプに応じたテスト計画を立案
3. Serenaで変更の影響範囲を分析
4. 環境準備
   - Docker Compose環境の起動（必要な場合）
   - テストデータの準備
5. **開発タイプ別のテスト実行**
   - 単体テスト（該当箇所）
   - 統合テスト（影響範囲）
   - E2Eテスト（主要フロー）
   - パフォーマンステスト（必要に応じて）
   - リグレッションテスト（重要度に応じて）
6. **テスト結果の分析**
   - カバレッジ確認
   - パフォーマンス指標確認
   - エラー/警告の確認
7. **問題があった場合の対応**
   - エラーログの詳細分析
   - 根本原因の特定
   - 修正方針の提案
8. テスト結果を `docs/test/test_{TIMESTAMP}.md` に記録
9. 改善されたテストパターンをSerenaメモリに保存
10. 環境のクリーンアップ
11. `afplay /System/Library/Sounds/Sosumi.aiff` で完了通知
12. テスト結果サマリーをコンソール出力

## テストチェックリスト
- [ ] 単体テストカバレッジ80%以上
- [ ] 統合テストで主要フロー確認
- [ ] E2Eテストで実使用シナリオ確認
- [ ] パフォーマンス基準を満たす
- [ ] リグレッションなし
- [ ] セキュリティテスト合格
- [ ] エラーハンドリング適切

## 出力ファイル
- `docs/test/test_{TIMESTAMP}.md`

## 最終出力形式
### テスト成功の場合
status: SUCCESS
next: DONE
details: "全テスト合格。test_{TIMESTAMP}.mdに詳細記録。カバレッジ: XX%、パフォーマンス: XX%改善。"

### 軽微な問題がある場合
status: MINOR_ISSUES
next: IMPLEMENT
details: "主要テスト合格、軽微な問題あり。test_{TIMESTAMP}.mdに詳細。[問題の概要]の修正推奨。"

### 重大な問題がある場合
status: CRITICAL_FAILURE
next: BUG-FIX or REFACTOR-ANALYZE
details: "重大な問題発見。test_{TIMESTAMP}.mdに詳細。[問題の概要]。即時対応必要。"

### パフォーマンス問題の場合
status: PERFORMANCE_ISSUE
next: DB-OPTIMIZATION or REFACTOR-ANALYZE
details: "性能基準未達。test_{TIMESTAMP}.mdに詳細。[具体的な指標]。最適化必要。"