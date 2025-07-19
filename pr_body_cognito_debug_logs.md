## 概要
Cognito Localコンテナから大量のデバッグログが出力される問題を解消しました（Phase 1: 短期対応）。

## 背景
- cognito-localコンテナから約1秒間隔で`/json/version`と`/json/list`への404エラーログが出力
- Node.jsデバッガーツール（VSCode、IntelliJ等）がポート9229を自動検出して接続を試行
- DEBUG=1環境変数により全HTTPリクエストがログ出力されていた

## 変更内容
- [x] docker-compose.ymlからcognito-localサービスのDEBUG=1環境変数を削除
- [x] デバッグログの出力が停止することを確認
- [x] ヘルスチェックエンドポイント（/health）の正常動作を確認
- [x] 調査・計画・実装ドキュメントを追加

## 関連Issue
- N/A（小規模な修正のため）

## 実装状況
- [x] Phase 1: DEBUG環境変数の削除（完了）
- [ ] Phase 2: ポート番号変更（9229→9230）※将来実施予定

## テスト
- [x] 手動テスト実施
  - cognito-localコンテナの再起動
  - ログ出力の停止を確認
  - ヘルスチェックの正常応答（OK）を確認
- [x] 既存機能への影響なし

## スクリーンショット
### 修正前（大量のデバッグログ）
```
[1752811911071] DEBUG: 96bf226c NONE request completed {"method":"GET","url":"/json/version","statusCode":404}
[1752811911087] DEBUG: 7a3e0a60 NONE request completed {"method":"GET","url":"/json/list","statusCode":404}
```

### 修正後（クリーンなログ）
```
# デバッグログなし
```

## 確認事項
- [x] コーディング規約に準拠
- [x] 最小限の変更で問題を解決
- [x] 既存機能への影響なし
- [x] ドキュメント作成済み

## レビュー依頼事項
- docker-compose.ymlの変更内容の確認
- Phase 2（ポート番号変更）の実施時期についてのご意見

## デプロイ時の注意
- 特になし（開発環境のみの変更）

## 今後の対応
Phase 2として、以下の根本的解決を計画：
1. cognito-localのポートを9229から9230に変更
2. 関連する全設定ファイルの更新
3. ドキュメントの更新

詳細は`docs/plan/plan_20250718_131500.md`を参照してください。