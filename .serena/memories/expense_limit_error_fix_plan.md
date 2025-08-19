# 経費申請上限エラー修正計画

## 修正パターン
HTTPステータスコード500を400に修正する標準的なエラーハンドリング追加

## 修正対象
- backend/internal/handler/expense_handler.go
- 6箇所のswitch文（行397, 1069, 1124, 1171, 1222, 1279）

## 修正内容
各switch文に以下を追加：
```go
case dto.ErrCodeMonthlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrMonthlyLimitExceeded, expenseErr.Message)
    return
case dto.ErrCodeYearlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrYearlyLimitExceeded, expenseErr.Message)
    return
```

## 既存定数
- constants.ErrMonthlyLimitExceeded = "E003B001"（定義済み）
- constants.ErrYearlyLimitExceeded = "E003B002"（定義済み）

## テスト観点
- HTTPステータスコードが400になること
- エラーメッセージが正しく返されること
- 他のエラーハンドリングに影響がないこと