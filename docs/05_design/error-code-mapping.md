# エラーコードマッピング一覧

## 概要
既存の日本語エラーメッセージと新しいエラーコード体系のマッピング一覧です。

## マッピング表

### 認証関連（AUTH）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgAuthRequired | 認証が必要です | AUTH001 | 401 |
| MsgInvalidCredentials | メールアドレスまたはパスワードが正しくありません | AUTH002 | 401 |
| MsgTokenExpired | 認証トークンの有効期限が切れています | AUTH003 | 401 |
| MsgTokenInvalid | 無効な認証トークンです | AUTH004 | 401 |
| MsgRefreshTokenExpired | リフレッシュトークンの有効期限が切れています | AUTH005 | 401 |
| MsgRefreshTokenInvalid | 無効なリフレッシュトークンです | AUTH006 | 401 |
| MsgPermissionDenied | この操作を実行する権限がありません | AUTH007 | 403 |
| MsgAccessDenied | アクセスが拒否されました | AUTH008 | 403 |

### バリデーション関連（VAL）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgInvalidRequest | 無効なリクエストデータです | VAL001 | 400 |
| MsgRequiredField | 必須項目です | VAL002 | 400 |
| MsgInvalidFormat | 形式が正しくありません | VAL003 | 400 |
| MsgInvalidDateFormat | 日付の形式が正しくありません | VAL004 | 400 |
| MsgInvalidTimeRange | 時間の範囲が正しくありません | VAL005 | 400 |
| MsgInvalidEmailFormat | メールアドレスの形式が正しくありません | VAL006 | 400 |
| MsgPasswordTooShort | パスワードは8文字以上で入力してください | VAL007 | 400 |
| MsgInvalidStatus | 無効なステータスです | VAL008 | 400 |

### リソース関連（RES）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgResourceNotFound | リソースが見つかりません | RES001 | 404 |
| MsgWeeklyReportNotFound | 週報が見つかりません | RES002 | 404 |
| MsgUserNotFound | ユーザーが見つかりません | RES003 | 404 |
| MsgAlreadyExists | 既に存在します | RES004 | 409 |
| MsgWeeklyReportAlreadyExists | この期間の週報は既に存在します | RES005 | 409 |
| MsgEmailAlreadyExists | このメールアドレスは既に使用されています | RES006 | 409 |
| MsgDataConflict | データの競合が発生しました | RES007 | 409 |
| MsgOptimisticLockError | 他のユーザーによって更新されています | RES008 | 409 |

### ビジネスロジック関連（BIZ）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgAlreadySubmitted | 既に提出済みです | BIZ001 | 400 |
| MsgCannotEditSubmitted | 提出済みの週報は編集できません | BIZ002 | 400 |
| MsgInvalidDateRange | 無効な日付範囲です | BIZ003 | 400 |
| MsgExceedsLimit | 制限を超えています | BIZ004 | 400 |
| MsgInvalidOperation | 無効な操作です | BIZ005 | 400 |
| MsgStatusTransitionError | ステータスの変更ができません | BIZ006 | 400 |
| MsgDependencyError | 依存関係エラーです | BIZ007 | 400 |

### システムエラー関連（SYS）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgInternalServerError | サーバー内部エラーが発生しました | SYS001 | 500 |
| MsgServiceUnavailable | サービスが一時的に利用できません | SYS002 | 503 |
| MsgTimeout | タイムアウトが発生しました | SYS003 | 504 |
| MsgExternalServiceError | 外部サービスでエラーが発生しました | SYS004 | 502 |
| MsgConfigurationError | 設定エラーが発生しました | SYS005 | 500 |
| MsgNetworkError | ネットワークエラーが発生しました | SYS006 | 500 |

