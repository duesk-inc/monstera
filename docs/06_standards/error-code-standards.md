# エラーコード規則仕様書

## 1. 概要

Monsteraプロジェクトで使用するエラーコードの統一規則を定義する。

## 2. エラーコード体系

### 2.1 基本フォーマット

```
[システム][機能][種別][連番]

例: W001V001 (Weekly report - 001 - Validation - 001)
```

### 2.2 システムコード（1文字）

| コード | システム | 説明 |
|--------|----------|------|
| A | Auth | 認証・認可 |
| U | User | ユーザー管理 |
| W | WeeklyReport | 週報管理 |
| N | Notification | 通知システム |
| E | Export | エクスポート機能 |
| S | System | システム全般 |

### 2.3 機能コード（3桁）

#### 週報管理（W）
| コード | 機能 |
|--------|------|
| 001 | 週報基本操作 |
| 002 | 未提出者管理 |
| 003 | アラート管理 |
| 004 | 月次サマリー |

#### 認証・認可（A）
| コード | 機能 |
|--------|------|
| 001 | ログイン |
| 002 | 権限チェック |
| 003 | トークン管理 |

#### システム全般（S）
| コード | 機能 |
|--------|------|
| 001 | データベース |
| 002 | バッチ処理 |
| 003 | 外部連携 |

### 2.4 種別コード（1文字）

| コード | 種別 | 説明 |
|--------|------|------|
| V | Validation | バリデーションエラー |
| B | Business | ビジネスロジックエラー |
| S | System | システムエラー |
| A | Auth | 認証・認可エラー |
| N | NotFound | リソースが見つからない |
| P | Permission | 権限不足 |

### 2.5 連番（3桁）

同一機能・種別内での通し番号（001〜999）

## 3. エラーコード一覧

### 3.1 週報管理エラー

#### 週報基本操作（W001）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| W001V001 | Validation | 開始日は必須です | 週報期間の開始日未入力 |
| W001V002 | Validation | 終了日は必須です | 週報期間の終了日未入力 |
| W001V003 | Validation | 勤務時間は0時間以上で入力してください | 勤務時間の値不正 |
| W001V004 | Validation | 備考は1000文字以内で入力してください | 備考文字数超過 |
| W001B001 | Business | 既に提出済みの週報は編集できません | 提出済み週報の編集試行 |
| W001B002 | Business | 過去の週報期間は編集できません | 期限切れ週報の編集試行 |
| W001N001 | NotFound | 指定された週報が見つかりません | 週報ID不正 |
| W001S001 | System | 週報の保存に失敗しました | DB保存エラー |

#### 未提出者管理（W002）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| W002V001 | Validation | 送信対象を選択してください | リマインド対象未選択 |
| W002V002 | Validation | メッセージは500文字以内で入力してください | カスタムメッセージ超過 |
| W002P001 | Permission | リマインド送信権限がありません | 一般ユーザーの送信試行 |
| W002S001 | System | リマインド送信に失敗しました | 通知システムエラー |

#### アラート管理（W003）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| W003V001 | Validation | 労働時間上限は1以上の数値で入力してください | 設定値不正 |
| W003V002 | Validation | コメントは1000文字以内で入力してください | 解決コメント超過 |
| W003P001 | Permission | アラート設定の変更権限がありません | 一般管理部の設定変更試行 |
| W003N001 | NotFound | 指定されたアラートが見つかりません | アラートID不正 |
| W003S001 | System | アラート設定の保存に失敗しました | DB保存エラー |

#### 月次サマリー（W004）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| W004V001 | Validation | 年は有効な値で入力してください | 年の値不正 |
| W004V002 | Validation | 月は1〜12の範囲で入力してください | 月の値不正 |
| W004S001 | System | サマリーデータの取得に失敗しました | 集計処理エラー |

### 3.2 認証・認可エラー

#### ログイン（A001）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| A001V001 | Validation | メールアドレスは必須です | メールアドレス未入力 |
| A001V002 | Validation | パスワードは必須です | パスワード未入力 |
| A001A001 | Auth | メールアドレスまたはパスワードが正しくありません | 認証失敗 |
| A001A002 | Auth | アカウントが無効化されています | 無効ユーザー |

#### 権限チェック（A002）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| A002A001 | Auth | 認証が必要です | 未認証アクセス |
| A002P001 | Permission | この操作を実行する権限がありません | 権限不足 |
| A002A002 | Auth | セッションが期限切れです | トークン期限切れ |

### 3.3 システム全般エラー

#### データベース（S001）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| S001S001 | System | データベース接続に失敗しました | DB接続エラー |
| S001S002 | System | トランザクション処理に失敗しました | トランザクションエラー |

#### バッチ処理（S002）
| エラーコード | 種別 | メッセージ | 説明 |
|-------------|------|-----------|------|
| S002S001 | System | バッチ処理の実行に失敗しました | バッチエラー |
| S002S002 | System | 設定ファイルの読み込みに失敗しました | 設定エラー |

## 4. 実装指針

### 4.1 バックエンド実装

