# バグ調査レポート: スキルシートAPI 404エラー

## 調査日時
2025年1月16日 10:08

## バグの概要
スキルシートの一時保存および更新処理で404エラーが発生し、データの保存ができない状態。

## エラー内容

### 1. 一時保存エラー
```
POST http://localhost:8080/ 404 (Not Found)
```
- **期待されるURL**: `/api/v1/skill-sheet/temp-save`
- **実際のリクエスト**: URLが完全に欠落

### 2. 更新エラー
```
PUT http://localhost:8080/api/v1/skill-sheets 404 (Not Found)
```
- **期待されるURL**: `/api/v1/skill-sheet`（単数形）
- **実際のリクエスト**: `/api/v1/skill-sheets`（複数形）

## 根本原因

### 原因1: API定数の不整合
**フロントエンド** (`frontend/src/constants/api.ts`):
```typescript
export const SKILL_SHEET_API = {
  BASE: `/api/${API_VERSION}/skill-sheets`,    // 複数形
  CREATE: `/api/${API_VERSION}/skill-sheets`,  // 複数形
  UPDATE: `/api/${API_VERSION}/skill-sheets`,  // 複数形
  LIST: `/api/${API_VERSION}/skill-sheets`,    // 複数形
} as const;
```

**バックエンド** (`backend/cmd/server/main.go:638-643`):
```go
skillSheet := api.Group("/skill-sheet")  // 単数形
{
  skillSheet.GET("", skillSheetHandler.GetSkillSheet)
  skillSheet.PUT("", skillSheetHandler.SaveSkillSheet)
  skillSheet.POST("/temp-save", skillSheetHandler.TempSaveSkillSheet)
}
```

### 原因2: 必要な定数の不足
**使用されているが定義されていない定数**:
- `SKILL_SHEET_API.GET` - スキルシート取得で使用
- `SKILL_SHEET_API.TEMP_SAVE` - 一時保存で使用

**コード内での使用箇所**:
```typescript
// frontend/src/lib/api/skillSheet.ts:26
const response = await client.get(SKILL_SHEET_API.GET, options);

// frontend/src/lib/api/skillSheet.ts:175
await client.post(SKILL_SHEET_API.TEMP_SAVE, snakeData);
```

## 影響範囲

### 影響を受ける機能
1. **スキルシート取得** - 画面表示時にエラー
2. **スキルシート更新** - 保存ボタン押下時に404エラー
3. **スキルシート一時保存** - 一時保存ボタン押下時に404エラー

### 影響を受けるコンポーネント
- `/app/(authenticated)/(engineer)/skill-sheet/page.tsx` - スキルシート画面
- `/hooks/skillSheet/useSkillSheetForm.ts` - フォーム管理フック
- `/hooks/skillSheet/useSkillSheet.ts` - データ取得フック
- `/lib/api/skillSheet.ts` - APIクライアント

### 影響を受けるユーザー
- 全エンジニアユーザー - スキルシート機能が完全に使用不可

## データ整合性への影響
- データの破損なし（APIが呼ばれていないため）
- 既存データへの影響なし

## セキュリティへの影響
- なし（404エラーのため）

## 回避策
- なし（APIパスの修正が必要）

## 修正方針

### 推奨修正案
フロントエンドのAPI定数を修正（バックエンドに合わせる）:

```typescript
export const SKILL_SHEET_API = {
  BASE: `/api/${API_VERSION}/skill-sheet`,       // 単数形に修正
  GET: `/api/${API_VERSION}/skill-sheet`,        // 新規追加
  CREATE: `/api/${API_VERSION}/skill-sheet`,     // 単数形に修正
  UPDATE: `/api/${API_VERSION}/skill-sheet`,     // 単数形に修正
  TEMP_SAVE: `/api/${API_VERSION}/skill-sheet/temp-save`, // 新規追加
  LIST: `/api/${API_VERSION}/skill-sheets`,      // リスト取得は複数形のまま（未使用）
} as const;
```

### 修正が必要なファイル
1. `frontend/src/constants/api.ts` - API定数の修正

### テスト項目
- [ ] スキルシート画面の表示
- [ ] スキルシート情報の取得
- [ ] スキルシート情報の更新（保存ボタン）
- [ ] スキルシート情報の一時保存
- [ ] 職務経歴の追加・編集・削除

## 関連する過去の修正履歴
- なし（新規発見のバグ）

## 詳細ログ

### エラー発生時のリクエストデータ
```json
{
  "work_history": [{
    "project_name": "パーク２４",
    "start_date": "2025-08-01",
    "end_date": "",
    "industry": 3,
    "project_overview": "...",
    "responsibilities": "コードレビュー\nテスト設計、リーダー",
    "achievements": "チーム内の業務効率化へ貢献",
    "processes": [3, 2, 4],
    "programming_languages": ["Spring Boot", "Java", "TypeScript"],
    "servers_databases": ["PostgreSQL"],
    "tools": ["Docker", "GitLab CI", "Jenkins"],
    "team_size": 20,
    "role": "SE"
  }]
}
```

## ステータス
**status**: SUCCESS  
**next**: BUG-FIX  
**details**: "バグの根本原因を特定。bug-investigate_20250116_skill_sheet_404.mdに詳細記録。修正フェーズへ移行。"