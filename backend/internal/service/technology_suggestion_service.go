package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/duesk/monstera/internal/dto"
	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/internal/repository"
	"github.com/duesk/monstera/pkg/normalizer"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// TechnologySuggestionService 技術候補サービスのインターフェース
type TechnologySuggestionService interface {
	// 技術候補検索
	SearchSuggestions(ctx context.Context, req dto.TechnologySuggestionRequest) ([]dto.TechnologySuggestionResponse, error)

	// カテゴリ別人気技術取得
	GetPopularByCategory(ctx context.Context, category string, limit int) ([]dto.TechnologySuggestionResponse, error)

	// ユーザー使用技術の候補取得
	GetUserRecentTechnologies(ctx context.Context, userID string, limit int) ([]dto.TechnologySuggestionResponse, error)

	// 技術の正規化と候補提示
	NormalizeAndSuggest(ctx context.Context, input string) (*dto.TechnologySuggestionResponse, []dto.TechnologySuggestionResponse, error)

	// 一括候補検索
	BulkSearchSuggestions(ctx context.Context, queries []string, categoryFilter *string) (map[string][]dto.TechnologySuggestionResponse, error)

	// 技術マスタへの新規登録
	RegisterNewTechnology(ctx context.Context, category model.TechCategory, name string, displayName *string) (*model.TechnologyMaster, error)

	// カテゴリ一覧取得
	GetCategories(ctx context.Context) ([]model.TechnologyCategoryInfo, error)
}

// technologySuggestionService 技術候補サービスの実装
type technologySuggestionService struct {
	db              *gorm.DB
	technologyRepo  repository.TechnologyMasterEnhancedRepository
	workHistoryRepo repository.WorkHistoryRepository
	normalizer      *normalizer.TechnologyNormalizer
	logger          *zap.Logger
}

// NewTechnologySuggestionService 技術候補サービスのコンストラクタ
func NewTechnologySuggestionService(
	db *gorm.DB,
	technologyRepo repository.TechnologyMasterEnhancedRepository,
	workHistoryRepo repository.WorkHistoryRepository,
	logger *zap.Logger,
) TechnologySuggestionService {
	return &technologySuggestionService{
		db:              db,
		technologyRepo:  technologyRepo,
		workHistoryRepo: workHistoryRepo,
		normalizer:      normalizer.NewTechnologyNormalizer(),
		logger:          logger,
	}
}

// SearchSuggestions 技術候補を検索
func (s *technologySuggestionService) SearchSuggestions(ctx context.Context, req dto.TechnologySuggestionRequest) ([]dto.TechnologySuggestionResponse, error) {
	// デフォルト値設定
	if req.Limit == 0 {
		req.Limit = 10
	}
	if req.Limit > 50 {
		req.Limit = 50
	}

	// クエリの正規化
	normalizedQuery := s.normalizer.Normalize(req.Query)

	// カテゴリフィルタの変換
	var categoryFilter *model.TechCategory
	if req.CategoryName != nil && *req.CategoryName != "" {
		category := s.categoryNameToEnum(*req.CategoryName)
		categoryFilter = &category
	}

	// 候補検索実行
	suggestions, err := s.technologyRepo.SearchByKeyword(ctx, normalizedQuery, categoryFilter, int(req.Limit))
	if err != nil {
		s.logger.Error("Failed to search technology suggestions",
			zap.String("query", req.Query),
			zap.Error(err))
		return nil, fmt.Errorf("技術候補の検索に失敗しました: %w", err)
	}

	// レスポンス形式に変換
	responses := make([]dto.TechnologySuggestionResponse, 0, len(suggestions))
	for _, tech := range suggestions {
		response := s.convertToSuggestionResponse(tech)

		// マッチスコアを計算
		response.MatchScore = s.calculateMatchScore(normalizedQuery, tech.Name)

		// 人気技術かどうかを判定
		response.IsPopular = tech.UsageCount > 100

		responses = append(responses, response)
	}

	// 人気技術を優先する場合
	if req.IncludePopular {
		// 人気技術を取得して追加
		popularTechs, err := s.technologyRepo.GetPopularTechnologies(ctx, categoryFilter, 5)
		if err == nil {
			for _, tech := range popularTechs {
				// 既に含まれていない場合のみ追加
				if !s.containsTechnology(responses, tech.ID) {
					response := s.convertToSuggestionResponse(tech)
					response.IsPopular = true
					response.MatchScore = 0.5 // 人気技術の基本スコア
					responses = append(responses, response)
				}
			}
		}
	}

	// マッチスコアでソート
	sort.Slice(responses, func(i, j int) bool {
		// 人気技術を優先
		if responses[i].IsPopular != responses[j].IsPopular {
			return responses[i].IsPopular
		}
		// マッチスコアが高い順
		if responses[i].MatchScore != responses[j].MatchScore {
			return responses[i].MatchScore > responses[j].MatchScore
		}
		// 使用回数が多い順
		return responses[i].UsageCount > responses[j].UsageCount
	})

	// 上限数に絞る
	if len(responses) > int(req.Limit) {
		responses = responses[:req.Limit]
	}

	return responses, nil
}

