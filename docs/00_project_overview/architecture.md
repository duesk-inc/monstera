# 🏗️ Monsteraプロジェクト アーキテクチャ詳細

## システム構成図

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │────▶│   Backend    │────▶│ PostgreSQL   │
│  (Next.js)  │     │   (Go/Gin)   │     │     15       │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │                    ├─────────────────────┤
       │                    ▼                     ▼
       │            ┌──────────────┐     ┌──────────────┐
       │            │    Redis 7   │     │ Cognito Local│
       │            │   (Cache)    │     │   (Auth)     │
       │            └──────────────┘     └──────────────┘
       │                    │                     │
       │                    ▼                     │
       │            ┌──────────────┐             │
       │            │   pgAdmin    │             │
       │            │ (DB管理UI)   │             │
       │            └──────────────┘             │
       │                                          │
       └──────────────────────────────────────────┘
                    HTTPOnly Cookie (JWT)
```

## アーキテクチャ概要

### 1. フロントエンド (Next.js)
- **フレームワーク**: Next.js 15.3.2 (App Router)
- **言語**: TypeScript 5.5.4
- **UI**: Material-UI (MUI) v7.1.0
- **状態管理**: React Context + React Query v5.80.7
- **認証**: JWT (HTTPOnly Cookie)
- **フォーム管理**: React Hook Form v7.56.3
- **日付処理**: dayjs v1.11.13
- **PDF生成**: jsPDF v3.0.1
- **E2Eテスト**: Playwright

### 2. バックエンド (Go)
- **フレームワーク**: Gin v1.8.1
- **言語**: Go 1.23.0 / 1.24.0
- **ORM**: GORM v1.30.0
- **認証**: JWT v5.2.2 + AWS Cognito
- **API**: RESTful API
- **ロギング**: zap v1.27.0
- **Redis**: go-redis v9.11.0
- **マイグレーション**: golang-migrate v4.18.3
- **AWS SDK**: v2 (Cognito連携)

### 3. データベース
- **メインDB**: PostgreSQL 15 (Alpine)
  - 接続プール設定済み
  - 日本時間設定 (Asia/Tokyo)
  - カスタム設定ファイル使用
- **キャッシュ**: Redis 7 (Alpine)
  - 永続化設定 (appendonly)
  - キャッシュプレフィックス: "monstera:"
- **マイグレーション**: golang-migrate
- **DB管理UI**: pgAdmin (port 5050)

### 4. 認証・認可
- **認証プロバイダ**: AWS Cognito
  - ローカル: Cognito Local (port 9229)
  - 本番: AWS Cognito (ap-northeast-1)
- **認証方式**: JWT (Access Token + Refresh Token)
  - アクセストークン: 15分
  - リフレッシュトークン: 7日
- **認可**: RBAC (Role-Based Access Control)
  - 一般ユーザー (0)
  - スーパー管理者 (1)
  - 管理者 (2)
  - 営業 (3)

## レイヤードアーキテクチャ

### バックエンド層構造
```
cmd/
  ├── server/          # メインエントリーポイント
  ├── batch/           # バッチ処理
  └── migrate-users/   # ユーザー移行ツール
internal/
  ├── handler/         # HTTPハンドラー層
  ├── service/         # ビジネスロジック層
  ├── repository/      # データアクセス層
  ├── model/           # ドメインモデル
  ├── middleware/      # ミドルウェア
  ├── auth/            # 認証関連
  ├── cache/           # キャッシュ層
  ├── batch/           # バッチ処理
  ├── validator/       # バリデーション
  ├── errors/          # エラー定義
  ├── utils/           # ユーティリティ
  └── config/          # 設定管理
migrations/            # DBマイグレーション
templates/             # HTMLテンプレート (PDF生成用)
```

### フロントエンド層構造
```
src/
  ├── app/             # App Router
  │   ├── (authenticated)/ # 認証後のレイアウト
  │   ├── api/         # API Routes (BFFパターン)
  │   └── auth/        # 認証ページ
  ├── components/      # UIコンポーネント
  │   ├── common/      # 共通コンポーネント
  │   ├── features/    # 機能別コンポーネント
  │   └── layouts/     # レイアウトコンポーネント
  ├── hooks/           # カスタムフック
  ├── lib/             # ライブラリ設定
  ├── types/           # TypeScript型定義
  └── utils/           # ユーティリティ関数
