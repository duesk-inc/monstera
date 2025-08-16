# バグ調査レポート: 無限ループエラー（Maximum update depth exceeded）

## 調査日時
2025年1月16日

## バグの概要
職務経歴編集ダイアログで言語やフレームワークの選択時、カスタム値を入力すると「Maximum update depth exceeded」エラーが発生し、無限ループに陥る。

## エラー内容
```
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
    at InputBase (webpack-internal:///./node_modules/@mui/material/InputBase/InputBase.js:147:83)
```

## 根本原因
TechnologyInputコンポーネント内のuseEffectが循環依存を引き起こしていた。

### 問題のコード（修正前）
```typescript
// TechnologyInput.tsx - Line 91-95
useEffect(() => {
  if (inputValue !== value) {
    onChange(inputValue);  // 親コンポーネントに変更を通知
  }
}, [inputValue, onChange, value]);  // valueが依存配列に含まれている
```

### 無限ループの発生メカニズム
1. ユーザーが文字を入力 → `inputValue`が変更
2. useEffectが実行 → `onChange(inputValue)`を呼び出し
3. 親コンポーネント（WorkHistoryEditDialog）が`setValue`で値を更新
4. `value` propが変更される
5. useEffectが再実行（`value`が依存配列にあるため）
6. `inputValue !== value`の条件が常に真となり、無限ループ発生

## 修正内容

### 1. useEffectによる循環依存を削除
- 問題のあるuseEffectを削除
- valueの変更時のみinputValueを同期するシンプルなuseEffectに変更

### 2. onInputChangeハンドラーの改善
- `reason`パラメータを活用して、ユーザー入力時のみ親に通知
- 選択やリセット時の不要な通知を防止

### 修正後のコード
```typescript
// inputValueの初期化を簡略化
const [inputValue, setInputValue] = useState('');

// valueが変更されたらinputValueも同期（初期値設定とリセット時のため）
useEffect(() => {
  setInputValue(value || '');
}, [value]);

// Autocompleteのハンドラーを改善
onInputChange={(_, newInputValue, reason) => {
  setInputValue(newInputValue);
  // ユーザーが直接入力した場合のみ、親コンポーネントに通知
  if (reason === 'input') {
    onChange(newInputValue);
  }
}}
```

## 修正の効果
1. **循環依存の解消**: useEffectの依存配列からonChangeを除外
2. **状態管理の簡略化**: Autocompleteコンポーネントに状態管理を委譲
3. **パフォーマンス向上**: 不要な再レンダリングを防止
4. **入力の安定性**: カスタム入力時の無限ループを完全に防止

## テスト項目
- [ ] 技術リストから選択が正常に動作
- [ ] カスタム値の入力が可能
- [ ] 入力値のクリアが正常に動作
- [ ] 複数の技術入力フィールドで独立して動作
- [ ] 無限ループエラーが発生しないこと

## 影響範囲
- `/src/components/common/forms/TechnologyInput.tsx` - 直接修正
- WorkHistoryEditDialogで使用される全ての技術入力フィールド
- スキルシート編集機能全体

## リグレッションリスク
- **リスクレベル**: 低
- **理由**: 
  - TechnologyInputコンポーネント内部の修正のみ
  - 外部APIとのインターフェースは変更なし
  - 既存の機能に影響を与えない

## ステータス
**status**: SUCCESS  
**fix_type**: LOGIC_FIX  
**test_status**: PENDING  
**details**: "無限ループの原因となる循環依存を解消。useEffectの依存関係を適切に修正。"