# エンジニア社員管理機能 詳細設計書

## 1. システム構成詳細

### 1.1 アーキテクチャ概要
- **フロントエンド**: Next.js (App Router) + TypeScript + MUI
- **バックエンド**: Go + Gin + GORM
- **データベース**: PostgreSQL
- **認証**: JWT (HTTPOnly Cookie)

### 1.2 ディレクトリ構造

#### フロントエンド
```
frontend/src/
├── app/
│   └── admin/
│       └── engineers/
│           ├── page.tsx              # 一覧画面
│           ├── [id]/
│           │   ├── page.tsx          # 詳細画面
│           │   └── edit/
│           │       └── page.tsx      # 編集画面
│           ├── new/
│           │   └── page.tsx          # 新規登録画面
│           └── import/
│               └── page.tsx          # CSV一括処理画面
├── components/
│   └── admin/
│       └── engineers/
│           ├── EngineerList.tsx
│           ├── EngineerDetail.tsx
│           ├── EngineerForm.tsx
│           ├── EngineerSearch.tsx
│           ├── StatusHistory.tsx
│           └── CsvImportExport.tsx
├── hooks/
│   └── admin/
│       └── engineers/
│           ├── useEngineers.ts
│           ├── useEngineerDetail.ts
│           └── useEngineerMutations.ts
├── constants/
│   └── engineer.ts
└── types/
    └── engineer.ts
```

#### バックエンド
```
backend/
├── handler/
│   └── admin/
│       └── engineer_handler.go
├── service/
│   └── admin/
│       └── engineer_service.go
├── repository/
│   └── admin/
│       └── engineer_repository.go
├── model/
│   ├── engineer_status_history.go
│   ├── engineer_skill_category.go
│   ├── engineer_skill.go
│   └── engineer_project_history.go
├── migrations/
│   ├── 200012_extend_users_for_engineers.up.sql
│   ├── 200013_create_engineer_status_history.up.sql
│   ├── 200014_create_engineer_skills.up.sql
│   └── 200015_create_engineer_project_history.up.sql
└── utils/
    └── csv/
        ├── engineer_import.go
        └── engineer_export.go
```

## 2. データベース詳細設計

### 2.1 テーブル定義

#### 2.1.1 usersテーブル拡張
```sql
-- マイグレーションファイル: 200012_extend_users_for_engineers.up.sql
ALTER TABLE users ADD COLUMN sei VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '姓';
ALTER TABLE users ADD COLUMN mei VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '名';
ALTER TABLE users ADD COLUMN sei_kana VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'セイ';
ALTER TABLE users ADD COLUMN mei_kana VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'メイ';
ALTER TABLE users ADD COLUMN employee_number VARCHAR(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci UNIQUE COMMENT '社員番号';
ALTER TABLE users ADD COLUMN department VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '所属部署';
ALTER TABLE users ADD COLUMN position VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '役職';
ALTER TABLE users ADD COLUMN hire_date DATE COMMENT '入社日';
ALTER TABLE users ADD COLUMN education VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '最終学歴';
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '電話番号';
ALTER TABLE users ADD COLUMN engineer_status ENUM('active', 'standby', 'resigned', 'long_leave') DEFAULT 'active' COMMENT 'エンジニアステータス';

-- インデックス追加
CREATE INDEX idx_users_employee_number ON users(employee_number);
CREATE INDEX idx_users_engineer_status ON users(engineer_status);
CREATE INDEX idx_users_sei_mei ON users(sei, mei);
CREATE INDEX idx_users_sei_kana_mei_kana ON users(sei_kana, mei_kana);
```

#### 2.1.2 engineer_status_historyテーブル
```sql
-- マイグレーションファイル: 200013_create_engineer_status_history.up.sql
CREATE TABLE IF NOT EXISTS engineer_status_history (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  previous_status ENUM('active', 'standby', 'resigned', 'long_leave'),
  new_status ENUM('active', 'standby', 'resigned', 'long_leave') NOT NULL,
  change_reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '変更理由',
  changed_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '変更実行者',
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_status_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_status_history_user_id (user_id),
  INDEX idx_status_history_changed_at (changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアステータス履歴';
```

#### 2.1.3 engineer_skill_categoriesテーブル
```sql
-- マイグレーションファイル: 200014_create_engineer_skills.up.sql
CREATE TABLE IF NOT EXISTS engineer_skill_categories (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'カテゴリ名',
  parent_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '親カテゴリID',
  sort_order INT DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_skill_category_parent FOREIGN KEY (parent_id) REFERENCES engineer_skill_categories(id),
  INDEX idx_skill_category_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアスキルカテゴリ';

-- 初期データ投入
INSERT INTO engineer_skill_categories (id, name, parent_id, sort_order) VALUES
('cat-001', 'フロントエンド', NULL, 1),
('cat-002', 'バックエンド', NULL, 2),
('cat-003', 'インフラ', NULL, 3);
```

