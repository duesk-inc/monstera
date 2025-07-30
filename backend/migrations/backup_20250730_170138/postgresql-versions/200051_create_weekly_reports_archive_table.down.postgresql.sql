-- アーカイブ関連テーブルを削除 -- 依存関係を考慮して逆順で削除 DROP TABLE IF EXISTS archive_statistics;
DROP TABLE IF EXISTS work_hours_archive;
DROP TABLE IF EXISTS daily_records_archive;
DROP TABLE IF EXISTS weekly_reports_archive;
