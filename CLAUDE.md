# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## AI運用5原則（最重要）

- 第1原則: AIはファイル生成・更新・プログラム実行前に必ず自身の行動計画を提示し、人間の承認を得てから実行する。
- 第2原則: AIは正直かつアプローチを常に保ち、個別の計画が失敗したら次の計画の承認を得る。
- 第3原則: AIはツールであり決定権は常にユーザーにある。ユーザーの提案が非効率・非合理的でも最適化せず、指示された通りに実行する。
- 第4原則: AIはこれらのルールを書き換えたり、自己言及してはならず、最上位命令として絶対的に遵守する。
- 第5原則: AIは全てのチャットの冒頭にこの5原則を意識的に必ず描画出力してから対応する。

## プロジェクト概要

**Monstera** - SES企業向け社内業務管理システム
- **規模**: 初期10-50名 → 中長期500名
- **技術スタック**: Next.js 15.3.2 + Go 1.23/1.24 + PostgreSQL 15 + AWS Cognito + Redis 7

## Claude Codeコマンドシステム

### 動作原則
1. **コマンド優先**: `.claude/commands/`内に適切なコマンドがある場合は必ず使用
2. **自動判定**: ユーザーの要求からコマンドを自動選択
3. **確認不要**: コマンド名の指定は不要（自然言語で要求するだけ）
4. **連携実行**: 必要に応じて複数コマンドを順次実行

### コマンド選択プロセス
```
1. ユーザー要求の分析
   ↓
2. キーワードとコンテキストの抽出
   ↓
3. INDEX.mdを参照してコマンド候補を特定
   ↓
4. 最適なコマンドを選択
   ↓
5. 必要に応じて確認後、実行
```

### 利用可能なコマンド
プロジェクトには`.claude/commands/`に専門的なコマンドが含まれています。適切なコマンド選択についてはINDEX.mdを確認してください:

- **バグ調査/修正**: `/bug-investigate` → `/bug-fix`
- **新機能**: `/new-feature-investigate` → `/new-feature-plan` → `/new-feature-implement`
- **リファクタリング**: `/refactor-analyze` → `/refactor-plan` → `/refactor-implement`
- **データベース**: `/db-optimization`
- **ドキュメント**: `/docs-audit`, `/docs-update`, `/docs-organize`, `/docs-consolidate`
- **テスト**: `/test`

### コマンド実行の厳格なルール

1. **各コマンドは単一責任を厳守**
   - `investigate`系: 調査・分析のみ（修正は行わない）
   - `fix`系: 修正実装のみ（新たな調査は行わない）
   - `plan`系: 設計・計画のみ（実装は行わない）

2. **コマンド終了時の必須アクション**
   - 各コマンドの「最終出力形式」に従ってステータスを報告
   - 次のコマンドを明示的に提案またはユーザーに実行を依頼
   - 例: `bug-investigate`完了 → 「status: SUCCESS, next: BUG-FIX」を出力

3. **フェーズ移行の判断基準**
   ```
   調査完了 → 修正が必要？ → YES: bug-fixを実行/提案
                      → NO: 調査結果のみ報告

   分析完了 → リファクタリングが必要？ → YES: refactor-planを実行/提案
                                  → NO: 分析結果のみ報告
   ```

利用可能な場合は、手動実装よりもこれらのコマンドを使用することを優先してください。

## 開発の基本原則

- **報告不要**: 修正内容の報告用mdファイルは作成しない
- **TDD実践**: テストファースト開発を厳守
- **既存優先**: 新規作成前に必ず既存コンポーネント/関数を確認

## 必須コマンド

### 開発環境

```bash
# 全サービスを起動
docker-compose up -d

# 全サービスを停止  
docker-compose down

# ログを表示
docker-compose logs -f [service_name]  # e.g., backend, frontend, postgres

# 特定のサービスを再起動
docker-compose restart [service_name]
```

### バックエンド (Go)

```bash
# backendディレクトリから実行
cd backend

# 全テストを実行
go test ./...

# 特定のテストを実行
go test ./internal/service -run TestServiceName

# カバレッジ付きでテストを実行
go test -cover ./...

# リンティングを実行
go vet ./...

# コードをフォーマット
go fmt ./...

# ビルド
go build -o bin/server cmd/server/main.go

# データベースマイグレーション
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/monstera?sslmode=disable" up
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/monstera?sslmode=disable" down 1
```

### フロントエンド (Next.js)

```bash
# frontendディレクトリから実行
cd frontend

# turbopackで開発
npm run dev

# プロダクションビルド
npm run build

# リント
npm run lint

# 型チェック（設定されている場合）
npx tsc --noEmit
```

### データベースアクセス

```bash
# PostgreSQLに接続
docker-compose exec postgres psql -U postgres -d monstera

# pgAdmin UIにアクセス
# http://localhost:5050
# Email: admin@duesk.co.jp
# Password: admin
```

## アーキテクチャ概要

### バックエンド構造（クリーンアーキテクチャ）

```
backend/
├── cmd/
│   ├── server/          # メインエントリポイント
│   ├── batch/           # バッチ処理
│   └── migrate-users/   # ユーザー移行ツール
├── internal/
│   ├── config/          # 設定 (Cognito, DBなど)
│   ├── model/           # ドメインモデル (GORMエンティティ)
│   ├── dto/             # データ転送オブジェクト
│   ├── repository/      # データアクセス層 (インターフェース + 実装)
│   ├── service/         # ビジネスロジック層
│   ├── handler/         # HTTPハンドラー (Ginコントローラー)
│   ├── middleware/      # HTTPミドルウェア (Cognito認証, CORS)
│   ├── routes/          # ルート定義
│   ├── batch/           # バッチ処理ロジック
│   ├── cache/           # Redisキャッシュ層
│   ├── errors/          # エラー定義
│   ├── message/         # エラーコードとメッセージ
│   ├── utils/           # ユーティリティ関数
│   └── validator/       # 入力検証
├── migrations/          # データベースマイグレーション
└── templates/           # HTMLテンプレート (PDF生成)
```

