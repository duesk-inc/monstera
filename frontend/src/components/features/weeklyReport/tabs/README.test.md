# UnsubmittedManagementTab テスト仕様

## 概要
`UnsubmittedManagementTab`コンポーネントの単体テストです。

## テスト環境のセットアップ

### 必要なパッケージのインストール
```bash
npm install --save-dev jest @types/jest jest-environment-jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### テストの実行
```bash
# 単体テストの実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# カバレッジレポート付きでテストを実行
npm run test:coverage
```

## テストケース

### 1. レンダリング
- コンポーネントが正しくレンダリングされること
- サマリーカードが正しく表示されること
- 未提出者のデータが正しく表示されること
- 経過日数に応じて適切なChipが表示されること
- リマインドステータスが正しく表示されること

### 2. ローディング状態
- ローディング中はプログレスバーが表示されること

### 3. エラー状態
- エラーが発生した場合、データは空の配列として扱われること

### 4. 個別リマインド送信
- 送信ボタンをクリックするとリマインドが送信されること
- リマインド送信に失敗した場合、エラーがコンソールに出力されること

### 5. 一括リマインド送信
- 複数選択して一括送信ができること
- 確認ダイアログが表示されること

### 6. エクスポート機能
- CSVエクスポートが正しく動作すること
- Excelエクスポートが正しく動作すること
- データがない場合はエクスポートできないこと
- エクスポートエラー時にエラーメッセージが表示されること

### 7. フィルタリング
- 部署フィルターが正しく動作すること
- リフレッシュボタンが正しく動作すること

## モックされる依存関係
- `useUnsubmittedReports`: 未提出者データの取得フック
- `useToast`: Toast通知表示フック
- `exportUtils`: エクスポートユーティリティ関数

## カバレッジ目標
- ステートメントカバレッジ: 90%以上
- ブランチカバレッジ: 80%以上
- 関数カバレッジ: 90%以上
- 行カバレッジ: 90%以上