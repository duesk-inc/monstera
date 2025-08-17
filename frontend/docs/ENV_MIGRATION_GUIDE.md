# 環境変数移行ガイド

## 概要

MonsteraプロジェクトのAPIクライアント環境変数を新しい形式に移行するためのガイドです。

## 変更内容

### 旧形式（非推奨）
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 新形式（推奨）
```bash
NEXT_PUBLIC_API_HOST=http://localhost:8080
NEXT_PUBLIC_API_VERSION=v1
```

## 移行手順

### 1. 開発環境の場合

`.env.local` ファイルを以下のように更新してください：

```bash
# 新しい環境変数（必須）
NEXT_PUBLIC_API_HOST=http://localhost:8080
NEXT_PUBLIC_API_VERSION=v1

# レガシー環境変数（後方互換性のため一時的に維持）
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 2. ステージング環境の場合

```bash
NEXT_PUBLIC_API_HOST=https://staging.example.com
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_STAGING_API_HOST=https://staging-api.example.com
```

### 3. 本番環境の場合

```bash
NEXT_PUBLIC_API_HOST=https://api.example.com
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_PRODUCTION_API_HOST=https://api.example.com
```

## 利点

1. **柔軟性の向上**: ホストとバージョンを独立して管理可能
2. **環境別設定**: 環境ごとに異なるAPIホストを簡単に設定
3. **バージョン管理**: APIバージョンの切り替えが容易
4. **保守性向上**: 設定の見通しが良くなる

## 後方互換性

現在、システムは両方の形式をサポートしています：

- 新しい環境変数が設定されている場合は、それを優先
- 新しい環境変数がない場合は、レガシー環境変数を使用
- どちらもない場合は、デフォルト値を使用

**移行期間**: 3ヶ月（2025年4月まで）

## トラブルシューティング

### Q: 環境変数が正しく読み込まれているか確認したい

開発環境で以下を確認してください：
- ブラウザの開発者ツールのコンソールに `[API Config] Loaded configuration:` というログが表示される
- 設定内容が正しいか確認

### Q: レガシー環境変数の警告が表示される

コンソールに以下の警告が表示される場合：
```
[API Config] Using legacy NEXT_PUBLIC_API_URL. Please migrate to NEXT_PUBLIC_API_HOST and NEXT_PUBLIC_API_VERSION.
```

新しい環境変数への移行をお願いします。

### Q: Docker環境での設定方法

`docker-compose.yml` を以下のように更新：

```yaml
environment:
  - NEXT_PUBLIC_API_HOST=http://localhost:8080
  - NEXT_PUBLIC_API_VERSION=v1
```

## サポート

問題が発生した場合は、チームの #tech-support チャンネルまでお問い合わせください。