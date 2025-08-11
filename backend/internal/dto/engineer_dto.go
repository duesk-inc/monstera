package dto

import (
	"time"

	"github.com/duesk/monstera/internal/model"
)

// EngineerSummaryDTO エンジニア一覧表示用DTO
type EngineerSummaryDTO struct {
	ID             string    `json:"id"`
	EmployeeNumber string    `json:"employeeNumber"`
	Email          string    `json:"email"`
	FullName       string    `json:"fullName"`
	FullNameKana   string    `json:"fullNameKana"`
	Department     *string   `json:"department"`
	Position       *string   `json:"position"`
	EngineerStatus string    `json:"engineerStatus"`
	HireDate       *string   `json:"hireDate"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// EngineerDTO エンジニア基本情報DTO
type EngineerDTO struct {
	ID             string     `json:"id"`
	EmployeeNumber string     `json:"employeeNumber"`
	Email          string     `json:"email"`
	FirstName      string     `json:"firstName"`
	LastName       string     `json:"lastName"`
	FirstNameKana  *string    `json:"firstNameKana"`
	LastNameKana   *string    `json:"lastNameKana"`
	Sei            string     `json:"sei"`
	Mei            string     `json:"mei"`
	SeiKana        *string    `json:"seiKana"`
	MeiKana        *string    `json:"meiKana"`
	Department     *string    `json:"department"`
	Position       *string    `json:"position"`
	HireDate       *time.Time `json:"hireDate"`
	Education      *string    `json:"education"`
	PhoneNumber    *string    `json:"phoneNumber"`
	EngineerStatus string     `json:"engineerStatus"`
	DepartmentID   *string    `json:"departmentId"`
	ManagerID      *string    `json:"managerId"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// EngineerDetailDTO エンジニア詳細情報DTO
type EngineerDetailDTO struct {
	User           EngineerDTO                 `json:"user"`
	StatusHistory  []EngineerStatusHistoryDTO  `json:"statusHistory"`
	Skills         []EngineerSkillDTO          `json:"skills"`
	ProjectHistory []EngineerProjectHistoryDTO `json:"projectHistory"`
}

// EngineerStatusHistoryDTO ステータス履歴DTO
type EngineerStatusHistoryDTO struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	PreviousStatus *string   `json:"previousStatus"`
	NewStatus      string    `json:"newStatus"`
	Reason         string    `json:"reason"`
	ChangedBy      string    `json:"changedBy"`
	ChangedAt      time.Time `json:"changedAt"`
	CreatedAt      time.Time `json:"createdAt"`
}

// EngineerSkillDTO スキル情報DTO
type EngineerSkillDTO struct {
	ID              string                    `json:"id"`
	UserID          string                    `json:"userId"`
	SkillCategoryID string                    `json:"skillCategoryId"`
	SkillName       string                    `json:"skillName"`
	SkillLevel      int                       `json:"skillLevel"`
	Experience      *string                   `json:"experience"`
	LastUsedDate    *time.Time                `json:"lastUsedDate"`
	CreatedAt       time.Time                 `json:"createdAt"`
	UpdatedAt       time.Time                 `json:"updatedAt"`
	SkillCategory   *EngineerSkillCategoryDTO `json:"skillCategory,omitempty"`
}

// EngineerSkillCategoryDTO スキルカテゴリDTO
type EngineerSkillCategoryDTO struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	ParentID    *string   `json:"parentId"`
	SortOrder   int       `json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// EngineerProjectHistoryDTO プロジェクト履歴DTO
type EngineerProjectHistoryDTO struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	ProjectID   string     `json:"projectId"`
	Role        string     `json:"role"`
	StartDate   time.Time  `json:"startDate"`
	EndDate     *time.Time `json:"endDate"`
	Description *string    `json:"description"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// GetEngineersResponseDTO エンジニア一覧レスポンスDTO
type GetEngineersResponseDTO struct {
	Engineers []EngineerSummaryDTO `json:"engineers"`
	Total     int64                `json:"total"`
	Page      int                  `json:"page"`
	Limit     int                  `json:"limit"`
	Pages     int                  `json:"pages"`
}

// CreateEngineerRequestDTO エンジニア作成リクエストDTO
type CreateEngineerRequestDTO struct {
	Email         string     `json:"email" binding:"required,email"`
	FirstName     string     `json:"firstName" binding:"required"`
	LastName      string     `json:"lastName" binding:"required"`
	FirstNameKana *string    `json:"firstNameKana"`
	LastNameKana  *string    `json:"lastNameKana"`
	Sei           string     `json:"sei" binding:"required"`
	Mei           string     `json:"mei" binding:"required"`
	SeiKana       *string    `json:"seiKana"`
	MeiKana       *string    `json:"meiKana"`
	Department    *string    `json:"department"`
	Position      *string    `json:"position"`
	HireDate      *time.Time `json:"hireDate"`
	Education     *string    `json:"education"`
	PhoneNumber   *string    `json:"phoneNumber"`
	DepartmentID  *string    `json:"departmentId"`
	ManagerID     *string    `json:"managerId"`
}

