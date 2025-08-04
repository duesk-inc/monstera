# 提案情報確認機能 基本設計書

> ⚠️ **注意**: この機能は未実装です。将来的な実装予定の設計書です。

## 1. 機能概要

### 1.1 目的
SES企業のエンジニア社員が、monstera-pocから抽出された個別提案案件を確認し、見送り/選考への進行を判断できる機能を提供する。

### 1.2 対象ユーザー
- エンジニア社員

### 1.3 機能一覧
- 提案情報一覧表示
- 提案情報詳細表示
- 提案ステータス管理（提案中/選考へ進む/見送り）
- 案件に対する質問機能
- 営業担当者への通知機能

## 2. システム構成

### 2.1 データベース構成
```
monstera データベース
├── public スキーマ（既存）
│   ├── users
│   ├── proposals（新規）
│   └── proposal_questions（新規）
└── monstera_poc スキーマ（参照）
    ├── projects
    ├── project_required_skills
    └── skills
```

## 3. データベース設計

### 3.1 proposalsテーブル（新規作成）
```sql
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL, -- monstera_poc.projects.id参照
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'proposed' 
        CHECK (status IN ('proposed', 'proceed', 'declined')),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_proposals_user_id (user_id),
    INDEX idx_proposals_project_id (project_id),
    INDEX idx_proposals_status (status),
    UNIQUE(project_id, user_id, deleted_at)
);
```

### 3.2 proposal_questionsテーブル（新規作成）
```sql
CREATE TABLE proposal_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    response_text TEXT,
    sales_user_id UUID REFERENCES users(id), -- 営業担当者
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_proposal_questions_proposal_id (proposal_id),
    INDEX idx_proposal_questions_sales_user_id (sales_user_id)
);
```

### 3.3 usersテーブル拡張（想定）
既存のusersテーブルに以下のカラムが存在することを前提とする：
- `email`: エンジニアのメールアドレス（talent+xxx@duesk.co.jp形式での紐付けに使用）
- `role`: 'engineer', 'sales'等の役割識別

## 4. API設計

### 4.1 エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/v1/proposals` | 提案情報一覧取得 |
| GET | `/api/v1/proposals/{id}` | 提案情報詳細取得 |
| PUT | `/api/v1/proposals/{id}/status` | 提案ステータス更新 |
| POST | `/api/v1/proposals/{id}/questions` | 質問投稿 |
| GET | `/api/v1/proposals/{id}/questions` | 質問履歴取得 |

### 4.2 レスポンス形式

#### 4.2.1 提案情報一覧
```json
{
  "items": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "projectName": "案件名",
      "minPrice": 700000,
      "maxPrice": 800000,
      "workLocation": "六本木",
      "requiredSkills": "Java, Spring Boot, React",
      "status": "proposed",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10
}
```

#### 4.2.2 提案情報詳細
```json
{
  "id": "uuid",
  "project": {
    "id": "uuid",
    "projectName": "案件名",
    "description": "案件詳細",
    "minPrice": 700000,
    "maxPrice": 800000,
    "workLocation": "六本木",
    "remoteWorkType": "一部リモート",
    "workingTime": "9:00-18:00",
    "contractPeriod": "6ヶ月",
    "startDate": "2025-02-01",
    "requiredSkills": [
      {
        "skillName": "Java",
        "experienceYearsMin": 3,
        "isRequired": true
      }
    ]
  },
  "status": "proposed",
  "respondedAt": null,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

## 5. 画面設計

### 5.1 提案情報一覧画面
- **パス**: `/proposals`
- **表示項目**: 案件名、単価、場所、技術要件、ステータス
- **機能**: 
  - 一覧表示（ページネーション対応）
  - ステータスフィルタ
  - 詳細画面への遷移

### 5.2 提案情報詳細画面
- **パス**: `/proposals/{id}`
- **表示項目**: 案件詳細情報（すべての項目）
- **機能**: 
  - 「見送り」「選考へ進む」ボタン
  - 質問投稿フォーム
  - 質問履歴表示

## 6. 業務フロー

### 6.1 提案情報の作成
1. monstera-pocが`talent+xxx@duesk.co.jp`から案件メールを受信
2. 案件情報をmonstera_poc.projectsテーブルに保存
3. メールアドレスからエンジニアを特定
4. monsteraのproposalsテーブルに提案レコードを作成

### 6.2 エンジニアの判断フロー
1. エンジニアが提案情報一覧を確認
2. 詳細画面で案件内容を確認
3. 必要に応じて質問を投稿
4. 「見送り」または「選考へ進む」を選択
5. 営業担当者にシステム内通知が送信

## 7. 技術仕様

### 7.1 バックエンド
- **言語**: Go 1.22
- **フレームワーク**: Gin
- **ORM**: GORM
- **アーキテクチャ**: Handler → Service → Repository

### 7.2 フロントエンド
- **フレームワーク**: Next.js 15.3.2 + TypeScript
- **UI**: MUI v7
- **状態管理**: TanStack Query v5
- **フォーム**: React Hook Form

### 7.3 データベース
- **RDBMS**: PostgreSQL
- **スキーマ管理**: golang-migrate

## 8. セキュリティ

### 8.1 認証・認可
- Cognito認証（既存システムと同様）
- エンジニアは自分の提案情報のみアクセス可能
- 営業担当者は関連する提案情報の質問への回答が可能

### 8.2 データ保護
- 個人情報の適切な暗号化
- APIレスポンスでの機密情報の除外
- SQLインジェクション対策（ORMによる自動対応）

## 9. 運用考慮事項

### 9.1 通知機能
- エンジニアの回答時に営業担当者へシステム内通知
- 通知は既存のnotificationsテーブルを活用

### 9.2 データ同期
- monstera-pocとの参照関係維持
- 案件情報の更新時の整合性確保

### 9.3 パフォーマンス
- 提案情報一覧のページネーション実装
- 適切なインデックス設定
- N+1問題の回避

## 10. 実装スケジュール（想定）

1. **Phase 1**: データベース設計・マイグレーション
2. **Phase 2**: バックエンドAPI実装
3. **Phase 3**: フロントエンド画面実装
4. **Phase 4**: 通知機能統合
5. **Phase 5**: テスト・デバッグ・リリース

## 11. 今後の拡張予定

- 案件のお気に入り機能
- 提案情報の自動マッチング
- エンジニアスキルとの適合度表示
- 営業担当者向けの進捗管理機能