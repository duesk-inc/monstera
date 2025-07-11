# 提案情報確認機能 詳細設計書

## 1. 概要

### 1.1 機能目的
エンジニア社員が個別提案された案件情報を確認し、見送り/選考への進行を判断できる機能を提供する。

### 1.2 アーキテクチャ方針
- 既存のmonsteraアーキテクチャに準拠（Handler → Service → Repository）
- monstera-pocスキーマとの参照関係を維持
- 既存の通知システム・認証システムとの統合

## 2. データベース詳細設計

### 2.1 テーブル設計

#### 2.1.1 proposalsテーブル
```sql
CREATE TABLE proposals (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    project_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'monstera_poc.projects.id参照',
    user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'エンジニアID',
    status ENUM('proposed', 'proceed', 'declined') NOT NULL DEFAULT 'proposed' COMMENT '提案ステータス',
    responded_at DATETIME(3) COMMENT '回答日時',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
    deleted_at DATETIME(3) NULL COMMENT '削除日時',
    
    CONSTRAINT fk_proposals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_proposals_user_id (user_id),
    INDEX idx_proposals_project_id (project_id),
    INDEX idx_proposals_status (status),
    INDEX idx_proposals_responded_at (responded_at),
    UNIQUE KEY idx_proposal_user_project (project_id, user_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提案情報テーブル';
```

#### 2.1.2 proposal_questionsテーブル
```sql
CREATE TABLE proposal_questions (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
    proposal_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '提案ID',
    question_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '質問内容',
    response_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '回答内容',
    sales_user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '営業担当者ID',
    is_responded BOOLEAN NOT NULL DEFAULT FALSE COMMENT '回答済みフラグ',
    responded_at DATETIME(3) COMMENT '回答日時',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
    deleted_at DATETIME(3) NULL COMMENT '削除日時',
    
    CONSTRAINT fk_proposal_questions_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_proposal_questions_sales_user FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_proposal_questions_proposal_id (proposal_id),
    INDEX idx_proposal_questions_sales_user_id (sales_user_id),
    INDEX idx_proposal_questions_is_responded (is_responded)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提案質問テーブル';
```

### 2.2 monstera-pocスキーマ参照設計

#### 2.2.1 クロススキーマ接続設定
```yaml
# config/database.yml
databases:
  monstera:
    host: ${DB_HOST}
    port: ${DB_PORT}
    name: ${DB_NAME}
    user: ${DB_USER}
    password: ${DB_PASSWORD}
  
  monstera_poc:
    host: ${DB_HOST}
    port: ${DB_PORT}
    name: ${MONSTERA_POC_DB_NAME}
    user: ${DB_USER}
    password: ${DB_PASSWORD}
```

#### 2.2.2 参照用モデル定義
```go
// internal/model/monstera_poc/project.go
type MonseteraPocProject struct {
    ID                   uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
    ProjectName          string    `gorm:"column:project_name" json:"project_name"`
    MinPrice             *int      `gorm:"column:min_price" json:"min_price"`
    MaxPrice             *int      `gorm:"column:max_price" json:"max_price"`
    WorkLocation         string    `gorm:"column:work_location" json:"work_location"`
    RemoteWorkType       string    `gorm:"column:remote_work_type" json:"remote_work_type"`
    WorkingTime          string    `gorm:"column:working_time" json:"working_time"`
    ContractPeriod       string    `gorm:"column:contract_period" json:"contract_period"`
    StartDate            *time.Time `gorm:"column:start_date" json:"start_date"`
    StartDateText        string    `gorm:"column:start_date_text" json:"start_date_text"`
    Description          string    `gorm:"column:description" json:"description"`
    CreatedAt            time.Time `gorm:"column:created_at" json:"created_at"`
    
    // 関連データ
    RequiredSkills       []ProjectRequiredSkill `gorm:"foreignKey:ProjectID" json:"required_skills"`
}

func (MonseteraPocProject) TableName() string {
    return "monstera_poc.projects"
}
```

## 3. バックエンド詳細設計

### 3.1 Model層設計

#### 3.1.1 Proposalモデル
```go
// internal/model/proposal.go
type ProposalStatus string

const (
    ProposalStatusProposed ProposalStatus = "proposed"
    ProposalStatusProceed  ProposalStatus = "proceed"
    ProposalStatusDeclined ProposalStatus = "declined"
)

type Proposal struct {
    model.Model
    ProjectID    uuid.UUID      `gorm:"type:varchar(36);not null;index" json:"project_id"`
    UserID       uuid.UUID      `gorm:"type:varchar(36);not null;index" json:"user_id"`
    Status       ProposalStatus `gorm:"type:enum('proposed','proceed','declined');default:'proposed'" json:"status"`
    RespondedAt  *time.Time     `gorm:"type:datetime(3)" json:"responded_at"`
    
    // 関連
    User         *model.User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
    Questions    []ProposalQuestion     `gorm:"foreignKey:ProposalID" json:"questions,omitempty"`
}

// ビジネスロジック
func (p *Proposal) CanRespond() bool {
    return p.Status == ProposalStatusProposed
}

func (p *Proposal) Respond(status ProposalStatus) error {
    if !p.CanRespond() {
        return errors.New("既に回答済みです")
    }
    
    p.Status = status
    now := time.Now()
    p.RespondedAt = &now
    return nil
}

func (p *Proposal) IsExpired() bool {
    if p.RespondedAt != nil {
        return false
    }
    // 30日経過で自動期限切れ
    return time.Since(p.CreatedAt) > 30*24*time.Hour
}
```

#### 3.1.2 ProposalQuestionモデル
```go
// internal/model/proposal_question.go
type ProposalQuestion struct {
    model.Model
    ProposalID    uuid.UUID  `gorm:"type:varchar(36);not null;index" json:"proposal_id"`
    QuestionText  string     `gorm:"type:text;not null" json:"question_text"`
    ResponseText  *string    `gorm:"type:text" json:"response_text"`
    SalesUserID   *uuid.UUID `gorm:"type:varchar(36);index" json:"sales_user_id"`
    IsResponded   bool       `gorm:"default:false" json:"is_responded"`
    RespondedAt   *time.Time `gorm:"type:datetime(3)" json:"responded_at"`
    
    // 関連
    Proposal      *Proposal   `gorm:"foreignKey:ProposalID" json:"proposal,omitempty"`
    SalesUser     *model.User `gorm:"foreignKey:SalesUserID" json:"sales_user,omitempty"`
}

func (q *ProposalQuestion) Respond(responseText string, salesUserID uuid.UUID) error {
    if q.IsResponded {
        return errors.New("既に回答済みです")
    }
    
    q.ResponseText = &responseText
    q.SalesUserID = &salesUserID
    q.IsResponded = true
    now := time.Now()
    q.RespondedAt = &now
    return nil
}
```

### 3.2 DTO設計

