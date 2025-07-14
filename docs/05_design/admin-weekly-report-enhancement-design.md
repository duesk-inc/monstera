# 週報管理機能拡張 基本設計書

## 1. 概要

### 1.1 目的
300-500名規模のエンジニア組織において、管理者が効率的に週報の提出状況を管理し、労務リスクを早期発見するための機能を提供する。

### 1.2 基本方針
- 例外管理に集中できる設計（正常な週報は確認不要）
- 段階的な機能実装による着実な改善
- 既存の管理者用週報管理画面への統合
- 画面遷移を最小限にしたワンストップ対応

### 1.3 対象ユーザー
- 一般管理部社員
- マネージャー以上の管理職
- システム管理者

## 2. 機能要件

### 2.1 既存機能の見直し

#### 2.1.1 削除する機能
| 機能 | 削除理由 | 代替手段 |
|------|----------|----------|
| 週報詳細画面（別画面） | 500名分の個別確認は非現実的 | クイックビュー（サイドパネル） |
| 日次記録の詳細表示 | 管理上の必要性が低い | 週次サマリーとアラート機能 |
| 気分アイコン表示 | 管理指標としての優先度低 | 必要時のみクイックビューで確認 |

#### 2.1.2 改善する機能
| 機能 | 改善内容 |
|------|----------|
| 週報一覧 | 必要最小限の情報に絞り込み、月間累計を追加 |
| コメント機能 | 一覧画面から直接投稿可能に |
| エクスポート | フィルタ結果の部分エクスポートに対応 |

### 2.2 新規機能

#### 2.2.1 未提出者管理機能（フェーズ1：優先度高）

##### 機能概要
週報未提出者を効率的に把握し、一括でリマインド通知を送信する機能

##### 詳細仕様
- **未提出者ダッシュボード**
  ```
  表示項目：
  - エンジニア名、所属部署
  - 締切日、経過日数
  - 過去の提出率
  - 最終リマインド日時
  ```

- **一括リマインド送信**
  ```
  機能：
  - チェックボックスによる複数選択
  - フィルタ結果の全選択
  - カスタムメッセージの追加
  - 送信履歴の記録
  ```

- **提出状況分析**
  ```
  表示内容：
  - 部署別提出率
  - 週次提出率推移グラフ
  - 常習未提出者のハイライト
  ```

#### 2.2.2 異常値検知・アラート機能（フェーズ2：優先度高）

##### 機能概要
労務リスクの早期発見のため、設定した閾値を超える勤務状況を自動検知し通知

##### 詳細仕様
- **アラート設定管理**
  ```
  設定項目（デフォルト値）：
  - 週間労働時間上限：60時間
  - 前週比増減幅：20時間
  - 連続休日出勤回数：3週
  - 月間残業時間上限：80時間
  
  権限：
  - 閲覧：全管理者
  - 変更：マネージャー以上
  ```

- **異常値検知画面**
  ```
  表示項目：
  - アラート対象者（優先度順）
  - アラート種別とその値
  - 深刻度（高/中/低）
  - 対応状況と履歴
  ```

- **日次バッチ処理**
  ```
  実行時刻：毎日 AM 6:00
  処理内容：
  1. 前日分の週報データ集計
  2. 設定閾値との比較
  3. アラート生成
  4. システム内通知作成
  ```

#### 2.2.3 効率的な状況把握機能（フェーズ3：優先度中）

##### 機能概要
経営層への報告や全体状況の把握のための集計・分析機能

##### 詳細仕様
- **月次稼働サマリー**
  ```
  集計内容：
  - 部署別平均稼働時間
  - 提出率統計
  - アラート発生状況
  - 前月比較
  ```

- **一括エクスポート**
  ```
  出力形式：Excel/CSV
  出力内容：
  - 基本情報シート
  - 集計サマリーシート
  - 詳細データシート（オプション）
  保存先：
  - Google Workspace共有ドライブ
  - 非同期処理で生成後、ダウンロードリンクを通知
  ```

## 3. システム設計

### 3.1 アーキテクチャ

