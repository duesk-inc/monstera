# AlertService テスト仕様

## 概要
`AlertService`のユニットテストです。アラート機能の各種メソッドに対する正常系・異常系のテストケースを網羅しています。

## テスト環境のセットアップ

### 必要なパッケージのインストール
```bash
go get -u github.com/stretchr/testify/assert
go get -u github.com/stretchr/testify/mock
```

### テストの実行
```bash
# 単体テストの実行
go test ./internal/service -run TestAlertService

# 特定のテストケースの実行
go test ./internal/service -run TestGetAlertSettings

# カバレッジ付きでテストを実行
go test ./internal/service -cover

# カバレッジレポートを生成
go test ./internal/service -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

## テストケース一覧

### 1. GetAlertSettings
- ✅ 正常系: アクティブな設定を取得できる
- ✅ 異常系: 設定の取得に失敗
- ✅ 異常系: アクティブな設定が存在しない

### 2. UpdateAlertSettings
- ✅ 正常系: 設定を更新できる
- ✅ 異常系: 更新者が存在しない

### 3. CreateAlert
- ✅ 正常系: アラートを作成できる
- ✅ 異常系: ユーザーが存在しない

### 4. DetectWeeklyReportAlerts
- ✅ 正常系: 長時間労働アラートを検出

### 5. UpdateAlertStatus
- ✅ 正常系: ステータスを更新できる
- ✅ 異常系: 無効なステータス遷移

### 6. GetAlertTrends
- ✅ 正常系: アラートトレンドを取得できる

### 7. checkOverwork（内部メソッド）
- ✅ 長時間労働を検出
- ✅ 長時間労働（高severity）を検出
- ✅ 正常な労働時間の場合はアラートなし

### 8. calculateTimeVariance（内部メソッド）
- ✅ 時刻のばらつきを計算
- ✅ 同じ時刻の場合はばらつきなし
- ✅ データが1つ以下の場合はばらつきなし

### 9. isValidStatusTransition（内部メソッド）
- ✅ 未処理から対応中への遷移は有効
- ✅ 未処理から解決済みへの遷移は有効
- ✅ 対応中から解決済みへの遷移は有効
- ✅ 解決済みからの遷移は無効
- ✅ 対応中から未処理への遷移は無効

## モック対象

### リポジトリ
- `AlertRepository`
- `AlertHistoryRepository`
- `AlertSettingsRepository`
- `WeeklyReportRepository`
- `UserRepository`

### サービス
- `IntegratedNotificationService`

## テストデータ生成ヘルパー

### createTestAlertSettings
デフォルトのアラート設定を生成します：
- 週間労働時間上限: 60時間
- 週間変動上限: 20%
- 連続休日出勤上限: 3日
- 月間残業時間上限: 80時間

### createTestWeeklyReport
テスト用の週報データを生成します。総労働時間を指定可能です。

## カバレッジ目標
- ステートメントカバレッジ: 80%以上
- ブランチカバレッジ: 70%以上
- 関数カバレッジ: 90%以上

## 追加可能なテストケース

### 将来的に追加すべきテスト
1. **checkSuddenChange**: 前週比急激な変化の検出
2. **checkHolidayWork**: 連続休日出勤の検出
3. **checkMonthlyOvertime**: 月間残業時間の検出
4. **checkAbnormalWorkPattern**: 異常な勤務パターンの検出
5. **CreateBulkAlerts**: 複数アラートの一括作成
6. **GetAlerts**: フィルタ条件でのアラート取得
7. **PerformComprehensiveAlertDetection**: 包括的なアラート検知

### エッジケース
- 空のデータセットの処理
- 大量データの処理性能
- 同時実行時の競合状態
- トランザクションのロールバック