-- Initial data deletion script
-- Note: This script attempts to delete data inserted by the corresponding .up.sql file.
-- Due to UUID() generating different values each time, and fixed UUIDs used in the up script,
-- this down script will use those fixed UUIDs for deletion where applicable.

-- Fixed UUIDs used in the up script
SET @admin_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
SET @user1_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
SET @user2_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
SET @profile1_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
SET @profile2_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
SET @draft_report_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
SET @submitted_report_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';

SET @paid_leave_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
SET @summer_leave_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02';
SET @condolence_leave_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03';
SET @special_leave_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04';
SET @substitute_leave_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05';
SET @menstrual_leave_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06';

SET @leave_request1_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01';
SET @leave_request2_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02';
SET @leave_request3_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03';
SET @leave_request4_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04';
SET @leave_request5_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05';
SET @leave_request6_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06';

SET @admin_substitute1_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
SET @admin_substitute2_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02';
SET @user1_substitute1_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03';
SET @user1_substitute2_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04';
SET @user2_substitute1_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05';

-- Deleting data in reverse order of insertion and considering dependencies

-- Attendances
DELETE FROM attendances WHERE user_id IN (@user1_id);

-- SubstituteLeaveGrants
DELETE FROM substitute_leave_grants WHERE id IN (
    @admin_substitute1_id, @admin_substitute2_id, 
    @user1_substitute1_id, @user1_substitute2_id, 
    @user2_substitute1_id
);

-- LeaveRequestDetails (dependent on LeaveRequests)
DELETE FROM leave_request_details WHERE leave_request_id IN (
    @leave_request1_id, @leave_request2_id, @leave_request3_id, 
    @leave_request4_id, @leave_request5_id, @leave_request6_id
);

-- LeaveRequests (dependent on Users, LeaveTypes)
DELETE FROM leave_requests WHERE id IN (
    @leave_request1_id, @leave_request2_id, @leave_request3_id, 
    @leave_request4_id, @leave_request5_id, @leave_request6_id
);

-- UserLeaveBalances (dependent on Users, LeaveTypes)
-- It's safer to delete all for these users and leave types rather than relying on UUID() in up.sql if they were used there.
DELETE FROM user_leave_balances WHERE user_id IN (@admin_id, @user1_id, @user2_id);

-- Holidays (no direct dependencies from other seeded data, can be deleted directly)
-- For simplicity, deleting all holidays. If specific ones were seeded, target them.
TRUNCATE TABLE holidays; -- Or DELETE FROM holidays WHERE id IN (... specific UUIDs if used ...);

-- LeaveTypes (UserLeaveBalances and LeaveRequests depend on this)
-- Since user_leave_balances and leave_requests are deleted, we can now delete leave_types.
DELETE FROM leave_types WHERE id IN (
    @paid_leave_id, @summer_leave_id, @condolence_leave_id, 
    @special_leave_id, @substitute_leave_id, @menstrual_leave_id
);

-- UserDefaultWorkSettings (dependent on Users)
DELETE FROM user_default_work_settings WHERE user_id IN (@admin_id, @user1_id, @user2_id);

-- DailyRecords (dependent on WeeklyReports)
DELETE FROM daily_records WHERE weekly_report_id IN (@draft_report_id, @submitted_report_id);

-- WeeklyReports (dependent on Users)
DELETE FROM weekly_reports WHERE id IN (@draft_report_id, @submitted_report_id);

-- WorkHistories, LanguageSkills, FrameworkSkills, BusinessExperiences (dependent on Profiles)
DELETE FROM work_histories WHERE profile_id = @profile1_id;
DELETE FROM language_skills WHERE profile_id = @profile1_id;
DELETE FROM framework_skills WHERE profile_id = @profile1_id;
DELETE FROM business_experiences WHERE profile_id = @profile1_id;

-- Profiles (dependent on Users)
DELETE FROM profiles WHERE id IN (@profile1_id, @profile2_id);

-- Users (base table)
DELETE FROM users WHERE id IN (@admin_id, @user1_id, @user2_id); 
-- 通知関連の固定UUIDを設定
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

-- NotificationSettings (依存関係なし)
DELETE FROM notification_settings WHERE id IN (
  @notification_setting1_id, @notification_setting2_id, @notification_setting3_id, 
  @notification_setting4_id, @notification_setting5_id
);

-- UserNotifications (notifications依存)
DELETE FROM user_notifications WHERE id IN (
  @user_notification1_id, @user_notification2_id, @user_notification3_id, 
  @user_notification4_id, @user_notification5_id, @user_notification6_id
);

-- Notifications (基本テーブル)
DELETE FROM notifications WHERE id IN (
  @notification1_id, @notification2_id, @notification3_id, @notification4_id
); 

-- 技術カテゴリマスタデータ削除
SET @category_programming_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01';
SET @category_servers_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02';
SET @category_tools_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03';

DELETE FROM technology_categories WHERE id IN (
  @category_programming_id, @category_servers_id, @category_tools_id
); 
