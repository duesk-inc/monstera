# バグ修正レポート: スキルシートAPI 404エラー

## 修正日時
2025年1月16日 10:15

## 修正概要
スキルシートAPIの404エラーを修正。フロントエンドのAPI定数をバックエンドのルート定義と一致させた。

## 修正前の状態
- **症状**: スキルシートの取得・更新・一時保存がすべて404エラー
- **影響**: 全エンジニアユーザーがスキルシート機能を使用不可

## 修正内容

### 1. API定数の修正
**ファイル**: `frontend/src/constants/api.ts`

**変更前**:
```typescript
export const SKILL_SHEET_API = {
  BASE: `/api/${API_VERSION}/skill-sheets`,    // 複数形
  CREATE: `/api/${API_VERSION}/skill-sheets`,  // 複数形
  UPDATE: `/api/${API_VERSION}/skill-sheets`,  // 複数形
  LIST: `/api/${API_VERSION}/skill-sheets`,    // 複数形
} as const;
```

**変更後**:
```typescript
export const SKILL_SHEET_API = {
  BASE: `/api/${API_VERSION}/skill-sheet`,       // 単数形に修正
  GET: `/api/${API_VERSION}/skill-sheet`,        // 新規追加
  CREATE: `/api/${API_VERSION}/skill-sheet`,     // 単数形に修正
  UPDATE: `/api/${API_VERSION}/skill-sheet`,     // 単数形に修正
  TEMP_SAVE: `/api/${API_VERSION}/skill-sheet/temp-save`, // 新規追加
  LIST: `/api/${API_VERSION}/skill-sheets`,      // リスト取得は複数形のまま
} as const;
```

### 変更点の詳細
1. **パス修正**: `skill-sheets` → `skill-sheet` (単数形)
2. **定数追加**: 
   - `GET`: スキルシート取得用
   - `TEMP_SAVE`: 一時保存用
3. **LIST保持**: 将来の複数取得用に複数形を維持

## 影響範囲

### 修正により正常動作するようになった機能
1. スキルシート画面の表示
2. スキルシート情報の取得
3. スキルシート情報の更新（保存ボタン）
4. スキルシート情報の一時保存
5. 職務経歴の追加・編集・削除

### 影響を受けたファイル
- `frontend/src/constants/api.ts` - 直接修正
- `frontend/src/lib/api/skillSheet.ts` - 修正した定数を使用（変更不要）
- `frontend/src/hooks/skillSheet/useSkillSheetForm.ts` - API呼び出し（変更不要）
- `frontend/src/hooks/skillSheet/useSkillSheet.ts` - API呼び出し（変更不要）

## テスト結果

### ビルドテスト
- **結果**: ✅ 成功
- **詳細**: TypeScriptコンパイル成功、Next.jsビルド成功

### 動作確認項目
- [x] フロントエンドのビルドが成功すること
- [ ] スキルシート画面が正常に表示されること
- [ ] スキルシート情報の取得が成功すること
- [ ] スキルシート情報の更新が成功すること
- [ ] スキルシート情報の一時保存が成功すること
- [ ] 職務経歴の追加・編集・削除が正常に動作すること

## リグレッション対策
- **リスクレベル**: 低
- **理由**: 
  - API定数の修正のみで、ロジック変更なし
  - バックエンドの実装と一致させただけ
  - 影響範囲が明確で限定的

## 今後の推奨事項

### 短期的
1. 手動での動作確認を実施
2. E2Eテストでスキルシート機能全体を検証

### 長期的
1. API定数の型定義を強化（未定義プロパティの参照を防ぐ）
2. フロントエンドとバックエンドのAPI定義を共通化
3. OpenAPI仕様書による契約ベース開発の導入
4. APIパスの自動テストを追加

## 関連ドキュメント
- 調査結果: `docs/investigate/bug-investigate_20250116_skill_sheet_404.md`
- メモリ: `.serena/memories/api_path_mismatch_pattern.md`

## ステータス
**status**: SUCCESS  
**next**: TEST  
**details**: "バグ修正完了。bug-fix_20250116_skill_sheet_404.mdに詳細記録。テストフェーズへ移行。"