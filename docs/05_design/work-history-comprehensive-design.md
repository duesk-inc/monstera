# 職務経歴機能 総合設計書

## 1. 機能概要

### 目的
エンジニアの職務経歴を効率的に管理し、営業活動に必要なPDFを迅速に生成する。

### 主要機能
1. **職務経歴管理**
   - プロジェクト単位での経歴登録・編集
   - 使用技術の入力支援（候補表示）
   - 経験年数の自動計算

2. **スキル分析**
   - IT経験年数の自動集計
   - 技術スキル別の経験年数計算
   - プロジェクト数の集計

3. **PDF出力**
   - 営業提案用フォーマット
   - 参画開始可能日の動的設定
   - A4縦向きの標準レイアウト

## 2. システム設計

### 2.1 データベース設計

#### work_histories テーブル（職務経歴）
```sql
CREATE TABLE work_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    industry VARCHAR(100),
    team_size VARCHAR(50),
    role VARCHAR(100),
    project_overview TEXT,
    responsibilities TEXT,
    achievements TEXT,
    programming_languages JSON,
    servers_and_db JSON,
    tools JSON,
    duration_months INT GENERATED ALWAYS AS (
        CASE 
            WHEN end_date IS NULL THEN 
                TIMESTAMPDIFF(MONTH, start_date, CURDATE())
            ELSE 
                TIMESTAMPDIFF(MONTH, start_date, end_date)
        END
    ) STORED,
    remarks TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_work_histories_user_id (user_id),
    INDEX idx_work_histories_start_date (start_date),
    INDEX idx_work_histories_duration (duration_months),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### technology_master テーブル（技術マスタ）
```sql
CREATE TABLE technology_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'programming_language', 'server_db', 'tool'
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    aliases JSON, -- 表記ゆれ対応
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_technology_category_name (category, name),
    INDEX idx_technology_usage (usage_count DESC)
);
```

#### ビュー定義

```sql
-- ユーザーのスキルサマリービュー
CREATE VIEW user_skill_summary AS
SELECT 
    u.id as user_id,
    u.name,
    -- IT経験年数（最初のプロジェクトから現在まで）
    TIMESTAMPDIFF(MONTH, MIN(wh.start_date), CURDATE()) / 12.0 as it_experience_years,
    -- 総プロジェクト数
    COUNT(DISTINCT wh.id) as total_projects,
    -- 最終更新日
    MAX(wh.updated_at) as last_updated
FROM users u
LEFT JOIN work_histories wh ON u.id = wh.user_id AND wh.is_deleted = FALSE
GROUP BY u.id, u.name;

-- ユーザーの技術別経験年数ビュー
CREATE VIEW user_technology_experience AS
SELECT 
    wh.user_id,
    tech_data.category,
    tech_data.technology,
    SUM(wh.duration_months) / 12.0 as experience_years,
    COUNT(DISTINCT wh.id) as project_count
