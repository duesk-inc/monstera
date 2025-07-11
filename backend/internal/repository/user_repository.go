package repository

import (
	"context"

	"github.com/duesk/monstera/internal/model"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// UserRepository ユーザーに関するデータアクセスのインターフェース
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	FindByID(id uuid.UUID) (*model.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByCognitoSub(ctx context.Context, cognitoSub string) (*model.User, error)
	FindByEmail(email string) (*model.User, error)
	Update(ctx context.Context, user *model.User) error
	Delete(id uuid.UUID) error
	List(offset, limit int) ([]model.User, int64, error)
	FindByRole(role model.Role) ([]model.User, error)
	// ロール管理メソッド
	AddRole(userID uuid.UUID, role model.Role) error
	RemoveRole(userID uuid.UUID, role model.Role) error
	SetRoles(userID uuid.UUID, roles []model.Role) error
	GetRoles(userID uuid.UUID) ([]model.Role, error)
	UpdateDefaultRole(userID uuid.UUID, defaultRole *model.Role) error
	SetLogger(logger *zap.Logger)
	// 統計メソッド
	CountByDepartment(ctx context.Context, departmentID uuid.UUID) (int64, error)
	CountActiveUsers(ctx context.Context, days int) (int64, error)
}

// UserRepositoryImpl ユーザーに関するデータアクセスの実装
type UserRepositoryImpl struct {
	DB     *gorm.DB
	Logger *zap.Logger
}

// NewUserRepository UserRepositoryのインスタンスを生成する
func NewUserRepository(db *gorm.DB) UserRepository {
	return &UserRepositoryImpl{DB: db}
}

// SetLogger ロガーを設定
func (r *UserRepositoryImpl) SetLogger(logger *zap.Logger) {
	r.Logger = logger
}

// Create 新しいユーザーを作成（Context付き）
func (r *UserRepositoryImpl) Create(ctx context.Context, user *model.User) error {
	if r.Logger != nil {
		r.Logger.Info("Creating user", zap.String("email", user.Email))
	}
	err := r.DB.WithContext(ctx).Create(user).Error
	if err != nil && r.Logger != nil {
		r.Logger.Error("Failed to create user", zap.String("email", user.Email), zap.Error(err))
	}
	return err
}

// FindByID IDでユーザーを検索
func (r *UserRepositoryImpl) FindByID(id uuid.UUID) (*model.User, error) {
	var user model.User
	err := r.DB.Preload("UserRoles").First(&user, "id = ?", id).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to find user by ID", zap.String("id", id.String()), zap.Error(err))
		}
		return nil, err
	}
	// UserRolesからRoles配列を構築
	user.LoadRolesFromUserRoles()
	return &user, nil
}

// GetByID ユーザーIDでユーザーを取得（Context付き）
func (r *UserRepositoryImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	if r.Logger != nil {
		r.Logger.Info("Getting user by ID", zap.String("id", id.String()))
	}
	err := r.DB.WithContext(ctx).Preload("UserRoles").First(&user, "id = ?", id).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to get user by ID", zap.String("id", id.String()), zap.Error(err))
		}
		return nil, err
	}
	user.LoadRolesFromUserRoles()
	return &user, nil
}

// GetByEmail メールアドレスでユーザーを取得（Context付き）
func (r *UserRepositoryImpl) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	if r.Logger != nil {
		r.Logger.Info("Getting user by email", zap.String("email", email))
	}
	err := r.DB.WithContext(ctx).Preload("UserRoles").First(&user, "email = ?", email).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to get user by email", zap.String("email", email), zap.Error(err))
		}
		return nil, err
	}
	user.LoadRolesFromUserRoles()
	return &user, nil
}

// GetByCognitoSub CognitoサブIDでユーザーを取得
func (r *UserRepositoryImpl) GetByCognitoSub(ctx context.Context, cognitoSub string) (*model.User, error) {
	var user model.User
	if r.Logger != nil {
		r.Logger.Info("Getting user by Cognito sub", zap.String("cognito_sub", cognitoSub))
	}
	err := r.DB.WithContext(ctx).Preload("UserRoles").First(&user, "cognito_sub = ?", cognitoSub).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to get user by Cognito sub", zap.String("cognito_sub", cognitoSub), zap.Error(err))
		}
		return nil, err
	}
	user.LoadRolesFromUserRoles()
	return &user, nil
}

// Update ユーザー情報を更新（Context付き）
func (r *UserRepositoryImpl) Update(ctx context.Context, user *model.User) error {
	if r.Logger != nil {
		r.Logger.Info("Updating user", zap.String("id", user.ID.String()))
	}
	err := r.DB.WithContext(ctx).Save(user).Error
	if err != nil && r.Logger != nil {
		r.Logger.Error("Failed to update user", zap.String("id", user.ID.String()), zap.Error(err))
	}
	return err
}

// FindByEmail メールアドレスでユーザーを検索
func (r *UserRepositoryImpl) FindByEmail(email string) (*model.User, error) {
	var user model.User
	if r.Logger != nil {
		r.Logger.Info("Finding user by email", zap.String("email", email))
	}
	err := r.DB.Preload("UserRoles").First(&user, "email = ?", email).Error
	if err != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to find user by email", zap.String("email", email), zap.Error(err))
		}
		return nil, err
	}
	// UserRolesからRoles配列を構築
	user.LoadRolesFromUserRoles()
	if r.Logger != nil {
		r.Logger.Info("User found", zap.String("email", email), zap.String("id", user.ID.String()))
	}
	return &user, nil
}

