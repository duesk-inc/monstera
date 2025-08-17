# APIクライアント移行 ロールバック手順書

**作成日**: 2025-08-17  
**対象**: APIクライアント新システムへの移行

## 🚨 緊急ロールバック手順

### 即座にロールバックが必要な場合（5分以内）

```bash
# 1. 環境変数を無効化
echo "NEXT_PUBLIC_USE_NEW_API=false" >> .env.local
echo "NEXT_PUBLIC_API_ROLLOUT_PERCENTAGE=0" >> .env.local

# 2. アプリケーションを再起動
npm run build
npm run start

# 3. キャッシュをクリア（必要に応じて）
rm -rf .next
npm run build
```

## 📊 ロールバック判定基準

以下の条件のいずれかが発生した場合、ロールバックを検討：

### Critical（即座にロールバック）
- [ ] 認証が完全に機能しない
- [ ] 本番環境でのエラー率が10%を超える
- [ ] データ損失の可能性がある
- [ ] セキュリティ脆弱性の発見

### High（1時間以内に判断）
- [ ] パフォーマンスが50%以上劣化
- [ ] 特定の機能が使用不可
- [ ] エラー率が5%を超える
- [ ] ユーザーからの重大なクレーム

### Medium（24時間以内に判断）
- [ ] パフォーマンスが20%以上劣化
- [ ] 一部の機能で不具合
- [ ] エラー率が2%を超える
- [ ] 開発チームから複数の問題報告

## 🔄 段階別ロールバック手順

### Phase 1-2: 移行準備段階

#### 状況
- Feature Flagは実装済みだが無効
- 新APIシステムは使用されていない

#### ロールバック手順
```bash
# ブランチを削除して元に戻す
git checkout main
git branch -D refactor/api-client-migration-phase1
```

### Phase 3-5: 部分移行段階

#### 状況
- 一部のモジュールが新システムに移行済み
- Feature Flagで制御中

#### ロールバック手順

##### Option 1: Feature Flagで無効化（推奨）
```bash
# .env.localを編集
NEXT_PUBLIC_USE_NEW_API=false
NEXT_PUBLIC_API_ROLLOUT_PERCENTAGE=0

# 再ビルド・再起動
npm run build
npm run start
```

##### Option 2: コードレベルでロールバック
```bash
# 移行前のコミットに戻す
git log --oneline | grep "Before migration"
git revert <commit-hash>

# 競合を解決
git status
# 必要に応じて手動で解決

# ビルド・テスト
npm run build
npm test
```

### Phase 6-7: 完全移行後

#### 状況
- 旧システムのコードが削除済み
- 全ユーザーが新システムを使用

#### ロールバック手順

##### 緊急対応
```bash
# 1. バックアップブランチから復元
git checkout backup/pre-migration-snapshot

# 2. hotfixブランチを作成
git checkout -b hotfix/emergency-rollback

# 3. 必要な修正を適用
# - セキュリティパッチ
# - 重要なバグ修正

# 4. マージ
git checkout main
git merge hotfix/emergency-rollback
```

## 🛠️ ロールバック実行チェックリスト

### 事前準備
- [ ] 現在の状態をバックアップ
- [ ] ロールバック理由を文書化
- [ ] 関係者に通知
- [ ] メンテナンスモードの準備（必要に応じて）

### 実行
- [ ] Feature Flagを無効化
- [ ] 環境変数を更新
- [ ] アプリケーションを再起動
- [ ] キャッシュをクリア
- [ ] ログを監視

### 事後確認
- [ ] 機能が正常に動作することを確認
- [ ] エラー率が正常範囲内
- [ ] パフォーマンスメトリクスを確認
- [ ] ユーザーからのフィードバックを収集

## 📝 ロールバック時のコミュニケーション

### 社内向け

#### Slackメッセージテンプレート
```
@channel
【APIクライアント移行ロールバック】

状況: [Critical/High/Medium]
理由: [具体的な問題]
影響: [影響を受ける機能/ユーザー]
対応: ロールバック実施中
完了予定: [時刻]

詳細: [問題の詳細URL]
```

### ステークホルダー向け

#### メールテンプレート
```
件名: APIクライアント移行の一時停止について

関係者各位

APIクライアント移行において、[問題の概要]が発生したため、
一時的に移行を停止し、従来のシステムに戻しております。

影響範囲: [影響を受ける機能]
復旧時刻: [予定時刻]
今後の対応: [対応計画]

ご迷惑をおかけして申し訳ございません。
```

## 🔍 ロールバック後の分析

### 収集すべき情報

1. **エラーログ**
```bash
# エラーログを収集
grep "ERROR" logs/application.log > rollback-errors.log
```

2. **メトリクス**
```bash
# パフォーマンスメトリクスを保存
node scripts/measure-baseline.js
mv docs/migration/baseline-metrics.json docs/migration/rollback-metrics.json
```

3. **ユーザーフィードバック**
- サポートチケット
- エラー報告
- パフォーマンス問題

### 原因分析テンプレート

```markdown
## ロールバック原因分析

### 発生日時
YYYY-MM-DD HH:MM:SS

### 問題の概要
[問題の説明]

### 根本原因
[技術的な原因]

### 影響範囲
- 影響を受けたユーザー数: 
- 影響を受けた機能:
- ダウンタイム:

### 再発防止策
1. [対策1]
2. [対策2]
3. [対策3]

### 学んだこと
[今回の経験から得た教訓]
```

## 🔄 再移行の準備

### ロールバック後のアクションアイテム

1. **問題の修正**
   - [ ] 根本原因の特定
   - [ ] 修正の実装
   - [ ] テストの追加/強化

2. **プロセスの改善**
   - [ ] 移行手順の見直し
   - [ ] テスト項目の追加
   - [ ] 監視項目の強化

3. **再移行計画**
   - [ ] 修正版の検証
   - [ ] 段階的ロールアウトの再設計
   - [ ] リスク評価の更新

## 📞 緊急連絡先

| 役割 | 担当者 | 連絡先 |
|------|--------|--------|
| プロジェクトリード | - | - |
| テックリード | - | - |
| インフラ担当 | - | - |
| QA担当 | - | - |

## 🔧 デバッグコマンド

### Feature Flag状態確認（ブラウザコンソール）
```javascript
// 現在の状態を確認
window.ApiMigrationDebugTools.showStatus();

// 強制的に旧APIを使用
window.ApiMigrationDebugTools.forceOldApi();

// パフォーマンステスト
window.ApiMigrationDebugTools.performanceTest('/api/v1/health');
```

### サーバーサイドログ確認
```bash
# エラーログを確認
tail -f logs/error.log | grep "API"

# リクエストログを確認
tail -f logs/access.log | grep "api/v1"

# Feature Flag関連のログ
grep "API Migration" logs/application.log
```

## 📋 ロールバック実施記録

| 日時 | フェーズ | 理由 | 対応者 | 結果 |
|------|---------|------|--------|------|
| - | - | - | - | - |

---

**重要**: このドキュメントは常に最新の状態に保ち、全チームメンバーがアクセスできる場所に保管してください。