-- PostgreSQL Database User Setup Script for Monstera Project
-- このスクリプトは PostgreSQL データベースにユーザーと権限を設定します
-- 実行前に適切な管理者権限で PostgreSQL に接続してください

-- =====================================
-- 基本設定
-- =====================================

-- データベース接続（実行前に確認）
\c monstera;

-- =====================================
-- ユーザー作成
-- =====================================

-- 1. アプリケーションユーザー作成
DO $$
BEGIN
    -- ユーザーが存在しない場合のみ作成
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'monstera_app') THEN
        -- セキュアなパスワードでユーザー作成
        CREATE USER monstera_app WITH 
            PASSWORD 'app_password_change_in_production'
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            LOGIN 
            CONNECTION LIMIT 50;
        
        RAISE NOTICE 'Application user "monstera_app" created successfully.';
    ELSE
        RAISE NOTICE 'Application user "monstera_app" already exists.';
    END IF;
END
$$;

-- 2. 読み取り専用ユーザー作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'monstera_readonly') THEN
        CREATE USER monstera_readonly WITH 
            PASSWORD 'readonly_password_change_in_production'
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            LOGIN 
            CONNECTION LIMIT 10;
        
        RAISE NOTICE 'Read-only user "monstera_readonly" created successfully.';
    ELSE
        RAISE NOTICE 'Read-only user "monstera_readonly" already exists.';
    END IF;
END
$$;

-- 3. バックアップユーザー作成（本番環境用）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'monstera_backup') THEN
        CREATE USER monstera_backup WITH 
            PASSWORD 'backup_password_change_in_production'
            NOSUPERUSER 
            NOCREATEDB 
            NOCREATEROLE 
            NOINHERIT 
            LOGIN 
            CONNECTION LIMIT 5;
        
        RAISE NOTICE 'Backup user "monstera_backup" created successfully.';
    ELSE
        RAISE NOTICE 'Backup user "monstera_backup" already exists.';
    END IF;
END
$$;

-- =====================================
-- 基本権限設定
-- =====================================

-- アプリケーションユーザー権限
GRANT CONNECT ON DATABASE monstera TO monstera_app;
GRANT USAGE ON SCHEMA public TO monstera_app;
GRANT CREATE ON SCHEMA public TO monstera_app;

-- 読み取り専用ユーザー権限
GRANT CONNECT ON DATABASE monstera TO monstera_readonly;
GRANT USAGE ON SCHEMA public TO monstera_readonly;

-- バックアップユーザー権限
GRANT CONNECT ON DATABASE monstera TO monstera_backup;
GRANT USAGE ON SCHEMA public TO monstera_backup;

-- =====================================
-- テーブル・シーケンス権限設定
-- =====================================

-- 既存のテーブル・シーケンスに対する権限
-- アプリケーションユーザー: 全権限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO monstera_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO monstera_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO monstera_app;

-- 読み取り専用ユーザー: 読み取りのみ
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monstera_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO monstera_readonly;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO monstera_readonly;

-- バックアップユーザー: 読み取りのみ
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monstera_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO monstera_backup;

-- =====================================
-- 将来作成されるオブジェクトへの権限設定
-- =====================================

-- アプリケーションユーザー: 全権限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO monstera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO monstera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO monstera_app;

-- 読み取り専用ユーザー: 読み取りのみ
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monstera_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO monstera_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO monstera_readonly;

-- バックアップユーザー: 読み取りのみ
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monstera_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO monstera_backup;

-- =====================================
-- セキュリティ設定
-- =====================================

-- アプリケーションユーザーへの監視テーブルアクセス権限
GRANT SELECT ON slow_query_log TO monstera_app;
GRANT INSERT, UPDATE, DELETE ON slow_query_log TO monstera_app;
GRANT USAGE, SELECT ON SEQUENCE slow_query_log_id_seq TO monstera_app;

-- 読み取り専用ユーザーへの監視権限
GRANT SELECT ON slow_query_log TO monstera_readonly;

