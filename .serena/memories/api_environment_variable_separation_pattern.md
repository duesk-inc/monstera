# API環境変数分離パターン

## 概要
APIのホストとバージョンを分離して管理することで、保守性と拡張性を向上させるパターン

## 実装例

### 環境変数の定義
```bash
# 新しい分離された環境変数（推奨）
NEXT_PUBLIC_API_HOST=http://localhost:8080
NEXT_PUBLIC_API_VERSION=v1

# レガシー環境変数（後方互換性のため維持）
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### APIクライアント設定
```typescript
// 新しい分離された環境変数を使用（後方互換性も維持）
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const LEGACY_URL = process.env.NEXT_PUBLIC_API_URL;

// レガシー環境変数を優先、なければ新環境変数から構築
export const API_BASE_URL = LEGACY_URL || `${API_HOST}/api/${API_VERSION}`;
```

## メリット
1. **バージョン管理の容易性**: API_VERSIONの変更だけでバージョン切り替え可能
2. **環境別設定の柔軟性**: ホストとバージョンを独立して管理
3. **後方互換性**: 既存の設定を壊さない段階的移行
4. **DRY原則**: バージョン情報を1箇所で管理

## 適用箇所
- `frontend/src/lib/api/index.ts`
- `frontend/src/lib/api/config.ts`
- `frontend/src/constants/api.ts`

## 実装時期
2025-01-16 Phase 2実装で適用