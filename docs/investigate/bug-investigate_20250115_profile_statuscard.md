# プロフィール画面StatusCardエラー調査報告書

## 調査日時
2025年1月15日

## 問題の概要
プロフィール画面（/profile）表示時に以下のエラーが発生：
```
TypeError: Cannot read properties of undefined (reading 'MD')
    at StatusCard (StatusCard.tsx:201:52)
```

## 根本原因
`StatusCard.tsx`で使用している`PROGRESS_DIMENSIONS`定数のプロパティパスが、実際の定数定義と一致していない。

### 詳細な原因分析

1. **エラー発生箇所**
   - ファイル1: `frontend/src/components/common/cards/StatusCard.tsx`
     - 118行目: `PROGRESS_DIMENSIONS.CIRCULAR_SIZE.SMALL`
     - 201行目: `PROGRESS_DIMENSIONS.HEIGHT.MD`

2. **実際の定数定義**（`frontend/src/constants/dimensions.ts`）
   ```typescript
   export const PROGRESS_DIMENSIONS = {
     LINEAR: {
       HEIGHT: "4px",
       BORDER_RADIUS: BORDER_RADIUS.FULL,
     },
     CIRCULAR: {
       SIZE: {
         SM: "20px",
         MD: "32px",
         LG: "48px",
       },
       STROKE_WIDTH: {
         SM: "2px",
         MD: "3px",
         LG: "4px",
       },
     },
   } as const;
   ```

3. **不整合の詳細**
   - StatusCard.tsxが期待: `PROGRESS_DIMENSIONS.HEIGHT.MD`
   - 実際の構造: `PROGRESS_DIMENSIONS.LINEAR.HEIGHT`（値は固定で"4px"）
   
   - StatusCard.tsxが期待: `PROGRESS_DIMENSIONS.CIRCULAR_SIZE.SMALL`
   - 実際の構造: `PROGRESS_DIMENSIONS.CIRCULAR.SIZE.SM`

## 影響範囲
- プロフィール画面（/profile）が表示できない
- StatusCardコンポーネントを使用している全ての画面に影響する可能性
- ProfileStatusCardsコンポーネントがエラーにより動作しない

## 修正案

### StatusCard.tsxの修正
```typescript
// 118行目を修正
// 変更前
<CircularProgress size={PROGRESS_DIMENSIONS.CIRCULAR_SIZE.SMALL} />
// 変更後
<CircularProgress size={PROGRESS_DIMENSIONS.CIRCULAR.SIZE.SM} />

// 201行目を修正
// 変更前
height: PROGRESS_DIMENSIONS.HEIGHT.MD,
// 変更後（オプション1: LINEAR.HEIGHTを使用）
height: PROGRESS_DIMENSIONS.LINEAR.HEIGHT,
// 変更後（オプション2: 固定値を使用）
height: "8px",  // Medium heightとして適切な値
```

### または、dimensions.tsに新しい定数を追加（代替案）
```typescript
export const PROGRESS_DIMENSIONS = {
  // 既存の構造に追加
  HEIGHT: {
    SM: "4px",
    MD: "8px",  // 新規追加
    LG: "12px", // 新規追加
  },
  // 既存のLINEARとCIRCULARはそのまま
}
```

## テスト手順
1. 修正を適用
2. 開発環境でアプリケーションを再起動
3. プロフィール画面（/profile）にアクセス
4. StatusCardコンポーネントが正しく表示されることを確認
5. プログレスバーとサーキュラープログレスが正しく表示されることを確認

## 推奨事項
1. 定数ファイルとコンポーネント間の整合性を保つためのTypeScript型チェックを強化
2. 定数の構造を変更する際は、使用箇所の影響調査を徹底
3. UIコンポーネントライブラリの定数は、ドキュメント化して開発者間で共有

## 緊急度
**高** - プロフィール画面が全く表示できない状態

## 結論
定数定義の構造とコンポーネントでの使用方法の不一致が原因。StatusCard.tsxのプロパティパスを修正することで解決可能。