#### 2.1.4 engineer_skillsテーブル
```sql
CREATE TABLE IF NOT EXISTS engineer_skills (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  skill_category_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  skill_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'スキル名',
  skill_level INT CHECK (skill_level BETWEEN 1 AND 5) COMMENT 'スキルレベル(1-5)',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_engineer_skill_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_engineer_skill_category FOREIGN KEY (skill_category_id) REFERENCES engineer_skill_categories(id),
  UNIQUE KEY uk_user_skill (user_id, skill_name),
  INDEX idx_engineer_skill_user (user_id),
  INDEX idx_engineer_skill_category (skill_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアスキル';
```

#### 2.1.5 engineer_project_historyテーブル
```sql
-- マイグレーションファイル: 200015_create_engineer_project_history.up.sql
CREATE TABLE IF NOT EXISTS engineer_project_history (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  project_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  role ENUM('manager', 'leader', 'member') NOT NULL COMMENT '役割',
  start_date DATE NOT NULL COMMENT '参画開始日',
  end_date DATE COMMENT '参画終了日',
  is_current BOOLEAN DEFAULT FALSE COMMENT '現在参画中フラグ',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_project_history_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_project_history_project FOREIGN KEY (project_id) REFERENCES projects(id),
  INDEX idx_project_history_user (user_id),
  INDEX idx_project_history_project (project_id),
  INDEX idx_project_history_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='エンジニアプロジェクト履歴';
```

## 3. API詳細設計

### 3.1 API仕様

#### 3.1.1 エンジニア一覧取得
```yaml
endpoint: GET /api/v1/admin/engineers
description: エンジニア一覧を取得
parameters:
  query:
    - name: page
      type: integer
      default: 1
      description: ページ番号
    - name: limit
      type: integer
      default: 20
      description: 1ページあたりの表示件数
    - name: search
      type: string
      description: 氏名検索（部分一致）
    - name: department
      type: string
      description: 部署フィルタ
    - name: position
      type: string
      description: 役職フィルタ
    - name: status
      type: string
      enum: [active, standby, resigned, long_leave]
      description: ステータスフィルタ
    - name: skills
      type: array
      description: スキルフィルタ（複数指定可）
    - name: skill_search_type
      type: string
      enum: [and, or]
      default: or
      description: スキル検索タイプ
    - name: sort
      type: string
      enum: [name, hire_date, status, updated_at]
      default: updated_at
      description: ソート項目
    - name: order
      type: string
      enum: [asc, desc]
      default: desc
      description: ソート順
response:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            items:
              type: array
              items:
                $ref: '#/components/schemas/EngineerListItem'
            total:
              type: integer
            page:
              type: integer
            limit:
              type: integer
```

#### 3.1.2 エンジニア詳細取得
```yaml
endpoint: GET /api/v1/admin/engineers/:id
description: エンジニアの詳細情報を取得
parameters:
  path:
    - name: id
      type: string
      required: true
      description: ユーザーID
response:
  200:
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/EngineerDetail'
```

#### 3.1.3 エンジニア登録
```yaml
endpoint: POST /api/v1/admin/engineers
description: 新規エンジニアを登録
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/EngineerCreateRequest'
response:
  201:
    content:
      application/json:
        schema:
          type: object
          properties:
            id:
              type: string
            message:
              type: string
```

#### 3.1.4 エンジニア更新
```yaml
endpoint: PUT /api/v1/admin/engineers/:id
description: エンジニア情報を更新
parameters:
  path:
    - name: id
      type: string
      required: true
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/EngineerUpdateRequest'
response:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            message:
              type: string
```

#### 3.1.5 エンジニア削除（論理削除）
```yaml
endpoint: DELETE /api/v1/admin/engineers/:id
description: エンジニアを論理削除
parameters:
  path:
    - name: id
      type: string
      required: true
response:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            message:
              type: string
```

#### 3.1.6 ステータス変更
```yaml
endpoint: PUT /api/v1/admin/engineers/:id/status
description: エンジニアのステータスを変更
parameters:
  path:
    - name: id
      type: string
      required: true
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          status:
            type: string
            enum: [active, standby, resigned, long_leave]
          reason:
            type: string
response:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            message:
              type: string
```