#### 3.2.1 Proposalリクエスト・レスポンスDTO
```go
// internal/dto/proposal_dto.go

// 提案一覧リクエスト
type GetProposalsRequest struct {
    Status    *string `form:"status" binding:"omitempty,oneof=proposed proceed declined"`
    Page      int     `form:"page" binding:"omitempty,min=1"`
    Limit     int     `form:"limit" binding:"omitempty,min=1,max=100"`
    SortBy    *string `form:"sort_by" binding:"omitempty,oneof=created_at responded_at"`
    SortOrder *string `form:"sort_order" binding:"omitempty,oneof=asc desc"`
}

func (r *GetProposalsRequest) SetDefaults() {
    if r.Page == 0 { r.Page = 1 }
    if r.Limit == 0 { r.Limit = 20 }
}

// 提案ステータス更新リクエスト
type UpdateProposalStatusRequest struct {
    Status string `json:"status" binding:"required,oneof=proceed declined"`
}

// 提案詳細レスポンス
type ProposalDetailResponse struct {
    ID           uuid.UUID                     `json:"id"`
    ProjectID    uuid.UUID                     `json:"project_id"`
    Status       string                        `json:"status"`
    RespondedAt  *time.Time                    `json:"responded_at"`
    CreatedAt    time.Time                     `json:"created_at"`
    Project      ProjectDetailDTO              `json:"project"`
    Questions    []ProposalQuestionDTO         `json:"questions"`
}

// プロジェクト詳細DTO（monstera-pocデータ統合）
type ProjectDetailDTO struct {
    ID                uuid.UUID              `json:"id"`
    ProjectName       string                 `json:"project_name"`
    Description       string                 `json:"description"`
    MinPrice          *int                   `json:"min_price"`
    MaxPrice          *int                   `json:"max_price"`
    WorkLocation      string                 `json:"work_location"`
    RemoteWorkType    string                 `json:"remote_work_type"`
    WorkingTime       string                 `json:"working_time"`
    ContractPeriod    string                 `json:"contract_period"`
    StartDate         *time.Time             `json:"start_date"`
    StartDateText     string                 `json:"start_date_text"`
    RequiredSkills    []ProjectSkillDTO      `json:"required_skills"`
    PreferredSkills   []ProjectSkillDTO      `json:"preferred_skills"`
}

// プロジェクトスキルDTO
type ProjectSkillDTO struct {
    SkillName             string `json:"skill_name"`
    ExperienceYearsMin    *int   `json:"experience_years_min"`
    ExperienceYearsMax    *int   `json:"experience_years_max"`
    IsRequired            bool   `json:"is_required"`
}

// 提案一覧レスポンス
type ProposalListResponse struct {
    Items []ProposalItemDTO `json:"items"`
    Total int64             `json:"total"`
    Page  int               `json:"page"`
    Limit int               `json:"limit"`
}

type ProposalItemDTO struct {
    ID             uuid.UUID  `json:"id"`
    ProjectID      uuid.UUID  `json:"project_id"`
    ProjectName    string     `json:"project_name"`
    MinPrice       *int       `json:"min_price"`
    MaxPrice       *int       `json:"max_price"`
    WorkLocation   string     `json:"work_location"`
    RequiredSkills string     `json:"required_skills"` // カンマ区切り文字列
    Status         string     `json:"status"`
    CreatedAt      time.Time  `json:"created_at"`
    RespondedAt    *time.Time `json:"responded_at"`
}
```

#### 3.2.2 質問機能DTO
```go
// 質問投稿リクエスト
type CreateQuestionRequest struct {
    QuestionText string `json:"question_text" binding:"required,min=1,max=2000"`
}

// 質問回答リクエスト（営業担当者用）
type RespondQuestionRequest struct {
    ResponseText string `json:"response_text" binding:"required,min=1,max=2000"`
}

// 質問DTO
type ProposalQuestionDTO struct {
    ID           uuid.UUID  `json:"id"`
    QuestionText string     `json:"question_text"`
    ResponseText *string    `json:"response_text"`
    IsResponded  bool       `json:"is_responded"`
    RespondedAt  *time.Time `json:"responded_at"`
    CreatedAt    time.Time  `json:"created_at"`
    SalesUser    *UserSummaryDTO `json:"sales_user,omitempty"`
}

type UserSummaryDTO struct {
    ID        uuid.UUID `json:"id"`
    FirstName string    `json:"first_name"`
    LastName  string    `json:"last_name"`
    Email     string    `json:"email"`
}
```

### 3.3 Repository層設計

#### 3.3.1 ProposalRepositoryインターフェース
```go
// internal/repository/proposal_repository.go
type ProposalRepository interface {
    repository.CrudRepository[model.Proposal]
    
    // 基本検索
    FindByUserID(ctx context.Context, userID uuid.UUID, params GetProposalsParams) ([]*model.Proposal, int64, error)
    FindByProjectID(ctx context.Context, projectID uuid.UUID) (*model.Proposal, error)
    FindWithProject(ctx context.Context, id uuid.UUID) (*model.Proposal, *monstera_poc.Project, error)
    
    // ステータス管理
    UpdateStatus(ctx context.Context, id uuid.UUID, status model.ProposalStatus) error
    FindByStatus(ctx context.Context, status model.ProposalStatus) ([]*model.Proposal, error)
    
    // 統計・分析
    GetProposalStats(ctx context.Context, userID *uuid.UUID) (*ProposalStats, error)
    CountByStatus(ctx context.Context, userID uuid.UUID) (map[model.ProposalStatus]int64, error)
}

type GetProposalsParams struct {
    Status    *model.ProposalStatus
    Page      int
    Limit     int
    SortBy    string
    SortOrder string
}

type ProposalStats struct {
    TotalProposals   int64 `json:"total_proposals"`
    ProposedCount    int64 `json:"proposed_count"`
    ProceedCount     int64 `json:"proceed_count"`
    DeclinedCount    int64 `json:"declined_count"`
    ResponseRate     float64 `json:"response_rate"`
}
```

