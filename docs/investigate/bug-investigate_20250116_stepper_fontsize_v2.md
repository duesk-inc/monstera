# バグ調査レポート: StepIcon fontSize エラー（再調査）

## 調査日時
2025年1月16日

## バグの症状
前回の修正後も、スキルシート画面で「職務経歴を追加」ボタンを押すと同じエラーが継続して発生:
```
TypeError: Cannot read properties of undefined (reading 'fontSize')
    at eval (StepIcon.js:75:44)
```

## 真の根本原因

### 問題の核心
タイポグラフィ定数のキー名の不一致が原因。

**TYPOGRAPHY_VARIANTS の定義（typography.ts）:**
```typescript
export const TYPOGRAPHY_VARIANTS = {
  H1: HEADING_STYLES.H1,      // 大文字
  H2: HEADING_STYLES.H2,      // 大文字
  BODY1: BODY_STYLES.MEDIUM,  // 大文字
  BODY2: BODY_STYLES.SMALL,   // 大文字
  // ...
}
```

**theme.tsx での参照:**
```typescript
typography: {
  h1: TYPOGRAPHY_VARIANTS.h1,      // 小文字でアクセス → undefined
  h2: TYPOGRAPHY_VARIANTS.h2,      // 小文字でアクセス → undefined
  body1: TYPOGRAPHY_VARIANTS.body1, // 小文字でアクセス → undefined
  body2: TYPOGRAPHY_VARIANTS.body2, // 小文字でアクセス → undefined
  // ...
}
```

### 結果
- `TYPOGRAPHY_VARIANTS.h1` は undefined（正しくは `TYPOGRAPHY_VARIANTS.H1`）
- すべてのタイポグラフィバリアントが undefined になっている
- MUI コンポーネントが期待する fontSize プロパティが存在しない

## 解決策の選択肢

### 案A: TYPOGRAPHY_VARIANTS のキー名を小文字に修正（推奨）
```typescript
export const TYPOGRAPHY_VARIANTS = {
  h1: HEADING_STYLES.H1,      // 小文字に変更
  h2: HEADING_STYLES.H2,      // 小文字に変更
  body1: BODY_STYLES.MEDIUM,  // 小文字に変更
  body2: BODY_STYLES.SMALL,   // 小文字に変更
  // ...
}
```

**メリット:**
- MUI の規約に準拠
- 他の MUI テーマとの互換性が高い
- 最小限の変更で済む

### 案B: theme.tsx でのアクセスを大文字に修正
```typescript
typography: {
  h1: TYPOGRAPHY_VARIANTS.H1,      // 大文字でアクセス
  h2: TYPOGRAPHY_VARIANTS.H2,      // 大文字でアクセス
  body1: TYPOGRAPHY_VARIANTS.BODY1, // 大文字でアクセス
  body2: TYPOGRAPHY_VARIANTS.BODY2, // 大文字でアクセス
  // ...
}
```

**メリット:**
- 既存の定数構造を維持
- 変更箇所が theme.tsx のみ

### 案C: Stepper コンポーネントを置き換える
MUI Stepper を使わず、独自のステップ表示を実装。

**実装案:**
```tsx
// カスタムステップインジケーター
<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
  {steps.map((label, index) => (
    <Box key={label} sx={{ 
      display: 'flex', 
      alignItems: 'center',
      opacity: index <= activeStep ? 1 : 0.5
    }}>
      <Typography variant="body2" sx={{ 
        fontWeight: index === activeStep ? 'bold' : 'normal' 
      }}>
        {index + 1}. {label}
      </Typography>
    </Box>
  ))}
</Box>
```

**メリット:**
- MUI Stepper の複雑な依存を回避
- シンプルで軽量
- カスタマイズが容易

## 影響分析

### 案A を選択した場合
- **影響範囲**: typography.ts のみ
- **リスク**: 低（定数の内部的な変更のみ）
- **テスト必要箇所**: すべてのタイポグラフィを使用している箇所

### 案B を選択した場合
- **影響範囲**: theme.tsx のみ
- **リスク**: 低（テーマ設定の変更のみ）
- **テスト必要箇所**: MUI コンポーネント全般

### 案C を選択した場合
- **影響範囲**: WorkHistoryEditDialog.tsx
- **リスク**: 中（UI/UX の変更）
- **テスト必要箇所**: 職務経歴編集ダイアログ

## 推奨事項

### 即座の対応（案A）
1. `TYPOGRAPHY_VARIANTS` のキー名を小文字に修正
2. これにより、既存のテーマ設定が正しく動作する
3. MUI の規約に準拠し、将来的な互換性も確保

### 長期的な改善
1. テーマ設定の包括的なテスト追加
2. MUI コンポーネントの期待する全プロパティの検証
3. 定数定義の命名規則統一

## 回避策
現時点での回避策なし。エラーにより WorkHistoryEditDialog が表示されない。

## 関連ファイル
- `/src/constants/typography.ts` - 問題の原因（キー名の不一致）
- `/src/theme/theme.tsx` - テーマ設定
- `/src/components/features/skillSheet/WorkHistoryEditDialog.tsx` - エラー発生箇所

## ステータス
**status**: SUCCESS  
**next**: BUG-FIX  
**severity**: HIGH  
**root_cause**: "TYPOGRAPHY_VARIANTS のキー名不一致"  
**recommended_fix**: "案A（キー名を小文字に修正）"  
**details**: "タイポグラフィ定数のキー名不一致が根本原因。MUI 規約に準拠した修正を推奨。"