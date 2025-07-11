package validator

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/duesk/monstera/internal/dto"
)

// WorkHistoryValidator 職務経歴バリデーター
type WorkHistoryValidator struct {
	// バリデーションエラーを格納
	errors []ValidationError
}

// ValidationError バリデーションエラー
type ValidationError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewWorkHistoryValidator 職務経歴バリデーターのコンストラクタ
func NewWorkHistoryValidator() *WorkHistoryValidator {
	return &WorkHistoryValidator{
		errors: make([]ValidationError, 0),
	}
}

// ValidateWorkHistory 職務経歴全体のバリデーション
func (v *WorkHistoryValidator) ValidateWorkHistory(req dto.WorkHistoryRequestV2) []ValidationError {
	v.errors = make([]ValidationError, 0)

	// 必須項目のバリデーション
	v.validateRequired("project_name", req.ProjectName, "プロジェクト名は必須です")
	v.validateRequired("start_date", req.StartDate, "開始日は必須です")
	v.validateRequired("industry", req.Industry, "業種は必須です")
	v.validateRequired("role", req.Role, "役割は必須です")

	// プロジェクト名のバリデーション
	v.validateProjectName(req.ProjectName)

	// 日付のバリデーション
	v.validateDateRange(req.StartDate, req.EndDate)

	// 業種のバリデーション
	v.validateIndustry(req.Industry)

	// 企業名のバリデーション
	v.validateCompanyName(req.CompanyName)

	// チーム規模のバリデーション
	v.validateTeamSize(req.TeamSize)

	// 役割のバリデーション
	v.validateRole(req.Role)

	// テキストフィールドのバリデーション
	v.validateProjectOverview(req.ProjectOverview)
	v.validateResponsibilities(req.Responsibilities)
	v.validateAchievements(req.Achievements)
	v.validateRemarks(req.Remarks)

	// 担当工程のバリデーション
	v.validateProcesses(req.Processes)

	// 技術情報のバリデーション
	v.validateTechnologies(req.Technologies)

	return v.errors
}

// WorkHistoryRequest 職務経歴リクエスト（後方互換のためのエイリアス）
type WorkHistoryRequest = dto.WorkHistoryRequestV2

// TechnologyRequest 技術リクエスト（後方互換のためのエイリアス）
type TechnologyRequest = dto.TechnologyRequestV2

// validateRequired 必須項目のバリデーション
func (v *WorkHistoryValidator) validateRequired(field, value, message string) {
	if strings.TrimSpace(value) == "" {
		v.addError(field, "REQUIRED", message)
	}
}

// validateProjectName プロジェクト名のバリデーション
func (v *WorkHistoryValidator) validateProjectName(projectName string) {
	if projectName == "" {
		return // 必須チェックで処理済み
	}

	// 文字数チェック (1-255文字)
	if utf8.RuneCountInString(projectName) > 255 {
		v.addError("project_name", "MAX_LENGTH", "プロジェクト名は255文字以内で入力してください")
	}

	// 不正文字チェック
	if v.containsInvalidChars(projectName) {
		v.addError("project_name", "INVALID_CHARS", "プロジェクト名に使用できない文字が含まれています")
	}
}

// validateDateRange 日付範囲のバリデーション
func (v *WorkHistoryValidator) validateDateRange(startDate string, endDate *string) {
	if startDate == "" {
		return // 必須チェックで処理済み
	}

	// 開始日の形式チェック
	startTime, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		v.addError("start_date", "INVALID_FORMAT", "開始日の形式が正しくありません (YYYY-MM-DD)")
		return
	}

	// 開始日が未来でないかチェック
	if startTime.After(time.Now()) {
		v.addError("start_date", "FUTURE_DATE", "開始日は現在日時より前の日付を入力してください")
	}

	// 開始日が過去すぎないかチェック (50年前まで)
	fiftyYearsAgo := time.Now().AddDate(-50, 0, 0)
	if startTime.Before(fiftyYearsAgo) {
		v.addError("start_date", "TOO_OLD", "開始日は50年以内の日付を入力してください")
	}

	// 終了日が指定されている場合
	if endDate != nil && *endDate != "" {
		endTime, err := time.Parse("2006-01-02", *endDate)
		if err != nil {
			v.addError("end_date", "INVALID_FORMAT", "終了日の形式が正しくありません (YYYY-MM-DD)")
			return
		}

		// 終了日が開始日より後かチェック
		if !endTime.After(startTime) {
			v.addError("end_date", "INVALID_RANGE", "終了日は開始日より後の日付を入力してください")
		}

		// 終了日が未来すぎないかチェック (1年後まで)
		oneYearLater := time.Now().AddDate(1, 0, 0)
		if endTime.After(oneYearLater) {
			v.addError("end_date", "TOO_FUTURE", "終了日は現在から1年以内の日付を入力してください")
		}
	}
}