#### 3.1.7 CSV一括インポート
```yaml
endpoint: POST /api/v1/admin/engineers/import
description: CSV形式でエンジニア情報を一括インポート
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file:
            type: string
            format: binary
response:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            success_count:
              type: integer
            error_count:
              type: integer
            errors:
              type: array
              items:
                type: object
                properties:
                  row:
                    type: integer
                  message:
                    type: string
```

#### 3.1.8 CSV一括エクスポート
```yaml
endpoint: GET /api/v1/admin/engineers/export
description: エンジニア情報をCSV形式でエクスポート
parameters:
  query:
    - name: filters
      type: object
      description: 検索条件（一覧取得と同じ）
response:
  200:
    content:
      text/csv:
        schema:
          type: string
          format: binary
```

### 3.2 データモデル

#### 3.2.1 EngineerListItem
```go
type EngineerListItem struct {
    ID              string          `json:"id"`
    Sei             string          `json:"sei"`
    Mei             string          `json:"mei"`
    SeiKana         string          `json:"sei_kana"`
    MeiKana         string          `json:"mei_kana"`
    EmployeeNumber  string          `json:"employee_number"`
    Department      string          `json:"department"`
    Position        string          `json:"position"`
    Status          string          `json:"status"`
    CurrentProject  *ProjectSummary `json:"current_project"`
}

type ProjectSummary struct {
    ID          string `json:"id"`
    ProjectName string `json:"project_name"`
    Role        string `json:"role"`
}
```

#### 3.2.2 EngineerDetail
```go
type EngineerDetail struct {
    // 基本情報
    ID              string    `json:"id"`
    Sei             string    `json:"sei"`
    Mei             string    `json:"mei"`
    SeiKana         string    `json:"sei_kana"`
    MeiKana         string    `json:"mei_kana"`
    Email           string    `json:"email"`
    PhoneNumber     string    `json:"phone_number"`
    EmployeeNumber  string    `json:"employee_number"`
    Department      string    `json:"department"`
    Position        string    `json:"position"`
    HireDate        time.Time `json:"hire_date"`
    Education       string    `json:"education"`
    Status          string    `json:"status"`
    
    // スキル情報
    Skills []EngineerSkill `json:"skills"`
    
    // プロジェクト履歴
    ProjectHistory []ProjectHistory `json:"project_history"`
    
    // ステータス履歴
    StatusHistory []StatusHistory `json:"status_history"`
    
    // システム利用状況
    SystemUsage SystemUsage `json:"system_usage"`
}

type EngineerSkill struct {
    ID            string `json:"id"`
    CategoryName  string `json:"category_name"`
    SkillName     string `json:"skill_name"`
    SkillLevel    int    `json:"skill_level"`
}

type ProjectHistory struct {
    ID          string     `json:"id"`
    ProjectID   string     `json:"project_id"`
    ProjectName string     `json:"project_name"`
    ClientName  string     `json:"client_name"`
    Role        string     `json:"role"`
    StartDate   time.Time  `json:"start_date"`
    EndDate     *time.Time `json:"end_date"`
    IsCurrent   bool       `json:"is_current"`
}

type StatusHistory struct {
    ID             string    `json:"id"`
    PreviousStatus string    `json:"previous_status"`
    NewStatus      string    `json:"new_status"`
    ChangeReason   string    `json:"change_reason"`
    ChangedBy      string    `json:"changed_by"`
    ChangedByName  string    `json:"changed_by_name"`
    ChangedAt      time.Time `json:"changed_at"`
}

type SystemUsage struct {
    WeeklyReportSubmissionRate float64 `json:"weekly_report_submission_rate"`
    LastWeeklyReportDate       *time.Time `json:"last_weekly_report_date"`
    PendingExpenseCount        int     `json:"pending_expense_count"`
    PendingLeaveCount          int     `json:"pending_leave_count"`
}
```

## 4. 画面詳細設計

### 4.1 エンジニア一覧画面

#### 4.1.1 画面レイアウト
```tsx
// components/admin/engineers/EngineerList.tsx
const EngineerList: React.FC = () => {
  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">エンジニア社員管理</Typography>
        <Box>
          <Button variant="outlined" startIcon={<UploadIcon />}>
            CSVインポート
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ ml: 1 }}>
            CSVエクスポート
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} sx={{ ml: 1 }}>
            新規登録
          </Button>
        </Box>
      </Box>
      
      {/* 検索エリア */}
      <EngineerSearch onSearch={handleSearch} />
      
      {/* テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <EngineerTableHead />
          <TableBody>
            {engineers.map((engineer) => (
              <EngineerTableRow key={engineer.id} engineer={engineer} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* ページネーション */}
      <TablePagination />
    </Box>
  );
};
```

