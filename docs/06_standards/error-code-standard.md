# エラーコード標準化ガイドライン

## 概要
Monsteraプロジェクトにおけるエラーコードの統一的な体系を定義します。

## エラーコード体系

### 基本フォーマット
```
[カテゴリ]_[番号]
```

- **カテゴリ**: 3文字の大文字アルファベット
- **番号**: 3桁の数字（001-999）

### カテゴリ定義

| カテゴリ | 説明 | 範囲 | HTTPステータス |
|---------|------|------|---------------|
| AUTH | 認証・認可関連 | AUTH_001-099 | 401, 403 |
| VAL | バリデーション関連 | VAL_001-099 | 400 |
| RES | リソース関連 | RES_001-099 | 404, 409 |
| BIZ | ビジネスロジック関連 | BIZ_001-099 | 400, 422 |
| SYS | システムエラー | SYS_001-099 | 500, 503 |
| DAT | データ関連 | DAT_001-099 | 500 |
| DB | データベース関連 | DB_001-099 | 500 |

### 機能別サブカテゴリ（推奨）

機能固有のエラーコードは、基本カテゴリ＋機能識別子を使用：

```
[基本カテゴリ]_[機能]_[番号]
```

例:
- `BIZ_PROP_001` - 提案機能のビジネスロジックエラー
- `VAL_WR_001` - 週報のバリデーションエラー
- `RES_SKILL_001` - スキルシートのリソースエラー

## エラーレスポンス形式

### 標準形式
```json
{
  "error": {
    "code": "AUTH_001",
    "message": "認証が必要です",
    "details": {
      "field": "email",
      "reason": "required"
    },
    "timestamp": "2025-08-13T10:00:00Z"
  }
}
```

### 複数エラーの場合
```json
{
  "errors": [
    {
      "code": "VAL_001",
      "message": "必須項目が入力されていません",
      "field": "email"
    },
    {
      "code": "VAL_004",
      "message": "文字数制限を超えています",
      "field": "description"
    }
  ]
}
```

## 実装ガイドライン

### 1. エラーコードの定義
```go
// backend/internal/message/error_codes.go
const (
    // 認証・認可関連
    ErrCodeUnauthorized       ErrorCode = "AUTH_001"
    ErrCodeInvalidCredentials ErrorCode = "AUTH_002"
    // ...
)
```

### 2. エラーメッセージの定義
```go
// backend/internal/message/messages.go
var ErrorMessages = map[ErrorCode]string{
    ErrCodeUnauthorized:       "認証が必要です",
    ErrCodeInvalidCredentials: "認証情報が正しくありません",
    // ...
}
```

### 3. エラーハンドリング
```go
func HandleError(c *gin.Context, code ErrorCode, details ...interface{}) {
    message := ErrorMessages[code]
    status := GetHTTPStatus(code)
    
    response := ErrorResponse{
        Code:      string(code),
        Message:   message,
        Details:   details,
        Timestamp: time.Now(),
    }
    
    c.JSON(status, response)
}
```

## マッピングルール

### HTTPステータスコードとの対応
```go
func GetHTTPStatus(code ErrorCode) int {
    prefix := strings.Split(string(code), "_")[0]
    switch prefix {
    case "AUTH":
        if strings.Contains(string(code), "005") {
            return http.StatusForbidden // 403
        }
        return http.StatusUnauthorized // 401
    case "VAL", "BIZ":
        return http.StatusBadRequest // 400
    case "RES":
        if strings.Contains(string(code), "002") {
            return http.StatusConflict // 409
        }
        return http.StatusNotFound // 404
    case "SYS", "DAT", "DB":
        return http.StatusInternalServerError // 500
    default:
        return http.StatusInternalServerError
    }
}
```

## 移行計画

### フェーズ1: 新規エラーコードの統一
- 新規開発時は必ず標準形式を使用
- エラーコード定義ファイルの集約

### フェーズ2: 既存コードの段階的移行
1. 提案機能（P001xxx形式）→ BIZ_PROP_xxx形式へ
2. PostgreSQL専用コード → DB_xxx形式へ統一
3. 重複コードの整理

### フェーズ3: フロントエンド対応
- エラーコードに基づいた統一的なエラーハンドリング
- 国際化対応（i18n）の準備

## ベストプラクティス

### DO
- ✅ 一貫性のあるエラーコード体系を使用
- ✅ エラーメッセージは具体的かつユーザーフレンドリーに
- ✅ デバッグ情報は開発環境のみで出力
- ✅ エラーログには詳細情報を記録

### DON'T
- ❌ エラーコードを直接ハードコード
- ❌ 内部実装の詳細をエラーメッセージに含める
- ❌ 同じエラーに複数のコードを割り当てる
- ❌ カテゴリを無視したエラーコード作成

## エラーコード一覧

現在定義されている主要なエラーコード：

### 認証・認可（AUTH）
| コード | メッセージ | 用途 |
|--------|-----------|------|
| AUTH_001 | 認証が必要です | 未認証アクセス |
| AUTH_002 | 認証情報が無効です | ログイン失敗 |
| AUTH_003 | トークンの有効期限が切れています | トークン期限切れ |
| AUTH_004 | 無効なトークンです | 不正トークン |
| AUTH_005 | アクセス権限がありません | 権限不足 |

### バリデーション（VAL）
| コード | メッセージ | 用途 |
|--------|-----------|------|
| VAL_001 | 無効なリクエストです | 一般的なバリデーションエラー |
| VAL_003 | 必須項目が未入力です | 必須フィールド |
| VAL_004 | 文字数制限エラー | 長さ制限 |
| VAL_006 | メールアドレス形式エラー | Email検証 |
| VAL_007 | 日付形式エラー | 日付検証 |

### リソース（RES）
| コード | メッセージ | 用途 |
|--------|-----------|------|
| RES_001 | リソースが見つかりません | 404エラー |
| RES_002 | リソースが既に存在します | 重複エラー |
| RES_003 | リソースの競合が発生しました | 競合エラー |

### ビジネスロジック（BIZ）
| コード | メッセージ | 用途 |
|--------|-----------|------|
| BIZ_001 | 無効な操作です | 一般的な業務エラー |
| BIZ_002 | 許可されていない操作です | 業務ルール違反 |
| BIZ_003 | 無効な状態です | ステータスエラー |

### システム（SYS）
| コード | メッセージ | 用途 |
|--------|-----------|------|
| SYS_001 | 内部エラーが発生しました | 一般的なサーバーエラー |
| SYS_002 | データベースエラー | DB接続エラー |
| SYS_005 | サービスが利用できません | 503エラー |

---

最終更新: 2025-08-13