// Delete ユーザーを削除（ソフトデリート）
func (r *UserRepositoryImpl) Delete(id uuid.UUID) error {
	return r.DB.Delete(&model.User{}, "id = ?", id).Error
}

// List ユーザー一覧を取得
func (r *UserRepositoryImpl) List(offset, limit int) ([]model.User, int64, error) {
	var users []model.User
	var count int64

	// 総数を取得
	if err := r.DB.Model(&model.User{}).Count(&count).Error; err != nil {
		return nil, 0, err
	}

	// ユーザー一覧を取得
	err := r.DB.Preload("UserRoles").Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	// 各ユーザーのRoles配列を構築
	for i := range users {
		users[i].LoadRolesFromUserRoles()
	}

	return users, count, nil
}

// FindByRole ロールでユーザーを検索
func (r *UserRepositoryImpl) FindByRole(role model.Role) ([]model.User, error) {
	var users []model.User
	// user_rolesテーブルから指定されたロールを持つユーザーを検索
	err := r.DB.
		Preload("UserRoles").
		Joins("JOIN user_roles ON users.id = user_roles.user_id").
		Where("user_roles.role = ?", role).
		Group("users.id").
		Find(&users).Error
	if err != nil {
		return nil, err
	}

	// 各ユーザーのRoles配列を構築
	for i := range users {
		users[i].LoadRolesFromUserRoles()
	}

	return users, nil
}

// AddRole ユーザーにロールを追加
func (r *UserRepositoryImpl) AddRole(userID uuid.UUID, role model.Role) error {
	userRole := model.UserRole{
		UserID: userID,
		Role:   role,
	}
	// ON DUPLICATE KEY UPDATEの代わりにGORMのFirstOrCreateを使用
	result := r.DB.Where("user_id = ? AND role = ?", userID, role).FirstOrCreate(&userRole)
	return result.Error
}

// RemoveRole ユーザーからロールを削除
func (r *UserRepositoryImpl) RemoveRole(userID uuid.UUID, role model.Role) error {
	return r.DB.Where("user_id = ? AND role = ?", userID, role).Delete(&model.UserRole{}).Error
}

// SetRoles ユーザーのロールを一括設定（既存のロールを全て削除して新しいロールを設定）
func (r *UserRepositoryImpl) SetRoles(userID uuid.UUID, roles []model.Role) error {
	// トランザクション内で処理
	return r.DB.Transaction(func(tx *gorm.DB) error {
		// 既存のロールを全て削除
		if err := tx.Where("user_id = ?", userID).Delete(&model.UserRole{}).Error; err != nil {
			return err
		}

		// 新しいロールを追加
		for _, role := range roles {
			userRole := model.UserRole{
				UserID: userID,
				Role:   role,
			}
			if err := tx.Create(&userRole).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetRoles ユーザーのロール一覧を取得
func (r *UserRepositoryImpl) GetRoles(userID uuid.UUID) ([]model.Role, error) {
	var userRoles []model.UserRole
	err := r.DB.Where("user_id = ?", userID).Find(&userRoles).Error
	if err != nil {
		return nil, err
	}

	roles := make([]model.Role, len(userRoles))
	for i, ur := range userRoles {
		roles[i] = ur.Role
	}

	return roles, nil
}

// UpdateDefaultRole ユーザーのデフォルトロールを更新
func (r *UserRepositoryImpl) UpdateDefaultRole(userID uuid.UUID, defaultRole *model.Role) error {
	updates := make(map[string]interface{})
	if defaultRole == nil {
		updates["default_role"] = nil
	} else {
		updates["default_role"] = *defaultRole
	}

	result := r.DB.Model(&model.User{}).Where("id = ?", userID).Updates(updates)
	if result.Error != nil {
		if r.Logger != nil {
			r.Logger.Error("Failed to update default role",
				zap.String("user_id", userID.String()),
				zap.Error(result.Error))
		}
		return result.Error
	}

	if result.RowsAffected == 0 {
		if r.Logger != nil {
			r.Logger.Warn("No user found to update default role",
				zap.String("user_id", userID.String()))
		}
	}

	return nil
}

// CountByDepartment 部署別のユーザー数を取得
func (r *UserRepositoryImpl) CountByDepartment(ctx context.Context, departmentID uuid.UUID) (int64, error) {
	var count int64
	err := r.DB.WithContext(ctx).Model(&model.User{}).
		Where("department_id = ? AND active = ? AND deleted_at IS NULL", departmentID, true).
		Count(&count).Error
	return count, err
}

// CountActiveUsers アクティブユーザー数を取得
func (r *UserRepositoryImpl) CountActiveUsers(ctx context.Context, days int) (int64, error) {
	var count int64
	err := r.DB.WithContext(ctx).Model(&model.User{}).
		Where("active = ? AND deleted_at IS NULL", true).
		Count(&count).Error
	return count, err
}
