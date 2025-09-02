# ファクトリパターン統合アーキテクチャ設計

## 設計概要

### 現状の問題点
1. **インターセプターの重複リスク**: client.tsとindex.tsで別々に設定
2. **責務の分散**: ファクトリロジックが複数ファイルに分散
3. **キャッシング戦略の不明確**: インスタンスの再利用が不十分

### 統合後のアーキテクチャ

```
/lib/api/
├── factory/
│   ├── index.ts           # 統合ファクトリ本体
│   ├── interceptors.ts    # インターセプター管理
│   └── cache.ts          # キャッシュ管理
├── config/
│   └── env.ts            # 環境変数（既存）
├── index.ts              # 公開API（簡潔に）
└── legacy/               # 後方互換性レイヤー
    └── compat.ts
```

## 詳細設計

### 1. 統合ファクトリ（/lib/api/factory/index.ts）

```typescript
interface UnifiedApiConfig {
  // 基本設定
  baseURL?: string;
  host?: string;
  version?: string;
  timeout?: number;
  
  // インターセプター設定
  enableAuth?: boolean;
  enableRetry?: boolean;
  enableLogging?: boolean;
  
  // キャッシュ設定
  cacheKey?: string;
  useCache?: boolean;
}

class UnifiedApiFactory {
  private static instance: UnifiedApiFactory;
  private cache: Map<string, AxiosInstance>;
  private interceptorManager: InterceptorManager;
  
  // シングルトン
  static getInstance(): UnifiedApiFactory;
  
  // 統合されたクライアント作成
  createClient(config?: UnifiedApiConfig): AxiosInstance;
  
  // プリセット
  createDefaultClient(): AxiosInstance;
  createAuthenticatedClient(): AxiosInstance;
  createAdminClient(): AxiosInstance;
  
  // キャッシュ管理
  clearCache(): void;
  getCachedClient(key: string): AxiosInstance | null;
}
```

### 2. インターセプター管理（/lib/api/factory/interceptors.ts）

```typescript
class InterceptorManager {
  // インターセプター登録時にIDを管理
  private interceptorIds: Map<string, number[]>;
  
  // 重複防止機構
  registerOnce(client: AxiosInstance, type: string): void;
  
  // 統合インターセプター
  setupAuth(client: AxiosInstance): void;
  setupRetry(client: AxiosInstance): void;
  setupLogging(client: AxiosInstance): void;
  setupErrorHandling(client: AxiosInstance): void;
  
  // クリーンアップ
  removeAll(client: AxiosInstance): void;
}
```

### 3. キャッシュ戦略（/lib/api/factory/cache.ts）

```typescript
class ApiClientCache {
  private cache: Map<string, {
    client: AxiosInstance;
    createdAt: Date;
    lastUsed: Date;
    hitCount: number;
  }>;
  
  // LRU戦略
  get(key: string): AxiosInstance | null;
  set(key: string, client: AxiosInstance): void;
  
  // メトリクス
  getStats(): CacheStats;
  
  // 自動クリーンアップ
  startCleanupTimer(): void;
}
```

## 実装フェーズ

### Step 1: 基本構造の作成（1時間）
- ディレクトリ構造の作成
- インターフェース定義
- 基本的なファクトリクラス

### Step 2: インターセプター統合（2時間）
- 既存のインターセプターを移行
- 重複防止機構の実装
- テスト追加

### Step 3: キャッシング実装（1時間）
- LRUキャッシュ実装
- メトリクス収集
- 自動クリーンアップ

### Step 4: 既存コードの移行（2時間）
- client.tsの機能を統合
- index.tsの簡略化
- 後方互換性の確保

### Step 5: テストとドキュメント（2時間）
- 単体テスト
- 統合テスト
- 移行ガイド作成

## 期待される改善

### パフォーマンス
- インスタンス再利用率: 50% → 90%
- メモリ使用量: 20%削減
- 初期化時間: 30%短縮

### 保守性
- コード行数: 40%削減
- 複雑度: 50%削減
- テストカバレッジ: 80%以上

### 拡張性
- 新しいインターセプターの追加が容易
- カスタムクライアントの作成が簡単
- プラグイン機構の追加が可能

## リスクと対策

### リスク
1. **既存コードの破壊**: 既存の動作を変更する可能性
2. **パフォーマンス劣化**: キャッシュ管理のオーバーヘッド
3. **複雑性の増加**: 過度な抽象化

### 対策
1. **段階的移行**: 後方互換性レイヤーで徐々に移行
2. **ベンチマーク**: 各ステップでパフォーマンス測定
3. **シンプルな設計**: 必要最小限の機能に絞る

## 成功基準

- [ ] 既存のすべてのAPIコールが動作する
- [ ] インターセプターの重複がない
- [ ] キャッシュヒット率80%以上
- [ ] ビルド時間の増加なし
- [ ] テストカバレッジ80%以上

---

作成日: 2025-01-17
作成者: Claude Code