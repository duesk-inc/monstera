# DebugLoggerクラス リファクタリング分析

## 分析日
2025-01-18

## 主要な問題点

### 1. コード重複（48%が重複）
- 11個のメソッドで同じパターンの繰り返し
- console.log文の重複
- Axiosエラー処理の重複

### 2. インターフェースの不統一
- errorメソッドだけ異なる引数パターン
- 存在しないメソッド（warn、apiResponse）の呼び出し

### 3. 拡張性の欠如
- ログレベルなし
- 出力先固定（console）
- フィルタリング不可
- カスタマイズ不可

## 使用状況
- 282箇所で使用（30ファイル）
- info（84回）、apiError（74回）が最頻出

## 推奨リファクタリング戦略

### 内部構造の改善
```typescript
// 共通ロジックの抽出
private static logInternal(level: string, config: LogConfig, message: string, data?: any) {
  if (!this.isDevelopment) return;
  const formatted = this.format(level, config, message, data);
  console.log(formatted);
}
```

### Strategy パターン
- ログフォーマッターの抽象化
- 出力先の抽象化
- レベルベースフィルタリング

### Builder パターン
- メソッドチェーンによる直感的なAPI
- 型安全性の向上

## リスクと緩和策

### 高リスク
- 282箇所への影響 → Adapter パターンで既存API維持

### 中リスク
- パフォーマンス → 本番環境では最適化ビルド
- 学習コスト → 段階的移行とドキュメント

## 段階的実装計画

### Phase 1: 内部リファクタ（2時間）
- 重複削除
- 共通処理抽出

### Phase 2: API統一（1時間）
- インターフェース統一
- 不足メソッド追加

### Phase 3: 機能拡張（3時間）
- ログレベル
- カスタマイズ可能な出力

### Phase 4: 移行（2時間）
- 移行ガイド
- 自動移行スクリプト

## 期待効果
- コード量49%削減（312行→160行）
- 重複100%削除
- 保守工数1/5

## 関連情報
- 現在のバグ修正で46箇所のlog()エラーを修正済み
- 予防措置（型定義、ESLint、CI/CD）実装済み