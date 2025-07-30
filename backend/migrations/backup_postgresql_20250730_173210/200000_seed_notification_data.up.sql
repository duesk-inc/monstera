-- Notification関連のシードデータ
-- 固定UUIDの設定
SET @admin_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
SET @user1_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
SET @leave_request1_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01';
SET @draft_report_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';

SET @notification1_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01';
SET @notification2_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02';
SET @notification3_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03';
SET @notification4_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04';

SET @user_notification1_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f01';
SET @user_notification2_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f02';
SET @user_notification3_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f03';
SET @user_notification4_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f04';
SET @user_notification5_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f05';
SET @user_notification6_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380f06';

SET @notification_setting1_id = 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381001';
SET @notification_setting2_id = 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381002';
SET @notification_setting3_id = 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381003';
SET @notification_setting4_id = 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381004';
SET @notification_setting5_id = 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd381005';

-- Notifications
INSERT INTO notifications (id, title, message, notification_type, priority, created_at, expires_at, reference_id, reference_type, updated_at)
VALUES
  (@notification1_id, '有給申請が承認されました', '12/25の有給休暇申請が承認されました。', 'leave', 'medium', DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), @leave_request1_id, 'leave_request', DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
  (@notification2_id, '経費申請が承認待ちです', '交通費精算（¥3,200）の承認が保留中です。', 'expense', 'medium', DATE_SUB(CURDATE(), INTERVAL 9 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), NULL, NULL, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
  (@notification3_id, '週報の提出期限が近づいています', '今週の週報をまだ提出していません。期限は明日までです。', 'weekly', 'high', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), @draft_report_id, 'weekly_report', DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
  (@notification4_id, 'システムメンテナンスのお知らせ', '12/31 23:00〜1/1 3:00の間、システムメンテナンスを行います。この間はシステムをご利用いただけません。', 'system', 'low', DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), NULL, NULL, DATE_SUB(CURDATE(), INTERVAL 12 DAY));

-- UserNotifications
INSERT INTO user_notifications (id, user_id, notification_id, is_read, read_at, created_at, updated_at)
VALUES
  (@user_notification1_id, @admin_id, @notification1_id, FALSE, NULL, DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
  (@user_notification2_id, @admin_id, @notification2_id, TRUE, DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 9 DAY), DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
  (@user_notification3_id, @admin_id, @notification3_id, FALSE, NULL, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
  (@user_notification4_id, @admin_id, @notification4_id, TRUE, DATE_SUB(CURDATE(), INTERVAL 11 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
  (@user_notification5_id, @user1_id, @notification3_id, FALSE, NULL, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
  (@user_notification6_id, @user1_id, @notification4_id, TRUE, DATE_SUB(CURDATE(), INTERVAL 11 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_SUB(CURDATE(), INTERVAL 11 DAY));

-- NotificationSettings
INSERT INTO notification_settings (id, user_id, notification_type, is_enabled, email_enabled, created_at, updated_at)
VALUES
  (@notification_setting1_id, @admin_id, 'leave', TRUE, TRUE, CURDATE(), CURDATE()),
  (@notification_setting2_id, @admin_id, 'expense', TRUE, TRUE, CURDATE(), CURDATE()),
  (@notification_setting3_id, @admin_id, 'weekly', TRUE, FALSE, CURDATE(), CURDATE()),
  (@notification_setting4_id, @admin_id, 'project', TRUE, FALSE, CURDATE(), CURDATE()),
  (@notification_setting5_id, @admin_id, 'system', TRUE, TRUE, CURDATE(), CURDATE()); 