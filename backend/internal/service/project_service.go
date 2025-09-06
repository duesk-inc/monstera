package service

import (
    "context"
    "fmt"
    "strings"
    "time"

    "github.com/duesk/monstera/internal/common/dateutil"
    "github.com/duesk/monstera/internal/common/validate"
    "github.com/duesk/monstera/internal/dto"
    "github.com/duesk/monstera/internal/model"
    repo "github.com/duesk/monstera/internal/repository"
    "github.com/duesk/monstera/internal/service/mapping"
    "go.uber.org/zap"
    "gorm.io/gorm"
)

// ProjectService Engineer向けの案件サービス
type ProjectService interface {
    List(ctx context.Context, q dto.ProjectListQuery) (*dto.ProjectListResponse, error)
    Get(ctx context.Context, id string) (*dto.ProjectMinimalDTO, error)
    Create(ctx context.Context, req *dto.ProjectCreate) (*dto.ProjectMinimalDTO, error)
    Update(ctx context.Context, id string, req *dto.ProjectUpdate) (*dto.ProjectMinimalDTO, error)
}

type projectService struct {
    db          *gorm.DB
    projectRepo repo.ProjectRepository
    clientRepo  repo.ClientRepository
    logger      *zap.Logger
}

func NewProjectService(db *gorm.DB, projectRepo repo.ProjectRepository, clientRepo repo.ClientRepository, logger *zap.Logger) ProjectService {
    return &projectService{db: db, projectRepo: projectRepo, clientRepo: clientRepo, logger: logger}
}

// List 一覧取得（検索/ページング）
func (s *projectService) List(ctx context.Context, q dto.ProjectListQuery) (*dto.ProjectListResponse, error) {
    page, limit := validate.NormalizePageLimit(q.Page, q.Limit)
    offset := (page - 1) * limit

    // ベースクエリ
    query := s.db.WithContext(ctx).Model(&model.Project{}).Where("projects.deleted_at IS NULL")

    // 検索
    if q.Q != "" {
        search := "%" + q.Q + "%"
        query = query.Where("project_name LIKE ? OR description LIKE ?", search, search)
    }

    // ステータス（FE→BEマッピング）
    if q.Status != "" {
        mapped, err := mapping.MapFEToBEStatus(q.Status)
        if err != nil {
            return nil, fmt.Errorf("invalid status: %w", err)
        }
        query = query.Where("status = ?", mapped)
    }

    // 総件数
    var total int64
    if err := query.Count(&total).Error; err != nil {
        s.logger.Error("projects count failed", zap.Error(err))
        return nil, err
    }

    // ソート
    orderBy := q.SortBy
    if orderBy == "" { orderBy = "created_at" }
    orderDir := strings.ToLower(q.SortOrder)
    if orderDir != "asc" { orderDir = "desc" }
    query = query.Order(orderBy + " " + orderDir)

    // ページング + 取得（ClientもJOINして名称取得）
    type row struct {
        model.Project
        CompanyName string `gorm:"column:company_name"`
    }
    var rows []row
    if err := query.
        Select("projects.*, clients.company_name").
        Joins("LEFT JOIN clients ON clients.id = projects.client_id AND clients.deleted_at IS NULL").
        Limit(limit).Offset(offset).
        Find(&rows).Error; err != nil {
        s.logger.Error("projects list failed", zap.Error(err))
        return nil, err
    }

    // DTO変換
    items := make([]dto.ProjectMinimalDTO, 0, len(rows))
    for _, r := range rows {
        items = append(items, s.toMinimalDTO(&r.Project, r.CompanyName))
    }

    totalPages := int((total + int64(limit) - 1) / int64(limit))
    return &dto.ProjectListResponse{Items: items, Total: total, Page: page, Limit: limit, TotalPages: totalPages}, nil
}

// Get 詳細取得
func (s *projectService) Get(ctx context.Context, id string) (*dto.ProjectMinimalDTO, error) {
    // JOINして1件取得
    type row struct {
        model.Project
        CompanyName string `gorm:"column:company_name"`
    }
    var r row
    if err := s.db.WithContext(ctx).
        Table("projects").
        Select("projects.*, clients.company_name").
        Joins("LEFT JOIN clients ON clients.id = projects.client_id AND clients.deleted_at IS NULL").
        Where("projects.id = ? AND projects.deleted_at IS NULL", id).
        First(&r).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    dto := s.toMinimalDTO(&r.Project, r.CompanyName)
    return &dto, nil
}

