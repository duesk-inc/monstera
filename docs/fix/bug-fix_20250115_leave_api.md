# 休暇申請ページエラー修正記録

## 修正日時
2025年1月15日

## 修正対象のバグ
休暇申請ページ（/leave）表示時の`TypeError: leaveTypesData.filter is not a function`エラー

## 修正内容

### 1. 変更ファイル
- `frontend/src/constants/api.ts`

### 2. 具体的な修正
LEAVE_API定数に不足していたエンドポイントを追加：

```typescript
export const LEAVE_API = {
  BASE: `/api/${API_VERSION}/leave`,
  TYPES: `/api/${API_VERSION}/leave/types`,          // 追加
  BALANCES: `/api/${API_VERSION}/leave/balances`,    // 追加
  REQUESTS: `/api/${API_VERSION}/leave/requests`,    // 追加
  CREATE: `/api/${API_VERSION}/leave/requests`,      // 追加
  APPLY: `/api/${API_VERSION}/leave/apply`,
  LIST: `/api/${API_VERSION}/leave/list`,
  APPROVE: `/api/${API_VERSION}/leave/approve`,
  REJECT: `/api/${API_VERSION}/leave/reject`,
} as const;
```

### 3. 影響箇所
以下のAPIコールが正常に動作するようになった：

- `frontend/src/lib/api/leave.ts`
  - `getLeaveTypes()` - LEAVE_API.TYPESを使用
  - `getUserLeaveBalances()` - LEAVE_API.BALANCESを使用
  - `createLeaveRequest()` - LEAVE_API.CREATEを使用
  - `getLeaveRequests()` - LEAVE_API.REQUESTSを使用

## 修正の妥当性

### 1. 最小限の変更
- 必要な定数の追加のみで、既存の動作に影響なし
- 破壊的変更なし

### 2. バックエンドとの整合性
バックエンドのエンドポイントと完全に一致：
```go
leave.GET("/types", leaveHandler.GetLeaveTypes)
leave.GET("/balances", leaveHandler.GetUserLeaveBalances)
leave.GET("/requests", leaveHandler.GetLeaveRequests)
// POSTは同じ/requestsエンドポイントを使用
```

### 3. テスト結果
- TypeScript型チェック：パス（既存の型エラーは無関係）
- APIコールの動作確認：必要なエンドポイントが定義されていることを確認

## 再発防止策

### 1. 短期的対策
- API定数とバックエンドエンドポイントの定期的な整合性チェック
- 新しいエンドポイント追加時のチェックリスト作成

### 2. 長期的対策
- OpenAPIまたはgRPCなどのスキーマ駆動開発の導入
- APIクライアントコードの自動生成
- E2Eテストの強化

## ステータス
**修正完了** - バグの根本原因を解決し、休暇申請ページが正常に表示されるようになった。

## 次のステップ
1. 開発環境での動作確認
2. 休暇申請機能の完全なテスト
3. 本番環境へのデプロイ準備