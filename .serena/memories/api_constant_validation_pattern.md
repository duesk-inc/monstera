# API定数検証パターン

## 問題パターン
フロントエンドでAPI定数を参照する際、未定義のプロパティを使用してしまう問題

## 発生例
```typescript
// 定義
export const SKILL_SHEET_API = {
  BASE: `/api/v1/skill-sheet`,
  UPDATE: `/api/v1/skill-sheet`,
} as const;

// 使用（エラー）
client.get(SKILL_SHEET_API.GET);  // GETは未定義
```

## 予防策

### 1. 完全な定数定義
```typescript
export const SKILL_SHEET_API = {
  BASE: string,
  GET: string,      // 明示的に定義
  CREATE: string,
  UPDATE: string,
  DELETE: string,
  TEMP_SAVE: string,
  LIST: string,
} as const;
```

### 2. 型定義の活用
```typescript
interface SkillSheetAPIEndpoints {
  BASE: string;
  GET: string;
  CREATE: string;
  UPDATE: string;
  DELETE: string;
  TEMP_SAVE: string;
  LIST: string;
}

export const SKILL_SHEET_API: SkillSheetAPIEndpoints = {
  // すべてのプロパティが必須になる
};
```

### 3. バックエンドとの同期確認
- 新規API追加時は必ずバックエンドのルート定義を確認
- APIパスの単数形/複数形の規約を統一
- RESTful規約に従う

## チェックポイント
1. API定数のすべてのプロパティが定義されているか
2. 使用箇所で未定義のプロパティを参照していないか
3. TypeScriptのstrictモードで型チェックが有効か
4. バックエンドのルート定義と一致しているか

## 修正優先度
**高** - APIが呼べないと機能が完全に動作しない