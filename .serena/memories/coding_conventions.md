# コーディング規約

## 全般原則
- 保守性・可読性を最優先
- コメントは最小限（コードで意図を表現）
- 絵文字は使用禁止
- 既存コンポーネント・関数を優先利用

## Go（Backend）
### 命名規則
- パッケージ名: 小文字、単数形
- 関数名: キャメルケース（公開: PascalCase、非公開: camelCase）
- 変数名: camelCase
- 定数名: PascalCase または UPPER_SNAKE_CASE

### 構造
- Clean Architecture パターン遵守
- handler → service → repository の階層構造
- エラーハンドリング: errors パッケージ利用
- インターフェース定義によるDI

### パッケージ構成
```
internal/
├── handler/     # HTTPハンドラー
├── service/     # ビジネスロジック
├── repository/  # データアクセス
├── model/       # データモデル
├── dto/         # データ転送オブジェクト
└── errors/      # エラー定義
```

## TypeScript（Frontend）
### 命名規則
- コンポーネント: PascalCase
- 関数・変数: camelCase
- 定数: UPPER_SNAKE_CASE
- 型・インターフェース: PascalCase（Iプレフィックス不要）

### 構造
- React Hooks を優先使用
- カスタムフックは use プレフィックス
- コンポーネントは機能単位で分割
- 共通コンポーネントは components/ に配置

### ディレクトリ構成
```
src/
├── components/  # 共通コンポーネント
├── features/    # 機能別モジュール
├── hooks/       # カスタムフック
├── services/    # API通信
├── types/       # 型定義
└── utils/       # ユーティリティ
```

## テスト規約
- TDD実践（テストファースト）
- ユニットテストは必須
- テストファイル名: *_test.go, *.test.ts
- カバレッジ目標: 80%以上

## セキュリティ規約
- APIエンドポイントは認証必須（ホワイトリスト方式）
- 入力検証は両層（Frontend/Backend）で実施
- RBAC による権限管理徹底
- 機密情報はコードに含めない