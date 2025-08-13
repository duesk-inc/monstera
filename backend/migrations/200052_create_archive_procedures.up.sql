-- アーカイブ処理用ストアドプロシージャ
-- 注: MySQLストアドプロシージャからPostgreSQLファンクションへの変換は複雑なため、
-- 別途アプリケーション層での実装を推奨します。
-- 必要に応じて、PostgreSQL PLpgSQLファンクションとして実装してください。

-- 統計テーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS archive_statistics (
    id VARCHAR(36) PRIMARY KEY,
    archive_type VARCHAR(50) NOT NULL,
    fiscal_year INTEGER,
    fiscal_quarter SMALLINT,
    start_date DATE,
    end_date DATE,
    total_records INTEGER DEFAULT 0,
    archived_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    executed_by VARCHAR(255) NOT NULL,
    execution_method VARCHAR(50),
    archive_reason VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_archive_statistics_type ON archive_statistics(archive_type);
CREATE INDEX IF NOT EXISTS idx_archive_statistics_fiscal ON archive_statistics(fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_archive_statistics_status ON archive_statistics(status);
CREATE INDEX IF NOT EXISTS idx_archive_statistics_executed_by ON archive_statistics(executed_by);