// Create 作成
func (s *projectService) Create(ctx context.Context, req *dto.ProjectCreate) (*dto.ProjectMinimalDTO, error) {
    // バリデーション: 日付範囲
    var startPtr, endPtr *time.Time
    if req.StartDate != nil && *req.StartDate != "" {
        start, err := dateutil.ParseDateString(*req.StartDate)
        if err != nil { return nil, err }
        startPtr = &start
    }
    if req.EndDate != nil && *req.EndDate != "" {
        end, err := dateutil.ParseDateString(*req.EndDate)
        if err != nil { return nil, err }
        endPtr = &end
    }
    if startPtr != nil && endPtr != nil {
        if err := dateutil.ValidateDateRange(*startPtr, *endPtr); err != nil { return nil, err }
    }

    // ステータス
    feStatus := ""
    if req.Status != nil { feStatus = *req.Status }
    beStatus, err := mapping.MapFEToBEStatus(feStatus)
    if err != nil { return nil, err }

    // 作成
    p := &model.Project{
        ClientID:    req.ClientID,
        ProjectName: req.ProjectName,
        Status:      beStatus,
        StartDate:   startPtr,
        EndDate:     endPtr,
        Description: derefString(req.Description),
    }
    if err := s.db.WithContext(ctx).Create(p).Error; err != nil {
        return nil, err
    }

    // client名取得
    var client model.Client
    _ = s.db.WithContext(ctx).Where("id = ?", p.ClientID).First(&client)
    dto := s.toMinimalDTO(p, client.CompanyName)
    return &dto, nil
}

// Update 更新
func (s *projectService) Update(ctx context.Context, id string, req *dto.ProjectUpdate) (*dto.ProjectMinimalDTO, error) {
    var p model.Project
    if err := s.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&p).Error; err != nil {
        if err == gorm.ErrRecordNotFound { return nil, nil }
        return nil, err
    }

    updates := map[string]interface{}{}
    if req.ProjectName != nil { updates["project_name"] = *req.ProjectName }
    if req.ClientID != nil { updates["client_id"] = *req.ClientID }
    if req.Status != nil {
        be, err := mapping.MapFEToBEStatus(*req.Status)
        if err != nil { return nil, err }
        updates["status"] = be
    }
    if req.Description != nil { updates["description"] = *req.Description }
    if req.StartDate != nil {
        if *req.StartDate == "" { updates["start_date"] = gorm.Expr("NULL") } else {
            start, err := dateutil.ParseDateString(*req.StartDate)
            if err != nil { return nil, err }
            updates["start_date"] = start
        }
    }
    if req.EndDate != nil {
        if *req.EndDate == "" { updates["end_date"] = gorm.Expr("NULL") } else {
            end, err := dateutil.ParseDateString(*req.EndDate)
            if err != nil { return nil, err }
            updates["end_date"] = end
        }
    }

    // 日付範囲の検証（両方が存在する最終値で判定）
    var startFinal, endFinal *time.Time
    if v, ok := updates["start_date"].(time.Time); ok { startFinal = &v } else { startFinal = p.StartDate }
    if v, ok := updates["end_date"].(time.Time); ok { endFinal = &v } else { endFinal = p.EndDate }
    if startFinal != nil && endFinal != nil {
        if err := dateutil.ValidateDateRange(*startFinal, *endFinal); err != nil { return nil, err }
    }

    if len(updates) > 0 {
        if err := s.db.WithContext(ctx).Model(&p).Updates(updates).Error; err != nil { return nil, err }
    }

    // 最新を取得
    if err := s.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil { return nil, err }
    var client model.Client
    _ = s.db.WithContext(ctx).Where("id = ?", p.ClientID).First(&client)
    dto := s.toMinimalDTO(&p, client.CompanyName)
    return &dto, nil
}

func (s *projectService) toMinimalDTO(p *model.Project, clientName string) dto.ProjectMinimalDTO {
    return dto.ProjectMinimalDTO{
        ID:          p.ID,
        ProjectName: p.ProjectName,
        Status:      mapping.MapBEToFEStatus(p.Status),
        StartDate:   p.StartDate,
        EndDate:     p.EndDate,
        Description: p.Description,
        ClientID:    p.ClientID,
        ClientName:  clientName,
        CreatedAt:   p.CreatedAt,
        UpdatedAt:   p.UpdatedAt,
    }
}

func derefString(p *string) string {
    if p == nil { return "" }
    return *p
}