#### 3.3.2 ProposalRepositoryの実装
```go
// internal/repository/proposal_repository.go
type proposalRepository struct {
    *BaseRepository
    pocDB *gorm.DB // monstera-pocスキーマ用DB接続
}

func NewProposalRepository(db *gorm.DB, pocDB *gorm.DB, logger *zap.Logger) ProposalRepository {
    return &proposalRepository{
        BaseRepository: NewBaseRepository(db, logger),
        pocDB:          pocDB,
    }
}

func (r *proposalRepository) FindByUserID(ctx context.Context, userID uuid.UUID, params GetProposalsParams) ([]*model.Proposal, int64, error) {
    var proposals []*model.Proposal
    var total int64
    
    query := r.DB.WithContext(ctx).Where("user_id = ? AND deleted_at IS NULL", userID)
    
    // フィルタリング
    if params.Status != nil {
        query = query.Where("status = ?", *params.Status)
    }
    
    // カウント取得
    if err := query.Model(&model.Proposal{}).Count(&total).Error; err != nil {
        r.Logger.Error("Failed to count proposals", zap.Error(err))
        return nil, 0, err
    }
    
    // ソート
    orderBy := "created_at DESC"
    if params.SortBy != "" {
        orderBy = fmt.Sprintf("%s %s", params.SortBy, params.SortOrder)
    }
    
    // ページネーション
    offset := (params.Page - 1) * params.Limit
    err := query.Order(orderBy).Limit(params.Limit).Offset(offset).Find(&proposals).Error
    
    if err != nil {
        r.Logger.Error("Failed to find proposals by user ID", 
            zap.String("user_id", userID.String()),
            zap.Error(err))
        return nil, 0, err
    }
    
    return proposals, total, nil
}

func (r *proposalRepository) FindWithProject(ctx context.Context, id uuid.UUID) (*model.Proposal, *monstera_poc.Project, error) {
    var proposal model.Proposal
    err := r.DB.WithContext(ctx).
        Where("id = ? AND deleted_at IS NULL", id).
        Preload("Questions", func(db *gorm.DB) *gorm.DB {
            return db.Where("deleted_at IS NULL").Order("created_at ASC")
        }).
        Preload("Questions.SalesUser").
        First(&proposal).Error
        
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil, nil
        }
        r.Logger.Error("Failed to find proposal", zap.String("id", id.String()), zap.Error(err))
        return nil, nil, err
    }
    
    // monstera-pocからプロジェクト情報を取得
    var project monstera_poc.Project
    err = r.pocDB.WithContext(ctx).
        Where("id = ?", proposal.ProjectID).
        Preload("RequiredSkills").
        Preload("RequiredSkills.Skill").
        First(&project).Error
        
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            r.Logger.Warn("Project not found in monstera-poc", zap.String("project_id", proposal.ProjectID.String()))
            return &proposal, nil, nil
        }
        r.Logger.Error("Failed to find project from monstera-poc", 
            zap.String("project_id", proposal.ProjectID.String()),
            zap.Error(err))
        return nil, nil, err
    }
    
    return &proposal, &project, nil
}
```

#### 3.3.3 ProposalQuestionRepository
```go
// internal/repository/proposal_question_repository.go
type ProposalQuestionRepository interface {
    repository.CrudRepository[model.ProposalQuestion]
    
    FindByProposalID(ctx context.Context, proposalID uuid.UUID) ([]*model.ProposalQuestion, error)
    FindPendingBySalesUser(ctx context.Context, salesUserID uuid.UUID) ([]*model.ProposalQuestion, error)
    UpdateResponse(ctx context.Context, id uuid.UUID, responseText string, salesUserID uuid.UUID) error
}
```

### 3.4 Service層設計

#### 3.4.1 ProposalServiceインターフェース
```go
// internal/service/proposal_service.go
type ProposalServiceInterface interface {
    // 提案情報管理
    GetProposals(ctx context.Context, userID uuid.UUID, req *dto.GetProposalsRequest) (*dto.ProposalListResponse, error)
    GetProposalDetail(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*dto.ProposalDetailResponse, error)
    UpdateProposalStatus(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateProposalStatusRequest) error
    
    // 質問機能
    CreateQuestion(ctx context.Context, proposalID uuid.UUID, userID uuid.UUID, req *dto.CreateQuestionRequest) (*dto.ProposalQuestionDTO, error)
    GetQuestions(ctx context.Context, proposalID uuid.UUID, userID uuid.UUID) ([]*dto.ProposalQuestionDTO, error)
    
    // 営業担当者向け
    RespondToQuestion(ctx context.Context, questionID uuid.UUID, salesUserID uuid.UUID, req *dto.RespondQuestionRequest) error
    GetPendingQuestions(ctx context.Context, salesUserID uuid.UUID) ([]*dto.ProposalQuestionDTO, error)
    
    // 統計・分析
    GetProposalStats(ctx context.Context, userID uuid.UUID) (*dto.ProposalStatsResponse, error)
    
    // 内部処理
    CreateProposal(ctx context.Context, projectID uuid.UUID, userID uuid.UUID) (*model.Proposal, error)
}
```

#### 3.4.2 ProposalService実装
```go
// internal/service/proposal_service.go
type proposalService struct {
    db                  *gorm.DB
    logger              *zap.Logger
    proposalRepo        repository.ProposalRepository
    questionRepo        repository.ProposalQuestionRepository
    userRepo            repository.UserRepository
    notificationService NotificationServiceInterface
    transactionManager  transaction.TransactionManager
}

func (s *proposalService) UpdateProposalStatus(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *dto.UpdateProposalStatusRequest) error {
    return s.transactionManager.WithTransaction(ctx, func(tx *gorm.DB) error {
        proposalRepo := repository.NewProposalRepository(tx, s.pocDB, s.logger)
        
        // 提案の存在確認と権限チェック
        proposal, err := proposalRepo.FindByID(ctx, id)
        if err != nil {
            return fmt.Errorf("提案の取得に失敗しました: %w", err)
        }
        if proposal == nil {
            return errors.New("提案が見つかりません")
        }
        if proposal.UserID != userID {
            return errors.New("アクセス権限がありません")
        }
        
        // ビジネスロジック検証
        if err := proposal.Respond(model.ProposalStatus(req.Status)); err != nil {
            return fmt.Errorf("ステータス更新に失敗しました: %w", err)
        }
        
        // データベース更新
        if err := proposalRepo.Update(ctx, proposal); err != nil {
            return fmt.Errorf("データベース更新に失敗しました: %w", err)
        }
        
        // 営業担当者への通知送信
        if err := s.sendStatusChangeNotification(ctx, proposal); err != nil {
            s.logger.Warn("通知送信に失敗しました", zap.Error(err))
            // 通知失敗はメイン処理を停止しない
        }
        
        return nil
    })
}

func (s *proposalService) sendStatusChangeNotification(ctx context.Context, proposal *model.Proposal) error {
    // 営業担当者を特定
    salesUsers, err := s.getSalesUsersForProposal(ctx, proposal.ProjectID)
    if err != nil {
        return fmt.Errorf("営業担当者の特定に失敗しました: %w", err)
    }
    
    if len(salesUsers) == 0 {
        s.logger.Info("営業担当者が見つかりません", zap.String("project_id", proposal.ProjectID.String()))
        return nil
    }
    
    // ユーザー情報取得
    user, err := s.userRepo.FindByID(ctx, proposal.UserID)
    if err != nil {
        return fmt.Errorf("ユーザー情報の取得に失敗しました: %w", err)
    }
    
    // 通知内容作成
    var notificationType model.NotificationType
    var title, message string
    
    switch proposal.Status {
    case model.ProposalStatusProceed:
        notificationType = model.NotificationTypeProject
        title = "案件提案への回答（選考へ進む）"
        message = fmt.Sprintf("%s %sさんが案件提案に対して「選考へ進む」を選択しました",
            user.LastName, user.FirstName)
    case model.ProposalStatusDeclined:
        notificationType = model.NotificationTypeProject
        title = "案件提案への回答（見送り）"
        message = fmt.Sprintf("%s %sさんが案件提案に対して「見送り」を選択しました",
            user.LastName, user.FirstName)
    default:
        return nil // proposed状態では通知しない
    }
    
    // 営業担当者全員に通知送信
    for _, salesUser := range salesUsers {
        notification := &model.Notification{
            Title:            title,
            Message:          message,
            NotificationType: notificationType,
            Priority:         model.NotificationPriorityMedium,
            ReferenceID:      &proposal.ID,
            ReferenceType:    StringPtr("proposal"),
        }
        
        if err := s.notificationService.CreateUserNotification(ctx, salesUser.ID, notification); err != nil {
            s.logger.Error("ユーザー通知の作成に失敗しました",
                zap.String("sales_user_id", salesUser.ID.String()),
                zap.Error(err))
        }
    }
    
    return nil
}

func (s *proposalService) getSalesUsersForProposal(ctx context.Context, projectID uuid.UUID) ([]*model.User, error) {
    // 営業役割を持つユーザーを取得
    salesUsers, err := s.userRepo.FindByRoles(ctx, []model.Role{
        model.RoleSalesManager,
        model.RoleSalesRep,
    })
    if err != nil {
        return nil, fmt.Errorf("営業担当者の検索に失敗しました: %w", err)
    }
    
    // アクティブなユーザーのみフィルタ
    var activeSalesUsers []*model.User
    for _, user := range salesUsers {
        if user.Active {
            activeSalesUsers = append(activeSalesUsers, user)
        }
    }
    
    return activeSalesUsers, nil
}
```

