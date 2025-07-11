# 経費申請機能 基本設計書

## 1. 概要

### 1.1 目的
SES企業のエンジニア社員が業務で発生した経費を申請し、管理部および役員の承認を経て精算するシステムを構築する。

### 1.2 対象ユーザー
- **申請者**: エンジニア社員
- **承認者**: 管理部担当者、役員

### 1.3 既存実装との統合
現在実装中の画面（週報、休暇申請等）と統合し、統一されたUIで経費申請機能を提供する。

## 2. 機能要件

### 2.1 経費申請機能

#### 2.1.1 申請作成
- 経費カテゴリの選択
  - 旅費交通費
  - 交際費
  - 備品
  - 書籍
  - セミナー
  - その他（手入力項目あり）
- 金額入力
- 使用日の選択
- 使用理由の入力（必須、10文字以上）
- 領収書のアップロード（必須）
- 備考入力（任意）

#### 2.1.2 申請一覧・履歴表示
- 申請状況の確認（下書き、提出済み、承認済み、却下、支払済み）
- 年度別フィルター機能
- 詳細表示機能

#### 2.1.3 申請の編集・取消
- 下書き状態のみ編集可能
- 提出済み申請の取消機能（承認前のみ）

### 2.2 承認フロー

#### 2.2.1 承認段階
```
【5万円未満】
申請者 → 管理部担当者 → 承認完了

【5万円以上】
申請者 → 管理部担当者 → 役員 → 承認完了
```

#### 2.2.2 承認者の設定
- 管理部担当者: 管理部権限を持つユーザーが承認可能
- 役員承認者: 管理部側で設定・変更可能

### 2.3 領収書管理

#### 2.3.1 ファイル仕様
- **対応形式**: JPEG, JPG, PNG, PDF
- **ファイルサイズ**: 最大5MB
- **保存先**: AWS S3または同等のストレージサービス

#### 2.3.2 ファイル検証
- ファイル形式の検証
- ファイルサイズの検証
- ウイルススキャン（推奨）

### 2.4 金額制限

#### 2.4.1 申請上限
- **月額上限**: 50万円（管理部・役員が変更可能）
- **年額上限**: 200万円（管理部・役員が変更可能）

#### 2.4.2 制限管理
- ユーザー別の月次・年次集計
- 上限到達時の警告表示
- 上限超過時の申請制限

## 3. 非機能要件

### 3.1 セキュリティ
- JWT認証による本人確認
- ロールベースアクセス制御
- 領収書ファイルの暗号化保存
- 監査ログの記録

### 3.2 パフォーマンス
- 申請一覧: 1秒以内での表示
- ファイルアップロード: プログレスバー表示
- ページネーション（50件/ページ）

### 3.3 可用性
- エラー時の適切なフィードバック
- 一時保存機能（下書き）
- タイムアウト時の自動保存

## 4. データベース設計

### 4.1 テーブル構造（既存）

#### expenses テーブル
```sql
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount INT NOT NULL,
    expense_date DATETIME(3) NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'paid') DEFAULT 'draft' NOT NULL,
    description TEXT,
    receipt_url VARCHAR(255),
    approver_id VARCHAR(36),
    approved_at DATETIME(3),
    paid_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);
```

### 4.2 追加テーブル

#### expense_approvals テーブル（新規）
```sql
CREATE TABLE expense_approvals (
    id VARCHAR(36) PRIMARY KEY,
    expense_id VARCHAR(36) NOT NULL,
    approver_id VARCHAR(36) NOT NULL,
    approval_type ENUM('manager', 'executive') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
    comment TEXT,
    approved_at DATETIME(3),
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);
```

