# Monstera プロジェクト概要

## 目的
SES企業向け社内業務管理システム
- 規模: 初期10-50名 → 中長期500名
- 企業の業務効率化を支援

## 技術スタック
- **Frontend**: Next.js 15.3.2 (TypeScript)
  - React 19 ベースのフレームワーク
  - TypeScript による型安全性
  - Jest/Playwright によるテスト
  - Turbopack による開発
  
- **Backend**: Go 1.23/1.24 (Gin フレームワーク)
  - RESTful API
  - Clean Architecture パターン
  - 階層構造: handler → service → repository
  
- **Database**: PostgreSQL 15
  - マイグレーション管理あり (golang-migrate)
  - pgAdmin による管理
  
- **認証**: AWS Cognito
  - JWT認証から完全移行済み
  - HTTPOnly Cookie による認証
  - ユーザーIDは文字列型 (Cognito Sub形式)
  
- **キャッシュ**: Redis 7
  - セッション管理
  - 頻繁にアクセスされるデータのキャッシュ
  
- **Infrastructure**: Docker Compose
  - 開発環境の統一
  - サービス間連携の簡素化

## プロジェクト構造
```
.
├── backend/         # Go バックエンド
│   └── internal/    # 内部パッケージ群
├── frontend/        # Next.js フロントエンド
│   └── src/        # ソースコード
├── docs/           # ドキュメント群
├── .claude/        # Claude用コマンド定義
└── scripts/        # ユーティリティスクリプト
```

## 開発原則
1. 保守性・可読性を最優先
2. TDD（テストファースト開発）実践
3. 既存コンポーネント・関数の再利用
4. セキュリティ重視（ホワイトリスト方式、両層検証）
5. RBAC による権限管理