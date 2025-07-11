-- アーカイブ処理用ストアドプロシージャを削除

DROP PROCEDURE IF EXISTS ArchiveWeeklyReports;
DROP PROCEDURE IF EXISTS CleanupExpiredArchives;
DROP PROCEDURE IF EXISTS ArchiveUserWeeklyReports;
DROP PROCEDURE IF EXISTS GenerateArchiveReport;
DROP PROCEDURE IF EXISTS ValidateArchiveIntegrity;