FROM work_histories wh
CROSS JOIN JSON_TABLE(
    JSON_MERGE(
        COALESCE(wh.programming_languages, '[]'),
        COALESCE(wh.servers_and_db, '[]'),
        COALESCE(wh.tools, '[]')
    ),
    '$[*]' COLUMNS (
        technology VARCHAR(100) PATH '$',
        category VARCHAR(50) PATH '$' -- この部分は実装時に調整
    )
) AS tech_data
WHERE wh.is_deleted = FALSE
GROUP BY wh.user_id, tech_data.category, tech_data.technology;
```

### 2.2 API設計

#### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/v1/work-history | 職務経歴一覧取得 |
| POST | /api/v1/work-history | 職務経歴新規作成 |
| PUT | /api/v1/work-history/{id} | 職務経歴更新 |
| DELETE | /api/v1/work-history/{id} | 職務経歴削除 |
| POST | /api/v1/work-history/temp-save | 一時保存 |
| GET | /api/v1/work-history/technology-suggestions | 技術候補取得 |
| GET | /api/v1/work-history/pdf | PDF出力 |
| GET | /api/v1/admin/engineers/work-history/{userId}/pdf | 管理者用PDF出力 |

#### レスポンスサンプル

```json
{
  "work_histories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "project_name": "ECサイトリニューアル",
      "start_date": "2023-04-01",
      "end_date": "2023-12-31",
      "duration_months": 9,
      "industry": "小売業",
      "team_size": "10-20名",
      "role": "バックエンドエンジニア",
      "project_overview": "既存ECサイトのマイクロサービス化",
      "responsibilities": "API設計・実装、性能改善",
      "achievements": "レスポンス時間を50%削減",
      "programming_languages": ["Go", "Python"],
      "servers_and_db": ["AWS", "PostgreSQL", "Redis"],
      "tools": ["Docker", "Kubernetes", "GitHub Actions"],
      "phases": ["要件定義", "基本設計", "詳細設計", "実装", "テスト"],
      "remarks": "アジャイル開発（2週間スプリント）"
    }
  ],
  "summary": {
    "it_experience_years": 8.5,
    "total_projects": 15,
    "technology_summary": {
      "programming_languages": [
        {"name": "Go", "experience_years": 3.5, "project_count": 5},
        {"name": "Python", "experience_years": 5.0, "project_count": 8}
      ],
      "servers_and_db": [
        {"name": "AWS", "experience_years": 6.0, "project_count": 10}
      ],
      "tools": [
        {"name": "Docker", "experience_years": 4.0, "project_count": 7}
      ]
    }
  }
}
```

### 2.3 PDF生成設計

#### HTMLテンプレート構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>職務経歴書</title>
    <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: "Noto Sans JP", sans-serif; }
        /* 詳細なスタイル定義 */
    </style>
</head>
<body>
    <h1>職務経歴書</h1>
    
    <!-- 基本情報 -->
    <section class="basic-info">
        <h2>基本情報</h2>
        <table>
            <tr><th>氏名</th><td>{{.Name}}</td></tr>
            <tr><th>IT経験年数</th><td>{{.ITExperienceYears}}年</td></tr>
            <tr><th>参画開始可能日</th><td>{{.AvailableDate}}</td></tr>
        </table>
    </section>
    
    <!-- 技術スキルサマリー -->
    <section class="skill-summary">
        <h2>技術スキルサマリー</h2>
        <!-- 動的生成 -->
    </section>
    
    <!-- 職務経歴詳細 -->
    <section class="work-history">
        <h2>職務経歴</h2>
        <!-- 動的生成 -->
    </section>
</body>
</html>
```

## 3. 開発ステップ

### Phase 1: 環境・インフラ準備 (1-2日)
- Chrome headlessのインストール確認
- 必要パッケージの追加
- ディレクトリ構造準備

### Phase 2: データベース設計・実装 (2-3日)
- 新規テーブル作成
- 既存テーブル拡張
- ビュー作成
- パフォーマンステスト

### Phase 3: バックエンドAPI実装 (5-7日)
- 共通ユーティリティ実装
- モデル・DTO実装
- リポジトリ層実装
- サービス層実装
- ハンドラー層実装

### Phase 4: フロントエンド実装 (8-10日)
- 型定義・ユーティリティ
- カスタムフック実装
- 共通コンポーネント実装
- 画面実装

### Phase 5: PDF生成機能 (4-5日)
- HTMLテンプレート作成
- 動的コンテンツ実装
- PDF生成サービス実装

### Phase 6: テスト・品質保証 (3-4日)
- 単体テスト
- 統合テスト
- E2Eテスト
- パフォーマンステスト

### Phase 7: 名称変更・移行作業 (2-3日)
- エンドポイント名変更
- 画面・メニュー名変更
- ファイル名変更

## 4. 技術仕様

### 4.1 経験年数計算ロジック

```go
// IT経験年数計算
func CalculateITExperience(workHistories []WorkHistory) float64 {
    if len(workHistories) == 0 {
        return 0
    }
    
    // 最初のプロジェクト開始日を取得
    var firstStartDate time.Time
    for _, wh := range workHistories {
        if firstStartDate.IsZero() || wh.StartDate.Before(firstStartDate) {
            firstStartDate = wh.StartDate
        }
    }
    
    // 現在日時との差分を計算
    months := time.Since(firstStartDate).Hours() / 24 / 30.44
    return math.Round(months/12*10) / 10 // 小数点第1位まで
}

// 技術別経験年数計算
func CalculateSkillExperience(workHistories []WorkHistory) map[string]SkillExperience {
    skillMap := make(map[string]SkillExperience)
    
    for _, wh := range workHistories {
        duration := wh.DurationMonths
        
        // プログラミング言語
        for _, lang := range wh.ProgrammingLanguages {
            updateSkillExperience(skillMap, lang, duration, "programming_language")
        }
        
        // サーバー・DB
        for _, tech := range wh.ServersAndDB {
            updateSkillExperience(skillMap, tech, duration, "server_db")
        }
        
        // ツール
        for _, tool := range wh.Tools {
            updateSkillExperience(skillMap, tool, duration, "tool")
        }
    }
    
    return skillMap
}
```

