# プロフィール画面 経費申請履歴機能削除 分析報告書

## 調査日時
2025年1月15日

## 1. 分析対象
プロフィール画面から経費申請履歴機能を完全に削除する

## 2. 現在の実装状況

### 2.1 フロントエンド実装構造

#### 主要コンポーネント
```
frontend/src/
├── components/
│   ├── profile/
│   │   └── ExpenseProfileSection.tsx  # 経費申請履歴セクション (削除対象)
│   ├── expense/
│   │   └── ExpenseSummaryCard.tsx    # 経費集計カード (依存関係確認)
│   └── features/profile/
│       └── ProfileTabbedContent.tsx   # プロフィールタブコンテナ (修正対象)
├── hooks/
│   └── useExpenseSummary.ts          # 経費集計フック (削除不要※)
└── lib/api/
    └── expenseSummary.ts              # 経費集計API (削除不要※)
```

※注: 他の経費関連機能でも使用されている可能性があるため要確認

### 2.2 実装詳細

#### ProfileTabbedContent.tsx での実装
- **位置**: タブ配列の4番目（index: 3）として実装
- **タブ定義** (line 79-87):
  ```typescript
  { 
    label: (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WalletIcon fontSize="small" />
        経費申請履歴
      </Box>
    ), 
    value: 3 
  }
  ```
- **タブパネル** (line 144-149):
  ```typescript
  <CommonTabPanel value={currentTab} index={3} prefix="profile">
    <Box sx={{ px: 3 }}>
      <ExpenseProfileSection />
    </Box>
  </CommonTabPanel>
  ```

#### ExpenseProfileSection.tsx の機能
- 年度別経費申請データの表示
- 年次・月次の使用率表示
- 承認率・承認待ち金額の表示
- 詳細分析画面へのナビゲーション（`/expenses/summary`）

## 3. 依存関係分析

### 3.1 直接依存
- `ProfileTabbedContent.tsx` → `ExpenseProfileSection.tsx` (import & 使用)
- `ExpenseProfileSection.tsx` → `useExpenseSummary` (フック)
- `ExpenseProfileSection.tsx` → `ExpenseSummaryCard` (コンポーネント)

### 3.2 間接依存
- `useExpenseSummary.ts` → `expenseSummary.ts` (API)
- バックエンドAPIエンドポイント (`/expenses/summary`)

### 3.3 他機能での使用状況
- `ExpenseSummaryCard` : 他の経費関連画面でも使用されている可能性
- `useExpenseSummary` : 他の経費関連機能でも使用されている可能性
- `/expenses/summary` ページ: 独立した経費分析画面として存在

## 4. 削除対象ファイル・箇所

### 4.1 完全削除対象
1. **frontend/src/components/profile/ExpenseProfileSection.tsx**
   - ファイル全体を削除

### 4.2 修正対象
1. **frontend/src/components/features/profile/ProfileTabbedContent.tsx**
   - line 8: `AccountBalanceWallet as WalletIcon` のimportを削除
   - line 16: `ExpenseProfileSection` のimportを削除
   - line 79-87: 経費申請履歴タブの定義を削除
   - line 144-149: 経費申請履歴タブパネルを削除

## 5. 影響範囲評価

### 5.1 UI/UX への影響
- **影響度**: 低〜中
- プロフィール画面のタブが4つから3つに減少
- 経費申請履歴の確認は `/expenses` または `/expenses/summary` から可能
- ユーザーワークフローへの影響は限定的

### 5.2 機能への影響
- **影響度**: 低
- プロフィール画面の他の機能（基本情報、資格・認定、自己PR）には影響なし
- 経費申請機能自体は別画面で利用可能

### 5.3 システムへの影響
- **影響度**: 最小
- APIエンドポイントは他機能でも使用されているため削除不要
- データベース構造への影響なし
- バックエンドロジックへの影響なし

## 6. リスク評価

### 6.1 削除リスク
| リスク項目 | レベル | 詳細 | 対策 |
|----------|-------|------|------|
| ユーザー混乱 | 低 | 既存ユーザーが機能を探す可能性 | 経費画面へのナビゲーションを明確化 |
| コンパイルエラー | 最小 | import文の削除漏れ | TypeScriptの型チェックで検出可能 |
| 実行時エラー | 最小 | 削除漏れによる参照エラー | 開発環境でのテストで検出可能 |
| データ損失 | なし | UIのみの変更 | - |

### 6.2 残存コードのリスク
- `useExpenseSummary` と `expenseSummary.ts` は他機能で使用されている可能性があるため削除しない
- `ExpenseSummaryCard` も同様に他機能で使用されている可能性があるため削除しない

## 7. テスト項目

### 7.1 削除後の動作確認
1. プロフィール画面が正常に表示されること
2. 残る3つのタブ（基本情報、資格・認定、自己PR）が正常に動作すること
3. タブ切り替えが正常に動作すること
4. コンソールにエラーが出力されないこと

### 7.2 ビルド確認
1. `npm run build` が成功すること
2. TypeScriptの型チェックが通ること
3. リンターエラーが発生しないこと

## 8. 推奨手順

### Phase 1: コード修正
1. `ProfileTabbedContent.tsx` から経費申請履歴関連のコードを削除
2. `ExpenseProfileSection.tsx` ファイルを削除

### Phase 2: テスト
1. 開発環境での動作確認
2. ビルドテスト
3. 型チェック

### Phase 3: クリーンアップ
1. 未使用importの削除
2. コード整形

## 9. 結論

### 分析結果
- **削除の複雑度**: 低
- **影響範囲**: 限定的（プロフィール画面のみ）
- **リスクレベル**: 最小
- **推定作業時間**: 30分以内

### 推奨事項
1. 削除は安全に実行可能
2. 他の経費関連コンポーネント/APIは削除しない
3. 削除後は必ずTypeScriptの型チェックを実行
4. プロフィール画面の全タブの動作確認を実施

## ステータス
**status**: SUCCESS  
**next**: REFACTOR-PLAN  
**details**: "プロフィール画面からの経費申請履歴機能削除の分析完了。影響範囲は限定的でリスクは最小。refactor-analyze_20250115_remove_expense_history.mdに詳細記録。計画フェーズへ移行可能。"