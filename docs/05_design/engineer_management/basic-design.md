# エンジニア社員管理機能 基本設計書

## 1. 概要

### 1.1 目的
管理部がエンジニア社員の情報を一元管理し、プロジェクトアサインや人材活用の最適化を図るためのWebシステム機能。

### 1.2 対象ユーザー
- 管理部職員（管理者権限・一般権限）

### 1.3 主要機能
- エンジニア社員情報の登録・編集・削除・閲覧
- 検索・フィルタリング機能
- ステータス管理（履歴含む）
- CSV一括インポート・エクスポート
- 既存システムとの連携（案件情報、週報、経費、休暇申請）
- 通知機能

## 2. 機能詳細

### 2.1 エンジニア社員管理機能
#### 2.1.1 基本情報管理
- **管理項目**：
  - 姓、名、セイ、メイ
  - 社員番号
  - 所属部署、役職
  - 入社日、最終学歴
  - メールアドレス、電話番号
  - ステータス（稼働中/待機中/退職/長期休暇中）

#### 2.1.2 スキル情報参照
- **表示項目**：
  - 大分類（フロントエンド、バックエンド、インフラ）
  - 小分類（言語・技術名）
  - スキルレベル（1-5段階）
- **注意**：スキル情報の編集はエンジニア側画面で実施

#### 2.1.3 プロジェクト情報管理
- **管理項目**：
  - 現在参画中のプロジェクト
  - 過去の参画履歴
  - プロジェクト期間（開始日・終了日）
  - 役割・ポジション（マネージャー、リーダー、メンバー）

### 2.2 検索・フィルタリング機能
#### 2.2.1 検索条件
- 氏名（姓名、カナ）での部分一致検索
- 部署・役職での絞り込み
- ステータスでの絞り込み
- スキル（言語、フレームワーク）での検索

### 2.3 ステータス管理機能
#### 2.3.1 ステータス種別
- 稼働中：プロジェクトに継続参画中
- 待機中：プロジェクト間の待機期間
- 退職：退職済み（データ保持）
- 長期休暇中：育休、病休等の長期休暇

#### 2.3.2 ステータス履歴管理
- ステータス変更日時
- 変更前・変更後ステータス
- 変更理由・備考
- 変更実行者

### 2.4 CSV一括処理機能
#### 2.4.1 インポート機能
- 基本情報の一括登録・更新
- エラーチェック・バリデーション
- インポート結果レポート

#### 2.4.2 エクスポート機能
- 基本情報・スキル情報を含むCSV出力
- 検索条件に基づく絞り込み出力

### 2.5 通知機能
#### 2.5.1 通知タイミング
- パスワードリセット実行時
- ロール・権限変更時
- 参画案件変更時

## 3. データベース設計

### 3.1 テーブル拡張・追加

#### 3.1.1 usersテーブル拡張
```sql
ALTER TABLE users ADD COLUMN (
  sei VARCHAR(50) COMMENT '姓',
  mei VARCHAR(50) COMMENT '名',
  sei_kana VARCHAR(50) COMMENT 'セイ',
  mei_kana VARCHAR(50) COMMENT 'メイ',
  employee_number VARCHAR(20) UNIQUE COMMENT '社員番号',
  department VARCHAR(100) COMMENT '所属部署',
  position VARCHAR(100) COMMENT '役職',
  hire_date DATE COMMENT '入社日',
  education VARCHAR(200) COMMENT '最終学歴',
  phone_number VARCHAR(20) COMMENT '電話番号',
  status ENUM('active', 'standby', 'resigned', 'long_leave') DEFAULT 'active' COMMENT 'ステータス',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT '削除フラグ'
);
```

#### 3.1.2 engineer_status_historyテーブル新規作成
```sql
CREATE TABLE engineer_status_history (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  previous_status ENUM('active', 'standby', 'resigned', 'long_leave'),
  new_status ENUM('active', 'standby', 'resigned', 'long_leave') NOT NULL,
  change_reason TEXT COMMENT '変更理由',
  changed_by CHAR(36) NOT NULL COMMENT '変更実行者',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

#### 3.1.3 engineer_skill_categoriesテーブル新規作成
```sql
CREATE TABLE engineer_skill_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT 'カテゴリ名',
  parent_id CHAR(36) COMMENT '親カテゴリID（大分類用）',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3.1.4 engineer_skillsテーブル新規作成
```sql
CREATE TABLE engineer_skills (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  skill_category_id CHAR(36) NOT NULL,
  skill_name VARCHAR(100) NOT NULL COMMENT 'スキル名',
  skill_level INT CHECK (skill_level BETWEEN 1 AND 5) COMMENT 'スキルレベル(1-5)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_category_id) REFERENCES engineer_skill_categories(id)
);
```

