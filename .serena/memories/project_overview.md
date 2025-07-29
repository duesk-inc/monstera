# Monstera プロジェクト概要

## 目的
SES企業向け社内業務管理システム
- 規模: 初期10-50名 → 中長期500名
- 企業の業務効率化を支援

## 技術スタック
- **Frontend**: Next.js (TypeScript)
  - React ベースのフレームワーク
  - TypeScript による型安全性
  - Jest/Playwright によるテスト
  
- **Backend**: Go (Gin フレームワーク)
  - RESTful API
  - Clean Architecture パターン
  - 階層構造: handler → service → repository
  
- **Database**: PostgreSQL
  - マイグレーション管理あり
  - pgAdmin による管理
  
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