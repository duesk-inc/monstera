# APIエンドポイント修正パターン

## 修正方法
1. **フロントエンドの定数確認**
   - `frontend/src/constants/api.ts` でAPI定数を確認
   - 実際に使用されているすべての定数を把握

2. **バックエンドルーティング確認**  
   - `backend/cmd/server/main.go` の setupRouter関数を確認
   - 実際のエンドポイントパスを確認

3. **修正手順**
   - API定数を実際のバックエンドルーティングに合わせる
   - 不足している定数を追加
   - エラーメッセージを適切に改善

## よくあるパターン
- RESTfulな更新: POST `/resource` (not `/resource/update`)
- 取得: GET `/resource`
- 一時保存: POST `/resource/temp-save`
- 履歴: GET `/resource/history`

## 確認ポイント
- ビルドが成功すること
- TypeScriptの型エラーがないこと
- 関連する全機能が動作すること