#### 3.1.5 engineer_project_historyテーブル新規作成
```sql
CREATE TABLE engineer_project_history (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  project_id CHAR(36) NOT NULL,
  role ENUM('manager', 'leader', 'member') NOT NULL COMMENT '役割',
  start_date DATE NOT NULL COMMENT '参画開始日',
  end_date DATE COMMENT '参画終了日',
  is_current BOOLEAN DEFAULT FALSE COMMENT '現在参画中フラグ',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

## 4. API設計

### 4.1 エンドポイント一覧

#### 4.1.1 エンジニア社員管理
```
GET    /api/v1/admin/engineers                    # エンジニア一覧取得
GET    /api/v1/admin/engineers/:id                # エンジニア詳細取得
POST   /api/v1/admin/engineers                    # エンジニア新規登録
PUT    /api/v1/admin/engineers/:id                # エンジニア情報更新
DELETE /api/v1/admin/engineers/:id                # エンジニア削除（論理削除）
```

#### 4.1.2 ステータス管理
```
PUT    /api/v1/admin/engineers/:id/status         # ステータス変更
GET    /api/v1/admin/engineers/:id/status-history # ステータス履歴取得
```

#### 4.1.3 CSV処理
```
POST   /api/v1/admin/engineers/import             # CSV一括インポート
GET    /api/v1/admin/engineers/export             # CSV一括エクスポート
```

#### 4.1.4 スキル・プロジェクト情報
```
GET    /api/v1/admin/engineers/:id/skills         # スキル情報取得
GET    /api/v1/admin/engineers/:id/projects       # プロジェクト履歴取得
GET    /api/v1/admin/skill-categories             # スキルカテゴリ一覧取得
```

### 4.2 レスポンス形式

#### 4.2.1 エンジニア一覧レスポンス
```json
{
  "items": [
    {
      "id": "uuid",
      "sei": "山田",
      "mei": "太郎",
      "sei_kana": "ヤマダ",
      "mei_kana": "タロウ",
      "employee_number": "EMP001",
      "department": "開発部",
      "position": "エンジニア",
      "status": "active",
      "current_project": {
        "id": "project-uuid",
        "name": "プロジェクトA",
        "role": "member"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

## 5. 画面設計

### 5.1 画面構成
1. **エンジニア一覧画面**
2. **エンジニア詳細画面**
3. **エンジニア登録・編集画面**
4. **CSV一括処理画面**

### 5.2 エンジニア一覧画面
#### 5.2.1 表示項目
- 氏名（姓名・カナ）
- 社員番号
- 所属部署・役職
- ステータス（バッジ表示）
- 現在の案件名（リンク）
- 操作ボタン（詳細・編集・削除）

#### 5.2.2 検索・フィルター
- 氏名検索（部分一致）
- 部署・役職プルダウン
- ステータス選択
- スキル検索（マルチセレクト）

### 5.3 エンジニア詳細画面
#### 5.3.1 表示内容
- **基本情報タブ**：個人情報、連絡先、入社情報
- **スキル情報タブ**：技術スキル一覧（レベル付き）
- **プロジェクト履歴タブ**：参画プロジェクト履歴
- **ステータス履歴タブ**：ステータス変更履歴
- **システム利用状況タブ**：週報提出状況、申請状況

### 5.4 エンジニア登録・編集画面
#### 5.4.1 入力項目
- 基本情報：姓名、カナ、社員番号、部署、役職、入社日、学歴
- 連絡先：メールアドレス、電話番号
- ステータス：現在のステータス

## 6. 権限設計

### 6.1 権限レベル
#### 6.1.1 管理者権限
- 全機能利用可能
- エンジニア情報の登録・編集・削除
- ステータス変更・履歴閲覧
- CSV一括処理
- 権限管理

#### 6.1.2 一般管理部権限
- エンジニア情報の閲覧・編集
- ステータス変更・履歴閲覧
- CSV一括処理
- 削除機能は不可

### 6.2 権限チェック
- APIレベルでの権限チェック実装
- 画面レベルでの表示制御
- 操作ログの記録

## 7. 通知機能設計

### 7.1 通知種別
#### 7.1.1 パスワードリセット通知
- 対象：該当エンジニア
- 送信方法：メール
- 内容：パスワードリセット完了通知

#### 7.1.2 権限変更通知
- 対象：該当エンジニア
- 送信方法：メール
- 内容：ロール・権限変更通知

#### 7.1.3 案件変更通知
- 対象：該当エンジニア、関係者
- 送信方法：メール
- 内容：参画案件変更通知

### 7.2 通知設定
- 通知ON/OFF設定機能
- 通知履歴管理
- 送信失敗時の再送機能

## 8. セキュリティ要件

### 8.1 アクセス制御
- JWT認証による認証・認可
- セッション管理
- ロールベースアクセス制御（RBAC）

### 8.2 データ保護
- 個人情報の暗号化
- アクセスログ記録
- データバックアップ

### 8.3 監査機能
- 操作ログ記録
- データ変更履歴管理
- 不正アクセス検知

## 9. 非機能要件

### 9.1 性能要件
- レスポンス時間：3秒以内
- 同時接続数：50ユーザー
- データ量：10,000件のエンジニアデータ

### 9.2 可用性
- 稼働率：99.9%
- 定期メンテナンス：月1回（2時間以内）

### 9.3 拡張性
- エンジニア数の増加に対応
- 新機能追加への対応
- 他システムとの連携拡張

## 10. 実装スケジュール（想定）

### フェーズ1：基盤機能（4週間）
- データベース設計・構築
- 基本CRUD API実装
- 一覧・詳細画面実装

### フェーズ2：高度機能（3週間）
- 検索・フィルタリング機能
- ステータス管理・履歴機能
- 権限管理機能

### フェーズ3：連携・拡張機能（3週間）
- CSV一括処理機能
- 既存システム連携
- 通知機能

### フェーズ4：テスト・運用準備（2週間）
- 結合テスト
- 性能テスト
- セキュリティテスト
- 運用手順書作成

---

## 補足事項

- 本設計書は要件定義に基づく基本設計であり、詳細設計時に調整が必要な場合があります
- 既存システムとの整合性を保つため、実装時にはコードレビューを必須とします
- セキュリティ要件については、社内セキュリティガイドラインに準拠します