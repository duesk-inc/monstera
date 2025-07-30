-- Notification関連のシードデータ（PostgreSQL版）
-- 固定UUIDを使用して冪等性を保証

DO $$
DECLARE
    admin_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    user1_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    leave_request1_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01';
    draft_report_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';

    notification1_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01';
    notification2_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02';
    notification3_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03';
    notification4_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04';

    user_notification1_id VARCHAR(36) := 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f01';
    user_notification2_id VARCHAR(36) := 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f02';
    user_notification3_id VARCHAR(36) := 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f03';
    user_notification4_id VARCHAR(36) := 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f04';
    user_notification5_id VARCHAR(36) := 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f05';
    user_notification6_id VARCHAR(36) := 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f06';

    notification_setting1_id VARCHAR(36) := 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381001';
    notification_setting2_id VARCHAR(36) := 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381002';
    notification_setting3_id VARCHAR(36) := 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381003';
    notification_setting4_id VARCHAR(36) := 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381004';
    notification_setting5_id VARCHAR(36) := 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381005';
BEGIN
    -- Notifications
    INSERT INTO notifications (id, title, message, notification_type, priority, created_at, expires_at, reference_id, reference_type, updated_at)
    VALUES
      (notification1_id, '有給申請が承認されました', '12/25の有給休暇申請が承認されました。', 'leave', 'medium', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days', leave_request1_id, 'leave_request', CURRENT_DATE - INTERVAL '7 days'),
      (notification2_id, '経費申請が承認待ちです', '交通費精算（¥3,200）の承認が保留中です。', 'expense', 'medium', CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE + INTERVAL '30 days', NULL, NULL, CURRENT_DATE - INTERVAL '9 days'),
      (notification3_id, '週報の提出期限が近づいています', '今週の週報をまだ提出していません。期限は明日までです。', 'weekly', 'high', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '30 days', draft_report_id, 'weekly_report', CURRENT_DATE - INTERVAL '10 days'),
      (notification4_id, 'システムメンテナンスのお知らせ', '12/31 23:00〜1/1 3:00の間、システムメンテナンスを行います。この間はシステムをご利用いただけません。', 'system', 'low', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '30 days', NULL, NULL, CURRENT_DATE - INTERVAL '12 days')
    ON CONFLICT (id) DO NOTHING;

    -- UserNotifications
    INSERT INTO user_notifications (id, user_id, notification_id, is_read, read_at, created_at, updated_at)
    VALUES
      (user_notification1_id, admin_id, notification1_id, FALSE, NULL, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '7 days'),
      (user_notification2_id, admin_id, notification2_id, TRUE, CURRENT_DATE - INTERVAL '8 days', CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE - INTERVAL '8 days'),
      (user_notification3_id, admin_id, notification3_id, FALSE, NULL, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days'),
      (user_notification4_id, admin_id, notification4_id, TRUE, CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '11 days'),
      (user_notification5_id, user1_id, notification3_id, FALSE, NULL, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days'),
      (user_notification6_id, user1_id, notification4_id, TRUE, CURRENT_DATE - INTERVAL '11 days', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '11 days')
    ON CONFLICT (id) DO NOTHING;

    -- NotificationSettings
    INSERT INTO notification_settings (id, user_id, notification_type, is_enabled, email_enabled, created_at, updated_at)
    VALUES
      (notification_setting1_id, admin_id, 'leave', TRUE, TRUE, CURRENT_DATE, CURRENT_DATE),
      (notification_setting2_id, admin_id, 'expense', TRUE, TRUE, CURRENT_DATE, CURRENT_DATE),
      (notification_setting3_id, admin_id, 'weekly', TRUE, FALSE, CURRENT_DATE, CURRENT_DATE),
      (notification_setting4_id, admin_id, 'project', TRUE, FALSE, CURRENT_DATE, CURRENT_DATE),
      (notification_setting5_id, admin_id, 'system', TRUE, TRUE, CURRENT_DATE, CURRENT_DATE)
    ON CONFLICT (id) DO NOTHING;
END $$;