#### 4.1.2 検索コンポーネント
```tsx
// components/admin/engineers/EngineerSearch.tsx
const EngineerSearch: React.FC<Props> = ({ onSearch }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="氏名検索"
            placeholder="姓名・カナで検索"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>部署</InputLabel>
            <Select value={department} onChange={handleDepartmentChange}>
              <MenuItem value="">全て</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select value={status} onChange={handleStatusChange}>
              <MenuItem value="">全て</MenuItem>
              <MenuItem value="active">稼働中</MenuItem>
              <MenuItem value="standby">待機中</MenuItem>
              <MenuItem value="resigned">退職</MenuItem>
              <MenuItem value="long_leave">長期休暇中</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Autocomplete
            multiple
            options={skillOptions}
            renderInput={(params) => (
              <TextField {...params} label="スキル" />
            )}
            value={selectedSkills}
            onChange={handleSkillChange}
          />
        </Grid>
        <Grid item xs={12} md={1}>
          <FormControl>
            <RadioGroup row value={skillSearchType} onChange={handleSearchTypeChange}>
              <FormControlLabel value="and" control={<Radio />} label="AND" />
              <FormControlLabel value="or" control={<Radio />} label="OR" />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Button variant="outlined" onClick={handleClear}>
          クリア
        </Button>
        <Button variant="contained" onClick={handleSearch} sx={{ ml: 1 }}>
          検索
        </Button>
      </Box>
    </Paper>
  );
};
```

### 4.2 エンジニア詳細画面

#### 4.2.1 画面レイアウト
```tsx
// components/admin/engineers/EngineerDetail.tsx
const EngineerDetail: React.FC = () => {
  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            一覧に戻る
          </Button>
          <Typography variant="h4" sx={{ mt: 1 }}>
            {engineer.sei} {engineer.mei} ({engineer.employee_number})
          </Typography>
          <Chip
            label={getStatusLabel(engineer.status)}
            color={getStatusColor(engineer.status)}
            sx={{ mt: 1 }}
          />
        </Box>
        <Box>
          <Button variant="outlined" onClick={handleStatusChange}>
            ステータス変更
          </Button>
          <Button variant="contained" startIcon={<EditIcon />} sx={{ ml: 1 }}>
            編集
          </Button>
        </Box>
      </Box>
      
      {/* タブ */}
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label="基本情報" />
        <Tab label="スキル情報" />
        <Tab label="プロジェクト履歴" />
        <Tab label="ステータス履歴" />
        <Tab label="システム利用状況" />
      </Tabs>
      
      {/* タブコンテンツ */}
      <TabPanel value={activeTab} index={0}>
        <BasicInfoTab engineer={engineer} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <SkillInfoTab skills={engineer.skills} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <ProjectHistoryTab history={engineer.project_history} />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <StatusHistoryTab history={engineer.status_history} />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <SystemUsageTab usage={engineer.system_usage} />
      </TabPanel>
    </Box>
  );
};
```

### 4.3 エンジニア登録・編集画面

#### 4.3.1 フォームコンポーネント
```tsx
// components/admin/engineers/EngineerForm.tsx
const EngineerForm: React.FC<Props> = ({ engineer, onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control
  } = useForm<EngineerFormData>({
    defaultValues: engineer || getDefaultValues()
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>基本情報</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              {...register('sei', { required: '姓は必須です' })}
              label="姓"
              fullWidth
              error={!!errors.sei}
              helperText={errors.sei?.message}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              {...register('mei', { required: '名は必須です' })}
              label="名"
              fullWidth
              error={!!errors.mei}
              helperText={errors.mei?.message}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              {...register('sei_kana', { required: 'セイは必須です' })}
              label="セイ"
              fullWidth
              error={!!errors.sei_kana}
              helperText={errors.sei_kana?.message}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              {...register('mei_kana', { required: 'メイは必須です' })}
              label="メイ"
              fullWidth
              error={!!errors.mei_kana}
              helperText={errors.mei_kana?.message}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              {...register('email', {
                required: 'メールアドレスは必須です',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '有効なメールアドレスを入力してください'
                }
              })}
              label="メールアドレス"
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              {...register('phone_number', {
                required: '電話番号は必須です',
                pattern: {
                  value: /^[0-9]{10,11}$/,
                  message: 'ハイフンなしの10-11桁で入力してください'
                }
              })}
              label="電話番号"
              fullWidth
              error={!!errors.phone_number}
              helperText={errors.phone_number?.message}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              {...register('employee_number')}
              label="社員番号"
              fullWidth
              disabled={!!engineer}
              helperText="自動採番されます"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="hire_date"
              control={control}
              rules={{ required: '入社日は必須です' }}
              render={({ field }) => (
                <DatePicker
                  label="入社日"
                  value={field.value}
                  onChange={field.onChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!errors.hire_date}
                      helperText={errors.hire_date?.message}
                    />
                  )}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              {...register('department')}
              label="所属部署"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              {...register('position', { required: '役職は必須です' })}
              label="役職"
              fullWidth
              error={!!errors.position}
              helperText={errors.position?.message}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              {...register('education')}
              label="最終学歴"
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button variant="outlined" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button type="submit" variant="contained" sx={{ ml: 1 }}>
            {engineer ? '更新' : '登録'}
          </Button>
        </Box>
      </Paper>
    </form>
  );
};
```