### 3.5 Handler層設計

#### 3.5.1 ProposalHandlerインターフェース
```go
// internal/handler/proposal_handler.go
type ProposalHandler interface {
    // エンジニア向けAPI
    GetProposals(c *gin.Context)
    GetProposalDetail(c *gin.Context)
    UpdateProposalStatus(c *gin.Context)
    CreateQuestion(c *gin.Context)
    GetQuestions(c *gin.Context)
    
    // 営業担当者向けAPI
    RespondToQuestion(c *gin.Context)
    GetPendingQuestions(c *gin.Context)
}
```

#### 3.5.2 ProposalHandler実装
```go
// internal/handler/proposal_handler.go
type proposalHandler struct {
    service         service.ProposalServiceInterface
    logger          *zap.Logger
    errorHandler    *utils.ErrorHandler
    debugLogger     *debug.DebugLogger
}

func (h *proposalHandler) GetProposals(c *gin.Context) {
    // デバッグログ開始
    h.debugLogger.RequestStart(
        debug.DebugLogConfig{
            Category:    debug.CategoryAPI,
            Operation:   debug.OperationRead,
            Description: "提案情報一覧取得",
        },
        debug.RequestDebugData{
            Method:  c.Request.Method,
            URL:     c.Request.URL.String(),
            UserID:  c.GetString("user_id"),
        },
    )
    
    // ユーザー認証確認
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        h.errorHandler.HandleAuthorizationError(c, "提案情報の閲覧")
        return
    }
    
    // リクエストパラメータ解析
    var req dto.GetProposalsRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        validationErrors := h.errorHandler.CreateValidationErrorMap(err)
        h.errorHandler.HandleValidationError(c, validationErrors)
        return
    }
    req.SetDefaults()
    
    // サービス呼び出し
    response, err := h.service.GetProposals(c.Request.Context(), userID, &req)
    if err != nil {
        h.logger.Error("Failed to get proposals",
            zap.String("user_id", userID.String()),
            zap.Error(err))
        h.errorHandler.HandleError(c, message.ErrCodeInternalError, "提案情報の取得に失敗しました")
        return
    }
    
    // デバッグログ終了
    h.debugLogger.RequestComplete(
        debug.DebugLogConfig{
            Category:    debug.CategoryAPI,
            Operation:   debug.OperationRead,
            Description: "提案情報一覧取得",
        },
        debug.ResponseDebugData{
            StatusCode: 200,
            Data:       response,
        },
    )
    
    c.JSON(http.StatusOK, response)
}

func (h *proposalHandler) UpdateProposalStatus(c *gin.Context) {
    // リクエストID取得
    proposalID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "無効な提案IDです")
        return
    }
    
    userID, err := h.getUserIDFromContext(c)
    if err != nil {
        h.errorHandler.HandleAuthorizationError(c, "提案ステータスの更新")
        return
    }
    
    // リクエストボディ解析
    var req dto.UpdateProposalStatusRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        validationErrors := h.errorHandler.CreateValidationErrorMap(err)
        h.errorHandler.HandleValidationError(c, validationErrors)
        return
    }
    
    // サービス呼び出し
    if err := h.service.UpdateProposalStatus(c.Request.Context(), proposalID, userID, &req); err != nil {
        h.logger.Error("Failed to update proposal status",
            zap.String("proposal_id", proposalID.String()),
            zap.String("user_id", userID.String()),
            zap.String("status", req.Status),
            zap.Error(err))
            
        if err.Error() == "アクセス権限がありません" {
            h.errorHandler.HandleAuthorizationError(c, "提案ステータスの更新")
            return
        }
        
        if err.Error() == "既に回答済みです" {
            h.errorHandler.HandleError(c, message.ErrCodeInvalidRequest, "既に回答済みです")
            return
        }
        
        h.errorHandler.HandleError(c, message.ErrCodeInternalError, "ステータス更新に失敗しました")
        return
    }
    
    c.JSON(http.StatusOK, dto.SuccessResponse{
        Message: "ステータスを更新しました",
    })
}

func (h *proposalHandler) getUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
    userIDStr := c.GetString("user_id")
    if userIDStr == "" {
        return uuid.Nil, errors.New("user_id not found in context")
    }
    return uuid.Parse(userIDStr)
}
```

### 3.6 エラーハンドリング設計

#### 3.6.1 提案機能専用エラーコード
```go
// internal/message/proposal_error_codes.go
const (
    // 提案関連エラー（P001xxx）
    ErrCodeProposalNotFound        ErrorCode = "P001E001" // 提案が見つかりません
    ErrCodeProposalAccessDenied    ErrorCode = "P001E002" // 提案へのアクセス権限がありません
    ErrCodeProposalAlreadyAnswered ErrorCode = "P001E003" // 既に回答済みです
    ErrCodeProposalExpired         ErrorCode = "P001E004" // 提案の回答期限が過ぎています
    
    // 質問関連エラー（P002xxx）
    ErrCodeQuestionNotFound        ErrorCode = "P002E001" // 質問が見つかりません
    ErrCodeQuestionAccessDenied    ErrorCode = "P002E002" // 質問へのアクセス権限がありません
    ErrCodeQuestionAlreadyAnswered ErrorCode = "P002E003" // 既に回答済みです
    
    // バリデーションエラー（P003xxx）
    ErrCodeInvalidProposalStatus   ErrorCode = "P003V001" // 無効な提案ステータスです
    ErrCodeQuestionTextRequired    ErrorCode = "P003V002" // 質問内容は必須です
    ErrCodeQuestionTextTooLong     ErrorCode = "P003V003" // 質問内容が長すぎます
)

// HTTPステータスコードマッピング
func GetHTTPStatusCode(errorCode ErrorCode) int {
    switch errorCode {
    case ErrCodeProposalNotFound, ErrCodeQuestionNotFound:
        return http.StatusNotFound
    case ErrCodeProposalAccessDenied, ErrCodeQuestionAccessDenied:
        return http.StatusForbidden
    case ErrCodeProposalAlreadyAnswered, ErrCodeQuestionAlreadyAnswered,
         ErrCodeInvalidProposalStatus:
        return http.StatusBadRequest
    default:
        return http.StatusInternalServerError
    }
}
```

