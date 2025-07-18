# SharedLayoutWrapper marginLeft 手動テストシナリオ

## テスト準備
1. Frontend: http://localhost:3000 にアクセス
2. 開発者ツールを開いてコンソールとElementsタブを表示
3. テストアカウントでログイン

## テストシナリオ

### シナリオ1: 管理者ロールでのサイドバー開閉テスト
1. 管理者アカウントでログイン
2. ダッシュボードが表示されることを確認
3. サイドバーが開いている状態を確認:
   - [ ] メインコンテンツのmargin-leftが280pxであること
   - [ ] 開発者ツールのElementsタブで確認
4. サイドバーの開閉ボタンをクリック
5. サイドバーが閉じた状態を確認:
   - [ ] メインコンテンツのmargin-leftが0であること
   - [ ] コンテンツが左端から始まること
6. 再度開閉ボタンをクリックして開く
7. アニメーションを確認:
   - [ ] 0.2秒のスムーズなトランジション

### シナリオ2: エンジニアロールでのサイドバー開閉テスト
1. エンジニアアカウントでログイン（または画面切り替え）
2. ダッシュボードが表示されることを確認
3. サイドバーが開いている状態を確認:
   - [ ] メインコンテンツのmargin-leftが280pxであること
4. サイドバーの開閉ボタンをクリック
5. サイドバーが閉じた状態を確認:
   - [ ] メインコンテンツのmargin-leftが0であること
6. 再度開閉ボタンをクリックして開く

### シナリオ3: レスポンシブ表示テスト
1. ブラウザウィンドウを1024px以上の幅で表示
2. サイドバーが開いている状態でmargin-leftが280pxであることを確認
3. ブラウザウィンドウを900px以下に縮小
4. モバイル表示を確認:
   - [ ] margin-leftが常に0であること
   - [ ] サイドバーがドロワー形式になること
5. ウィンドウを再度拡大
6. デスクトップ表示に戻ることを確認

### シナリオ4: ページ遷移テスト
1. サイドバーを開いた状態で各ページに遷移:
   - [ ] /dashboard
   - [ ] /weekly-reports
   - [ ] /expense-applications
   - [ ] /admin/dashboard（管理者のみ）
2. 各ページでmargin-leftが維持されることを確認
3. サイドバーを閉じた状態で同様に遷移
4. margin-leftが0で維持されることを確認

### シナリオ5: ブラウザ互換性テスト
以下のブラウザで基本的な開閉動作を確認:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### シナリオ6: 異常値の確認
1. 開発者ツールでコンテンツ要素のスタイルを確認
2. 以下の異常値が表示されないことを確認:
   - [ ] margin-left: 544px が表示されない
   - [ ] margin-left: 1920px が表示されない
   - [ ] その他の予期しない値が表示されない

## テスト結果記入欄

### 環境情報
- テスト実施日時: 
- ブラウザ: 
- OS: 
- 画面解像度: 

### 結果サマリー
- [ ] 全てのテストシナリオがPASS
- [ ] 問題があった項目: 

### 備考
（特記事項があれば記載）