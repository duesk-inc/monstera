package message

// 認証関連のメッセージ定義

// エラーメッセージ
const (
	// ログイン関連
	MsgLoginSuccess         = "ログインに成功しました"
	MsgLoginFailed          = "ログインに失敗しました"
	MsgInvalidLoginInfo     = "認証情報が正しくありません"
	MsgAccountLocked        = "アカウントがロックされています"
	MsgTooManyLoginAttempts = "ログイン試行回数が上限を超えました。しばらくしてから再度お試しください"

	// ログアウト関連
	MsgLogoutSuccess = "ログアウトしました"
	MsgLogoutFailed  = "ログアウトに失敗しました"

	// ユーザー登録関連
	MsgUserRegistered          = "ユーザーが正常に登録されました"
	MsgUserRegistrationFailed  = "ユーザー登録に失敗しました"
	MsgEmailAlreadyExists      = "このメールアドレスは既に登録されています"
	MsgInvalidRegistrationData = "登録情報に不備があります"

	// トークン関連
	MsgTokenRefreshed        = "トークンが更新されました"
	MsgTokenRefreshFailed    = "トークンの更新に失敗しました"
	MsgTokenRevoked          = "トークンが無効化されました"
	MsgTokenNotFound         = "トークンが見つかりません"
	MsgRefreshTokenRequired  = "リフレッシュトークンが必要です"
	MsgInvalidRefreshToken   = "無効なリフレッシュトークンです"
	MsgTokenGenerationFailed = "トークンの生成に失敗しました"

	// 権限・ロール関連
	MsgInsufficientPermission = "この操作を行う権限がありません"
	MsgRoleRequired           = "この機能にアクセスするには特定のロールが必要です"
	MsgAdminOnly              = "管理者のみがこの操作を実行できます"
	MsgOwnerOnly              = "所有者のみがこの操作を実行できます"

	// 認証状態関連
	MsgAuthRequired         = "この操作には認証が必要です"
	MsgAlreadyAuthenticated = "既に認証済みです"
	MsgSessionInvalid       = "セッションが無効です"
	MsgPleaseLoginAgain     = "再度ログインしてください"

	// 二要素認証関連
	MsgTwoFactorRequired    = "二要素認証が必要です"
	MsgTwoFactorCodeInvalid = "認証コードが正しくありません"
	MsgTwoFactorCodeExpired = "認証コードの有効期限が切れています"
	MsgTwoFactorEnabled     = "二要素認証が有効になりました"
	MsgTwoFactorDisabled    = "二要素認証が無効になりました"

	// APIキー関連
	MsgAPIKeyCreated = "APIキーが作成されました"
	MsgAPIKeyDeleted = "APIキーが削除されました"
	MsgAPIKeyInvalid = "無効なAPIキーです"
	MsgAPIKeyExpired = "APIキーの有効期限が切れています"
	MsgAPIKeyRevoked = "APIキーが無効化されています"

	// セキュリティ関連
	MsgSuspiciousActivity  = "不審なアクティビティが検出されました"
	MsgIPAddressChanged    = "異なるIPアドレスからのアクセスが検出されました"
	MsgDeviceNotRecognized = "認識されていないデバイスからのアクセスです"
	MsgLocationChanged     = "異なる場所からのアクセスが検出されました"
)

// 成功メッセージ
const (
	MsgAuthSuccess         = "認証に成功しました"
	MsgVerificationSuccess = "検証に成功しました"
	MsgPermissionGranted   = "権限が付与されました"
	MsgAccessGranted       = "アクセスが許可されました"
)