// UpdateEngineerRequestDTO エンジニア更新リクエストDTO
type UpdateEngineerRequestDTO struct {
	FirstName     *string    `json:"firstName"`
	LastName      *string    `json:"lastName"`
	FirstNameKana *string    `json:"firstNameKana"`
	LastNameKana  *string    `json:"lastNameKana"`
	Sei           *string    `json:"sei"`
	Mei           *string    `json:"mei"`
	SeiKana       *string    `json:"seiKana"`
	MeiKana       *string    `json:"meiKana"`
	Department    *string    `json:"department"`
	Position      *string    `json:"position"`
	HireDate      *time.Time `json:"hireDate"`
	Education     *string    `json:"education"`
	PhoneNumber   *string    `json:"phoneNumber"`
	Email         *string    `json:"email"`
	DepartmentID  *string    `json:"departmentId"`
	ManagerID     *string    `json:"managerId"`
}

// UpdateEngineerStatusRequestDTO ステータス更新リクエストDTO
type UpdateEngineerStatusRequestDTO struct {
	Status string `json:"status" binding:"required,oneof=active standby resigned long_leave"`
	Reason string `json:"reason" binding:"required"`
}

// ModelからDTOへの変換関数

// UserToEngineerSummaryDTO UserモデルからEngineerSummaryDTOへ変換
func UserToEngineerSummaryDTO(user *model.User) EngineerSummaryDTO {
	fullName := user.LastName + " " + user.FirstName
	fullNameKana := ""
	if user.LastNameKana != "" && user.FirstNameKana != "" {
		fullNameKana = user.LastNameKana + " " + user.FirstNameKana
	}

	var hireDate *string
	if user.HireDate != nil {
		dateStr := user.HireDate.Format("2006-01-02")
		hireDate = &dateStr
	}

	return EngineerSummaryDTO{
		ID:             user.ID,
		EmployeeNumber: user.EmployeeNumber,
		Email:          user.Email,
		FullName:       fullName,
		FullNameKana:   fullNameKana,
		Department:     &user.Department,
		Position:       &user.Position,
		EngineerStatus: user.EngineerStatus,
		HireDate:       hireDate,
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}
}

// UserToEngineerDTO UserモデルからEngineerDTOへ変換
func UserToEngineerDTO(user *model.User) EngineerDTO {
	return EngineerDTO{
		ID:             parseStringToUUIDS(user.ID),
		EmployeeNumber: user.EmployeeNumber,
		Email:          user.Email,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		FirstNameKana:  &user.FirstNameKana,
		LastNameKana:   &user.LastNameKana,
		Sei:            user.Sei,
		Mei:            user.Mei,
		SeiKana:        &user.SeiKana,
		MeiKana:        &user.MeiKana,
		Department:     &user.Department,
		Position:       &user.Position,
		HireDate:       user.HireDate,
		Education:      &user.Education,
		PhoneNumber:    &user.PhoneNumber,
		EngineerStatus: user.EngineerStatus,
		DepartmentID:   parseStringToUUID(user.DepartmentID),
		ManagerID:      parseStringToUUID(user.ManagerID),
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}
}

// StatusHistoryToDTO EngineerStatusHistoryモデルからDTOへ変換
func StatusHistoryToDTO(history *model.EngineerStatusHistory) EngineerStatusHistoryDTO {
	return EngineerStatusHistoryDTO{
		ID:             history.ID,
		UserID:         history.UserID,
		PreviousStatus: history.PreviousStatus,
		NewStatus:      history.NewStatus,
		Reason:         history.ChangeReason,
		ChangedBy:      history.ChangedBy,
		ChangedAt:      history.ChangedAt,
		CreatedAt:      history.CreatedAt,
	}
}

// SkillToDTO EngineerSkillモデルからDTOへ変換
func SkillToDTO(skill *model.EngineerSkill) EngineerSkillDTO {
	dto := EngineerSkillDTO{
		ID:              skill.ID,
		UserID:          skill.UserID,
		SkillCategoryID: skill.SkillCategoryID,
		SkillName:       skill.SkillName,
		SkillLevel:      skill.SkillLevel,
		Experience:      nil,
		LastUsedDate:    nil,
		CreatedAt:       skill.CreatedAt,
		UpdatedAt:       skill.UpdatedAt,
	}

	if skill.SkillCategory != nil {
		category := SkillCategoryToDTO(skill.SkillCategory)
		dto.SkillCategory = &category
	}

	return dto
}

// SkillCategoryToDTO EngineerSkillCategoryモデルからDTOへ変換
func SkillCategoryToDTO(category *model.EngineerSkillCategory) EngineerSkillCategoryDTO {
	return EngineerSkillCategoryDTO{
		ID:          category.ID,
		Name:        category.Name,
		Description: nil,
		ParentID:    category.ParentID,
		SortOrder:   category.SortOrder,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

// ProjectHistoryToDTO EngineerProjectHistoryモデルからDTOへ変換
func ProjectHistoryToDTO(history *model.EngineerProjectHistory) EngineerProjectHistoryDTO {
	return EngineerProjectHistoryDTO{
		ID:          history.ID,
		UserID:      history.UserID,
		ProjectID:   history.ProjectID,
		Role:        history.Role,
		StartDate:   history.StartDate,
		EndDate:     history.EndDate,
		Description: nil,
		CreatedAt:   history.CreatedAt,
		UpdatedAt:   history.UpdatedAt,
	}
}

// parseStringToUUID string型のIDをuuid.UUIDポインタに変換するヘルパー関数
func parseStringToUUID(id *string) *string {
	if id == nil || *id == "" {
		return nil
	}
	parsed := *id
	return &parsed
}

// parseStringToUUIDS string型のIDをuuid.UUIDに変換するヘルパー関数
func parseStringToUUIDS(id string) string {
	parsed := id
	return parsed
}