#### expense_limits テーブル（新規）
```sql
CREATE TABLE expense_limits (
    id VARCHAR(36) PRIMARY KEY,
    limit_type ENUM('monthly', 'yearly') NOT NULL,
    amount INT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### expense_categories テーブル（新規）
```sql
CREATE TABLE expense_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INT NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3)
);
```

## 5. API設計

### 5.1 エンドポイント一覧

#### 経費申請関連
- `POST   /api/v1/expenses` - 経費申請作成
- `GET    /api/v1/expenses` - 経費申請一覧取得
- `GET    /api/v1/expenses/:id` - 経費申請詳細取得
- `PUT    /api/v1/expenses/:id` - 経費申請更新
- `DELETE /api/v1/expenses/:id` - 経費申請削除
- `POST   /api/v1/expenses/:id/submit` - 経費申請提出
- `POST   /api/v1/expenses/:id/cancel` - 経費申請取消

#### ファイルアップロード
- `POST   /api/v1/expenses/upload` - 領収書アップロード
- `DELETE /api/v1/expenses/upload/:filename` - アップロードファイル削除

#### 集計・制限
- `GET    /api/v1/expenses/summary` - 月次・年次集計取得
- `GET    /api/v1/expenses/limits` - 申請上限取得

#### カテゴリ管理
- `GET    /api/v1/expenses/categories` - カテゴリ一覧取得

### 5.2 リクエスト/レスポンス例

#### 経費申請作成
```json
// Request
POST /api/v1/expenses
{
  "title": "〇〇セミナー参加費",
  "category": "seminar",
  "amount": 15000,
  "expense_date": "2024-01-15T00:00:00Z",
  "description": "技術力向上のためのセミナー参加",
  "receipt_url": "https://storage.example.com/receipts/xxx.pdf",
  "other_category": null  // その他の場合のみ
}

// Response
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "〇〇セミナー参加費",
    "category": "seminar",
    "amount": 15000,
    "expense_date": "2024-01-15T00:00:00Z",
    "status": "draft",
    "description": "技術力向上のためのセミナー参加",
    "receipt_url": "https://storage.example.com/receipts/xxx.pdf",
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-10T10:00:00Z"
  }
}
```

## 6. 画面設計

### 6.1 画面一覧
1. 経費申請作成画面
2. 経費申請一覧画面
3. 経費申請詳細画面
4. 経費申請編集画面

### 6.2 画面遷移
```
メニュー
  ├─ 経費申請一覧
  │    ├─ 新規作成 → 経費申請作成画面
  │    └─ 一覧項目クリック → 経費申請詳細画面
  │                              └─ 編集 → 経費申請編集画面
  └─ 経費申請作成
```

### 6.3 UI要件
- MUI (Material-UI) v7を使用
- レスポンシブデザイン対応
- 既存画面との統一性維持
- Toast通知による操作フィードバック

## 7. エラーハンドリング

### 7.1 エラーコード
- `EXP001`: 申請上限超過
- `EXP002`: ファイルサイズ超過
- `EXP003`: 不正なファイル形式
- `EXP004`: 承認権限なし
- `EXP005`: 申請期限切れ

### 7.2 エラーメッセージ
- ユーザー向けメッセージは日本語で表示
- システムログには詳細情報を記録

## 8. 実装優先度

### Phase 1（必須）
1. 経費申請CRUD機能
2. 承認フロー実装
3. 領収書アップロード機能
4. 申請一覧・詳細表示

### Phase 2（推奨）
1. 月次・年次集計機能
2. 申請上限管理
3. カテゴリマスタ連携
4. 検索・フィルター機能拡張

### Phase 3（将来）
1. 管理画面でのカテゴリCRUD
2. 申請上限の動的変更機能
3. 複数領収書対応
4. CSVエクスポート機能

## 9. テスト計画

### 9.1 単体テスト
- API: 各エンドポイントのテスト
- サービス層: ビジネスロジックのテスト
- バリデーション: 入力値検証テスト

### 9.2 統合テスト
- 承認フロー全体のテスト
- ファイルアップロード統合テスト
- 権限管理テスト

### 9.3 E2Eテスト
- 申請から承認までの一連の流れ
- エラー発生時の動作確認
- 画面遷移テスト

## 10. 移行計画

### 10.1 データ移行
- 既存のexpensesテーブルを活用
- カテゴリマスタの初期データ投入
- 申請上限の初期値設定

### 10.2 段階的リリース
1. 開発環境でのテスト完了
2. ステージング環境での検証
3. 本番環境への段階的展開

## 11. 運用・保守

### 11.1 監視項目
- API応答時間
- ストレージ使用量
- エラー発生率

### 11.2 バックアップ
- データベース: 日次バックアップ
- アップロードファイル: 日次バックアップ

### 11.3 ログ管理
- アクセスログ
- エラーログ
- 監査ログ（承認履歴）

---

作成日: 2025-06-29
バージョン: 1.0