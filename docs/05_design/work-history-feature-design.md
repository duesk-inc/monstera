# 職務経歴機能 基本設計書

## 1. 概要

### 1.1 目的
SES企業のエンジニア社員が自身の職務経歴を管理し、営業活動に必要なスキルシートをPDF形式で出力できる機能を提供する。

### 1.2 対象ユーザー
- エンジニア社員：自身の職務経歴の登録・編集・PDF出力
- 管理者：エンジニアの職務経歴閲覧・PDF出力

### 1.3 主要機能
1. 職務経歴の登録・編集・削除
2. IT経験年数の自動計算
3. 技術スキルごとの経験年数自動計算
4. PDF形式でのスキルシート出力
5. 一時保存機能

## 2. 機能要件

### 2.1 職務経歴管理機能

#### 2.1.1 基本情報
- **プロジェクト名**（必須、最大255文字）
- **開始日**（必須、年月単位）
- **終了日**（任意、年月単位、空の場合は「現在」と表示）
- **業種**（必須、マスタから選択）
  - IT・通信
  - 金融・保険
  - 医療・福祉
  - 製造
  - 小売・流通
  - 公共・官公庁
  - その他

#### 2.1.2 プロジェクト詳細
- **プロジェクト概要**（必須、テキスト）
- **担当業務**（必須、テキスト）
- **成果・実績**（任意、テキスト）
- **備考**（任意、テキスト）

#### 2.1.3 技術情報
- **担当工程**（複数選択可）
  - 要件定義
  - 基本設計
  - 詳細設計
  - 製造・実装
  - テスト
  - 保守・運用
- **使用技術**
  - プログラミング言語（複数入力可）
  - サーバー・DB（複数入力可）
  - ツール（複数入力可）
- **チーム規模**（数値入力）
- **役割**（テキスト入力）

### 2.2 IT経験年数自動計算機能

#### 2.2.1 計算ロジック
- 最初の職務経歴の開始日から現在までの期間を計算
- 実際に勤務していた期間のみを合算（空白期間は除外）
- 表示形式：「○年○ヶ月」

#### 2.2.2 計算例
```
職務経歴1: 2020/04 - 2021/03 (12ヶ月)
職務経歴2: 2021/06 - 2023/12 (31ヶ月)
職務経歴3: 2024/01 - 現在 (計算時点まで)

IT経験年数 = 合計期間（空白期間を除く）
```

### 2.3 技術スキル経験年数自動計算機能

#### 2.3.1 計算ロジック
- 各技術を使用した職務経歴の期間を合算
- 同一期間に複数プロジェクトで使用した場合は重複カウントしない
- カテゴリ別（プログラミング言語、サーバー・DB、ツール）に集計

#### 2.3.2 表示例
```
プログラミング言語：
- Java: 3年6ヶ月
- Python: 2年0ヶ月
- JavaScript: 1年3ヶ月

サーバー・DB：
- PostgreSQL: 4年2ヶ月
- PostgreSQL: 1年8ヶ月
- AWS: 2年5ヶ月
```

### 2.4 PDF出力機能

#### 2.4.1 出力内容
1. **基本情報**
   - 氏名（姓名・かな）
   - 年齢（生年月日から自動計算）
   - 性別
   - 最寄り駅
   - 出張可否
   - IT経験年数（自動計算値）

2. **参画開始可能日**
   - PDF出力時に任意で設定可能
   - 未設定の場合は空欄

3. **アピールポイント**
   - プロフィール情報から取得

4. **職務経歴一覧**
   - 新しい順に表示
   - 各項目の詳細情報を含む

5. **技術スキルサマリー**
   - 使用技術と経験年数の一覧
   - カテゴリ別に整理

6. **保有資格**
   - プロフィール情報から取得
   - 取得日・有効期限を含む

#### 2.4.2 PDFフォーマット
- A4縦向き
- 日本語フォント対応（文字化け防止）
- シンプルで読みやすいレイアウト
- ヘッダー/フッターに出力日時を表示

### 2.5 一時保存機能
- 編集中の内容を一時的に保存
- 次回アクセス時に編集を継続可能
- 正式保存とは区別して管理

