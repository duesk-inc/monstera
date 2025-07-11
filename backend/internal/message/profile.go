package message

// プロフィール関連のメッセージ定義

// 成功メッセージ
const (
	// プロフィール操作
	MsgProfileRetrieved = "プロフィール情報を取得しました"
	MsgProfileCreated   = "プロフィールが作成されました"
	MsgProfileUpdated   = "プロフィールが更新されました"
	MsgProfileDeleted   = "プロフィールが削除されました"
	MsgProfileSaved     = "プロフィールが保存されました"
	MsgProfileTempSaved = "プロフィールが一時保存されました"

	// プロフィール項目
	MsgBasicInfoUpdated     = "基本情報が更新されました"
	MsgContactInfoUpdated   = "連絡先情報が更新されました"
	MsgAddressUpdated       = "住所が更新されました"
	MsgEducationUpdated     = "学歴情報が更新されました"
	MsgAppealPointsUpdated  = "アピールポイントが更新されました"
	MsgProfilePhotoUploaded = "プロフィール写真がアップロードされました"
	MsgProfilePhotoDeleted  = "プロフィール写真が削除されました"

	// スキル関連
	MsgSkillAdded          = "スキルが追加されました"
	MsgSkillUpdated        = "スキルが更新されました"
	MsgSkillDeleted        = "スキルが削除されました"
	MsgLanguageSkillAdded  = "言語スキルが追加されました"
	MsgFrameworkSkillAdded = "フレームワークスキルが追加されました"
	MsgBusinessExpAdded    = "業務経験が追加されました"

	// 資格関連
	MsgCertificationAdded   = "資格が追加されました"
	MsgCertificationUpdated = "資格情報が更新されました"
	MsgCertificationDeleted = "資格が削除されました"
	MsgCertificationExpired = "資格の有効期限が切れています"
	MsgCertificationRenewed = "資格が更新されました"
)

// エラーメッセージ
const (
	// プロフィール操作エラー
	MsgProfileNotFound      = "プロフィールが見つかりません"
	MsgProfileAlreadyExists = "プロフィールは既に存在します"
	MsgProfileCreateFailed  = "プロフィールの作成に失敗しました"
	MsgProfileUpdateFailed  = "プロフィールの更新に失敗しました"
	MsgProfileDeleteFailed  = "プロフィールの削除に失敗しました"
	MsgProfileLoadFailed    = "プロフィールの読み込みに失敗しました"
	MsgProfileSaveFailed    = "プロフィールの保存に失敗しました"

	// バリデーションエラー
	MsgInvalidProfileData    = "プロフィールデータが無効です"
	MsgRequiredFieldsMissing = "必須項目が入力されていません"
	MsgInvalidBirthdate      = "生年月日が無効です"
	MsgInvalidGender         = "性別の選択が無効です"
	MsgInvalidPhoneNumber    = "電話番号の形式が正しくありません"
	MsgInvalidAddress        = "住所の形式が正しくありません"
	MsgInvalidPostalCode     = "郵便番号の形式が正しくありません"

	// 名前関連
	MsgFirstNameRequired     = "名前（名）は必須項目です"
	MsgLastNameRequired      = "名前（姓）は必須項目です"
	MsgFirstNameKanaRequired = "名前（名・カナ）は必須項目です"
	MsgLastNameKanaRequired  = "名前（姓・カナ）は必須項目です"
	MsgNameTooLong           = "名前が長すぎます"
	MsgInvalidKanaFormat     = "カナは全角カタカナで入力してください"

	// スキル関連エラー
	MsgSkillNotFound      = "スキルが見つかりません"
	MsgSkillAlreadyExists = "このスキルは既に登録されています"
	MsgInvalidSkillLevel  = "スキルレベルが無効です"
	MsgInvalidExperience  = "経験年数が無効です"
	MsgSkillLimitExceeded = "登録できるスキルの上限に達しました"

	// 資格関連エラー
	MsgCertificationNotFound  = "資格が見つかりません"
	MsgCertificationDuplicate = "この資格は既に登録されています"
	MsgInvalidAcquiredDate    = "取得日が無効です"
	MsgInvalidExpiryDate      = "有効期限が無効です"
	MsgExpiryBeforeAcquired   = "有効期限は取得日より後の日付にしてください"

	// 写真関連エラー
	MsgPhotoUploadFailed  = "写真のアップロードに失敗しました"
	MsgPhotoSizeExceeded  = "写真のサイズが上限を超えています"
	MsgInvalidPhotoFormat = "写真の形式が無効です（JPG、PNG、GIFのみ対応）"
	MsgPhotoNotFound      = "写真が見つかりません"

	// 権限エラー
	MsgCannotEditOthersProfile  = "他のユーザーのプロフィールは編集できません"
	MsgCannotViewPrivateProfile = "このプロフィールは非公開です"

	// その他
	MsgProfileIncomplete = "プロフィールが未完成です"
	MsgProfileLocked     = "プロフィールは編集中のため、一時的にロックされています"

	// 追加のエラーメッセージ
	MsgProfileGetError            = "プロフィール情報の取得に失敗しました"
	MsgProfileHistoryGetError     = "プロフィール履歴の取得に失敗しました"
	MsgInvalidVersionNumber       = "無効なバージョン番号です"
	MsgTechnologyCategoryGetError = "技術カテゴリ情報の取得に失敗しました"
	MsgCertificationListGetError  = "資格一覧の取得に失敗しました"
)

// 確認メッセージ
const (
	MsgConfirmProfileDelete = "プロフィールを削除してもよろしいですか？この操作は取り消せません"
	MsgConfirmSkillDelete   = "このスキルを削除してもよろしいですか？"
	MsgConfirmCertDelete    = "この資格を削除してもよろしいですか？"
	MsgConfirmPhotoDelete   = "プロフィール写真を削除してもよろしいですか？"
)