// validateIndustry 業種のバリデーション
func (v *WorkHistoryValidator) validateIndustry(industry string) {
	if industry == "" {
		return // 必須チェックで処理済み
	}

	// 許可された業種リスト
	validIndustries := []string{
		"金融", "製造", "流通", "通信", "医療", "教育", "官公庁",
		"IT・Web", "不動産", "エネルギー", "建設", "運輸", "その他",
	}

	for _, valid := range validIndustries {
		if industry == valid {
			return
		}
	}

	v.addError("industry", "INVALID_VALUE", "指定された業種が無効です")
}

// validateCompanyName 企業名のバリデーション
func (v *WorkHistoryValidator) validateCompanyName(companyName *string) {
	if companyName == nil || *companyName == "" {
		return // 任意項目
	}

	// 文字数チェック (1-255文字)
	if utf8.RuneCountInString(*companyName) > 255 {
		v.addError("company_name", "MAX_LENGTH", "企業名は255文字以内で入力してください")
	}

	// 不正文字チェック
	if v.containsInvalidChars(*companyName) {
		v.addError("company_name", "INVALID_CHARS", "企業名に使用できない文字が含まれています")
	}
}

// validateTeamSize チーム規模のバリデーション
func (v *WorkHistoryValidator) validateTeamSize(teamSize *int) {
	if teamSize == nil {
		return // 任意項目
	}

	// 範囲チェック (1-1000人)
	if *teamSize < 1 || *teamSize > 1000 {
		v.addError("team_size", "OUT_OF_RANGE", "チーム規模は1〜1000人の範囲で入力してください")
	}
}

// validateRole 役割のバリデーション
func (v *WorkHistoryValidator) validateRole(role string) {
	if role == "" {
		return // 必須チェックで処理済み
	}

	// 許可された役割リスト
	validRoles := []string{
		"PG", "SE", "PL", "PM", "SA", "DB", "NW", "OP", "TEST", "その他",
	}

	for _, valid := range validRoles {
		if role == valid {
			return
		}
	}

	v.addError("role", "INVALID_VALUE", "指定された役割が無効です")
}

// validateProjectOverview プロジェクト概要のバリデーション
func (v *WorkHistoryValidator) validateProjectOverview(overview *string) {
	if overview == nil || *overview == "" {
		return // 任意項目
	}

	// 文字数チェック (1-2000文字)
	if utf8.RuneCountInString(*overview) > 2000 {
		v.addError("project_overview", "MAX_LENGTH", "プロジェクト概要は2000文字以内で入力してください")
	}
}

// validateResponsibilities 担当業務のバリデーション
func (v *WorkHistoryValidator) validateResponsibilities(responsibilities *string) {
	if responsibilities == nil || *responsibilities == "" {
		return // 任意項目
	}

	// 文字数チェック (1-2000文字)
	if utf8.RuneCountInString(*responsibilities) > 2000 {
		v.addError("responsibilities", "MAX_LENGTH", "担当業務は2000文字以内で入力してください")
	}
}

// validateAchievements 成果・実績のバリデーション
func (v *WorkHistoryValidator) validateAchievements(achievements *string) {
	if achievements == nil || *achievements == "" {
		return // 任意項目
	}

	// 文字数チェック (1-2000文字)
	if utf8.RuneCountInString(*achievements) > 2000 {
		v.addError("achievements", "MAX_LENGTH", "成果・実績は2000文字以内で入力してください")
	}
}

// validateRemarks 備考のバリデーション
func (v *WorkHistoryValidator) validateRemarks(remarks *string) {
	if remarks == nil || *remarks == "" {
		return // 任意項目
	}

	// 文字数チェック (1-1000文字)
	if utf8.RuneCountInString(*remarks) > 1000 {
		v.addError("remarks", "MAX_LENGTH", "備考は1000文字以内で入力してください")
	}
}

// validateProcesses 担当工程のバリデーション
func (v *WorkHistoryValidator) validateProcesses(processes []string) {
	if len(processes) == 0 {
		return // 任意項目
	}

	// 許可された工程リスト
	validProcesses := []string{
		"要件定義", "基本設計", "詳細設計", "実装", "単体テスト",
		"結合テスト", "システムテスト", "運用・保守", "その他",
	}

	processMap := make(map[string]bool)
	for _, valid := range validProcesses {
		processMap[valid] = true
	}

	// 重複チェック用
	seen := make(map[string]bool)

	for i, process := range processes {
		// 空文字チェック
		if strings.TrimSpace(process) == "" {
			v.addError(fmt.Sprintf("processes[%d]", i), "EMPTY", "工程名が空です")
			continue
		}

		// 有効な工程かチェック
		if !processMap[process] {
			v.addError(fmt.Sprintf("processes[%d]", i), "INVALID_VALUE", fmt.Sprintf("無効な工程です: %s", process))
			continue
		}

		// 重複チェック
		if seen[process] {
			v.addError(fmt.Sprintf("processes[%d]", i), "DUPLICATE", fmt.Sprintf("工程が重複しています: %s", process))
		}
		seen[process] = true
	}

	// 最大数チェック (10個まで)
	if len(processes) > 10 {
		v.addError("processes", "TOO_MANY", "担当工程は10個まで選択できます")
	}
}

