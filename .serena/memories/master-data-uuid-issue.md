# マスタデータのUUID不整合問題

## 問題パターン
データベースのマスタデータが動的UUID（`gen_random_uuid()`）で生成される場合、環境再構築時に異なるIDが生成され、フロントエンドのキャッシュと不整合が発生する。

## 症状
- エラー: `CATEGORY_NOT_FOUND` などのマスタデータ参照エラー
- HTTPステータス: 500
- タイミング: データベース再初期化後

## 原因
1. マイグレーションで `gen_random_uuid()` を使用
2. フロントエンドがキャッシュした古いIDを送信
3. データベースには新しいIDが存在

## 解決策
### 短期対応
```bash
# React Queryのキャッシュ無効化
queryClient.invalidateQueries({ queryKey: ['master-data-key'] });
```

### 長期対応
1. **固定UUID使用**
   ```sql
   INSERT INTO categories (id, code, name) VALUES 
   ('550e8400-e29b-41d4-a716-446655440001', 'transport', '交通費');
   ```

2. **コード値を主キーに**
   - IDの代わりにcodeフィールドを使用
   - 外部キー制約もcode基準に変更

## 調査方法
```bash
# データベースの現在の値を確認
docker exec -i [container] psql -U postgres -d [db] -c "SELECT id, code, name FROM [table];"

# フロントエンドが送信している値を確認
# Network DevToolsでリクエストボディを確認
```