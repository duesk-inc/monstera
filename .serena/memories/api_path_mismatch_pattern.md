# API Path Mismatch Pattern

## 問題パターン
フロントエンドとバックエンドでAPIパスの命名規則が不一致になる問題

## 発生例
- **フロントエンド**: `/api/v1/skill-sheets` (複数形)
- **バックエンド**: `/api/v1/skill-sheet` (単数形)

## 症状
- 404 Not Found エラー
- APIリクエストが到達しない
- URLが完全に欠落する場合もある

## チェックポイント
1. `/frontend/src/constants/api.ts` - API定数定義
2. `/backend/cmd/server/main.go` - ルート登録
3. `/backend/internal/routes/` - 各種ルート定義ファイル

## 予防策
1. API定数は必ずバックエンドのルート定義と同期する
2. RESTful規約に従う（コレクション＝複数形、単一リソース＝単数形）
3. 新規API追加時は必ず両側の定義を確認
4. TypeScriptの型定義で未定義の定数使用を防ぐ

## 修正優先度
**高** - 機能が完全に動作しないため即座の修正が必要