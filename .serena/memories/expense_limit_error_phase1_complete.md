# 経費申請上限エラー修正 Phase 1 完了

## 実施内容
Phase 1（緊急対応）を完了し、SubmitExpenseメソッドの月次・年次上限エラーハンドリングを修正

## 修正ファイル
- backend/internal/handler/expense_handler.go（行413-418）

## 追加コード
```go
case dto.ErrCodeMonthlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
    return
case dto.ErrCodeYearlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
    return
```

## 残作業
- Phase 2: 残り5つのswitch文への適用（行1069, 1124, 1171, 1222, 1279）
- Phase 3: テスト実行とドキュメント更新

## コミットID
ddae053