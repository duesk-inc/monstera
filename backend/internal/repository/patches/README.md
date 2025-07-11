# Repository Patches

このディレクトリには、PostgreSQL移行に関連するリポジトリ層のパッチファイルが含まれます。

## 目的

MySQL→PostgreSQL移行において、既存のリポジトリ実装に対する特定の最適化やパッチを管理するためのディレクトリです。

## 含まれるファイル

- `postgresql_bulk_insert_repository_patch.go` - バルクインサート最適化のパッチ
- `postgresql_repository_sql_patches.go` - SQL実行の最適化パッチ

## 使用方法

これらのパッチファイルは、PostgreSQL環境での特定の操作を最適化するために使用されます。各ファイルは適切なpackage宣言とimport文を持ち、既存のリポジトリ実装と統合されます。

## 注意事項

- パッチファイルの変更時は、既存のリポジトリとの互換性を確認してください
- MySQL環境でも正常に動作することを確認してください
- テストコードの更新も併せて行ってください