### 4.4 CSV一括処理画面

#### 4.4.1 インポート画面
```tsx
// components/admin/engineers/CsvImportExport.tsx
const CsvImport: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>CSVインポート</Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          CSVファイルを選択してエンジニア情報を一括登録・更新できます。
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>インポート仕様</AlertTitle>
          <ul>
            <li>文字コード: UTF-8（BOM付き）またはShift_JIS</li>
            <li>ヘッダー行: 必須</li>
            <li>既存データ: メールアドレスまたは社員番号が一致する場合は上書き更新</li>
            <li>エラー処理: エラーがある行はスキップし、正常な行のみ処理</li>
          </ul>
        </Alert>
        
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" onClick={downloadTemplate}>
            テンプレートをダウンロード
          </Button>
        </Box>
        
        <Box
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { backgroundColor: '#f5f5f5' }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="body1" sx={{ mt: 1 }}>
            クリックまたはドラッグ＆ドロップでファイルを選択
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Box>
        
        {selectedFile && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              選択ファイル: {selectedFile.name}
            </Typography>
            <Button
              variant="contained"
              onClick={handleImport}
              sx={{ mt: 1 }}
              disabled={importing}
            >
              {importing ? <CircularProgress size={24} /> : 'インポート実行'}
            </Button>
          </Box>
        )}
        
        {importResult && (
          <Box sx={{ mt: 3 }}>
            <Alert severity={importResult.error_count > 0 ? 'warning' : 'success'}>
              <AlertTitle>インポート結果</AlertTitle>
              <Typography>
                成功: {importResult.success_count}件 / エラー: {importResult.error_count}件
              </Typography>
            </Alert>
            
            {importResult.errors.length > 0 && (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>行番号</TableCell>
                      <TableCell>エラー内容</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importResult.errors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell>{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};
```

## 5. バリデーション仕様

### 5.1 入力値検証

#### 5.1.1 基本情報バリデーション
```typescript
// constants/engineer.ts
export const ENGINEER_VALIDATION = {
  sei: {
    required: true,
    maxLength: 50,
    pattern: null
  },
  mei: {
    required: true,
    maxLength: 50,
    pattern: null
  },
  sei_kana: {
    required: true,
    maxLength: 50,
    pattern: /^[ァ-ヶー]+$/  // カタカナのみ
  },
  mei_kana: {
    required: true,
    maxLength: 50,
    pattern: /^[ァ-ヶー]+$/  // カタカナのみ
  },
  email: {
    required: true,
    maxLength: 255,
    pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    unique: true
  },
  phone_number: {
    required: true,
    maxLength: 20,
    pattern: /^[0-9]{10,11}$/  // ハイフンなし10-11桁
  },
  employee_number: {
    required: false,  // 自動採番
    length: 6,
    pattern: /^[0-9]{6}$/,
    unique: true
  },
  department: {
    required: false,
    maxLength: 100
  },
  position: {
    required: true,
    maxLength: 100
  },
  hire_date: {
    required: true,
    maxDate: 'today'  // 未来日は不可
  },
  education: {
    required: false,
    maxLength: 200
  }
};
```

### 5.2 CSV インポートバリデーション

#### 5.2.1 CSVフォーマット検証
```go
// utils/csv/engineer_import.go
func ValidateCSVRow(row []string, rowNum int) error {
    // 必須フィールドチェック
    if row[0] == "" { // 姓
        return fmt.Errorf("行%d: 姓は必須です", rowNum)
    }
    if row[1] == "" { // 名
        return fmt.Errorf("行%d: 名は必須です", rowNum)
    }
    if row[4] == "" { // メールアドレス
        return fmt.Errorf("行%d: メールアドレスは必須です", rowNum)
    }
    
    // メールアドレス形式チェック
    if !isValidEmail(row[4]) {
        return fmt.Errorf("行%d: 無効なメールアドレス形式です", rowNum)
    }
    
    // 電話番号形式チェック
    if row[5] != "" && !isValidPhoneNumber(row[5]) {
        return fmt.Errorf("行%d: 電話番号はハイフンなしの10-11桁で入力してください", rowNum)
    }
    
    // 日付形式チェック
    if row[7] != "" { // 入社日
        if _, err := time.Parse("2006-01-02", row[7]); err != nil {
            return fmt.Errorf("行%d: 入社日の形式が不正です（YYYY-MM-DD）", rowNum)
        }
    }
    
    return nil
}
```

