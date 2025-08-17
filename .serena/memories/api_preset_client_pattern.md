# APIプリセットクライアントパターン

## 概要
Phase 4-2で実装した、プリセットベースのAPIクライアント生成パターン。
重複コードを削減し、用途別に最適化されたクライアントを簡単に生成できる。

## 実装場所
- `/lib/api/factory/index.ts` - メイン実装
- `/lib/api/types/unified.ts` - 型定義
- `/lib/api/config/unified.ts` - 統一設定

## プリセットタイプ
```typescript
type ApiClientPresetType = 
  | 'default'   // 一般API
  | 'auth'      // 認証API
  | 'admin'     // 管理者API
  | 'public'    // 公開API（認証不要）
  | 'upload'    // ファイルアップロード
  | 'batch'     // バッチ処理（長時間）
  | 'realtime'  // リアルタイム通信
```

## 使用方法
```typescript
// プリセットベースで作成
import { createPresetApiClient } from '@/lib/api/factory';
const client = createPresetApiClient('auth', {
  baseURL: 'https://api.example.com'
});

// 便利な関数
import { getPublicApiClient, getUploadApiClient } from '@/lib/api/factory';
const publicClient = getPublicApiClient();
const uploadClient = getUploadApiClient();
```

## 利点
1. **コード重複削減**: 5ファイルの実装を1つに統一
2. **用途別最適化**: 各プリセットが最適な設定を持つ
3. **型安全性**: ジェネリクスによる完全な型サポート
4. **拡張性**: 新しいプリセットの追加が容易
5. **キャッシュ効率**: プリセット別のキャッシュ戦略

## 成功パターン
- プリセット設定とカスタム設定のマージ
- 内部メソッドをプリセットベースに変更してコード削減
- 後方互換性を維持しながら段階的に移行