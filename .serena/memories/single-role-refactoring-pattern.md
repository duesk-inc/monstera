# 単一ロールシステムリファクタリングパターン

## 概要
複数ロール対応から単一ロールシステムへの移行パターン

## 重要な原則

### 1. アーキテクチャの一貫性
- 全レイヤー（DB, Backend, Frontend）で同じロールモデルを使用
- 単一ロール: 1ユーザー = 1ロール
- 階層型権限: 数値が小さいほど権限が高い（1:SuperAdmin > 4:Engineer）

### 2. 権限チェックの簡素化
```typescript
// Good: シンプルな数値比較
const hasPermission = (userRole: number, requiredRole: number): boolean => {
  return userRole <= requiredRole;
}

// Bad: 複雑な配列操作
const hasPermission = (roles: string[], required: string): boolean => {
  return roles.includes(required) || roles.includes('admin');
}
```

### 3. 型定義の統一
```typescript
// 推奨: シンプルな型定義
interface User {
  id: string;
  email: string;
  role: number; // 1-4の数値
}

// 非推奨: 複雑な型定義
interface User {
  role: string;
  roles?: string[];
  defaultRole?: number;
}
```

## 移行手順

### Phase 1: 準備
1. Feature Flagの実装
2. 並行実装の準備
3. テスト環境の構築

### Phase 2: 段階的移行
1. 新しいユーティリティ関数の作成
2. コンポーネントの段階的修正
3. 型定義の統一

### Phase 3: クリーンアップ
1. 不要なコードの削除
2. テストの更新
3. ドキュメントの更新

## ベストプラクティス

### DO:
- 段階的な移行
- Feature Flagによる制御
- 詳細なテスト
- ロールバック計画の準備

### DON'T:
- 一括置換
- テストなしのリリース
- 後方互換性の無視
- ドキュメント更新の省略

## 期待される効果
- コード量: 40-50%削減
- バグ率: 50-70%削減
- 開発速度: 30-40%向上
- 学習コスト: 50%削減

## 関連ドキュメント
- refactor-analyze_20250815_012000.md
- refactor-plan_20250815_013500.md