### データアクセス関連（DAT）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgDatabaseError | データベースエラーが発生しました | DAT001 | 500 |
| MsgTransactionError | トランザクション処理中にエラーが発生しました | DAT002 | 500 |
| MsgConnectionError | データベース接続エラーが発生しました | DAT003 | 500 |
| MsgQueryError | クエリ実行エラーが発生しました | DAT004 | 500 |
| MsgDataIntegrityError | データ整合性エラーが発生しました | DAT005 | 500 |
| MsgDuplicateKeyError | 重複キーエラーが発生しました | DAT006 | 409 |

### 週報固有エラー（W）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgWeeklyReportCreateFailed | 週報の作成に失敗しました | W001V001 | 400 |
| MsgWeeklyReportUpdateFailed | 週報の更新に失敗しました | W001V002 | 400 |
| MsgWeeklyReportDeleteFailed | 週報の削除に失敗しました | W001V003 | 400 |
| MsgWeeklyReportGetFailed | 週報の取得に失敗しました | W001R001 | 404 |
| MsgWeeklyReportListGetFailed | 週報一覧の取得に失敗しました | W001R002 | 500 |
| MsgDailyRecordCreateFailed | 日次勤怠記録の作成に失敗しました | W002V001 | 400 |
| MsgDailyRecordUpdateFailed | 日次勤怠記録の更新に失敗しました | W002V002 | 400 |
| MsgDailyRecordDeleteFailed | 日次勤怠記録の削除に失敗しました | W002V003 | 400 |
| MsgWorkHoursCalculationFailed | 作業時間の計算に失敗しました | W003B001 | 500 |
| MsgTotalWorkHoursUpdateFailed | 合計作業時間の更新に失敗しました | W003B002 | 500 |

### ユーザー管理関連（U）

| 既存メッセージ定数 | メッセージ内容 | エラーコード | HTTPステータス |
|------------------|--------------|-------------|---------------|
| MsgUserCreateFailed | ユーザーの作成に失敗しました | U001V001 | 400 |
| MsgUserUpdateFailed | ユーザーの更新に失敗しました | U001V002 | 400 |
| MsgUserDeleteFailed | ユーザーの削除に失敗しました | U001V003 | 400 |
| MsgUserGetFailed | ユーザーの取得に失敗しました | U001R001 | 404 |
| MsgUserListGetFailed | ユーザー一覧の取得に失敗しました | U001R002 | 500 |
| MsgPasswordChangeFailed | パスワードの変更に失敗しました | U002V001 | 400 |
| MsgProfileUpdateFailed | プロフィールの更新に失敗しました | U002V002 | 400 |

## 使用例

### バックエンド（Go）

```go
// 従来の実装
if user == nil {
    return fmt.Errorf(message.MsgUserNotFound)
}

// 新しい実装
if user == nil {
    return message.NewAppError("RES003", message.MsgUserNotFound, 
        map[string]interface{}{"user_id": userID})
}
```

### フロントエンド（TypeScript）

```typescript
// エラーレスポンスの処理
if (error.code === 'RES003') {
    // ユーザーが見つからない場合の処理
    showError('指定されたユーザーが見つかりません');
    router.push('/users');
}
```

## エラーコード追加のガイドライン

### 1. 命名規則
- カテゴリコード（3文字）+ 連番（3桁）
- 週報関連の場合：W + 機能番号（3桁） + エラー種別（1文字） + 連番（3桁）

### 2. カテゴリの選択
- AUTH: 認証・認可に関するエラー
- VAL: 入力値検証エラー
- RES: リソース関連エラー
- BIZ: ビジネスロジックエラー
- SYS: システムエラー
- DAT: データアクセスエラー

### 3. HTTPステータスコードの選択
- 400: クライアントエラー（入力値不正、ビジネスルール違反）
- 401: 認証エラー
- 403: 認可エラー
- 404: リソースが見つからない
- 409: 競合（重複、楽観的ロック）
- 500: サーバーエラー
- 502: 外部サービスエラー
- 503: サービス利用不可
- 504: タイムアウト

---

**文書情報**
- 作成日：2024年1月
- 作成者：システム開発部
- バージョン：1.0
- 更新履歴：
  - 2024年1月：初版作成