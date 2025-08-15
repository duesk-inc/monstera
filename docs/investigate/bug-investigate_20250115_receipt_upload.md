# 領収書アップロード二重ダイアログバグ 調査報告書

## 調査日時
2025年1月15日

## 1. 問題の概要

### 症状
- 経費新規作成画面で領収書をアップロードする際、ファイル選択ダイアログが2回開く
- 1回目のファイル選択では何も起きない
- 2回目のファイル選択でやっとアップロードが開始される

### 影響範囲
- 経費新規作成画面（`/expenses/new`）
- 経費編集画面（`/expenses/[id]/edit`）
- 領収書のアップロード機能を使用するすべてのユーザー

### 優先度
**高** - ユーザビリティに重大な影響がある

## 2. 調査結果

### 関連ファイル
```
frontend/src/components/features/expense/ReceiptUploader.tsx
```

### 根本原因
`ReceiptUploader.tsx`において、**イベントハンドラーの重複**が発生している。

#### 問題のコード箇所

```tsx
// Line 357-374: Paper要素にonClickイベントが設定されている
<Paper
  sx={{
    // ... styles
  }}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={disabled ? undefined : handleButtonClick}  // ⚠️ 問題箇所1
>

// Line 386-394: 子要素のButtonにもonClickイベントが設定されている
<Button
  variant="outlined"
  startIcon={<AttachFileIcon />}
  onClick={handleButtonClick}  // ⚠️ 問題箇所2
  disabled={disabled}
  sx={{ mb: 1 }}
>
  ファイルを選択
</Button>
```

### 問題のメカニズム

1. **ユーザーが「ファイルを選択」ボタンをクリック**
   - ButtonコンポーネントのonClickイベントが発火
   - `handleButtonClick`が実行され、1回目のファイル選択ダイアログが開く

2. **イベントバブリングが発生**
   - ButtonのクリックイベントがPaper要素まで伝播
   - Paper要素のonClickイベントも発火
   - 再度`handleButtonClick`が実行され、2回目のファイル選択ダイアログが開く

3. **結果**
   - ファイル選択ダイアログが2回連続で開く
   - 1回目の選択は2回目のダイアログで上書きされるため、無効になる

### handleButtonClickの実装（Line 245-249）
```tsx
const handleButtonClick = useCallback(() => {
  if (fileInputRef.current) {
    fileInputRef.current.click();  // input要素のclickを実行
  }
}, []);
```

## 3. 影響分析

### 機能への影響
- **ユーザビリティ**: 2回ファイルを選択する必要があり、ユーザーの混乱を招く
- **データ整合性**: 影響なし（最終的に選択されたファイルは正しくアップロードされる）
- **パフォーマンス**: 最小（不要なダイアログが1回余分に開くだけ）

### 他の機能への影響
- ドラッグ&ドロップによるアップロード: 影響なし（正常に動作）
- ファイル削除機能: 影響なし
- ファイルプレビュー機能: 影響なし

## 4. 修正方針

### 推奨される修正方法

**方法1: イベント伝播の停止（推奨）**
```tsx
// Buttonのクリックイベントでイベント伝播を停止
<Button
  variant="outlined"
  startIcon={<AttachFileIcon />}
  onClick={(e) => {
    e.stopPropagation();  // イベント伝播を停止
    handleButtonClick();
  }}
  disabled={disabled}
  sx={{ mb: 1 }}
>
  ファイルを選択
</Button>
```

**方法2: Paper要素のonClickを削除**
```tsx
// Paper要素全体のクリックを無効化し、ボタンのみでファイル選択を行う
<Paper
  sx={{ /* ... */ }}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  // onClick={disabled ? undefined : handleButtonClick}  // 削除
>
```

**方法3: 条件付きクリックハンドリング**
```tsx
// クリック位置を判定して、ボタン以外の領域をクリックした場合のみ処理
const handlePaperClick = useCallback((e: React.MouseEvent) => {
  // ボタンまたはその子要素がクリックされた場合は何もしない
  if ((e.target as HTMLElement).closest('button')) {
    return;
  }
  handleButtonClick();
}, [handleButtonClick]);
```

## 5. テスト項目

修正後は以下のテストを実施する必要がある：

1. **ボタンクリックによるファイル選択**
   - [ ] ファイル選択ダイアログが1回だけ開くこと
   - [ ] 選択したファイルが正しくアップロードされること

2. **Paper領域クリックによるファイル選択**
   - [ ] ドロップゾーン全体のクリックでファイル選択が可能なこと（方法1,3の場合）
   - [ ] ファイル選択ダイアログが1回だけ開くこと

3. **ドラッグ&ドロップ**
   - [ ] ドラッグ&ドロップが正常に動作すること

4. **無効化状態**
   - [ ] disabled時にファイル選択ができないこと

5. **エラー処理**
   - [ ] ファイルサイズ超過時のエラー表示
   - [ ] 非対応ファイル形式のエラー表示

## 6. 結論

### 調査結果サマリー
- **原因**: ButtonとPaper要素の両方にonClickイベントが設定されており、イベントバブリングにより2回実行される
- **影響**: ユーザビリティに重大な影響があるが、データ整合性への影響はない
- **修正難易度**: 低（1行の修正で解決可能）

### 推奨アクション
1. **方法1**（イベント伝播の停止）を採用して修正
2. 修正後、全テスト項目を実施
3. 他の画面でも同様のパターンがないか確認

## ステータス
**status**: SUCCESS  
**next**: BUG-FIX  
**details**: "バグの根本原因を特定。bug-investigate_20250115_receipt_upload.mdに詳細記録。修正フェーズへ移行。"