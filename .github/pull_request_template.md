## 概要（Why/What）

<!-- 目的と変更内容の要点を簡潔に -->

## 主な変更点
- 

## 影響範囲
- Frontend / Backend / DB / CI / Infra（該当を残す）

## 動作確認手順
ローカル:
```
docker compose up -d
cd frontend && npm ci && npm run test:e2e:install && npm run test:e2e
```
CI:
- Playwrightスモーク（Secrets未設定時はスキップ）

## リスクとリカバリ（1行）
- 例: フラグで無効化可／ロールバックはXの前コミットへ戻す

## スクリーンショット/ログ（任意）

## 関連Issue/チケット（任意）
- Closes #

---
チェックリスト（必須）
- [ ] docs/pr-guidelines.md を読み、内容に準拠しています
- [ ] 変更範囲は最小で、不要な差分を含みません
- [ ] 命名・責務・エラーハンドリング・ログ方針が一貫しています
- [ ] テストを追加/更新し、ローカルで通過しています（必要箇所）
- [ ] CIが通過しています（再実行含む）