-- 監視ビューへのアクセス権限
GRANT SELECT ON connection_pool_stats TO monstera_app;
GRANT SELECT ON connection_pool_stats TO monstera_readonly;
GRANT SELECT ON connection_pool_stats TO monstera_backup;

-- ヘルスチェック関数の実行権限
GRANT EXECUTE ON FUNCTION health_check() TO monstera_app;
GRANT EXECUTE ON FUNCTION health_check() TO monstera_readonly;

-- =====================================
-- ロール作成（本番環境推奨）
-- =====================================

-- アプリケーションロール
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monstera_app_role') THEN
        CREATE ROLE monstera_app_role;
        GRANT monstera_app_role TO monstera_app;
        RAISE NOTICE 'Application role "monstera_app_role" created and granted.';
    END IF;
END
$$;

-- 読み取り専用ロール
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monstera_readonly_role') THEN
        CREATE ROLE monstera_readonly_role;
        GRANT monstera_readonly_role TO monstera_readonly;
        GRANT monstera_readonly_role TO monstera_backup;
        RAISE NOTICE 'Read-only role "monstera_readonly_role" created and granted.';
    END IF;
END
$$;

-- =====================================
-- パスワード有効期限設定（本番環境用）
-- =====================================

-- 90日後にパスワード期限切れ（本番環境でコメントアウト解除）
-- ALTER USER monstera_app VALID UNTIL '2024-12-31';
-- ALTER USER monstera_readonly VALID UNTIL '2024-12-31';
-- ALTER USER monstera_backup VALID UNTIL '2024-12-31';

-- =====================================
-- 統計情報更新
-- =====================================

-- 全テーブルの統計情報を更新
ANALYZE;

-- =====================================
-- 権限確認クエリ
-- =====================================

-- 作成されたユーザー一覧表示
SELECT 
    usename AS username,
    usesuper AS is_superuser,
    usecreatedb AS can_create_db,
    usecreaterole AS can_create_role,
    usebypassrls AS can_bypass_rls,
    valuntil AS password_expiry
FROM pg_user 
WHERE usename IN ('monstera_app', 'monstera_readonly', 'monstera_backup')
ORDER BY usename;

-- ユーザー権限一覧表示
SELECT 
    grantee,
    table_catalog,
    table_schema,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE grantee IN ('monstera_app', 'monstera_readonly', 'monstera_backup')
ORDER BY grantee, table_name, privilege_type;

-- データベース権限確認
SELECT 
    datname,
    datacl
FROM pg_database 
WHERE datname = 'monstera';

-- =====================================
-- セキュリティ監査用クエリ
-- =====================================

-- 現在の接続情報
SELECT 
    usename,
    datname,
    count(*) as connection_count,
    max(backend_start) as last_connection
FROM pg_stat_activity 
WHERE datname = 'monstera'
GROUP BY usename, datname
ORDER BY usename;

-- =====================================
-- 完了メッセージ
-- =====================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'PostgreSQL User Setup Completed Successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created Users:';
    RAISE NOTICE '  - monstera_app     : Application user with full CRUD access';
    RAISE NOTICE '  - monstera_readonly: Read-only user for reporting';
    RAISE NOTICE '  - monstera_backup  : Backup user with read access';
    RAISE NOTICE '';
    RAISE NOTICE 'Security Recommendations:';
    RAISE NOTICE '  1. Change default passwords in production';
    RAISE NOTICE '  2. Enable SSL/TLS connections';
    RAISE NOTICE '  3. Set password expiration dates';
    RAISE NOTICE '  4. Monitor connection usage regularly';
    RAISE NOTICE '  5. Review and audit permissions monthly';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update application configuration (.env)';
    RAISE NOTICE '  2. Test database connections';
    RAISE NOTICE '  3. Run application test suite';
    RAISE NOTICE '  4. Configure monitoring and alerts';
    RAISE NOTICE '';
END
$$;