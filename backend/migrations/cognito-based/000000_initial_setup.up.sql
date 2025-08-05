-- 初期設定: タイムゾーン、拡張機能、共通関数の設定

-- タイムゾーンを日本時間に設定
SET TIME ZONE 'Asia/Tokyo';

-- 必要な拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- タイムスタンプ更新用の共通関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 共通のENUM型定義
-- ロール定義
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'employee');
    END IF;
END $$;

-- エンジニアステータス
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engineer_status') THEN
        CREATE TYPE engineer_status AS ENUM ('active', 'standby', 'resigned', 'long_leave');
    END IF;
END $$;

-- 承認ステータス
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    END IF;
END $$;

-- 通知タイプ
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
    END IF;
END $$;