public/                # 静的ファイル
e2e/                   # E2Eテスト (Playwright)
```

## データフロー

### 1. 認証フロー
```
1. ユーザー → Frontend: ログイン情報入力
2. Frontend → Backend: POST /api/v1/auth/login
3. Backend → Cognito: 認証リクエスト
4. Cognito → Backend: トークン発行
5. Backend → Frontend: HTTPOnly Cookie設定
6. Frontend: 認証状態をReduxに保存
```

### 2. APIリクエストフロー
```
1. Frontend → Backend: APIリクエスト (Cookie付き)
2. Backend Middleware: JWT検証
3. Backend Handler → Service → Repository
4. Repository → Database: クエリ実行
5. Database → Repository → Service → Handler
6. Backend → Frontend: JSONレスポンス
```

## セキュリティアーキテクチャ

### 1. 認証・認可
- JWT検証ミドルウェア
- ロールベースアクセス制御
- リフレッシュトークンローテーション

### 2. 通信セキュリティ
- HTTPS通信 (本番環境)
- CORS設定
- HTTPOnly Cookie
- CSRF対策

### 3. データ保護
- 入力値検証 (両層)
- SQLインジェクション対策 (GORM)
- XSS対策 (React)
- 暗号化 (センシティブデータ)

## 実装済み機能

### 認証・権限管理
- AWS Cognito連携によるユーザー認証
- JWT トークンベース認証（HTTPOnly Cookie）
- RBAC（Role-Based Access Control）
- セッション管理

### 業務機能
- **週報管理**: 週次報告書の作成・提出・承認
- **休暇管理**: 休暇申請・承認・残日数管理
- **経費申請**: 経費申請・承認・精算
- **エンジニア管理**: エンジニア情報・スキル・プロジェクト履歴
- **プロファイル管理**: 個人情報・経歴・スキル
- **スキルシート管理**: スキルシートの生成・PDF出力
- **案件管理**: プロジェクト・クライアント情報
- **請求書管理**: 請求書作成・管理
- **提案管理**: 営業提案・質問管理

### 管理機能
- **ダッシュボード**: 統計情報・グラフ表示
- **アラート・通知**: リマインダー・通知設定
- **監査ログ**: 操作履歴・セキュリティログ
- **バッチ処理**: スケジューラー・定期処理
- **エクスポート**: CSV・Excel出力

## スケーラビリティ設計

### 現在の実装状況
- Docker Compose による開発環境
- PostgreSQL 15 + Redis 7
- 接続プール最適化
- キャッシュ層実装
- 10-50名規模対応

### 今後の拡張計画
- 読み書き分離
- 負荷分散（ロードバランサー）
- 非同期ジョブキュー（バッチ処理の拡張）
- マイクロサービス化（必要に応じて）
- 500名規模対応

## 監視・運用

### ログ管理
- アプリケーションログ
- アクセスログ
- エラーログ
- 監査ログ

### メトリクス
- レスポンスタイム
- エラー率
- リソース使用率

### バックアップ
- 日次バックアップ
- 世代管理
- リストア手順

## 開発環境アーキテクチャ

### Docker構成
```yaml
services:
  postgres:      # PostgreSQL 15 (Alpine) - メインDB
  pgadmin:       # pgAdmin - DB管理UI
  redis:         # Redis 7 (Alpine) - キャッシュ
  cognito-local: # Cognito Local - 認証エミュレータ
  backend:       # Go APIサーバー (ARM64対応)
  frontend:      # Next.js開発サーバー (ARM64対応)
  # batch:       # バッチ処理 (開発中)
```

### ポート構成
- Frontend: 3000
- Backend API: 8080
- PostgreSQL: 5432
- pgAdmin: 5050
- Redis: 6379
- Cognito Local: 9229

### 環境分離
- **開発環境**: Docker Compose (ローカル)
- **E2E環境**: docker-compose.e2e.yml
- **テスト環境**: 単体・統合テスト
- **ステージング環境**: AWS/GCP (検討中)
- **本番環境**: 専用サーバー

## 技術選定理由

### Next.js
- SSR/SSG対応
- TypeScript標準サポート
- App Router による最新機能
- 優れた開発体験

### Go + Gin
- 高速・軽量
- 並行処理サポート
- 静的型付け
- シンプルな言語仕様

### PostgreSQL
- 高度なクエリ機能
- JSON対応
- 拡張性
- 実績と信頼性

### Cognito
- マネージド認証サービス
- セキュリティベストプラクティス
- スケーラビリティ
- MFA対応 (将来)

## 開発ツール・コマンド

### Makefile による統一コマンド
```bash
# 環境構築
make setup              # 初期セットアップ
make dev                # 開発環境起動
make down               # 環境停止

# データベース操作
make migrate-up         # マイグレーション実行
make migrate-down       # マイグレーションロールバック
make migrate-status     # マイグレーション状態確認
make db-psql           # PostgreSQLクライアント接続
make db-dump           # データベースバックアップ
make db-restore        # データベースリストア

# テスト
make test              # 全テスト実行
make test-backend      # バックエンドテスト
make test-frontend     # フロントエンドテスト
make test-e2e          # E2Eテスト

# 品質管理
make lint              # リント実行
make lint-fix          # リント自動修正
make format            # コードフォーマット
```

### 開発支援機能
- ホットリロード（フロントエンド・バックエンド）
- デバッグログ（zap logger）
- APIドキュメント（実装予定）
- パフォーマンスモニタリング

---

最終更新: 2025-07-11