# 調査レポート - 管理者サイドバー切替問題の根本原因特定

**調査日時:** 2025-07-21  
**調査ID:** debug_admin_sidebar_20250721  
**調査ブランチ:** feature/debug-admin-sidebar-switching  
**報告者:** ユーザー  

## 📋 問題の現象

### 報告された症状
- **管理者ログイン**: admin@duesk.co.jp / AdminPass123!
- **期待動作**: AdminSidebar表示
- **実際の動作**: 一瞬AdminSidebar表示 → すぐにEngineerSidebarに切り替わる

### 重要な手がかり
**「一瞬だけ管理者のサイドバーが表示される」** → 初期状態では正しく認識されている

## 🔍 Ultra-think調査結果

### 段階的調査プロセス

#### 1. useAuth.ts修正内容検証 ✅ **正常**
- 3箇所すべてで前回修正が正しく適用
- `|| 4` フォールバックも適切に削除済み

#### 2. ActiveRoleContext初期化フロー分析 ✅ **正常**
- initializeActiveRole関数の実装は適切
- セッションストレージとの整合性チェックも実装済み

#### 3. データベース状態確認 ✅ **正常**
```sql
       email       | role 
-------------------+------
 admin@duesk.co.jp |    2
```

#### 4. convertToLocalUser関数検証 ✅ **正常**
- API レスポンス変換ロジックは適切
- role=2 → 'admin' への変換は正しい

## 🚨 根本原因の発見

### **問題の核心**: 文字列ロールの数値変換エラー

**問題フロー**:
```
1. API レスポンス: role=2 (number)
2. convertToLocalUser: role='admin' (string) に変換 ✅
3. useAuth.ts: Number('admin') → NaN ❌
4. convertRoleNumberToString(NaN) → デフォルト 'employee' ❌
5. initializeActiveRole(['employee']) → validRoles = ['employee']
6. セッションストレージ 'employee' → 復元される
7. 結果: EngineerSidebar 表示
```

### **具体的な問題箇所**

#### useAuth.ts の3箇所すべて:
```typescript
// Line 81 (問題のあるコード)
const userRoles = userData.roles && userData.roles.length > 0 
  ? userData.roles 
  : [convertRoleNumberToString(Number(userData.role))];
//                                  ↑ Number('admin') → NaN

// Line 179 (同様の問題)  
const userRoles = localUser.roles && localUser.roles.length > 0 
  ? localUser.roles 
  : [convertRoleNumberToString(Number(localUser.role))];

// Line 299 (同様の問題)
const userRoles = formattedUser.roles && formattedUser.roles.length > 0 
  ? formattedUser.roles 
  : [convertRoleNumberToString(Number(formattedUser.role))];
```

### **なぜ 'employee' になるか**

**convertRoleNumberToString関数** (auth.ts:134-141):
```typescript
export const convertRoleNumberToString = (roleNumber: number): string => {
  const roleMap: Record<number, string> = {
    1: 'super_admin',
    2: 'admin',
    3: 'manager', 
    4: 'employee'
  };
  return roleMap[roleNumber] || 'employee'; // NaN の場合、デフォルト 'employee'
}
```

`Number('admin')` → `NaN` → `roleMap[NaN]` → `undefined` → デフォルト `'employee'`

## 🔧 解決策

### **修正方針**: 型チェックの追加

**useAuth.ts の3箇所すべてを修正**:

```typescript
// 修正前（問題のあるコード）
[convertRoleNumberToString(Number(userData.role))]

// 修正後（解決策）
[typeof userData.role === 'string' ? userData.role : convertRoleNumberToString(Number(userData.role))]
```

### **修正対象ファイル**
- `frontend/src/hooks/useAuth.ts` - Line 81, 179, 299

### **修正後の動作**
```
1. API レスポンス: role=2 (number)
2. convertToLocalUser: role='admin' (string) に変換
3. useAuth.ts: typeof 'admin' === 'string' → 'admin' をそのまま使用 ✅
4. initializeActiveRole(['admin']) → validRoles = ['admin']
5. セッションストレージ 'employee' → validRoles.includes('employee') → false
6. デフォルトロールまたは最高権限ロール 'admin' を選択
7. 結果: AdminSidebar 表示 ✅
```

## 📊 影響範囲

### **直接影響**
- 単一ロール管理者ユーザー（admin@duesk.co.jp）
- 将来的な単一ロールマネージャーユーザー

### **間接影響** 
- なし（エンジニアユーザーやマルチロールユーザーへの影響なし）

### **後方互換性**
- 維持される（既存のロジックを改善するのみ）

## 🎯 推奨アクション

### **immediate actions (必須)**
1. **useAuth.ts修正実装**: 3箇所の型チェック追加
2. **テスト実行**: admin@duesk.co.jp でのログイン確認
3. **回帰テスト**: engineer_test@duesk.co.jp での動作確認

### **follow-up actions (任意)**
1. **単体テスト追加**: ロール型変換のテストケース
2. **E2Eテスト**: 認証フロー・サイドバー選択の自動化
3. **ドキュメント更新**: 修正内容の記録

## 📁 関連ファイル

### **調査対象ファイル**
1. `frontend/src/hooks/useAuth.ts` - 主要修正対象
2. `frontend/src/utils/auth.ts` - convertRoleNumberToString, convertToLocalUser  
3. `frontend/src/context/ActiveRoleContext.tsx` - 初期化ロジック確認
4. `frontend/src/app/(authenticated)/layout.tsx` - サイドバー選択ロジック

### **作成ドキュメント**
5. `docs/debug/debug_admin_sidebar_20250721.md` - 本調査レポート
6. `debug-log-temp.md` - デバッグログ案（一時ファイル）

## 🔍 技術的知見

### **得られた学習**
1. **型変換の重要性**: `Number(string)` で予期しない結果になることを実証
2. **デバッグ手法**: Ultra-think手法による段階的原因特定の有効性
3. **セッションストレージの影響**: 複数初期化処理での状態管理の複雑性

### **今後の改善点**
1. **型安全性**: TypeScriptの型チェックを活用したより安全な実装
2. **テストカバレッジ**: エッジケースを含む包括的なテスト
3. **状態管理**: 認証関連の状態管理アーキテクチャの見直し

---
**調査者:** Claude (Anthropic)  
**調査完了日:** 2025-07-21  
**最終判定:** 🎯 **根本原因特定完了 - 修正方法確定**