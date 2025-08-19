# 経費申請上限エラーハンドリング問題

## 問題パターン
月次・年次上限超過エラーが発生した際、HTTPステータス500が返される

## 根本原因
expense_handler.goのエラーハンドリングswitch文に以下のケースが欠落：
- `dto.ErrCodeMonthlyLimitExceeded`
- `dto.ErrCodeYearlyLimitExceeded`

## 影響範囲
- expense_handler.goの6つのメソッド（行397, 1069, 1124, 1171, 1222, 1279）

## 修正方法
各switch文に上限エラーのケースを追加し、HTTP 400（BadRequest）を返すよう修正

## 関連ファイル
- backend/internal/handler/expense_handler.go
- backend/internal/dto/expense_dto.go
- backend/internal/service/expense_service.go