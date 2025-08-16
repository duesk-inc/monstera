# バグ調査レポート: StepIcon fontSize エラー

## 調査日時
2025年1月16日

## バグの症状
スキルシート画面で「職務経歴を追加」ボタンを押すと以下のエラーが発生:
```
TypeError: Cannot read properties of undefined (reading 'fontSize')
    at eval (StepIcon.js:75:44)
```

## 再現手順
1. スキルシート画面を開く
2. 「職務経歴を追加」ボタンをクリック
3. WorkHistoryEditDialogが開く際にエラー発生

## 根本原因

### 直接的な原因
MUI の `StepIcon` コンポーネントが `theme.typography.fontSize` プロパティにアクセスしようとしているが、このプロパティが定義されていない。

### 詳細分析

1. **エラー発生箇所**
   - ファイル: `/components/features/skillSheet/WorkHistoryEditDialog.tsx`
   - 行番号: 520行目（`<StepLabel>{label}</StepLabel>`）
   - コンポーネント: MUI Stepper内のStepIcon

2. **テーマ設定の問題**
   - `/theme/theme.tsx` では typography バリアント（h1, h2, body1等）は定義されている
   - しかし、MUI StepIcon が期待する基本的な `fontSize` プロパティが typography オブジェクトに存在しない
   - MuiStepIcon コンポーネントのスタイルオーバーライドも定義されていない

3. **問題のコード構造**
   ```tsx
   // 現在のテーマ設定
   typography: {
     fontFamily: [...],
     h1: TYPOGRAPHY_VARIANTS.h1,
     h2: TYPOGRAPHY_VARIANTS.h2,
     // ... 他のバリアント
     // fontSize プロパティが欠落している
   }
   ```

## 影響範囲
- **影響を受ける機能**: スキルシート画面の職務経歴追加・編集機能
- **影響を受けるユーザー**: 全エンジニアユーザー
- **データ整合性への影響**: なし（UIレベルのエラーのため）
- **セキュリティへの影響**: なし

## 解決策

### 方法1: テーマにfontSizeプロパティを追加（推奨）
```tsx
// theme.tsx に追加
typography: {
  fontSize: 14, // 基本フォントサイズ（px）
  fontFamily: [...],
  // ... 既存の設定
}
```

### 方法2: MuiStepIconのスタイルオーバーライドを追加
```tsx
// theme.tsx の components に追加
MuiStepIcon: {
  styleOverrides: {
    text: {
      fontSize: '0.75rem', // 12px
    },
  },
},
```

### 方法3: 両方の対策を実施（最も安全）
typography に fontSize を追加し、さらに MuiStepIcon のスタイルオーバーライドも追加する。

## 回避策
現時点での回避策はない。エラーはErrorBoundaryでキャッチされているため、アプリケーションはクラッシュしないが、ダイアログは表示されない。

## 推奨事項
1. **即座の修正**: 方法3（両方の対策）を実施
2. **テスト**: 修正後、Stepper を使用している他のコンポーネントも確認
3. **将来的な改善**: MUI コンポーネントが期待する全てのテーマプロパティを網羅的に定義

## 関連ファイル
- `/src/theme/theme.tsx` - テーマ設定ファイル
- `/src/components/features/skillSheet/WorkHistoryEditDialog.tsx` - エラー発生箇所
- `/src/constants/typography.ts` - タイポグラフィ定数

## ステータス
**status**: SUCCESS  
**next**: BUG-FIX  
**severity**: HIGH  
**details**: "MUI StepIcon の fontSize エラーの根本原因を特定。テーマ設定の不足が原因。"