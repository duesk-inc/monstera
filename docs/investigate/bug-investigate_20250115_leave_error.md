# 休暇申請ページエラー調査報告書

## 調査日時
2025年1月15日

## 問題の概要
休暇申請ページ（/leave）を表示した際に、以下のエラーが発生する：
```
TypeError: leaveTypesData.filter is not a function
    at useLeaveCalculation.useMemo[LEAVE_TYPES] (useLeaveCalculation.ts:71:8)
```

## 根本原因
フロントエンドのAPI定数定義にバックエンドの休暇関連エンドポイントが不足している。

### 詳細な原因分析

1. **エラー発生箇所**
   - ファイル: `frontend/src/hooks/leave/useLeaveCalculation.ts`
   - 行番号: 71行目
   - 処理内容: `leaveTypesData.filter(type => {...})`

2. **問題の流れ**
   1. `useLeaveData`フックで`apiGetLeaveTypes`を呼び出し
   2. `apiGetLeaveTypes`内で`LEAVE_API.TYPES`を参照
   3. `LEAVE_API.TYPES`が未定義のため、APIリクエストが失敗
   4. エラー処理により`leaveTypesData`が配列以外の値になる
   5. `filter`メソッドが存在しないためTypeError発生

3. **API定義の不整合**
   
   **バックエンドの実際のエンドポイント:**
   ```go
   // backend/cmd/server/main.go
   leave.GET("/types", leaveHandler.GetLeaveTypes)      // 休暇種別一覧
   leave.GET("/balances", leaveHandler.GetUserLeaveBalances)  // 残日数
   leave.GET("/requests", leaveHandler.GetLeaveRequests)      // 申請履歴
   ```

   **フロントエンドの定義（不完全）:**
   ```typescript
   // frontend/src/constants/api.ts
   export const LEAVE_API = {
     BASE: `/api/${API_VERSION}/leave`,
     APPLY: `/api/${API_VERSION}/leave/apply`,
     LIST: `/api/${API_VERSION}/leave/list`,
     APPROVE: `/api/${API_VERSION}/leave/approve`,
     REJECT: `/api/${API_VERSION}/leave/reject`,
   } as const;
   // TYPES, BALANCES, REQUESTS, CREATEが欠けている
   ```

## 影響範囲
- 休暇申請ページ（/leave）が表示できない
- ユーザーが休暇申請機能を利用できない
- 休暇残日数の確認ができない
- 休暇申請履歴の確認ができない

## 修正案

### 1. LEAVE_API定数の修正
`frontend/src/constants/api.ts`を以下のように修正：

```typescript
export const LEAVE_API = {
  BASE: `/api/${API_VERSION}/leave`,
  TYPES: `/api/${API_VERSION}/leave/types`,          // 追加
  BALANCES: `/api/${API_VERSION}/leave/balances`,    // 追加
  REQUESTS: `/api/${API_VERSION}/leave/requests`,    // 追加
  CREATE: `/api/${API_VERSION}/leave/requests`,      // 追加（POSTで使用）
  APPLY: `/api/${API_VERSION}/leave/apply`,
  LIST: `/api/${API_VERSION}/leave/list`,
  APPROVE: `/api/${API_VERSION}/leave/approve`,
  REJECT: `/api/${API_VERSION}/leave/reject`,
} as const;
```

### 2. エラーハンドリングの改善（オプション）
`frontend/src/hooks/leave/useLeaveState.ts`でデフォルト値を配列に設定していることを確認：

```typescript
const [leaveTypesData, setLeaveTypesData] = useState<LeaveType[]>([]);
```

これは正しく実装されているが、APIエラー時の処理も確認が必要。

## テスト手順
1. 修正を適用
2. 開発環境でアプリケーションを再起動
3. 休暇申請ページ（/leave）にアクセス
4. エラーが発生しないことを確認
5. 休暇種別のドロップダウンが正しく表示されることを確認
6. 休暇残日数が表示されることを確認
7. 休暇申請履歴が表示されることを確認

## 推奨事項
1. APIエンドポイント定義の自動生成ツールの導入を検討
2. TypeScriptの型定義を強化してコンパイル時にエラーを検出
3. API定数とバックエンドエンドポイントの整合性を保つためのテストを追加

## 緊急度
**高** - ユーザーが休暇申請機能を全く利用できない状態

## 結論
API定数定義の不足が原因でAPIリクエストが失敗し、その結果として配列メソッドの呼び出しエラーが発生している。定数定義を修正することで問題は解決する。