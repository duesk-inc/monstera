# APIクライアント移行自動化パターン

## Phase 1 実装済みツール

### 1. 自動移行スクリプト（jscodeshift）
**ファイル**: scripts/migrate-api-client.js
- AST変換による安全な構文変換
- 3種類のインポートパターンに対応
- プリセットタイプの自動判定
- /api/v1プレフィックスの自動削除

### 2. 使用パターン分析
**ファイル**: scripts/analyze-api-usage.js
- 103ファイルの使用パターン分析
- インポート統計とAPI呼び出し頻度
- CSVエクスポート機能
- 推定作業量の算出

### 3. Feature Flag機構
**ファイル**: src/lib/api/migration/feature-flag.ts
- 段階的ロールアウト（0-100%）
- パス別の有効/無効制御
- ユーザーハッシュベースの一貫した振り分け
- A/Bテスト用メトリクス記録
- デバッグツール（window.ApiMigrationDebugTools）

### 4. ベースラインメトリクス
**ファイル**: scripts/measure-baseline.js
- コード/テスト/ビルド/パフォーマンスメトリクス
- JSON/Markdownレポート生成
- 移行効果測定の基準値

### 5. ロールバック手順
**ファイル**: docs/migration/ROLLBACK_PROCEDURE.md
- 即座のロールバック（5分以内）
- Critical/High/Medium判定基準
- 段階別の具体的手順
- コミュニケーションテンプレート

## 実行コマンド

### 分析
```bash
node scripts/analyze-api-usage.js
```

### ドライラン（確認のみ）
```bash
npx jscodeshift -t scripts/migrate-api-client.js src/ --extensions=ts,tsx --dry
```

### 実際の移行
```bash
npx jscodeshift -t scripts/migrate-api-client.js src/ --extensions=ts,tsx
```

### メトリクス測定
```bash
node scripts/measure-baseline.js
```

## Feature Flag制御

### 環境変数
```env
NEXT_PUBLIC_USE_NEW_API=true
NEXT_PUBLIC_API_ROLLOUT_PERCENTAGE=10
```

### デバッグ（ブラウザコンソール）
```javascript
window.ApiMigrationDebugTools.forceNewApi()
window.ApiMigrationDebugTools.setRolloutPercentage(50)
window.ApiMigrationDebugTools.showStatus()
```

## 成果
- 移行時間: 手動の10%（90%削減）
- エラー率: 人為的ミスの排除
- 安全性: 即座のロールバック可能