### 3.7 ログ設計

#### 3.7.1 構造化ログパターン
```go
// ログレベル使い分け基準
// Info: 正常な業務操作、APIアクセス成功
// Warn: 回復可能なエラー、設定不備、通知送信失敗
// Error: システムエラー、データベースエラー、予期しないエラー
// Debug: 開発時の詳細情報（本番では無効）

// 提案ステータス更新のログ例
h.logger.Info("提案ステータスを更新しました",
    zap.String("proposal_id", proposalID.String()),
    zap.String("user_id", userID.String()),
    zap.String("old_status", oldStatus),
    zap.String("new_status", req.Status),
    zap.String("request_id", c.GetString("request_id")))

// エラーログ例
h.logger.Error("提案の取得に失敗しました",
    zap.String("proposal_id", proposalID.String()),
    zap.String("user_id", userID.String()),
    zap.String("operation", "GetProposalDetail"),
    zap.Error(err))
```

#### 3.7.2 APIアクセスログ
```go
// middleware/proposal_logger.go
func ProposalLoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        latency := time.Since(start)
        statusCode := c.Writer.Status()
        
        logLevel := zap.InfoLevel
        if statusCode >= 400 && statusCode < 500 {
            logLevel = zap.WarnLevel
        } else if statusCode >= 500 {
            logLevel = zap.ErrorLevel
        }
        
        logger.Log(logLevel, "Proposal API Access",
            zap.String("method", c.Request.Method),
            zap.String("path", c.Request.URL.Path),
            zap.Int("status", statusCode),
            zap.Duration("latency", latency),
            zap.String("user_id", c.GetString("user_id")),
            zap.String("request_id", c.GetString("request_id")),
            zap.String("client_ip", c.ClientIP()))
    }
}
```

## 4. フロントエンド詳細設計

### 4.1 React Query設計

#### 4.1.1 Query Keys定義
```typescript
// lib/tanstack-query.ts
export const queryKeys = {
  // 既存のキーに追加
  proposals: (params?: any) => ['proposals', params] as const,
  proposalDetail: (id: string) => ['proposals', id] as const,
  proposalQuestions: (proposalId: string) => ['proposals', proposalId, 'questions'] as const,
  proposalStats: ['proposals', 'stats'] as const,
  
  // 営業担当者向け
  salesPendingQuestions: ['sales', 'questions', 'pending'] as const,
}

// キャッシュ戦略設定
export const PROPOSAL_CACHE_STRATEGIES = {
  PROPOSALS: {
    staleTime: 2 * 60 * 1000, // 2分
    gcTime: 5 * 60 * 1000,    // 5分
  },
  PROPOSAL_DETAIL: {
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000,   // 10分
  },
  QUESTIONS: {
    staleTime: 1 * 60 * 1000, // 1分（リアルタイム性重視）
    gcTime: 3 * 60 * 1000,    // 3分
  },
}
```

#### 4.1.2 API Client設計
```typescript
// api/proposal.ts
import { apiClient } from '@/lib/apiClient';
import { ProposalListResponse, ProposalDetailResponse, UpdateProposalStatusRequest } from '@/types/proposal';

export const proposalApi = {
  // 提案一覧取得
  getProposals: async (params?: GetProposalsParams): Promise<ProposalListResponse> => {
    const response = await apiClient.get('/api/v1/proposals', { params });
    return response.data;
  },

  // 提案詳細取得
  getProposalDetail: async (id: string): Promise<ProposalDetailResponse> => {
    const response = await apiClient.get(`/api/v1/proposals/${id}`);
    return response.data;
  },

  // ステータス更新
  updateProposalStatus: async (id: string, data: UpdateProposalStatusRequest): Promise<void> => {
    await apiClient.put(`/api/v1/proposals/${id}/status`, data);
  },

  // 質問投稿
  createQuestion: async (proposalId: string, data: CreateQuestionRequest): Promise<ProposalQuestionDTO> => {
    const response = await apiClient.post(`/api/v1/proposals/${proposalId}/questions`, data);
    return response.data;
  },

  // 質問一覧取得
  getQuestions: async (proposalId: string): Promise<ProposalQuestionDTO[]> => {
    const response = await apiClient.get(`/api/v1/proposals/${proposalId}/questions`);
    return response.data;
  },
};
```

#### 4.1.3 Query・Mutation Hooks
```typescript
// hooks/proposal/useProposalQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalApi } from '@/api/proposal';
import { queryKeys, PROPOSAL_CACHE_STRATEGIES } from '@/lib/tanstack-query';
import { useToast } from '@/hooks/common/useToast';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';

export const useProposalsQuery = (params?: GetProposalsParams) => {
  return useQuery({
    queryKey: queryKeys.proposals(params),
    queryFn: () => proposalApi.getProposals(params),
    staleTime: PROPOSAL_CACHE_STRATEGIES.PROPOSALS.staleTime,
    gcTime: PROPOSAL_CACHE_STRATEGIES.PROPOSALS.gcTime,
  });
};

export const useProposalDetailQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.proposalDetail(id),
    queryFn: () => proposalApi.getProposalDetail(id),
    enabled: !!id,
    staleTime: PROPOSAL_CACHE_STRATEGIES.PROPOSAL_DETAIL.staleTime,
    gcTime: PROPOSAL_CACHE_STRATEGIES.PROPOSAL_DETAIL.gcTime,
  });
};

export const useUpdateProposalStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProposalStatusRequest }) =>
      proposalApi.updateProposalStatus(id, data),
    onSuccess: (_, { id, data }) => {
      // キャッシュ無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalDetail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalStats });
      
      const statusText = data.status === 'proceed' ? '選考へ進む' : '見送り';
      showSuccess(`提案への回答を「${statusText}」で送信しました`);
    },
    onError: (error) => {
      handleSubmissionError(error, '提案への回答');
    },
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const { handleSubmissionError } = useEnhancedErrorHandler();

  return useMutation({
    mutationFn: ({ proposalId, data }: { proposalId: string; data: CreateQuestionRequest }) =>
      proposalApi.createQuestion(proposalId, data),
    onSuccess: (_, { proposalId }) => {
      // 質問一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.proposalQuestions(proposalId) });
      showSuccess('質問を送信しました');
    },
    onError: (error) => {
      handleSubmissionError(error, '質問の送信');
    },
  });
};
```

### 4.2 Type定義

