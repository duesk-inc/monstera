# 経費申請月次・年次上限エラーHTTPステータス修正

## 修正日
2025年1月20日

## 問題
経費申請で月次・年次上限超過エラー（EXPENSE_MONTHLY_LIMIT_EXCEEDED, EXPENSE_YEARLY_LIMIT_EXCEEDED）が発生した際、HTTP 500が返されていた。本来はビジネスロジックエラーなのでHTTP 400を返すべき。

## 原因
`backend/internal/handler/expense_handler.go`の6箇所のswitch文で、月次・年次上限エラーコードのケースが実装されていなかった。

## 修正内容

### 修正箇所（6箇所）
1. SubmitExpense (line 397)
2. CreateWithReceipts (line 1075)
3. UpdateWithReceipts (line 1130)
4. GetExpenseReceipts (line 1177)
5. DeleteExpenseReceipt (line 1228)
6. UpdateReceiptOrder (line 1285)

### 追加したコード
```go
case dto.ErrCodeMonthlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
    return
case dto.ErrCodeYearlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
    return
```

### エラーコード
- `constants.ErrMonthlyLimitExceeded` = "E003B001"
- `constants.ErrYearlyLimitExceeded` = "E003B002"

## テスト
`backend/internal/handler/expense_handler_submit_test.go`に以下のテストを追加:
- TestExpenseHandler_SubmitExpense_LimitExceeded
- TestExpenseHandler_CreateWithReceipts_LimitExceeded
- TestExpenseHandler_UpdateWithReceipts_LimitExceeded

## ドキュメント
`docs/api/expense-api-errors.md`にAPIエラーレスポンス仕様を作成

## 今後の参考
新しいハンドラーを作成する際は、必ずすべてのエラーコードをswitch文でハンドリングすること。defaultケースは真に予期しないエラーのみに使用する。