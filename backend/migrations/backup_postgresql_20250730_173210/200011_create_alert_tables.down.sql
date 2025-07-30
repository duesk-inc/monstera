-- アラート履歴テーブルの削除（外部キー依存のため先に削除）
DROP TABLE IF EXISTS alert_histories;

-- アラート設定テーブルの削除
DROP TABLE IF EXISTS alert_settings;