// GetPopularByCategory カテゴリ別人気技術を取得
func (s *technologySuggestionService) GetPopularByCategory(ctx context.Context, category string, limit int) ([]dto.TechnologySuggestionResponse, error) {
	if limit == 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	// カテゴリ変換
	categoryEnum := s.categoryNameToEnum(category)

	// 人気技術を取得
	technologies, err := s.technologyRepo.GetPopularTechnologies(ctx, &categoryEnum, limit)
	if err != nil {
		s.logger.Error("Failed to get popular technologies",
			zap.String("category", category),
			zap.Error(err))
		return nil, fmt.Errorf("人気技術の取得に失敗しました: %w", err)
	}

	// レスポンス形式に変換
	responses := make([]dto.TechnologySuggestionResponse, len(technologies))
	for i, tech := range technologies {
		responses[i] = s.convertToSuggestionResponse(tech)
		responses[i].IsPopular = true
		responses[i].MatchScore = 1.0 // 人気技術は最高スコア
	}

	return responses, nil
}

// GetUserRecentTechnologies ユーザーの最近使用した技術を取得
func (s *technologySuggestionService) GetUserRecentTechnologies(ctx context.Context, userID string, limit int) ([]dto.TechnologySuggestionResponse, error) {
	if limit == 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	// ユーザーの最近使用した技術を取得
	technologies, err := s.technologyRepo.GetRecentlyUsedTechnologies(ctx, userID, limit)
	if err != nil {
		s.logger.Error("Failed to get user recent technologies",
			zap.String("user_id", userID),
			zap.Error(err))
		return nil, fmt.Errorf("ユーザーの使用技術取得に失敗しました: %w", err)
	}

	// レスポンス形式に変換
	responses := make([]dto.TechnologySuggestionResponse, len(technologies))
	for i, tech := range technologies {
		responses[i] = s.convertToSuggestionResponse(tech)
		responses[i].MatchScore = 0.8 // ユーザー使用技術は高スコア
	}

	return responses, nil
}

// NormalizeAndSuggest 技術名を正規化して候補を提示
func (s *technologySuggestionService) NormalizeAndSuggest(ctx context.Context, input string) (*dto.TechnologySuggestionResponse, []dto.TechnologySuggestionResponse, error) {
	// 入力を正規化
	normalized := s.normalizer.Normalize(input)

	// 正規化された名前で検索
	technology, err := s.technologyRepo.NormalizeAndFindTechnology(ctx, normalized)
	if err != nil && err != gorm.ErrRecordNotFound {
		s.logger.Error("Failed to normalize and find technology",
			zap.String("input", input),
			zap.Error(err))
		return nil, nil, fmt.Errorf("技術の正規化に失敗しました: %w", err)
	}

	var exactMatch *dto.TechnologySuggestionResponse
	if technology != nil {
		response := s.convertToSuggestionResponse(technology)
		response.MatchScore = 1.0
		exactMatch = &response
	}

	// 類似候補を検索
	suggestions, err := s.technologyRepo.SearchByKeyword(ctx, normalized, nil, 5)
	if err != nil {
		s.logger.Error("Failed to search similar technologies",
			zap.String("normalized", normalized),
			zap.Error(err))
		// エラーでも正規化結果は返す
		return exactMatch, nil, nil
	}

	// レスポンス形式に変換（完全一致は除外）
	var alternatives []dto.TechnologySuggestionResponse
	for _, tech := range suggestions {
		if technology != nil && tech.ID == technology.ID {
			continue
		}
		response := s.convertToSuggestionResponse(tech)
		response.MatchScore = s.calculateMatchScore(normalized, tech.Name)
		alternatives = append(alternatives, response)
	}

	return exactMatch, alternatives, nil
}