#### 3.1.1 システム構成
```
フロントエンド（Next.js）
├── 管理者用画面
│   └── /admin/engineers/weekly-reports/
└── エンジニア用画面
    └── /weekly-report/

バックエンド（Go + Gin）
├── 既存API
├── 新規API
│   ├── 未提出者管理
│   ├── アラート管理
│   └── 集計・分析
└── バッチ処理
    └── 異常値検知

データベース（PostgreSQL）
├── 既存テーブル
└── 新規テーブル
    ├── alert_settings
    ├── alert_histories
    └── notification_histories
```

### 3.2 データベース設計

#### 3.2.1 新規テーブル定義

```sql
-- アラート設定テーブル
CREATE TABLE alert_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    weekly_hours_limit INT NOT NULL DEFAULT 60,
    weekly_hours_change_limit INT NOT NULL DEFAULT 20,
    consecutive_holiday_work_limit INT NOT NULL DEFAULT 3,
    monthly_overtime_limit INT NOT NULL DEFAULT 80,
    updated_by CHAR(36) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- アラート履歴テーブル
CREATE TABLE alert_histories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    weekly_report_id CHAR(36),
    alert_type VARCHAR(50) NOT NULL, -- 'overwork', 'sudden_change', 'holiday_work'
    severity VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
    detected_value JSON NOT NULL,
    threshold_value JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unhandled', -- 'unhandled', 'handling', 'resolved'
    resolved_at TIMESTAMP NULL,
    resolved_by CHAR(36),
    resolution_comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_histories_user_status (user_id, status),
    INDEX idx_alert_histories_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- 通知履歴テーブル
CREATE TABLE notification_histories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recipient_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'reminder', 'alert', 'comment'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    related_entity_type VARCHAR(50), -- 'weekly_report', 'alert'
    related_entity_id CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_histories_recipient (recipient_id, is_read),
    INDEX idx_notification_histories_created_at (created_at),
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- インデックス追加（既存テーブル）
CREATE INDEX idx_weekly_reports_status_date ON weekly_reports(status, start_date);
CREATE INDEX idx_weekly_reports_user_date ON weekly_reports(user_id, start_date);
```

### 3.3 API設計

#### 3.3.1 新規エンドポイント

```yaml
# 未提出者管理
GET    /api/v1/admin/weekly-reports/unsubmitted
  query:
    - date_from: string
    - date_to: string
    - department_id: string
    - page: number
    - limit: number

POST   /api/v1/admin/weekly-reports/remind
  body:
    - user_ids: string[]
    - message: string

# アラート管理
GET    /api/v1/admin/alerts
  query:
    - status: string
    - severity: string
    - date_from: string
    - date_to: string

GET    /api/v1/admin/alerts/settings

PUT    /api/v1/admin/alerts/settings
  body:
    - weekly_hours_limit: number
    - weekly_hours_change_limit: number
    - consecutive_holiday_work_limit: number
    - monthly_overtime_limit: number

PUT    /api/v1/admin/alerts/{id}/status
  body:
    - status: string
    - comment: string

# 集計・分析
GET    /api/v1/admin/weekly-reports/summary
  query:
    - year: number
    - month: number

POST   /api/v1/admin/weekly-reports/export
  body:
    - format: string (csv|excel)
    - filters: object
```

### 3.4 権限設計

#### 3.4.1 権限マトリクス

| 機能 | 一般管理部 | マネージャー | システム管理者 |
|------|------------|--------------|----------------|
| 週報一覧閲覧 | ○ | ○ | ○ |
| クイックビュー | ○ | ○ | ○ |
| コメント投稿 | ○ | ○ | ○ |
| 未提出者閲覧 | ○ | ○ | ○ |
| リマインド送信 | ○ | ○ | ○ |
| アラート閲覧 | ○ | ○ | ○ |
| アラート設定変更 | × | ○ | ○ |
| 月次サマリー閲覧 | ○ | ○ | ○ |
| データエクスポート | ○ | ○ | ○ |

## 4. 画面設計

### 4.1 画面構成

```
/admin/engineers/weekly-reports/page.tsx（管理者用週報管理画面）
├── 週報一覧タブ（既存機能を改善）
├── 未提出者管理タブ（新規追加）
├── アラート管理タブ（新規追加）
└── 月次サマリータブ（新規追加）
```

### 4.2 コンポーネント構成