#### 4.2.1 提案関連Type
```typescript
// types/proposal.ts
export interface ProposalItemDTO {
  id: string;
  projectId: string;
  projectName: string;
  minPrice?: number;
  maxPrice?: number;
  workLocation: string;
  requiredSkills: string;
  status: ProposalStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface ProposalDetailResponse {
  id: string;
  projectId: string;
  status: ProposalStatus;
  respondedAt?: string;
  createdAt: string;
  project: ProjectDetailDTO;
  questions: ProposalQuestionDTO[];
}

export interface ProjectDetailDTO {
  id: string;
  projectName: string;
  description: string;
  minPrice?: number;
  maxPrice?: number;
  workLocation: string;
  remoteWorkType: string;
  workingTime: string;
  contractPeriod: string;
  startDate?: string;
  startDateText: string;
  requiredSkills: ProjectSkillDTO[];
  preferredSkills: ProjectSkillDTO[];
}

export interface ProjectSkillDTO {
  skillName: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  isRequired: boolean;
}

export type ProposalStatus = 'proposed' | 'proceed' | 'declined';

export interface UpdateProposalStatusRequest {
  status: 'proceed' | 'declined';
}

export interface GetProposalsParams {
  status?: ProposalStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProposalListResponse {
  items: ProposalItemDTO[];
  total: number;
  page: number;
  limit: number;
}
```

#### 4.2.2 質問関連Type
```typescript
// types/proposal.ts
export interface ProposalQuestionDTO {
  id: string;
  questionText: string;
  responseText?: string;
  isResponded: boolean;
  respondedAt?: string;
  createdAt: string;
  salesUser?: UserSummaryDTO;
}

export interface CreateQuestionRequest {
  questionText: string;
}

export interface UserSummaryDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
```

### 4.3 コンポーネント設計

#### 4.3.1 提案一覧ページ
```typescript
// app/(authenticated)/(engineer)/proposals/page.tsx
'use client';

import React, { useState } from 'react';
import { Box, Typography, Card, Chip, Button, Pagination, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useProposalsQuery } from '@/hooks/proposal/useProposalQueries';
import { ProposalStatus, GetProposalsParams } from '@/types/proposal';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCurrency } from '@/utils/format';
import { useRouter } from 'next/navigation';

export default function ProposalsPage() {
  const router = useRouter();
  const [params, setParams] = useState<GetProposalsParams>({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = useProposalsQuery(params);

  const handleStatusFilter = (status?: ProposalStatus) => {
    setParams(prev => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setParams(prev => ({ ...prev, page: value }));
  };

  const getStatusChip = (status: ProposalStatus) => {
    const statusConfig = {
      proposed: { label: '提案中', color: 'warning' as const },
      proceed: { label: '選考へ進む', color: 'success' as const },
      declined: { label: '見送り', color: 'error' as const },
    };
    
    const config = statusConfig[status];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatPriceRange = (minPrice?: number, maxPrice?: number) => {
    if (!minPrice && !maxPrice) return '応相談';
    if (minPrice && maxPrice && minPrice === maxPrice) {
      return formatCurrency(minPrice);
    }
    return `${minPrice ? formatCurrency(minPrice) : ''}〜${maxPrice ? formatCurrency(maxPrice) : ''}`;
  };

  if (isLoading) return <LoadingOverlay />;
  if (error) return <div>エラーが発生しました</div>;

  return (
    <PageContainer>
      <PageHeader
        title="提案情報"
        subtitle="あなたに提案された案件一覧です"
      />

      {/* フィルタセクション */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={params.status || ''}
            onChange={(e) => handleStatusFilter(e.target.value as ProposalStatus || undefined)}
          >
            <MenuItem value="">全て</MenuItem>
            <MenuItem value="proposed">提案中</MenuItem>
            <MenuItem value="proceed">選考へ進む</MenuItem>
            <MenuItem value="declined">見送り</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 提案一覧 */}
      {data?.items.length === 0 ? (
        <EmptyState
          title="提案情報がありません"
          description="現在提案されている案件はありません"
        />
      ) : (
        <Box sx={{ mb: 3 }}>
          {data?.items.map((proposal) => (
            <Card
              key={proposal.id}
              sx={{
                p: 3,
                mb: 2,
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'grey.50' },
              }}
              onClick={() => router.push(`/proposals/${proposal.id}`)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" component="h3">
                  {proposal.projectName}
                </Typography>
                {getStatusChip(proposal.status)}
              </Box>

              <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    単価
                  </Typography>
                  <Typography variant="body1">
                    {formatPriceRange(proposal.minPrice, proposal.maxPrice)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    場所
                  </Typography>
                  <Typography variant="body1">
                    {proposal.workLocation}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  必要スキル
                </Typography>
                <Typography variant="body1">
                  {proposal.requiredSkills}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary">
                提案日: {new Date(proposal.createdAt).toLocaleDateString('ja-JP')}
                {proposal.respondedAt && (
                  <> / 回答日: {new Date(proposal.respondedAt).toLocaleDateString('ja-JP')}</>
                )}
              </Typography>
            </Card>
          ))}
        </Box>
      )}

      {/* ページネーション */}
      {data && data.total > data.limit && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(data.total / data.limit)}
            page={params.page || 1}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </PageContainer>
  );
}
```

