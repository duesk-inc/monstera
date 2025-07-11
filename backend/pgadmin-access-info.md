# pgAdmin アクセス情報

## アクセスURL
http://localhost:5050

## ログイン情報
- **Email**: admin@duesk.co.jp
- **Password**: admin

## データベース接続情報
- **ホスト**: postgres (Docker内部ネットワーク)
- **ポート**: 5432
- **データベース名**: monstera
- **ユーザー名**: postgres
- **パスワード**: postgres

## pgAdminでの確認方法
1. ブラウザで http://localhost:5050 にアクセス
2. 上記のログイン情報でログイン
3. 左側のツリーで「Servers」→「Monstera PostgreSQL」を展開
4. パスワード「postgres」を入力
5. 「Databases」→「monstera」→「Schemas」→「public」→「Tables」で全テーブルを確認

## 主要な確認ポイント
- テーブル数: 42個
- 外部キー制約: 適切に設定済み
- トリガー: updated_at自動更新が全テーブルに設定
- インデックス: パフォーマンス最適化済み