-- PostgreSQL Initial Database Setup for Monstera Project
-- This script runs automatically when PostgreSQL container is first created

-- =====================================
-- Database Configuration
-- =====================================

-- Set timezone for the database
ALTER DATABASE monstera SET timezone = 'Asia/Tokyo';

-- Set default transaction isolation level
ALTER DATABASE monstera SET default_transaction_isolation = 'read committed';

-- Set connection and statement timeouts
ALTER DATABASE monstera SET lock_timeout = '30s';
ALTER DATABASE monstera SET statement_timeout = '300s';
ALTER DATABASE monstera SET idle_in_transaction_session_timeout = '60s';

-- =====================================
-- Extensions
-- =====================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable crypto functions (for password hashing if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================
-- Custom Functions
-- =====================================

-- Function to generate UUID v4 (compatible with MySQL UUID())
CREATE OR REPLACE FUNCTION uuid_generate_v4_text()
RETURNS TEXT AS $$
BEGIN
    RETURN uuid_generate_v4()::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- User and Permissions
-- =====================================

-- Create application user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'monstera_app') THEN
        CREATE USER monstera_app WITH PASSWORD 'app_password';
    END IF;
END
$$;

-- Grant permissions to application user
GRANT CONNECT ON DATABASE monstera TO monstera_app;
GRANT USAGE ON SCHEMA public TO monstera_app;
GRANT CREATE ON SCHEMA public TO monstera_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO monstera_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO monstera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO monstera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO monstera_app;

-- Create read-only user for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'monstera_readonly') THEN
        CREATE USER monstera_readonly WITH PASSWORD 'readonly_password';
    END IF;
END
$$;

-- Grant read-only permissions
GRANT CONNECT ON DATABASE monstera TO monstera_readonly;
GRANT USAGE ON SCHEMA public TO monstera_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monstera_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monstera_readonly;

-- =====================================
-- Performance Optimization Tables
-- =====================================

-- Table to track slow queries (optional, for monitoring)
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    calls BIGINT DEFAULT 1,
    total_time_ms BIGINT NOT NULL,
    mean_time_ms DOUBLE PRECISION NOT NULL,
    min_time_ms DOUBLE PRECISION NOT NULL,
    max_time_ms DOUBLE PRECISION NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for slow query analysis
CREATE INDEX IF NOT EXISTS idx_slow_query_log_duration ON slow_query_log(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_log_logged_at ON slow_query_log(logged_at DESC);

-- =====================================
-- Connection Pool Monitoring
-- =====================================

-- View for monitoring connection pool usage
CREATE OR REPLACE VIEW connection_pool_stats AS
SELECT 
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
    count(*) AS total_connections,
    max(EXTRACT(EPOCH FROM (now() - state_change))) AS oldest_connection_seconds,
    avg(EXTRACT(EPOCH FROM (now() - state_change))) AS avg_connection_age_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- =====================================
-- Utility Functions
-- =====================================

-- Function to terminate idle connections
CREATE OR REPLACE FUNCTION terminate_idle_connections(idle_time_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    terminated_count INTEGER := 0;
BEGIN
    SELECT count(*)
    INTO terminated_count
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'idle'
      AND state_change < CURRENT_TIMESTAMP - (idle_time_minutes || ' minutes')::INTERVAL
      AND pid != pg_backend_pid();
    
    -- Terminate the connections
    PERFORM pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'idle'
      AND state_change < CURRENT_TIMESTAMP - (idle_time_minutes || ' minutes')::INTERVAL
      AND pid != pg_backend_pid();
    
    RETURN terminated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- Monitoring and Maintenance
-- =====================================

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check database size
    RETURN QUERY
    SELECT 'database_size'::TEXT,
           'OK'::TEXT,
           pg_size_pretty(pg_database_size(current_database()))::TEXT;
    
    -- Check connection count
    RETURN QUERY
    SELECT 'connection_count'::TEXT,
           CASE 
               WHEN count(*) > 180 THEN 'WARNING'
               ELSE 'OK'
           END::TEXT,
           count(*)::TEXT || ' connections'
    FROM pg_stat_activity
    WHERE datname = current_database();
    
    -- Check for long-running queries
    RETURN QUERY
    SELECT 'long_running_queries'::TEXT,
           CASE 
               WHEN count(*) > 0 THEN 'WARNING'
               ELSE 'OK'
           END::TEXT,
           count(*)::TEXT || ' queries running > 5 minutes'
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'active'
      AND query_start < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- Initial Data (if needed)
-- =====================================

-- Log initialization
INSERT INTO slow_query_log (query_text, duration_ms, total_time_ms, mean_time_ms, min_time_ms, max_time_ms)
VALUES ('Database initialized', 0, 0, 0, 0, 0);

-- =====================================
-- Final Configuration
-- =====================================

-- Analyze all tables to update statistics
ANALYZE;