#### 4.3.2 提案詳細ページ
```typescript
// app/(authenticated)/(engineer)/proposals/[id]/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Card, CardContent, Chip, Button, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, RadioGroup, Radio, FormControl, FormLabel
} from '@mui/material';
import { useProposalDetailQuery, useUpdateProposalStatus, useCreateQuestion } from '@/hooks/proposal/useProposalQueries';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { formatCurrency } from '@/utils/format';
import { ProposalQuestionList } from '@/components/proposal/ProposalQuestionList';

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const [responseDialog, setResponseDialog] = useState(false);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'proceed' | 'declined'>('proceed');
  const [questionText, setQuestionText] = useState('');

  const { data: proposal, isLoading } = useProposalDetailQuery(proposalId);
  const updateStatusMutation = useUpdateProposalStatus();
  const createQuestionMutation = useCreateQuestion();

  const handleStatusUpdate = async () => {
    if (!proposal) return;
    
    await updateStatusMutation.mutateAsync({
      id: proposalId,
      data: { status: selectedStatus },
    });
    setResponseDialog(false);
    router.push('/proposals');
  };

  const handleQuestionSubmit = async () => {
    if (!questionText.trim()) return;
    
    await createQuestionMutation.mutateAsync({
      proposalId,
      data: { questionText },
    });
    setQuestionText('');
    setQuestionDialog(false);
  };

  if (isLoading) return <LoadingOverlay />;
  if (!proposal) return <div>提案が見つかりません</div>;

  const { project } = proposal;

  return (
    <PageContainer>
      <PageHeader
        title={project.projectName}
        subtitle="案件詳細情報"
        onBack={() => router.push('/proposals')}
      />

      {/* ステータス表示 */}
      <Box sx={{ mb: 3 }}>
        {proposal.status === 'proposed' ? (
          <Chip label="回答待ち" color="warning" />
        ) : proposal.status === 'proceed' ? (
          <Chip label="選考へ進む" color="success" />
        ) : (
          <Chip label="見送り" color="error" />
        )}
      </Box>

      {/* 案件詳細情報 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                案件詳細
              </Typography>
              
              {project.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    案件概要
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {project.description}
                  </Typography>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    単価
                  </Typography>
                  <Typography variant="body1">
                    {project.minPrice && project.maxPrice && project.minPrice === project.maxPrice
                      ? formatCurrency(project.minPrice)
                      : `${project.minPrice ? formatCurrency(project.minPrice) : ''}〜${
                          project.maxPrice ? formatCurrency(project.maxPrice) : ''
                        }`}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    勤務地
                  </Typography>
                  <Typography variant="body1">
                    {project.workLocation}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    リモートワーク
                  </Typography>
                  <Typography variant="body1">
                    {project.remoteWorkType}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    勤務時間
                  </Typography>
                  <Typography variant="body1">
                    {project.workingTime}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    契約期間
                  </Typography>
                  <Typography variant="body1">
                    {project.contractPeriod}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    開始予定日
                  </Typography>
                  <Typography variant="body1">
                    {project.startDate 
                      ? new Date(project.startDate).toLocaleDateString('ja-JP')
                      : project.startDateText}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* 必要スキル */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                必要スキル
              </Typography>
              {project.requiredSkills.map((skill, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
                    {skill.skillName}
                  </Typography>
                  {(skill.experienceYearsMin || skill.experienceYearsMax) && (
                    <Typography variant="body2" component="span" color="text.secondary">
                      {' '}(
                      {skill.experienceYearsMin && skill.experienceYearsMax
                        ? `${skill.experienceYearsMin}〜${skill.experienceYearsMax}年`
                        : skill.experienceYearsMin
                        ? `${skill.experienceYearsMin}年以上`
                        : `${skill.experienceYearsMax}年以下`}
                      )
                    </Typography>
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* 歓迎スキル */}
          {project.preferredSkills.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  歓迎スキル
                </Typography>
                {project.preferredSkills.map((skill, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                    {skill.skillName}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* アクションボタン */}
      {proposal.status === 'proposed' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setResponseDialog(true)}
          >
            この案件に回答する
          </Button>
          <Button
            variant="outlined"
            onClick={() => setQuestionDialog(true)}
          >
            質問する
          </Button>
        </Box>
      )}

      {/* 質問セクション */}
      <ProposalQuestionList proposalId={proposalId} questions={proposal.questions} />

      {/* 回答ダイアログ */}
      <Dialog open={responseDialog} onClose={() => setResponseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>案件への回答</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend">回答を選択してください</FormLabel>
            <RadioGroup
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'proceed' | 'declined')}
            >
              <FormControlLabel
                value="proceed"
                control={<Radio />}
                label="選考へ進む"
              />
              <FormControlLabel
                value="declined"
                control={<Radio />}
                label="見送り"
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={updateStatusMutation.isPending}
          >
            送信
          </Button>
        </DialogActions>
      </Dialog>

      {/* 質問ダイアログ */}
      <Dialog open={questionDialog} onClose={() => setQuestionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>案件への質問</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="質問内容"
            fullWidth
            multiline
            rows={4}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="案件について質問したいことを入力してください"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleQuestionSubmit}
            variant="contained"
            disabled={!questionText.trim() || createQuestionMutation.isPending}
          >
            送信
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
```

#### 4.3.3 質問一覧コンポーネント
```typescript
// components/proposal/ProposalQuestionList.tsx
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, Chip,
  Accordion, AccordionSummary, AccordionDetails, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { ProposalQuestionDTO } from '@/types/proposal';
import { useCreateQuestion } from '@/hooks/proposal/useProposalQueries';

interface ProposalQuestionListProps {
  proposalId: string;
  questions: ProposalQuestionDTO[];
}

export const ProposalQuestionList: React.FC<ProposalQuestionListProps> = ({
  proposalId,
  questions,
}) => {
  const [questionDialog, setQuestionDialog] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const createQuestionMutation = useCreateQuestion();

  const handleQuestionSubmit = async () => {
    if (!questionText.trim()) return;
    
    await createQuestionMutation.mutateAsync({
      proposalId,
      data: { questionText },
    });
    setQuestionText('');
    setQuestionDialog(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          質問・回答 ({questions.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<QuestionAnswerIcon />}
          onClick={() => setQuestionDialog(true)}
        >
          質問する
        </Button>
      </Box>

      {questions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              まだ質問はありません
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {questions.map((question) => (
            <Accordion key={question.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="body1" sx={{ flexGrow: 1 }}>
                    {question.questionText.length > 100
                      ? `${question.questionText.substring(0, 100)}...`
                      : question.questionText}
                  </Typography>
                  {question.isResponded ? (
                    <Chip label="回答済み" color="success" size="small" />
                  ) : (
                    <Chip label="回答待ち" color="warning" size="small" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {/* 質問内容 */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                        Q
                      </Avatar>
                      <Typography variant="subtitle2">
                        質問
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(question.createdAt).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', ml: 4 }}>
                      {question.questionText}
                    </Typography>
                  </Box>

                  {/* 回答内容 */}
                  {question.isResponded && question.responseText && (
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.main' }}>
                          A
                        </Avatar>
                        <Typography variant="subtitle2">
                          回答
                        </Typography>
                        {question.salesUser && (
                          <Typography variant="body2" color="text.secondary">
                            {question.salesUser.lastName} {question.salesUser.firstName}
                          </Typography>
                        )}
                        {question.respondedAt && (
                          <Typography variant="body2" color="text.secondary">
                            {new Date(question.respondedAt).toLocaleDateString('ja-JP')}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', ml: 4 }}>
                        {question.responseText}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* 質問投稿ダイアログ */}
      <Dialog open={questionDialog} onClose={() => setQuestionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>案件への質問</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="質問内容"
            fullWidth
            multiline
            rows={4}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="案件について質問したいことを入力してください"
            inputProps={{ maxLength: 2000 }}
            helperText={`${questionText.length}/2000文字`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleQuestionSubmit}
            variant="contained"
            disabled={!questionText.trim() || createQuestionMutation.isPending}
          >
            送信
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

### 4.4 ルーティング設計

#### 4.4.1 ルート定義
```typescript
// app/(authenticated)/(engineer)/proposals/layout.tsx
export default function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}

