# 経費申請上限エラー修正完了

## 修正完了日
2025年1月20日

## 実施内容
Phase 1とPhase 2を完了し、全6箇所のswitch文で月次・年次上限エラーハンドリングを修正

## 修正ファイル
backend/internal/handler/expense_handler.go

## 修正箇所
1. SubmitExpense（行413-418）- Phase 1で完了
2. CreateWithReceipts（行1075-1083）- Phase 2で完了
3. UpdateWithReceipts（行1134-1143）- Phase 2で完了
4. GetExpenseReceipts（行1185-1193）- Phase 2で完了  
5. DeleteExpenseReceipt（行1240-1250）- Phase 2で完了
6. UpdateReceiptOrder（行1301-1311）- Phase 2で完了

## 修正内容
各switch文に以下のケースを追加：
```go
case dto.ErrCodeMonthlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
    return
case dto.ErrCodeYearlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
    return
```

## 結果
- HTTPステータス500 → 400に修正完了
- 全APIで統一されたエラーハンドリング実装
- ユーザーは適切なエラーメッセージとステータスコードを受け取れるように改善

## コミット
- Phase 1: ddae053
- Phase 2: 05981e7