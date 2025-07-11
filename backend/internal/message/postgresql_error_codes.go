package message

// PostgreSQL追加エラーコード
const (
	ErrCodeUnavailable ErrorCode = "SYS_005" // サービス利用不可
)

// GetPostgreSQLErrorMessage エラーコードからメッセージを取得
func GetPostgreSQLErrorMessage(code ErrorCode) string {
	// PostgreSQL固有のエラーメッセージ
	postgresqlMessages := map[ErrorCode]string{
		ErrCodeDeadlock:            "データベースでデッドロックが検出されました。もう一度お試しください。",
		ErrCodeLockTimeout:         "データベースのロック取得がタイムアウトしました。",
		ErrCodeConnectionTimeout:   "データベース接続がタイムアウトしました。",
		ErrCodeConnectionClosed:    "データベース接続が切断されました。",
		ErrCodeTooManyConnections:  "データベース接続数が上限に達しています。",
		ErrCodeConstraintViolation: "データベース制約違反が発生しました。",
		ErrCodeDataException:       "データ形式エラーが発生しました。",
		ErrCodeSyntaxError:         "SQL構文エラーが発生しました。",
		ErrCodeResourceExhausted:   "システムリソースが不足しています。",
		ErrCodeStorageFull:         "ストレージ容量が不足しています。",
		ErrCodeMemoryExhausted:     "メモリが不足しています。",
		ErrCodeLimitExceeded:       "システム制限を超えました。",
		ErrCodeInvalidState:        "無効な状態です。",
		ErrCodeResourceBusy:        "リソースが使用中です。",
		ErrCodeCanceled:            "処理がキャンセルされました。",
		ErrCodeIOError:             "I/Oエラーが発生しました。",
		ErrCodeInvalidCredentials:  "認証情報が無効です。",
		ErrCodeDataTooLong:         "データが長すぎます。",
		ErrCodeValueOutOfRange:     "値が有効範囲外です。",
		ErrCodeInvalidFormat:       "データ形式が無効です。",
		ErrCodeInvalidQuery:        "クエリが無効です。",
		ErrCodeInvalidField:        "指定されたフィールドが存在しません。",
		ErrCodeInvalidTable:        "指定されたテーブルが存在しません。",
		ErrCodeInvalidFunction:     "指定された関数が存在しません。",
	}

	if msg, ok := postgresqlMessages[code]; ok {
		return msg
	}

	// フォールバックとして基本的なエラーメッセージを返す
	switch code {
	case ErrCodeInternalError:
		return "内部エラーが発生しました"
	case ErrCodeUnavailable:
		return "サービスが一時的に利用できません"
	}

	return "エラーが発生しました。"
}