```go
// エラーコード定数定義
const (
    // 週報関連
    ErrWeeklyReportStartDateRequired = "W001V001"
    ErrWeeklyReportEndDateRequired   = "W001V002"
    ErrWeeklyReportAlreadySubmitted  = "W001B001"
    
    // 認証関連
    ErrAuthEmailRequired     = "A001V001"
    ErrAuthInvalidCredentials = "A001A001"
)

// エラーレスポンス構造体
type ErrorResponse struct {
    ErrorCode string `json:"error_code"`
    Message   string `json:"message"`
    Details   string `json:"details,omitempty"`
}

// エラーレスポンス関数
func RespondErrorWithCode(c *gin.Context, statusCode int, errorCode string, message string) {
    c.JSON(statusCode, ErrorResponse{
        ErrorCode: errorCode,
        Message:   message,
    })
}
```

### 4.2 フロントエンド実装

```typescript
// エラーコード定数
export const ERROR_CODES = {
  WEEKLY_REPORT: {
    START_DATE_REQUIRED: 'W001V001',
    END_DATE_REQUIRED: 'W001V002',
    ALREADY_SUBMITTED: 'W001B001',
  },
  AUTH: {
    EMAIL_REQUIRED: 'A001V001',
    INVALID_CREDENTIALS: 'A001A001',
  },
  EXPENSE: {
    // 基本操作
    TITLE_REQUIRED: 'E001V001',
    AMOUNT_INVALID: 'E001V002',
    DATE_REQUIRED: 'E001V003',
    DESCRIPTION_INVALID: 'E001V004',
    RECEIPT_REQUIRED: 'E001V005',
    ALREADY_SUBMITTED: 'E001B001',
    ALREADY_APPROVED: 'E001B002',
    EXPIRED: 'E001B003',
    NOT_FOUND: 'E001N001',
    SAVE_FAILED: 'E001S001',
    // 承認フロー
    APPROVAL_COMMENT_TOO_LONG: 'E002V001',
    REJECTION_REASON_REQUIRED: 'E002V002',
    APPROVAL_ALREADY_APPROVED: 'E002B001',
    APPROVAL_ALREADY_REJECTED: 'E002B002',
    NO_APPROVAL_AUTHORITY: 'E002B003',
    APPROVAL_PERMISSION_DENIED: 'E002P001',
    APPROVAL_TARGET_NOT_FOUND: 'E002N001',
    APPROVAL_PROCESS_FAILED: 'E002S001',
    // 上限管理
    LIMIT_AMOUNT_INVALID: 'E003V001',
    LIMIT_EFFECTIVE_DATE_REQUIRED: 'E003V002',
    LIMIT_SCOPE_TARGET_REQUIRED: 'E003V003',
    MONTHLY_LIMIT_EXCEEDED: 'E003B001',
    YEARLY_LIMIT_EXCEEDED: 'E003B002',
    LIMIT_ALREADY_EXISTS: 'E003B003',
    LIMIT_CHANGE_PERMISSION_DENIED: 'E003P001',
    LIMIT_NOT_FOUND: 'E003N001',
    LIMIT_SAVE_FAILED: 'E003S001',
    // カテゴリ管理
    CATEGORY_CODE_INVALID: 'E004V001',
    CATEGORY_NAME_REQUIRED: 'E004V002',
    DEFAULT_CATEGORY_DELETE: 'E004B001',
    CATEGORY_CODE_DUPLICATE: 'E004B002',
    CATEGORY_IN_USE: 'E004B003',
    CATEGORY_PERMISSION_DENIED: 'E004P001',
    CATEGORY_NOT_FOUND: 'E004N001',
    CATEGORY_SAVE_FAILED: 'E004S001',
    // 集計・レポート
    SUMMARY_YEAR_INVALID: 'E005V001',
    SUMMARY_MONTH_INVALID: 'E005V002',
    FISCAL_YEAR_INVALID: 'E005V003',
    SUMMARY_DATA_NOT_FOUND: 'E005B001',
    SUMMARY_PERMISSION_DENIED: 'E005P001',
    SUMMARY_PROCESS_FAILED: 'E005S001',
  },
} as const;

// エラーレスポンス型
interface ApiErrorResponse {
  error_code: string;
  message: string;
  details?: string;
}

// エラーハンドリング
export const handleApiError = (error: ApiErrorResponse) => {
  const { error_code, message } = error;
  
  // エラーコードに基づく特別な処理
  switch (error_code) {
    case ERROR_CODES.AUTH.INVALID_CREDENTIALS:
      // ログイン画面にリダイレクト
      router.push('/login');
      break;
    case ERROR_CODES.WEEKLY_REPORT.ALREADY_SUBMITTED:
      // 画面をリロードして最新状態を取得
      window.location.reload();
      break;
    default:
      // 通常のエラートースト表示
      showErrorToast(message);
  }
};
```

### 4.3 ログ出力

```go
// 構造化ログでエラーコードを記録
logger.Error("週報保存エラー",
    zap.String("error_code", "W001S001"),
    zap.String("user_id", userID),
    zap.String("weekly_report_id", reportID),
    zap.Error(err))
```

## 5. 運用指針

### 5.1 エラーコード追加ルール

1. 新機能追加時は、事前にエラーコードを定義
2. 機能コード（3桁）は10単位で割り当て（001, 011, 021...）
3. エラーコード追加時は、この仕様書を更新

### 5.2 監視・分析

- エラーコード別の発生頻度を監視
- 高頻度エラーはアラート設定
- 月次でエラー傾向を分析し、改善点を特定

## 6. 更新履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|------------|----------|--------|
| 2024-01 | 1.0 | 初版作成 | システム開発部 |

---

**注意**: エラーコードは一度リリース後は変更しないこと。ログ分析や障害対応に影響するため。