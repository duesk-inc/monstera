# バグ調査報告書: 経費申請提出エラー

## 調査日時
2025年1月20日 00:10

## 問題概要
経費申請の提出時に月次上限超過エラーが発生した際、HTTPステータスコードが500（Internal Server Error）で返される問題。

## エラー詳細
- **エラーメッセージ**: `EXPENSE_MONTHLY_LIMIT_EXCEEDED: 月次上限を超過します（残り: 6401円）`
- **エラーコード**: `E001S001`
- **HTTPステータス**: 500（誤り）→ 本来は400番台であるべき
- **エンドポイント**: `/api/v1/expenses/{id}/submit`

## 根本原因

### 原因1: エラーハンドリングの不足
`backend/internal/handler/expense_handler.go`のSubmitExpenseメソッドにおいて、月次・年次上限超過エラーのハンドリングが実装されていない。

```go
// 現在の実装（expense_handler.go:397-416）
switch expenseErr.Code {
case dto.ErrCodeExpenseNotFound:
    RespondStandardErrorWithCode(c, http.StatusNotFound, ...)
case dto.ErrCodeUnauthorized:
    RespondStandardErrorWithCode(c, http.StatusForbidden, ...)
// ... 他のケース
default:
    // 月次・年次上限エラーはここに入ってしまう
    HandleStandardError(c, http.StatusInternalServerError, ...)  // 500エラー
}
```

### 欠落しているエラーコード
- `dto.ErrCodeMonthlyLimitExceeded`（定義済み、未ハンドリング）
- `dto.ErrCodeYearlyLimitExceeded`（定義済み、未ハンドリング）

## 影響範囲

### 影響を受けるメソッド
expense_handler.go内の以下の6つのメソッドで同じ問題が存在：
1. SubmitExpense（行397）
2. 他のメソッド（行1069, 1124, 1171, 1222, 1279）

### ユーザーへの影響
- ビジネスロジックエラー（上限超過）にも関わらず、システムエラーとして扱われる
- フロントエンドで適切なエラーメッセージを表示できない可能性
- ユーザーが問題の原因を理解できない

## 技術的詳細

### エラーフロー
1. expense_service.goで月次上限チェック
2. 上限超過時、`dto.NewExpenseError(dto.ErrCodeMonthlyLimitExceeded, ...)`を返す
3. expense_handler.goでエラーハンドリング
4. switch文にケースがないため、defaultに入る
5. HTTP 500エラーとして返される

### エラー定義場所
- エラーコード定義: `backend/internal/dto/expense_dto.go:990-991`
- エラー生成箇所: `backend/internal/service/expense_service.go`（複数箇所）

## 修正方針

### 推奨される修正
expense_handler.goの各switch文に以下のケースを追加：

```go
case dto.ErrCodeMonthlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseMonthlyLimitExceeded, expenseErr.Message)
    return
case dto.ErrCodeYearlyLimitExceeded:
    RespondStandardErrorWithCode(c, http.StatusBadRequest, constants.ErrExpenseYearlyLimitExceeded, expenseErr.Message)
    return
```

### 必要な定数追加
`backend/internal/constants/error_codes.go`に以下を追加（存在しない場合）：
- `ErrExpenseMonthlyLimitExceeded`
- `ErrExpenseYearlyLimitExceeded`

## セキュリティへの影響
なし（ビジネスロジックエラーの適切なHTTPステータスコード修正のため）

## データ整合性への影響
なし（エラーレスポンスのみの修正）

## 優先度
**高** - ユーザー体験に直接影響するため、早急な修正が必要

## 次のステップ
1. expense_handler.goの全switch文を修正
2. 必要に応じてerror_codes定数を追加
3. 修正後のテストを実施
4. 同様のパターンが他のハンドラーにないか確認