// validateTechnologies 技術情報のバリデーション
func (v *WorkHistoryValidator) validateTechnologies(technologies []dto.TechnologyRequestV2) {
	if len(technologies) == 0 {
		return // 任意項目
	}

	// 重複チェック用
	seen := make(map[string]bool)

	for i, tech := range technologies {
		// カテゴリIDのバリデーション
		if strings.TrimSpace(tech.CategoryID) == "" {
			v.addError(fmt.Sprintf("technologies[%d].category_id", i), "REQUIRED", "技術カテゴリは必須です")
		} else if !v.isValidUUID(tech.CategoryID) {
			v.addError(fmt.Sprintf("technologies[%d].category_id", i), "INVALID_FORMAT", "技術カテゴリIDの形式が正しくありません")
		}

		// 技術名のバリデーション
		if strings.TrimSpace(tech.TechnologyName) == "" {
			v.addError(fmt.Sprintf("technologies[%d].technology_name", i), "REQUIRED", "技術名は必須です")
		} else {
			// 文字数チェック (1-100文字)
			if utf8.RuneCountInString(tech.TechnologyName) > 100 {
				v.addError(fmt.Sprintf("technologies[%d].technology_name", i), "MAX_LENGTH", "技術名は100文字以内で入力してください")
			}

			// 技術名の文字種チェック（英数字、ハイフン、ドット、スペース、日本語のみ）
			if !v.isValidTechnologyName(tech.TechnologyName) {
				v.addError(fmt.Sprintf("technologies[%d].technology_name", i), "INVALID_CHARS", "技術名に使用できない文字が含まれています")
			}

			// 重複チェック (同一カテゴリ内)
			key := fmt.Sprintf("%s:%s", tech.CategoryID, tech.TechnologyName)
			if seen[key] {
				v.addError(fmt.Sprintf("technologies[%d]", i), "DUPLICATE", fmt.Sprintf("技術が重複しています: %s", tech.TechnologyName))
			}
			seen[key] = true
		}
	}

	// 最大数チェック (50個まで)
	if len(technologies) > 50 {
		v.addError("technologies", "TOO_MANY", "技術は50個まで登録できます")
	}
}

// containsInvalidChars 不正文字チェック
func (v *WorkHistoryValidator) containsInvalidChars(text string) bool {
	// SQLインジェクション対策: 特定の文字列をチェック
	invalidStrings := []string{
		"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_", "exec", "execute",
		"union", "select", "insert", "update", "delete", "drop", "create", "alter",
	}

	lowerText := strings.ToLower(text)
	for _, invalid := range invalidStrings {
		if strings.Contains(lowerText, invalid) {
			return true
		}
	}

	// 制御文字のチェック
	for _, r := range text {
		if r < 32 && r != 9 && r != 10 && r != 13 { // タブ、改行、復帰文字以外の制御文字
			return true
		}
	}

	return false
}

// isValidUUID UUID形式チェック
func (v *WorkHistoryValidator) isValidUUID(uuid string) bool {
	pattern := `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`
	matched, _ := regexp.MatchString(pattern, uuid)
	return matched
}

// isValidTechnologyName 技術名の文字種チェック
func (v *WorkHistoryValidator) isValidTechnologyName(name string) bool {
	// 英数字、ハイフン、ドット、スペース、アンダースコア、プラス、シャープ、日本語文字のみ許可
	pattern := `^[a-zA-Z0-9\-\.\s_+#ぁ-んァ-ヶー一-龯]+$`
	matched, _ := regexp.MatchString(pattern, name)
	return matched
}

// addError エラーを追加
func (v *WorkHistoryValidator) addError(field, code, message string) {
	v.errors = append(v.errors, ValidationError{
		Field:   field,
		Code:    code,
		Message: message,
	})
}

// GetErrorMessages エラーメッセージのリストを取得
func (v *WorkHistoryValidator) GetErrorMessages() []string {
	messages := make([]string, len(v.errors))
	for i, err := range v.errors {
		messages[i] = err.Message
	}
	return messages
}

// HasErrors エラーがあるかチェック
func (v *WorkHistoryValidator) HasErrors() bool {
	return len(v.errors) > 0
}

// GetErrorsByField フィールド別エラー取得
func (v *WorkHistoryValidator) GetErrorsByField(field string) []ValidationError {
	var fieldErrors []ValidationError
	for _, err := range v.errors {
		if err.Field == field {
			fieldErrors = append(fieldErrors, err)
		}
	}
	return fieldErrors
}