// BulkSearchSuggestions 一括候補検索
func (s *technologySuggestionService) BulkSearchSuggestions(ctx context.Context, queries []string, categoryFilter *string) (map[string][]dto.TechnologySuggestionResponse, error) {
	results := make(map[string][]dto.TechnologySuggestionResponse)

	// 各クエリで検索
	for _, query := range queries {
		if query == "" {
			continue
		}

		// 個別検索
		req := dto.TechnologySuggestionRequest{
			Query:        query,
			CategoryName: categoryFilter,
			Limit:        5,
		}

		suggestions, err := s.SearchSuggestions(ctx, req)
		if err != nil {
			s.logger.Warn("Failed to search suggestions for query",
				zap.String("query", query),
				zap.Error(err))
			results[query] = []dto.TechnologySuggestionResponse{}
			continue
		}

		results[query] = suggestions
	}

	return results, nil
}

// RegisterNewTechnology 新規技術を登録
func (s *technologySuggestionService) RegisterNewTechnology(ctx context.Context, category model.TechCategory, name string, displayName *string) (*model.TechnologyMaster, error) {
	// 正規化
	normalizedName := s.normalizer.Normalize(name)

	// 既存チェック
	existing, err := s.technologyRepo.GetByName(ctx, category, normalizedName)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("既存技術の確認に失敗しました: %w", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("技術「%s」は既に登録されています", name)
	}

	// 新規作成
	technology := &model.TechnologyMaster{
		ID:          uuid.New(),
		Category:    category,
		Name:        normalizedName,
		DisplayName: "",
		UsageCount:  0,
	}

	// displayNameが指定されている場合は設定
	if displayName != nil {
		technology.DisplayName = *displayName
	} else {
		technology.DisplayName = name // 元の名前を使用
	}

	if err := s.technologyRepo.Create(ctx, technology); err != nil {
		s.logger.Error("Failed to create new technology",
			zap.String("name", name),
			zap.String("category", string(category)),
			zap.Error(err))
		return nil, fmt.Errorf("技術の登録に失敗しました: %w", err)
	}

	return technology, nil
}

// GetCategories カテゴリ一覧を取得
func (s *technologySuggestionService) GetCategories(ctx context.Context) ([]model.TechnologyCategoryInfo, error) {
	// カテゴリ定義
	categories := []model.TechnologyCategoryInfo{
		{
			Name:        string(model.TechCategoryProgrammingLanguages),
			DisplayName: "プログラミング言語",
			Description: "Java, Python, JavaScript など",
			SortOrder:   1,
		},
		{
			Name:        string(model.TechCategoryServersDatabases),
			DisplayName: "サーバー・データベース",
			Description: "MySQL, PostgreSQL, MongoDB, Apache など",
			SortOrder:   2,
		},
		{
			Name:        string(model.TechCategoryTools),
			DisplayName: "ツール・その他",
			Description: "Git, Jenkins, Docker, Kubernetes など",
			SortOrder:   3,
		},
	}

	// 各カテゴリの技術数を取得
	for i := range categories {
		count, err := s.getTechnologyCountByCategory(ctx, model.TechCategory(categories[i].Name))
		if err != nil {
			s.logger.Warn("Failed to get technology count",
				zap.String("category", categories[i].Name),
				zap.Error(err))
			count = 0
		}
		categories[i].Count = count
	}

	return categories, nil
}