// ルート構造
// /proposals - 提案一覧ページ
// /proposals/[id] - 提案詳細ページ
```

#### 4.4.2 ナビゲーション統合
```typescript
// サイドバーメニューに追加
const engineerMenuItems = [
  // 既存のメニュー
  { 
    label: '提案情報', 
    icon: WorkIcon, 
    href: '/proposals',
    badge: unreadProposalsCount, // 未回答の提案数
  },
  // 他のメニュー
];
```

## 5. テスト設計

### 5.1 バックエンドテスト

#### 5.1.1 Repository層テスト
```go
// internal/repository/proposal_repository_test.go
func TestProposalRepository(t *testing.T) {
    gin.SetMode(gin.TestMode)
    
    t.Run("FindByUserID", func(t *testing.T) {
        // テストデータ準備
        db := testutils.SetupTestDB(t)
        logger := zap.NewNop()
        repo := NewProposalRepository(db, db, logger) // pocDBも同じDBを使用
        
        userID := uuid.New()
        proposal := &model.Proposal{
            ProjectID: uuid.New(),
            UserID:    userID,
            Status:    model.ProposalStatusProposed,
        }
        
        err := repo.Create(context.Background(), proposal)
        assert.NoError(t, err)
        
        // 検索実行
        params := GetProposalsParams{
            Page:  1,
            Limit: 10,
        }
        proposals, total, err := repo.FindByUserID(context.Background(), userID, params)
        
        // 検証
        assert.NoError(t, err)
        assert.Equal(t, int64(1), total)
        assert.Len(t, proposals, 1)
        assert.Equal(t, proposal.ID, proposals[0].ID)
    })
}
```

#### 5.1.2 Service層テスト
```go
// internal/service/proposal_service_test.go
func TestProposalService(t *testing.T) {
    t.Run("UpdateProposalStatus", func(t *testing.T) {
        t.Run("正常にステータスを更新", func(t *testing.T) {
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()
            
            mockProposalRepo := mocks.NewMockProposalRepository(ctrl)
            mockNotificationService := mocks.NewMockNotificationService(ctrl)
            mockUserRepo := mocks.NewMockUserRepository(ctrl)
            
            service := &proposalService{
                proposalRepo:        mockProposalRepo,
                notificationService: mockNotificationService,
                userRepo:           mockUserRepo,
                logger:             zap.NewNop(),
            }
            
            proposalID := uuid.New()
            userID := uuid.New()
            proposal := &model.Proposal{
                ID:        proposalID,
                ProjectID: uuid.New(),
                UserID:    userID,
                Status:    model.ProposalStatusProposed,
            }
            
            // モック設定
            mockProposalRepo.EXPECT().
                FindByID(gomock.Any(), proposalID).
                Return(proposal, nil)
            
            mockProposalRepo.EXPECT().
                Update(gomock.Any(), gomock.Any()).
                Return(nil)
                
            mockUserRepo.EXPECT().
                FindByRoles(gomock.Any(), gomock.Any()).
                Return([]*model.User{{ID: uuid.New(), Active: true}}, nil)
                
            mockNotificationService.EXPECT().
                CreateUserNotification(gomock.Any(), gomock.Any(), gomock.Any()).
                Return(nil)
            
            // テスト実行
            req := &dto.UpdateProposalStatusRequest{Status: "proceed"}
            err := service.UpdateProposalStatus(context.Background(), proposalID, userID, req)
            
            // 検証
            assert.NoError(t, err)
        })
    })
}
```

#### 5.1.3 Handler層テスト
```go
// internal/handler/proposal_handler_test.go
func TestProposalHandler(t *testing.T) {
    gin.SetMode(gin.TestMode)
    
    t.Run("GetProposals", func(t *testing.T) {
        t.Run("正常に一覧を取得", func(t *testing.T) {
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()
            
            mockService := mocks.NewMockProposalService(ctrl)
            handler := &proposalHandler{
                service: mockService,
                logger:  zap.NewNop(),
            }
            
            // モック設定
            expectedResponse := &dto.ProposalListResponse{
                Items: []dto.ProposalItemDTO{
                    {
                        ID:          uuid.New().String(),
                        ProjectName: "テスト案件",
                        Status:      "proposed",
                    },
                },
                Total: 1,
                Page:  1,
                Limit: 20,
            }
            
            mockService.EXPECT().
                GetProposals(gomock.Any(), gomock.Any(), gomock.Any()).
                Return(expectedResponse, nil)
            
            // HTTPリクエスト作成
            router := gin.New()
            router.GET("/proposals", func(c *gin.Context) {
                c.Set("user_id", uuid.New().String())
                handler.GetProposals(c)
            })
            
            req := httptest.NewRequest("GET", "/proposals", nil)
            w := httptest.NewRecorder()
            router.ServeHTTP(w, req)
            
            // 検証
            assert.Equal(t, http.StatusOK, w.Code)
            
            var response dto.ProposalListResponse
            err := json.Unmarshal(w.Body.Bytes(), &response)
            assert.NoError(t, err)
            assert.Equal(t, expectedResponse.Total, response.Total)
        })
    })
}
```

### 5.2 フロントエンドテスト

#### 5.2.1 Hook テスト
```typescript
// hooks/proposal/__tests__/useProposalQueries.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProposalsQuery } from '../useProposalQueries';
import { proposalApi } from '@/api/proposal';

// API モック
jest.mock('@/api/proposal');
const mockProposalApi = proposalApi as jest.Mocked<typeof proposalApi>;

describe('useProposalQueries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useProposalsQuery', () => {
    it('提案一覧を正常に取得する', async () => {
      const mockData = {
        items: [
          {
            id: '1',
            projectId: 'project-1',
            projectName: 'テスト案件',
            status: 'proposed' as const,
            createdAt: '2025-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockProposalApi.getProposals.mockResolvedValue(mockData);

      const { result } = renderHook(() => useProposalsQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });
});
```

#### 5.2.2 コンポーネントテスト
```typescript
// app/(authenticated)/(engineer)/proposals/__tests__/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProposalsPage from '../page';
import { proposalApi } from '@/api/proposal';

// モック設定
jest.mock('@/api/proposal');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockProposalApi = proposalApi as jest.Mocked<typeof proposalApi>;

describe('ProposalsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProposalsPage />
      </QueryClientProvider>
    );
  };

  it('提案一覧を表示する', async () => {
    const mockData = {
      items: [
        {
          id: '1',
          projectId: 'project-1',
          projectName: 'テスト案件',
          minPrice: 700000,
          maxPrice: 800000,
          workLocation: '六本木',
          requiredSkills: 'Java, Spring Boot',
          status: 'proposed' as const,
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };

    mockProposalApi.getProposals.mockResolvedValue(mockData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('テスト案件')).toBeInTheDocument();
    });

    expect(screen.getByText('¥700,000〜¥800,000')).toBeInTheDocument();
    expect(screen.getByText('六本木')).toBeInTheDocument();
    expect(screen.getByText('Java, Spring Boot')).toBeInTheDocument();
  });

  it('ステータスフィルタが動作する', async () => {
    const user = userEvent.setup();
    mockProposalApi.getProposals.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderComponent();

    // ステータスフィルタを選択
    const statusSelect = screen.getByLabelText('ステータス');
    await user.click(statusSelect);
    await user.click(screen.getByText('提案中'));

    await waitFor(() => {
      expect(mockProposalApi.getProposals).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'proposed' })
      );
    });
  });
});
```

## 6. デプロイメント・運用

### 6.1 マイグレーション実行順序
1. `000050_create_proposals_table.up.sql`
2. `000051_create_proposal_questions_table.up.sql`
3. 通知タイプ拡張（既存システムに`project`タイプを追加済み）

### 6.2 環境変数追加
```bash
# monstera-pocデータベース接続設定
MONSTERA_POC_DB_NAME=monstera_poc
MONSTERA_POC_DB_HOST=${DB_HOST}
MONSTERA_POC_DB_PORT=${DB_PORT}
MONSTERA_POC_DB_USER=${DB_USER}
MONSTERA_POC_DB_PASSWORD=${DB_PASSWORD}
```

### 6.3 モニタリング項目
- 提案情報同期エラー率
- 通知送信成功率
- レスポンス時間
- 質問・回答の利用状況

この詳細設計書に基づいて実装を進めることで、既存システムとの整合性を保ちながら、スケーラブルで保守性の高い提案情報確認機能を構築できます。