## 3. 画面設計

### 3.1 職務経歴一覧画面
- 登録済み職務経歴をカード形式で表示
- 各カードに編集・削除ボタンを配置
- 新規追加ボタンを上部に配置
- 一時保存/正式保存ボタンを配置
- PDF出力ボタンを配置

### 3.2 職務経歴編集ダイアログ
- モーダルダイアログ形式
- 入力項目をセクション分けして表示
- 保存/キャンセルボタン

### 3.3 PDF出力設定ダイアログ
- 参画開始可能日の入力欄
- プレビューボタン（将来実装）
- 出力ボタン

## 4. API設計

### 4.1 エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | /api/v1/work-history | 職務経歴取得 |
| PUT | /api/v1/work-history | 職務経歴更新 |
| POST | /api/v1/work-history/temp-save | 一時保存 |
| GET | /api/v1/work-history/pdf | PDF生成 |
| GET | /api/v1/admin/engineers/work-history/:id/pdf | 管理者向けPDF生成 |

### 4.2 レスポンス形式

#### 職務経歴取得レスポンス
```json
{
  "user_id": "xxxxx",
  "email": "example@duesk.co.jp",
  "first_name": "太郎",
  "last_name": "山田",
  "first_name_kana": "タロウ",
  "last_name_kana": "ヤマダ",
  "it_experience_years": 5,
  "it_experience_months": 6,
  "work_histories": [
    {
      "id": "xxxxx",
      "project_name": "ECサイト構築プロジェクト",
      "start_date": "2023-04-01",
      "end_date": "2024-03-31",
      "industry": 5,
      "project_overview": "...",
      "responsibilities": "...",
      "achievements": "...",
      "notes": "...",
      "processes": [1, 2, 3, 4],
      "programming_languages": ["Java", "JavaScript"],
      "servers_databases": ["PostgreSQL", "Redis"],
      "tools": ["Git", "Docker"],
      "team_size": 10,
      "role": "リードエンジニア"
    }
  ],
  "technical_skills": [
    {
      "category_name": "programming_languages",
      "display_name": "プログラミング言語",
      "skills": [
        {
          "name": "Java",
          "experience_years": 3,
          "experience_months": 6
        }
      ]
    }
  ]
}
```

## 5. データベース設計

### 5.1 既存テーブルの活用
- **profiles**: プロフィール情報
- **work_histories**: 職務経歴情報
- **work_history_technologies**: 使用技術情報
- **technology_categories**: 技術カテゴリマスタ

### 5.2 テーブル名について
- 影響範囲を考慮し、既存のテーブル名は変更しない
- 新規作成するビューやインデックスには新しい命名規則を適用

## 6. 実装方針

### 6.1 名称変更
1. **画面・メニュー名**
   - 「スキルシート」→「職務経歴」
   
2. **APIエンドポイント**
   - `/api/v1/skill-sheet` → `/api/v1/work-history`
   
3. **コンポーネント名**
   - SkillSheet系 → WorkHistory系
   
4. **関数・変数名**
   - 新規作成分は新命名規則を適用
   - 既存のものは段階的に変更

### 6.2 PDF生成の改善
- 文字化け対策：適切な日本語フォントの埋め込み
- レイアウト最適化：余白・改行の調整
- エラーハンドリング：生成失敗時の適切なメッセージ表示

### 6.3 パフォーマンス考慮
- IT経験年数、技術スキル経験年数は表示時に動的計算
- 大量データ対応：ページネーション実装（将来）
- PDF生成の非同期処理化（将来）

## 7. セキュリティ要件
- ユーザーは自身の職務経歴のみ編集可能
- 管理者は全ユーザーの職務経歴を閲覧可能
- PDF出力時の権限チェック
- XSS対策：入力値のサニタイズ

## 8. 今後の拡張予定
- 職務経歴のテンプレート機能
- AIによる職務経歴の文章改善提案
- 複数フォーマットでのエクスポート（Word、Excel）
- 職務経歴の公開/非公開設定
- バージョン管理機能