// ヘルパー関数

// convertToSuggestionResponse 技術マスタをレスポンス形式に変換
func (s *technologySuggestionService) convertToSuggestionResponse(tech *model.TechnologyMaster) dto.TechnologySuggestionResponse {
	var displayName *string
	if tech.DisplayName != "" {
		displayName = &tech.DisplayName
	}

	return dto.TechnologySuggestionResponse{
		TechnologyName:        tech.Name,
		TechnologyDisplayName: displayName,
		CategoryName:          string(tech.Category),
		CategoryDisplayName:   s.getCategoryDisplayName(tech.Category),
		UsageCount:            int32(tech.UsageCount),
		IsPopular:             tech.UsageCount > 100,
		MatchScore:            0,
	}
}

// calculateMatchScore マッチスコアを計算
func (s *technologySuggestionService) calculateMatchScore(query, target string) float64 {
	query = strings.ToLower(query)
	target = strings.ToLower(target)

	// 完全一致
	if query == target {
		return 1.0
	}

	// 前方一致
	if strings.HasPrefix(target, query) {
		return 0.9
	}

	// 部分一致
	if strings.Contains(target, query) {
		return 0.7
	}

	// レーベンシュタイン距離による類似度
	distance := levenshteinDistance(query, target)
	maxLen := max(len(query), len(target))
	if maxLen == 0 {
		return 0
	}

	similarity := 1.0 - float64(distance)/float64(maxLen)
	if similarity > 0.5 {
		return similarity * 0.6
	}

	return 0
}

// containsTechnology 技術が既に含まれているかチェック
func (s *technologySuggestionService) containsTechnology(responses []dto.TechnologySuggestionResponse, techID uuid.UUID) bool {
	// IDでの比較ができないため、名前で比較
	// TODO: レスポンスにIDを含めることを検討
	return false
}

// categoryNameToEnum カテゴリ名をEnum型に変換
func (s *technologySuggestionService) categoryNameToEnum(name string) model.TechCategory {
	switch name {
	case "プログラミング言語", "programming_languages":
		return model.TechCategoryProgrammingLanguages
	case "サーバー・データベース", "servers_databases":
		return model.TechCategoryServersDatabases
	case "ツール・その他", "tools":
		return model.TechCategoryTools
	default:
		return model.TechCategoryTools // デフォルト
	}
}

// getCategoryDisplayName カテゴリの表示名を取得
func (s *technologySuggestionService) getCategoryDisplayName(category model.TechCategory) string {
	switch category {
	case model.TechCategoryProgrammingLanguages:
		return "プログラミング言語"
	case model.TechCategoryServersDatabases:
		return "サーバー・データベース"
	case model.TechCategoryTools:
		return "ツール・その他"
	default:
		return string(category)
	}
}

// getTechnologyCountByCategory カテゴリ別技術数を取得
func (s *technologySuggestionService) getTechnologyCountByCategory(ctx context.Context, category model.TechCategory) (int32, error) {
	technologies, err := s.technologyRepo.GetByCategory(ctx, category)
	if err != nil {
		return 0, err
	}
	return int32(len(technologies)), nil
}

// levenshteinDistance レーベンシュタイン距離を計算
func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// 2次元配列を作成
	d := make([][]int, len(s1)+1)
	for i := range d {
		d[i] = make([]int, len(s2)+1)
	}

	// 初期化
	for i := 0; i <= len(s1); i++ {
		d[i][0] = i
	}
	for j := 0; j <= len(s2); j++ {
		d[0][j] = j
	}

	// 距離を計算
	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 0
			if s1[i-1] != s2[j-1] {
				cost = 1
			}

			d[i][j] = min(
				d[i-1][j]+1,      // 削除
				d[i][j-1]+1,      // 挿入
				d[i-1][j-1]+cost, // 置換
			)
		}
	}

	return d[len(s1)][len(s2)]
}

// min 最小値を返す
func min(values ...int) int {
	minVal := values[0]
	for _, v := range values[1:] {
		if v < minVal {
			minVal = v
		}
	}
	return minVal
}

// max 最大値を返す
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
