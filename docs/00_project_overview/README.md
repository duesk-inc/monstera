# Monstera プロジェクトドキュメント索引

> 最新版の製品仕様（Draft）は `docs/spec/README.md` を参照してください。
> 旧総覧・重複ドキュメントは順次 `docs/_archive/` へ移行しています。

## 📖 ドキュメント構成

このドキュメントは、Monsteraプロジェクトの技術仕様書の索引です。各カテゴリから必要な情報にアクセスできます。

### 📌 重要な設計原則
- **ステータス管理**: システムの保守性と開発者体験（DX）を最優先とし、データベースのステータス管理は可読性を重視した文字列（ENUM型）を使用します。既存のINT型やVARCHAR型は段階的にENUM型へ移行します。詳細は [CLAUDE.md](/CLAUDE.md) を参照してください。

## 🗂️ ドキュメント分類

### 00_project_overview - プロジェクト全体仕様
- [📋 プロジェクト構造](./monstera-structure.md) - システム全体のアーキテクチャと技術スタック
- [📝 コーディング規約](../06_standards/coding-standards.md) - プロジェクト全体で統一されたコーディング規約（命名規則を含む）

### 01_backend - バックエンド仕様
- [📘 基本仕様](../01_backend/specification.md) - バックエンドの基本設計方針
- **実装ガイド**:
  - [🔐 認証実装](../01_backend/implementation/auth-implementation.md)
  - [🌐 ハンドラー層実装](../01_backend/implementation/handler-implementation.md)
  - [⚙️ サービス層実装](../01_backend/implementation/service-implementation.md)
  - [🗃️ リポジトリ層実装](../01_backend/implementation/repository-implementation.md)
  - [📦 共通パッケージ](../01_backend/implementation/common-packages.md)
- **テスト**:
  - [🧪 テストガイド](../01_backend/testing/testing-guide.md)

### 02_frontend - フロントエンド仕様
- [📗 基本仕様](../02_frontend/specification.md) - フロントエンドの基本設計方針
- **コンポーネント仕様**:
  - **レイアウト**: [🎨 レイアウトコンポーネント](../02_frontend/components/layout/layout-components.md)
  - **フォーム**: [📝 フォームフィールドコンポーネント](../02_frontend/components/form/form-field-components.md)
  - **UI**: 
    - [🔘 アクションボタン](../02_frontend/components/ui/action-button.md)
    - [📊 テーブルコンポーネント](../02_frontend/components/ui/table-components.md)
    - [📄 ページネーションコンポーネント](../02_frontend/components/ui/pagination-components.md)
    - [💬 ダイアログコンポーネント](../02_frontend/components/ui/dialog-components.md)
    - [🏷️ ステータスチップコンポーネント](../02_frontend/components/ui/status-chip-components.md)
    - [🏅 バッジコンポーネント](../02_frontend/components/ui/badge-components.md)
    - [❌ エラーコンポーネント](../02_frontend/components/ui/error-components.md)
    - [⏳ ローディングコンポーネント](../02_frontend/components/ui/loading-components.md)
    - [📦 コンテナコンポーネント](../02_frontend/components/ui/container-components.md)
    - [🗂️ カードコンポーネント](../02_frontend/components/ui/card-components.md)
    - [🔔 ノーティフィケーションコンポーネント](../02_frontend/components/ui/notification-components.md)
  - **ナビゲーション**:
    - [📑 タブコンポーネント](../02_frontend/components/navigation/tab-components.md)
    - [📂 アコーディオンコンポーネント](../02_frontend/components/navigation/accordion-components.md)

### 03_database - データベース仕様
- [🗄️ DDL仕様](../03_database/ddl-specification.md) - データベーススキーマ設計とマイグレーション

### 04_development - 開発・運用
- [🐛 デバッグログ仕様](../04_development/debug-logging.md) - ログ出力の標準化
- [💬 Toast通知ガイド](../04_development/toast-notification-guide.md) - 統一されたユーザー通知システム
- [🧪 E2Eテスト（Playwright）](../e2e-testing.md) - 実行方法・ENV・CI運用
- [🧭 ルート登録ポリシー](../04_development/routes/README.md) - ルートの構造化と登録方針（軽量/構造体ベース）

### ルート登録の使い分け（軽量/構造体ベース）

- 軽量（SetupXxxRoutes）
  - 単一ドメイン・共通認証のみで足りる機能に適用
  - 例: Expense, Profile, SkillSheet, WeeklyReports, Leave, Users, WorkHistory

- 構造体ベース（XxxRoutes struct）
  - 複数ミドルウェア（Cognito+WeeklyReport権限など）や、ユーザー/管理者/統計/リマインドを一括で登録する複合ドメインに適用
  - 例: Notifications（`NotificationRoutes`）

原則: まずは軽量で実装し、要件が複雑化したら構造体ベースへ移行します。詳細・例は [🧭 ルート登録ポリシー](../04_development/routes/README.md) を参照。

---

## 🚀 開発開始ガイド

### 新しい開発者向け
1. **[プロジェクト構造](./monstera-structure.md)** を読んで全体像を把握
2. **[コーディング規約](../06_standards/coding-standards.md)** でコーディング規約を確認
3. 担当する分野の仕様書を詳読

### バックエンド開発者
1. [バックエンド基本仕様](../01_backend/specification.md)
2. 各レイヤーの実装ガイドを順次確認

### フロントエンド開発者
1. [フロントエンド基本仕様](../02_frontend/specification.md)
2. 使用するコンポーネントの仕様を確認

---

## 📝 ドキュメント更新ガイドライン

- 新しい仕様書は適切なカテゴリフォルダに配置
- ファイル名は機能を明確に表現するケバブケースを使用
- このREADMEファイルに新しいドキュメントへのリンクを追加
- 相互参照は相対パスで記述

---

**最終更新**: 2024年12月現在
**管理者**: プロジェクト開発チーム 