```
frontend/src/
├── app/(admin)/admin/engineers/weekly-reports/
│   └── page.tsx（メイン画面・タブ管理）
├── components/features/admin/weeklyReport/
│   ├── WeeklyReportList.tsx（改善：簡略化した一覧）
│   ├── WeeklyReportQuickView.tsx（新規：サイドパネル）
│   ├── UnsubmittedManagement.tsx（新規：未提出者管理）
│   ├── AlertManagement.tsx（新規：アラート一覧）
│   ├── AlertSettings.tsx（新規：アラート設定）
│   └── MonthlySummary.tsx（新規：月次サマリー）
└── hooks/admin/
    ├── useWeeklyReportManagement.ts（既存改善）
    ├── useUnsubmittedReports.ts（新規）
    ├── useAlertManagement.ts（新規）
    └── useMonthlySummary.ts（新規）
```

### 4.3 画面詳細

#### 4.3.1 週報一覧タブ（改善）

```typescript
// 表示カラム（簡略化）
const columns = [
  { field: 'engineer_name', headerName: 'エンジニア', width: 200 },
  { field: 'period', headerName: '期間', width: 150 },
  { field: 'status', headerName: 'ステータス', width: 100 },
  { field: 'total_hours', headerName: '週間時間', width: 100 },
  { field: 'monthly_total', headerName: '月累計', width: 100 },
  { field: 'comment_status', headerName: 'コメント', width: 100 },
  { field: 'actions', headerName: 'アクション', width: 150 }
];

// 機能
- 行クリックでクイックビュー表示
- 複数選択による一括操作
- インラインコメント機能
- 異常値の視覚的強調（赤文字等）
```

#### 4.3.2 未提出者管理タブ

```
┌─────────────────────────────────────────────────┐
│ 未提出者管理                                     │
├─────────────────────────────────────────────────┤
│ 期間: [2024/01/08-01/14 ▼] 部署: [全て ▼]      │
├─────────────────────────────────────────────────┤
│ 未提出者数: 45名 / 全体: 500名 (提出率: 91.0%)  │
├─────────────────────────────────────────────────┤
│ □ 全選択  [一括リマインド送信]                   │
│ □ 山田太郎  開発部  3日経過  提出率: 85%        │
│ □ 鈴木花子  営業部  5日経過  提出率: 60%        │
│ □ 佐藤次郎  開発部  7日経過  提出率: 40%        │
└─────────────────────────────────────────────────┘
```

#### 4.3.4 通知表示（AdminHeader）

```
┌─────────────────────────────────────────────────┐
│ [ロゴ] 管理者ダッシュボード    🔔(3) [ユーザー] │
├─────────────────────────────────────────────────┤
│                通知一覧                          │
│ ├─ 🔴 アラート: 高橋一郎さんが週72時間勤務     │
│ ├─ 🟡 リマインド: 5名への催促を送信しました     │
│ └─ 🔵 コメント: 田中さんの週報に返信があります  │
└─────────────────────────────────────────────────┘
```

#### 4.3.3 アラート管理タブ

```
┌─────────────────────────────────────────────────┐
│ アラート管理    [設定]                           │
├─────────────────────────────────────────────────┤
│ フィルタ: [全て ▼] 期間: [今週 ▼]              │
├─────────────────────────────────────────────────┤
│ 🔴 高橋一郎  週65時間勤務  要対応               │
│    先週: 45h → 今週: 65h (+20h)                 │
│    [詳細を見る] [コメントする] [対応済みにする]  │
├─────────────────────────────────────────────────┤
│ 🟡 田中美咲  3週連続休日出勤  対応中            │
│    1/6(土), 1/13(土), 1/20(土)                  │
│    [詳細を見る] [コメントする] [対応済みにする]  │
└─────────────────────────────────────────────────┘
```

### 4.4 UI/UX設計方針

1. **情報の優先順位**
   - 異常値を視覚的に強調
   - 重要度に応じた色分け
   - 必要最小限の情報表示

2. **操作の効率化**
   - 一括操作の充実
   - キーボードショートカット対応
   - フィルタ条件の保存

3. **レスポンシブ対応**
   - タブレットでの閲覧も考慮
   - 重要情報を左側に配置

## 5. データ保持ポリシー

### 5.1 保存期間

| データ種別 | 保存期間 | 理由 |
|------------|----------|------|
| 週報データ | 2年間 | 労務管理・人事評価での利用 |
| アラート履歴 | 3ヶ月 | 四半期での傾向分析 |
| 通知履歴 | 1ヶ月 | 直近の対応状況確認 |
| 集計データ | 3年間 | 年次比較・経営分析 |

