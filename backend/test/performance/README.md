# Monstera 負荷テスト

## 概要
500名想定の負荷テストを実行するためのツールとスクリプトです。

## ツール
- **Vegeta**: 高性能な負荷テストツール（Go言語製）

## インストール
```bash
# Vegeta のインストール
go install github.com/tsenart/vegeta@latest

# または homebrew を使用
brew install vegeta
```

## テスト項目
1. 未提出者管理API
2. 週次レポート一覧取得
3. 月次サマリー集計
4. リマインダー一括送信

## パフォーマンス目標
- レスポンスタイム: 95パーセンタイルで2秒以内
- スループット: 100リクエスト/秒以上
- エラー率: 0.1%未満

## 実行方法

### 1. テストデータ生成
```bash
go run test_data_generator.go
```

### 2. 負荷テスト実行
```bash
# 全テスト実行
make performance-test

# 個別テスト実行
./run_test.sh unsubmitted-reports
./run_test.sh weekly-reports
./run_test.sh monthly-summary
./run_test.sh reminders
```

### 3. レポート生成
```bash
./generate_report.sh
```

## ディレクトリ構造
```
performance/
├── README.md
├── Makefile
├── test_data_generator.go      # テストデータ生成
├── targets/                     # Vegeta用ターゲット定義
│   ├── unsubmitted.txt
│   ├── weekly_reports.txt
│   ├── monthly_summary.txt
│   └── reminders.txt
├── scripts/                     # テスト実行スクリプト
│   ├── run_test.sh
│   ├── generate_report.sh
│   └── setup_env.sh
├── results/                     # テスト結果
│   └── *.bin
└── reports/                     # レポート
    └── *.html
```