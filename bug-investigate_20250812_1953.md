# バグ調査レポート: ユーザーメニュー表示問題

## 調査日時
2025-08-12 19:53

## 問題の概要
ログイン後にユーザーメニューが正常に表示されない

## 調査結果

### 根本原因
フロントエンドのユーザーメニューコンポーネント（`SharedUserMenu.tsx`）において、単一ロール表示時のswitch文に`'employee'`ケースが欠落している。

### 詳細分析

#### 1. APIレスポンス
バックエンドは正常にロール値を数値として返却:
```json
{
  "role": 4  // Employee役割を表す数値
}
```

#### 2. 型変換処理
フロントエンドの変換処理は正常に動作:
- `convertToLocalUser`関数: APIレスポンスを受け取り、内部でロール変換を実行
- `convertRoleNumberToString`関数: 数値を文字列に変換
  - `4` → `'employee'`

#### 3. 問題箇所
**ファイル**: `frontend/src/components/common/layout/SharedUserMenu.tsx`
**行番号**: 71-76

```typescript
// 単一ロールの場合
switch (user.role) {
  case 'admin': return '管理者';
  case 'manager': return 'マネージャー';
  case 'user': return 'エンジニア';
  default: return user.role;  // 'employee'の場合、そのまま'employee'が表示される
}
```

**問題**: `'employee'`ケースが定義されていないため、デフォルトケースで'employee'という文字列がそのまま表示される

### 影響範囲
- ロール'Employee'を持つ全ユーザー
- ユーザーメニューの役割表示部分のみ（機能には影響なし）

## 修正案

### 修正内容
`SharedUserMenu.tsx`の`getRoleDisplay()`関数内の単一ロール用switch文に`'employee'`ケースを追加:

```typescript
// 単一ロールの場合
switch (user.role) {
  case 'super_admin': return 'スーパー管理者';
  case 'admin': return '管理者';
  case 'manager': return 'マネージャー';
  case 'employee': return 'エンジニア';  // この行を追加
  case 'user': return 'エンジニア';
  default: return user.role;
}
```

### 追加考慮事項
- 'super_admin'ケースも欠落しているため、同時に追加を推奨
- 複数ロール表示部分（56-68行）では既に'employee'と'super_admin'が定義済み

## テスト項目
1. Employeeロールでログイン → メニューに「エンジニア」と表示されることを確認
2. 他のロール（Admin, Manager）でも正常表示を確認
3. 複数ロール持つユーザーでの表示も確認

## 優先度
中 - 表示上の問題のみで、機能には影響なし