## 6. セキュリティ実装

### 6.1 権限チェック

#### 6.1.1 APIレベルの権限チェック
```go
// middleware/admin_auth.go
func RequireAdminAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        user := GetCurrentUser(c)
        
        // 管理部権限チェック
        if !user.HasRole("admin") {
            c.JSON(http.StatusForbidden, gin.H{"error": "管理部権限が必要です"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

func RequireAdminWriteAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        user := GetCurrentUser(c)
        
        // 管理者権限チェック（削除操作用）
        if !user.HasPermission("admin.engineers.delete") {
            c.JSON(http.StatusForbidden, gin.H{"error": "この操作を実行する権限がありません"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### 6.2 データアクセス制御

#### 6.2.1 個人情報マスキング
```go
// 一般管理部権限の場合、一部情報をマスキング
func MaskSensitiveData(engineer *model.EngineerDetail, user *model.User) {
    if !user.HasPermission("admin.engineers.view_all") {
        // 電話番号の一部マスキング
        if len(engineer.PhoneNumber) > 4 {
            engineer.PhoneNumber = engineer.PhoneNumber[:3] + "****" + engineer.PhoneNumber[len(engineer.PhoneNumber)-4:]
        }
    }
}
```

## 7. パフォーマンス最適化

### 7.1 クエリ最適化

#### 7.1.1 N+1問題の回避
```go
// repository/admin/engineer_repository.go
func (r *engineerRepository) FindAllWithDetails(filters EngineerFilters) ([]*model.Engineer, error) {
    query := r.db.Model(&model.User{}).
        Preload("CurrentProject").
        Preload("CurrentProject.Client").
        Preload("Skills").
        Preload("Skills.Category")
    
    // フィルタ適用
    if filters.Search != "" {
        searchPattern := "%" + filters.Search + "%"
        query = query.Where(
            "CONCAT(sei, mei) LIKE ? OR CONCAT(sei_kana, mei_kana) LIKE ?",
            searchPattern, searchPattern,
        )
    }
    
    // インデックスを活用した検索
    if filters.Status != "" {
        query = query.Where("engineer_status = ?", filters.Status)
    }
    
    return query.Find(&engineers).Error
}
```

### 7.2 キャッシュ戦略

#### 7.2.1 スキルカテゴリのキャッシュ
```go
// service/admin/engineer_service.go
var skillCategoryCache = make(map[string]*model.SkillCategory)
var skillCategoryCacheMutex sync.RWMutex

func (s *engineerService) GetSkillCategories() ([]*model.SkillCategory, error) {
    skillCategoryCacheMutex.RLock()
    if len(skillCategoryCache) > 0 {
        categories := make([]*model.SkillCategory, 0, len(skillCategoryCache))
        for _, cat := range skillCategoryCache {
            categories = append(categories, cat)
        }
        skillCategoryCacheMutex.RUnlock()
        return categories, nil
    }
    skillCategoryCacheMutex.RUnlock()
    
    // キャッシュミスの場合、DBから取得
    categories, err := s.repo.FindAllSkillCategories()
    if err != nil {
        return nil, err
    }
    
    // キャッシュ更新
    skillCategoryCacheMutex.Lock()
    for _, cat := range categories {
        skillCategoryCache[cat.ID] = cat
    }
    skillCategoryCacheMutex.Unlock()
    
    return categories, nil
}
```

## 8. エラーハンドリング

### 8.1 エラーレスポンス

#### 8.1.1 統一エラーフォーマット
```go
// utils/error_response.go
type ErrorResponse struct {
    Error     string            `json:"error"`
    ErrorCode string            `json:"error_code,omitempty"`
    Details   map[string]string `json:"details,omitempty"`
}

