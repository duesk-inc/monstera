# pgAdmin クイックスタートガイド

## 🚀 5分で始めるpgAdmin

### 1. pgAdminを起動
```bash
# PostgreSQL環境全体を起動
./scripts/postgres-dev.sh start

# または pgAdminのみ起動
docker-compose up -d pgadmin
```

### 2. ブラウザでアクセス
```
http://localhost:5050
```

### 3. ログイン
- Email: `admin@duesk.co.jp`
- Password: `admin`

### 4. 自動接続されたサーバーを確認
左側のツリーに「Monstera Development PostgreSQL」が表示されています。

## 📝 よく使う操作

### SQLクエリを実行したい
1. `monstera` データベースを右クリック
2. `Query Tool` を選択
3. SQLを入力して `F5` キーで実行

### テーブルのデータを見たい
1. `Tables` フォルダを展開
2. テーブル名を右クリック
3. `View/Edit Data > All Rows` を選択

### テーブル構造を確認したい
1. テーブル名を右クリック
2. `Properties` を選択
3. `Columns` タブを確認

### データをエクスポートしたい
1. テーブルを右クリック
2. `Import/Export Data...` を選択
3. `Export` タブでCSV形式を選択

## 🔍 phpMyAdminとの違い

| 操作 | phpMyAdmin | pgAdmin |
|-----|------------|---------|
| SQL実行 | SQLタブ | Query Tool（F5） |
| データ表示 | 参照タブ | View/Edit Data |
| 構造確認 | 構造タブ | Properties |
| エクスポート | エクスポートタブ | Import/Export Data |

## ⚡ ショートカット

- `F5`: クエリ実行
- `F7`: 実行計画表示
- `Ctrl+Space`: 自動補完
- `Ctrl+/`: コメント切り替え

## 🆘 困ったときは

### pgAdminが開かない
```bash
# 状態確認
docker-compose ps pgadmin

# 再起動
docker-compose restart pgadmin
```

### パスワードを忘れた
デフォルト: `admin@duesk.co.jp` / `admin`

### PostgreSQLに接続できない
```bash
# PostgreSQL状態確認
docker-compose ps postgres

# ログ確認
docker-compose logs postgres
```