### 5.2 アーカイブ戦略

```sql
-- アーカイブテーブル
CREATE TABLE weekly_reports_archive (
    -- weekly_reportsと同じ構造
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (YEAR(start_date));

-- アーカイブ処理（年次バッチ）
INSERT INTO weekly_reports_archive 
SELECT *, CURRENT_TIMESTAMP 
FROM weekly_reports 
WHERE start_date < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

### 5.3 外部保管

- 年次でアーカイブデータをエクスポート
- 暗号化ZIPファイルとして保管
- 保管先：Google Workspace共有ドライブ（長期保管用フォルダ）

## 6. 非機能要件

### 6.1 パフォーマンス要件

| 処理 | 目標値 | 測定条件 |
|------|--------|----------|
| 週報一覧表示 | 3秒以内 | 500件表示時 |
| 検索・フィルタ | 1秒以内 | インデックス使用 |
| エクスポート | 10秒以内 | 1ヶ月分のデータ |
| 日次バッチ | 30分以内 | 全処理完了 |

### 6.2 可用性要件

- システム稼働率：99.5%以上
- 計画停止：月1回、深夜2時間以内
- バックアップ：日次（世代管理：7世代）

### 6.3 セキュリティ要件

- 通信：HTTPS必須
- 認証：JWT（既存システムと同様）
- 権限：ロールベースアクセス制御
- ログ：操作ログの記録（1年保存）
- データ：個人情報のマスキング機能
- ユーザー削除：論理削除（週報データとの整合性保持）
- 権限変更：再ログイン必須

### 6.4 運用要件

- 監視：エラー率、レスポンスタイム、同時接続数（最大100名）
- アラート：システム異常時の通知
- バックアップ：自動実行と定期リストア確認
- ログレベル：本番環境でWARN以上を出力
- メンテナンス：日曜深夜2〜4時（2時間以内）
- 通知間隔：30秒ポーリング（リアルタイム性は不要）
- エラーコード：統一エラーコード体系を適用

## 7. 実装計画

### 7.1 フェーズ分割

#### フェーズ1（2週間）：基盤整備と未提出者管理
- 既存画面のリファクタリング
- タブ構造の実装
- 未提出者管理機能
- 通知システム基盤

#### フェーズ2（3週間）：アラート機能
- データベース拡張
- アラート設定管理
- 異常値検知バッチ
- アラート画面

#### フェーズ3（2週間）：分析・レポート機能
- 月次サマリー機能
- 一括エクスポート改善
- パフォーマンス最適化

### 7.2 テスト計画

| テスト種別 | 内容 | 期間 |
|------------|------|------|
| 単体テスト | 各機能の動作確認 | 開発と並行 |
| 結合テスト | API連携、画面遷移 | 各フェーズ末 |
| 性能テスト | 500名想定の負荷テスト | フェーズ3 |
| 受入テスト | 管理部での実運用確認 | リリース前1週間 |

### 7.3 移行計画

1. **データ移行**
   - 既存データはそのまま利用
   - 新規テーブルの初期データ投入

2. **段階的リリース**
   - フェーズ1：一部管理者で試行
   - フェーズ2：全管理者へ展開
   - フェーズ3：全機能リリース

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存機能への影響 | 高 | 機能フラグによる段階的有効化 |
| パフォーマンス劣化 | 中 | インデックス最適化、キャッシュ活用 |
| 利用者の抵抗 | 中 | 事前説明会、マニュアル整備 |
| データ量増大 | 低 | アーカイブ戦略の確実な実行 |

## 9. 成功指標

### 9.1 定量的指標
- 週報提出率：95%以上
- 未提出者へのフォロー時間：50%削減
- 異常値の早期発見率：90%以上

### 9.2 定性的指標
- 管理者の業務効率化実感
- エンジニアの負担感なし
- 労務リスクの予防効果

## 10. 今後の拡張可能性

- AI による異常パターンの学習と予測
- 他システムとの連携（勤怠、人事評価）
- モバイルアプリ対応
- 多言語対応

---

**文書情報**
- バージョン：1.0
- 作成日：2024年1月
- 作成者：システム開発部
- 承認者：（未設定）