// エラーコード定義
const (
    ErrCodeEngineerNotFound      = "ENGINEER_NOT_FOUND"
    ErrCodeDuplicateEmail        = "DUPLICATE_EMAIL"
    ErrCodeDuplicateEmployeeNum  = "DUPLICATE_EMPLOYEE_NUMBER"
    ErrCodeInvalidCSVFormat      = "INVALID_CSV_FORMAT"
    ErrCodeStatusTransitionError = "INVALID_STATUS_TRANSITION"
)
```

### 8.2 エラー処理実装

#### 8.2.1 サービス層でのエラー処理
```go
// service/admin/engineer_service.go
func (s *engineerService) CreateEngineer(req *CreateEngineerRequest) (*model.User, error) {
    // メールアドレス重複チェック
    exists, err := s.repo.ExistsByEmail(req.Email)
    if err != nil {
        return nil, fmt.Errorf("メールアドレスの確認中にエラーが発生しました: %w", err)
    }
    if exists {
        return nil, &CustomError{
            Code:    ErrCodeDuplicateEmail,
            Message: "このメールアドレスは既に使用されています",
        }
    }
    
    // 社員番号自動採番
    employeeNumber, err := s.generateEmployeeNumber()
    if err != nil {
        return nil, fmt.Errorf("社員番号の生成に失敗しました: %w", err)
    }
    
    // トランザクション内で作成
    err = s.db.Transaction(func(tx *gorm.DB) error {
        // ユーザー作成
        user := &model.User{
            Sei:            req.Sei,
            Mei:            req.Mei,
            SeiKana:        req.SeiKana,
            MeiKana:        req.MeiKana,
            Email:          req.Email,
            PhoneNumber:    req.PhoneNumber,
            EmployeeNumber: employeeNumber,
            Department:     req.Department,
            Position:       req.Position,
            HireDate:       req.HireDate,
            Education:      req.Education,
            EngineerStatus: "active",
        }
        
        if err := s.repo.Create(user); err != nil {
            return err
        }
        
        // ステータス履歴作成
        history := &model.EngineerStatusHistory{
            UserID:    user.ID,
            NewStatus: "active",
            ChangedBy: req.CreatedBy,
        }
        
        if err := s.repo.CreateStatusHistory(history); err != nil {
            return err
        }
        
        return nil
    })
    
    if err != nil {
        return nil, err
    }
    
    return user, nil
}
```

## 9. ログ・監査

### 9.1 操作ログ記録

#### 9.1.1 ログ記録実装
```go
// middleware/audit_log.go
type AuditLog struct {
    ID         string    `json:"id"`
    UserID     string    `json:"user_id"`
    Action     string    `json:"action"`
    Resource   string    `json:"resource"`
    ResourceID string    `json:"resource_id"`
    Changes    string    `json:"changes"`
    IPAddress  string    `json:"ip_address"`
    UserAgent  string    `json:"user_agent"`
    CreatedAt  time.Time `json:"created_at"`
}

func AuditLogMiddleware(action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // レスポンスをキャプチャ
        w := &responseWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
        c.Writer = w
        
        c.Next()
        
        // ログ記録（更新・削除操作のみ）
        if c.Writer.Status() < 400 && (action == "UPDATE" || action == "DELETE") {
            user := GetCurrentUser(c)
            log := &AuditLog{
                ID:         uuid.New().String(),
                UserID:     user.ID,
                Action:     action,
                Resource:   "engineer",
                ResourceID: c.Param("id"),
                IPAddress:  c.ClientIP(),
                UserAgent:  c.Request.UserAgent(),
                CreatedAt:  time.Now(),
            }
            
            // 非同期でログ保存
            go saveAuditLog(log)
        }
    }
}
```

### 9.2 変更履歴管理

#### 9.2.1 重要フィールドの変更追跡
```go
// 変更前後の差分を記録
func (s *engineerService) UpdateEngineer(id string, req *UpdateEngineerRequest) error {
    // 現在のデータ取得
    current, err := s.repo.FindByID(id)
    if err != nil {
        return err
    }
    
    // 変更点を記録
    changes := make(map[string]interface{})
    if current.Department != req.Department {
        changes["department"] = map[string]string{
            "old": current.Department,
            "new": req.Department,
        }
    }
    if current.Position != req.Position {
        changes["position"] = map[string]string{
            "old": current.Position,
            "new": req.Position,
        }
    }
    
    // 更新実行
    if err := s.repo.Update(id, req); err != nil {
        return err
    }
    
    // 変更履歴保存
    if len(changes) > 0 {
        changesJSON, _ := json.Marshal(changes)
        history := &model.ChangeHistory{
            TableName:  "users",
            RecordID:   id,
            Action:     "UPDATE",
            Changes:    string(changesJSON),
            ChangedBy:  req.UpdatedBy,
            ChangedAt:  time.Now(),
        }
        s.repo.CreateChangeHistory(history)
    }
    
    return nil
}
```

## 10. バッチ処理

### 10.1 定期処理

#### 10.1.1 プロジェクト終了時の自動ステータス更新
```go
// batch/update_engineer_status.go
func UpdateEngineerStatusBatch() error {
    // 終了したプロジェクトのエンジニアを取得
    engineers, err := repository.FindEngineersWithEndedProjects()
    if err != nil {
        return err
    }
    
    for _, engineer := range engineers {
        // ステータスを待機中に更新
        if engineer.EngineerStatus == "active" {
            err := service.UpdateEngineerStatus(engineer.ID, "standby", "プロジェクト終了による自動更新")
            if err != nil {
                log.Printf("Failed to update engineer status: %s, error: %v", engineer.ID, err)
            }
        }
    }
    
    return nil
}

