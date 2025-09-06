package sprint3_test

import (
    "context"
    "testing"

    "github.com/duesk/monstera/internal/dto"
    repo "github.com/duesk/monstera/internal/repository"
    "github.com/duesk/monstera/internal/service"
    "github.com/stretchr/testify/assert"
    "go.uber.org/zap"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

func setupPS(t *testing.T) (*gorm.DB, service.ProjectService) {
    t.Helper()
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil { t.Fatalf("sqlite open: %v", err) }
    // Create minimal clients table compatible with SQLite
    if err := db.Exec(`CREATE TABLE clients (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        company_name_kana TEXT,
        deleted_at DATETIME
    );`).Error; err != nil { t.Fatalf("create clients: %v", err) }
    if err := db.Exec(`CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        project_code TEXT,
        status TEXT DEFAULT 'proposal',
        start_date DATETIME NULL,
        end_date DATETIME NULL,
        monthly_rate REAL,
        working_hours_min INTEGER DEFAULT 140,
        working_hours_max INTEGER DEFAULT 180,
        contract_type TEXT,
        work_location TEXT,
        description TEXT,
        requirements TEXT,
        created_at DATETIME,
        updated_at DATETIME,
        deleted_at DATETIME
    );`).Error; err != nil { t.Fatalf("create projects: %v", err) }
    base := repo.NewBaseRepository(db, zap.NewNop())
    ps := service.NewProjectService(db, repo.NewProjectRepository(base), repo.NewClientRepository(base), zap.NewNop())
    return db, ps
}

func TestProjectService_Get_WithClientName(t *testing.T) {
    db, svc := setupPS(t)
    _ = db.Exec("INSERT INTO clients (id, company_name, company_name_kana) VALUES (?,?,?)", "c1", "Acme", "アクメ").Error
    _ = db.Exec("INSERT INTO projects (id, client_id, project_name, status) VALUES (?,?,?,?)", "p1", "c1", "Alpha", "proposal").Error
    got, err := svc.Get(context.Background(), "p1")
    assert.NoError(t, err)
    if assert.NotNil(t, got) {
        assert.Equal(t, "Acme", got.ClientName)
        assert.Equal(t, "draft", got.Status)
    }
}

func TestProjectService_List_SearchAndStatus(t *testing.T) {
    db, svc := setupPS(t)
    _ = db.Exec("INSERT INTO clients (id, company_name, company_name_kana) VALUES (?,?,?)", "c1", "Acme", "アクメ").Error
    _ = db.Exec("INSERT INTO projects (id, client_id, project_name, description, status) VALUES (?,?,?,?,?)", "p1", "c1", "Alpha", "xx", "proposal").Error
    _ = db.Exec("INSERT INTO projects (id, client_id, project_name, description, status) VALUES (?,?,?,?,?)", "p2", "c1", "Beta", "alpha matches", "active").Error
    _ = db.Exec("INSERT INTO projects (id, client_id, project_name, description, status) VALUES (?,?,?,?,?)", "p3", "c1", "Gamma", "yy", "closed").Error

    resp, err := svc.List(context.Background(), dto.ProjectListQuery{Q: "alpha", Page: 1, Limit: 50})
    assert.NoError(t, err)
    assert.Equal(t, int64(2), resp.Total)

    resp2, err := svc.List(context.Background(), dto.ProjectListQuery{Status: "active", Page: 1, Limit: 20})
    assert.NoError(t, err)
    if assert.Len(t, resp2.Items, 1) {
        assert.Equal(t, "p2", resp2.Items[0].ID)
        assert.Equal(t, "active", resp2.Items[0].Status)
    }
}

func TestProjectService_Create_ValidationAndDefaultStatus(t *testing.T) {
    _, svc := setupPS(t)
    start := "2025-01-10"
    end := "2025-01-05"
    _, err := svc.Create(context.Background(), &dto.ProjectCreate{ProjectName: "X", ClientID: "c1", StartDate: &start, EndDate: &end})
    assert.Error(t, err)

    // status omitted => draft
    got, err := svc.Create(context.Background(), &dto.ProjectCreate{ProjectName: "Y", ClientID: "c1"})
    assert.NoError(t, err)
    assert.Equal(t, "draft", got.Status)
}

func TestProjectService_Update_StatusAndNullDates(t *testing.T) {
    db, svc := setupPS(t)
    _ = db.Exec("INSERT INTO clients (id, company_name, company_name_kana) VALUES (?,?,?)", "c1", "Acme", "アクメ").Error
    _ = db.Exec("INSERT INTO projects (id, client_id, project_name, status) VALUES (?,?,?,?)", "p1", "c1", "Alpha", "proposal").Error
    archived := "archived"
    empty := ""
    got, err := svc.Update(context.Background(), "p1", &dto.ProjectUpdate{Status: &archived, StartDate: &empty, EndDate: &empty})
    assert.NoError(t, err)
    if assert.NotNil(t, got) {
        assert.Equal(t, "archived", got.Status)
        assert.Nil(t, got.StartDate)
        assert.Nil(t, got.EndDate)
    }
}