### 4.2 技術名正規化

```go
// 技術名の正規化
func NormalizeTechnologyName(input string, category string) string {
    // 大文字小文字の統一
    normalized := strings.ToLower(strings.TrimSpace(input))
    
    // エイリアスマッピング
    aliases := map[string]map[string]string{
        "programming_language": {
            "golang": "Go",
            "typescript": "TypeScript",
            "javascript": "JavaScript",
            "node.js": "Node.js",
            "nodejs": "Node.js",
        },
        "server_db": {
            "postgres": "PostgreSQL",
            "mysql": "MySQL",
            "aws": "AWS",
            "gcp": "Google Cloud Platform",
        },
        "tool": {
            "k8s": "Kubernetes",
            "github actions": "GitHub Actions",
            "vscode": "Visual Studio Code",
        },
    }
    
    if categoryAliases, ok := aliases[category]; ok {
        if canonical, exists := categoryAliases[normalized]; exists {
            return canonical
        }
    }
    
    // エイリアスが見つからない場合は、技術マスタから検索
    return searchFromMaster(input, category)
}
```

### 4.3 PDF生成処理

```go
type PDFGenerator struct {
    templatePath string
    outputPath   string
}

func (g *PDFGenerator) Generate(data WorkHistoryPDFData) (string, error) {
    // HTMLテンプレートの読み込み
    tmpl, err := template.ParseFiles(g.templatePath)
    if err != nil {
        return "", fmt.Errorf("template parse error: %w", err)
    }
    
    // HTMLの生成
    var htmlBuffer bytes.Buffer
    if err := tmpl.Execute(&htmlBuffer, data); err != nil {
        return "", fmt.Errorf("template execute error: %w", err)
    }
    
    // 一時HTMLファイルの作成
    tmpHTML := fmt.Sprintf("/tmp/work_history_%s.html", uuid.New().String())
    if err := os.WriteFile(tmpHTML, htmlBuffer.Bytes(), 0644); err != nil {
        return "", fmt.Errorf("html write error: %w", err)
    }
    defer os.Remove(tmpHTML)
    
    // PDFファイル名の生成
    fileName := fmt.Sprintf("職務経歴_%s_%s.pdf", 
        data.UserName, 
        time.Now().Format("20060102_150405"))
    outputPath := filepath.Join(g.outputPath, fileName)
    
    // wkhtmltopdfコマンドの実行
    cmd := exec.Command("wkhtmltopdf",
        "--encoding", "UTF-8",
        "--margin-top", "20mm",
        "--margin-bottom", "20mm",
        "--margin-left", "20mm",
        "--margin-right", "20mm",
        "--page-size", "A4",
        tmpHTML, outputPath)
    
    if err := cmd.Run(); err != nil {
        return "", fmt.Errorf("pdf generation error: %w", err)
    }
    
    return outputPath, nil
}
```

## 5. セキュリティ考慮事項

1. **アクセス制御**
   - 本人と管理者のみがアクセス可能
   - 管理者は全エンジニアのデータ閲覧可能

2. **入力値検証**
   - XSS対策（HTMLエスケープ）
   - SQLインジェクション対策（プリペアドステートメント）
   - ファイルパス操作の制限

3. **PDF生成**
   - 一時ファイルの安全な削除
   - ファイル名のサニタイゼーション
   - アクセスログの記録

## 6. パフォーマンス最適化

1. **データベース**
   - 適切なインデックスの設定
   - ビューの活用による集計処理の高速化
   - N+1問題の回避

2. **キャッシュ戦略**
   - 技術マスタデータのメモリキャッシュ
   - PDF生成結果の一時キャッシュ

3. **非同期処理**
   - 大量データのPDF生成時は非同期処理
   - 進捗状況の通知機能

## 7. 今後の拡張予定

1. **機能拡張**
   - 職務経歴のテンプレート機能
   - 複数フォーマットのPDF出力
   - 英語版PDF生成

2. **分析機能**
   - スキルギャップ分析
   - キャリアパス提案
   - 市場価値算出

3. **連携機能**
   - 外部転職サービスとの連携
   - LinkedInプロフィール同期

## 更新履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|------------|----------|--------|
| 2024-01 | 1.0 | 初版作成 | システム開発部 |
| 2025-01-30 | 1.1 | work-history-basic-design.mdとwork-history-development-steps.mdを統合 | Claude Code |