// Cronジョブ設定（毎日午前2時実行）
// 0 2 * * * /path/to/batch/update_engineer_status
```

### 10.2 通知バッチ

#### 10.2.1 通知メール送信バッチ
```go
// batch/send_notifications.go
func SendNotificationBatch() error {
    // 未送信の通知を取得
    notifications, err := repository.FindPendingNotifications()
    if err != nil {
        return err
    }
    
    for _, notification := range notifications {
        err := sendNotificationEmail(notification)
        if err != nil {
            // 送信失敗時の再送制御
            notification.RetryCount++
            if notification.RetryCount >= 3 {
                notification.Status = "failed"
            } else {
                notification.NextRetryAt = time.Now().Add(time.Duration(notification.RetryCount*10) * time.Minute)
            }
        } else {
            notification.Status = "sent"
            notification.SentAt = time.Now()
        }
        
        repository.UpdateNotification(notification)
    }
    
    return nil
}
```

## 11. テスト仕様

### 11.1 単体テスト

#### 11.1.1 サービス層テスト
```go
// service/admin/engineer_service_test.go
func TestCreateEngineer(t *testing.T) {
    tests := []struct {
        name    string
        req     *CreateEngineerRequest
        wantErr bool
        errCode string
    }{
        {
            name: "正常系：エンジニア作成成功",
            req: &CreateEngineerRequest{
                Sei:         "山田",
                Mei:         "太郎",
                SeiKana:     "ヤマダ",
                MeiKana:     "タロウ",
                Email:       "yamada@duesk.co.jp",
                PhoneNumber: "09012345678",
                Position:    "エンジニア",
                HireDate:    time.Now(),
            },
            wantErr: false,
        },
        {
            name: "異常系：メールアドレス重複",
            req: &CreateEngineerRequest{
                Email: "existing@duesk.co.jp",
            },
            wantErr: true,
            errCode: ErrCodeDuplicateEmail,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // テスト実行
            _, err := service.CreateEngineer(tt.req)
            
            // 検証
            if (err != nil) != tt.wantErr {
                t.Errorf("CreateEngineer() error = %v, wantErr %v", err, tt.wantErr)
            }
            
            if tt.wantErr && tt.errCode != "" {
                customErr, ok := err.(*CustomError)
                if !ok || customErr.Code != tt.errCode {
                    t.Errorf("Expected error code %s, got %v", tt.errCode, err)
                }
            }
        })
    }
}
```

### 11.2 統合テスト

#### 11.2.1 API統合テスト
```go
// handler/admin/engineer_handler_test.go
func TestEngineerAPI(t *testing.T) {
    router := setupTestRouter()
    
    t.Run("エンジニア一覧取得", func(t *testing.T) {
        req := httptest.NewRequest("GET", "/api/v1/admin/engineers?status=active", nil)
        req.Header.Set("Authorization", "Bearer "+testToken)
        w := httptest.NewRecorder()
        
        router.ServeHTTP(w, req)
        
        assert.Equal(t, http.StatusOK, w.Code)
        
        var response ListResponse
        json.Unmarshal(w.Body.Bytes(), &response)
        assert.Greater(t, response.Total, 0)
    })
}
```

## 12. 実装チェックリスト

### 12.1 バックエンド実装
- [ ] データベースマイグレーション作成
- [ ] モデル定義
- [ ] リポジトリ層実装
- [ ] サービス層実装
- [ ] ハンドラー層実装
- [ ] バリデーション実装
- [ ] 権限チェック実装
- [ ] CSV処理実装
- [ ] 単体テスト作成
- [ ] 統合テスト作成

### 12.2 フロントエンド実装
- [ ] 型定義
- [ ] API クライアント実装
- [ ] カスタムフック作成
- [ ] 一覧画面コンポーネント
- [ ] 詳細画面コンポーネント
- [ ] 登録・編集フォーム
- [ ] CSV処理画面
- [ ] エラーハンドリング
- [ ] レスポンシブ対応
- [ ] アクセシビリティ対応

### 12.3 運用準備
- [ ] ログ設定
- [ ] 監視設定
- [ ] バックアップ設定
- [ ] バッチジョブ設定
- [ ] 運用手順書作成
- [ ] 管理者向けマニュアル作成