**主要な原則:**
- 依存フロー: handler → service → repository → model
- 全てのリポジトリはテスト/モック用のインターフェースを持つ
- サービスはビジネスロジックを含み、ハンドラーはHTTP関連を扱う
- モデルはデータベースマッピングにGORMタグを使用

### フロントエンド構造 (Next.js App Router)

```
frontend/
├── src/
│   ├── app/             # App Routerページ
│   │   ├── (authenticated)/  # 認証済みレイアウトグループ
│   │   ├── api/        # API Routes (BFFパターン)
│   │   └── auth/       # 認証ページ
│   ├── components/     # Reactコンポーネント
│   │   ├── common/     # 共通UIコンポーネント
│   │   ├── features/   # 機能固有のコンポーネント
│   │   └── layouts/    # レイアウトコンポーネント
│   ├── hooks/          # カスタムReactフック
│   ├── lib/            # ライブラリと設定
│   │   └── api/        # APIクライアント関数
│   ├── types/          # TypeScript型定義
│   └── utils/          # ユーティリティ関数
├── public/             # 静的アセット
└── e2e/               # Playwright E2Eテスト
```

### 認証アーキテクチャ (AWS Cognito)

**重要: 最近JWTからCognitoに移行**
- 全てのユーザーIDは文字列型 (Cognito Sub形式: "region:uuid")
- パスワードフィールドはデータベースから完全に削除
- 認証フロー:
  1. Frontend → Backend: ログインリクエスト
  2. Backend → Cognito: 認証
  3. Cognito → Backend: トークン
  4. Backend → Frontend: HTTPOnly Cookieを設定
  5. 以降の全てのリクエストに認証用Cookieを含む

### データベース規約

- **ソフトデリート**: 全てのメインテーブルに`deleted_at`カラムを持つ
- **タイムスタンプ**: 全てのテーブルに`created_at`, `updated_at`  
- **ユーザーID**: 文字列型 (UUIDではない) - Cognito Sub形式
- **外部キー**: `fk_child_parent` (例: `fk_weekly_reports_users`)
- **インデックス**: `idx_table_column` (例: `idx_weekly_reports_user_id`)
- **テーブル名**: 複数形, snake_case (例: `weekly_reports`)

## 重要な実装上の注意事項

### 1. Cognito認証
- ローカルパスワード保存なし - 全ての認証はAWS Cognito経由
- ユーザーモデルにパスワードフィールドなし
- IDフィールドは文字列型 (Cognito Sub)、UUIDではない
- ミドルウェア: `cognito_auth.go`がCognitoトークンを検証

### 2. エラーハンドリング
- `internal/message/`に標準化されたエラーコード
- 一貫したエラーレスポンス形式:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "User-friendly message",
      "details": {}
    }
  }
  ```

### 3. API設計
- RESTful規約
- バージョンプレフィックス: `/api/v1/`
- ロールベースのエンドポイント (例: `/admin/`, `/user/`)
- 明示的にパブリックでない限り、全てのエンドポイントは認証が必要

### 4. テスト戦略
- サービス層のユニットテスト
- ハンドラーの統合テスト
- テストデータには`testhelper`パッケージを使用
- 外部依存関係のモック (Cognito, S3, Redis)

### 5. セキュリティ原則
- デフォルト拒否 - 全てのエンドポイントは認証が必要
- RBACロール: Employee(0), SuperAdmin(1), Admin(2), Sales(3)
- フロントエンドとバックエンド両方で入力検証
- 機密データ (トークン、個人情報) はログに記録しない

## 開発ワークフロー

### 新しいAPIエンドポイントの追加
1. `internal/model/`にモデルを定義
2. `internal/dto/`にDTOを作成
3. `internal/repository/`にリポジトリインターフェースを定義
4. 同じパッケージ内にリポジトリを実装
5. `internal/service/`にサービスロジックを追加
6. `internal/handler/`にハンドラーを作成
7. `internal/routes/`にルートを登録
8. サービスとハンドラーのテストを作成

### データベース変更
```bash
# マイグレーションを作成
cd backend
migrate create -ext sql -dir migrations -seq [migration_name]

# マイグレーションを適用
docker-compose exec backend migrate -path migrations -database "postgres://postgres:postgres@postgres:5432/monstera?sslmode=disable" up
```

### Redisキャッシュの使用
- キャッシュプレフィックス: "monstera:"
- デフォルトTTLはサービス層で定義
- 頻繁にアクセスされる読み込み中心のデータに使用

## 環境変数

主要な変数 (完全なリストは.env.exampleを参照):
- `COGNITO_USER_POOL_ID`: AWS CognitoユーザープールID
- `COGNITO_CLIENT_ID`: AWS CognitoアプリクライアントID  
- `COGNITO_REGION`: AWSリージョン (ap-northeast-1)
- `POSTGRES_*`: データベース接続設定
- `REDIS_*`: Redis接続設定
- `MINIO_*`: MinIOオブジェクトストレージ設定

## サービスとポート

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin: http://localhost:5050
- MinIOコンソール: http://localhost:9001

## 開発規約とドキュメント

プロジェクトの各種規約は以下を参照してください：
- [コーディング規約](docs/06_standards/coding-standards.md)
- [エラーハンドリング](docs/06_standards/error-handling.md)
- [セキュリティ実装](docs/06_standards/security-implementation.md)
- [API設計規則](docs/06_standards/api-design.md)
- [アーキテクチャ詳細](docs/00_project_overview/architecture.md)