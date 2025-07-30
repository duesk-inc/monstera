-- admin@duesk.co.jpユーザーを追加
-- 既存のシードデータではdaichiro.uesaka@duesk.co.jpが管理者となっているが、
-- システムではadmin@duesk.co.jpを想定しているため追加

-- PostgreSQL版
-- 固定UUIDを使用
INSERT INTO users (id, email, password, first_name, last_name, first_name_kana, last_name_kana, phone_number, role, active, created_at, updated_at)
VALUES (
    '3bb73c7d-4086-4304-a918-3d871c98ddc9',
    'admin@duesk.co.jp',
    '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', -- パスワード: Admin123!@#
    '管理者',
    'システム',
    'カンリシャ',
    'システム',
    '090-0000-0000',
    2, -- adminロール
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;