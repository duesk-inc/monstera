# Claude Commands と Serena の統合

## .claude/commands の役割
プロジェクトには以下の開発フローコマンドが定義されています：

1. **investigate.md** - 調査フェーズ
   - 問題の詳細分析
   - 関連コードの特定
   - 解決策の検討

2. **plan.md** - 計画フェーズ
   - 実装計画の作成
   - タスク分割
   - 技術的判断の記録

3. **implement.md** - 実装フェーズ
   - 計画に基づく実装
   - 段階的なコミット
   - Draft PR の作成・更新

4. **test.md** - テストフェーズ
   - テストの実行
   - 品質チェック
   - 問題の修正

## Serena での改善方法

### 1. 調査精度の向上
```
# 従来の方法（精度が低い）
grep -r "keyword" .

# Serenaの方法（精度が高い）
find_symbol("ClassName")
find_referencing_symbols("methodName", "path/to/file.go")
search_for_pattern("specific_pattern")
```

### 2. 実装精度の向上
```
# 従来の方法（穴だらけ）
- ファイル全体を読み込んで編集
- 参照箇所の見落とし

# Serenaの方法（正確）
- get_symbols_overview() で構造把握
- replace_symbol_body() で安全な置換
- find_referencing_symbols() で影響範囲確認
```

### 3. デグレ防止
```
# 実装前に必ず実行
find_referencing_symbols("変更対象シンボル")
→ 全ての参照箇所を把握してから変更

# 変更後に必ず実行
think_about_collected_information()
think_about_task_adherence()
```

### 4. ドキュメント遵守
```
# プロジェクト知識の永続化
write_memory("implementation_patterns", "実装パターン")
write_memory("common_pitfalls", "よくある間違い")

# 作業開始時に必ず参照
read_memory("coding_conventions")
read_memory("task_completion_checklist")
```

## 推奨ワークフロー

1. **タスク開始時**
   - 関連メモリを全て読み込む
   - get_symbols_overview() で全体構造把握

2. **実装時**
   - find_symbol() で正確な位置特定
   - find_referencing_symbols() で影響確認
   - replace_symbol_body() で安全な変更

3. **完了前**
   - think_about_* ツールで確認
   - task_completion_checklist を実行
   - 新しい知見を write_memory() で保存