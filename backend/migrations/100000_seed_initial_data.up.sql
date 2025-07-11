SET SESSION collation_connection = 'utf8mb4_0900_ai_ci';
SET NAMES 'utf8mb4' COLLATE 'utf8mb4_0900_ai_ci';

-- このマイグレーションファイルは、02_seed_data.sqlの内容を基にしています。
-- 注意: MySQLのセッション変数やinit_logへの挿入、IF文による確認などは除外しています。
-- また、UUID()は実行ごとに異なる値を生成するため、冪等性を完全に保証するには工夫が必要です。
-- ここでは、基本的なデータ投入の例として記述します。

-- 固定のUUIDを使用するための準備 (実際の運用では事前に生成したUUIDを使うことを推奨)
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


-- Users
INSERT INTO users (id, email, password, first_name, last_name, first_name_kana, last_name_kana, phone_number, role, active)
VALUES 
  (@admin_id, 'daichiro.uesaka@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', '大地郎', '上坂', 'ダイチロウ', 'ウエサカ', '080-4555-5678', 2, true),
  (@user1_id, 'test@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'テスト', 'ユーザー', 'テスト', 'ユーザー', '090-1234-5678', 4, true),
  (@user2_id, 'test2@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'テスト', 'ユーザー2', 'テスト', 'ユーザー', '080-8765-4321', 4, true);

-- Profiles
INSERT INTO profiles (id, user_id, education, nearest_station, can_travel, is_temp_saved, temp_saved_at, current_version)
VALUES 
  (@profile1_id, @user1_id, '東京大学工学部', '東京駅', 1, false, NULL, 1),
  (@profile2_id, @user2_id, '京都大学理学部', '京都駅', 3, true, NOW(), 1);

-- WorkHistories
INSERT INTO work_histories (id, profile_id, user_id, project_name, start_date, end_date, industry, project_overview, responsibilities, achievements, notes, role, team_size, processes, technologies)
VALUES 
  (UUID(), @profile1_id, @user1_id, '大手銀行口座管理システム開発', '2021-04-01', '2022-03-31', 2, 
  '既存の口座管理システムをモダン化するプロジェクト。バックエンドAPIの開発とフロントエンド実装を担当。',
  'フロントエンドの開発、UIコンポーネントの設計・実装、バックエンドAPIとの連携実装、レスポンシブデザインの実装',
  'パフォーマンスを30%向上、ユーザビリティの改善により顧客満足度が向上',
  '大規模システムでの開発経験を積むことができた。チームワークの重要性を学んだ。',
  'フロントエンドエンジニア', 8, '要件定義,設計,開発,テスト', 'React,TypeScript,Node.js,MySQL');

-- WeeklyReports
INSERT INTO weekly_reports (id, user_id, start_date, end_date, status, mood, weekly_remarks, workplace_name, workplace_hours, workplace_change_requested, total_work_hours, client_total_work_hours, client_work_hours, created_at)
VALUES 
  (@draft_report_id, @user1_id, '2023-11-06', '2023-11-12', 'draft', 4, '今週はフロントエンド開発に集中しました。React コンポーネントの最適化を行い、パフォーマンスが向上しました。','東京駅', '9:00 〜 18:00 (休憩: 12:00 〜 13:00)', FALSE, 40.0, 24.0, 24.0, NOW());
INSERT INTO weekly_reports (id, user_id, start_date, end_date, status, mood, weekly_remarks, workplace_name, workplace_hours, workplace_change_requested, total_work_hours, client_total_work_hours, client_work_hours, submitted_at, created_at)
VALUES 
  (@submitted_report_id, @user1_id, '2023-10-30', '2023-11-05', 'submitted', 5, '先週はバックエンドAPIの設計と実装を完了しました。チームの協力もあり予定通り進めることができました。','東京駅', '9:00 〜 18:00 (休憩: 12:00 〜 13:00)', FALSE, 42.5, 21.0, 21.0, '2023-11-05 18:30:00', '2023-10-30 09:00:00');

-- DailyRecords
INSERT INTO daily_records (id, weekly_report_id, date, start_time, end_time, break_time, work_hours, client_start_time, client_end_time, client_break_time, client_work_hours, has_client_work, remarks, is_holiday_work)
VALUES 
  (UUID(), @draft_report_id, '2023-11-06', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'フロントエンド開発：コンポーネント設計', FALSE),
  (UUID(), @draft_report_id, '2023-11-07', '09:00:00', '19:00:00', 1.0, 9.0, '09:30:00', '19:30:00', 1.0, 9.0, TRUE, 'React Hooksの実装と最適化', FALSE),
  (UUID(), @draft_report_id, '2023-11-08', '09:00:00', '18:00:00', 1.0, 8.0, '09:00:00', '17:30:00', 0.5, 8.0, TRUE, 'API連携の実装', FALSE),
  (UUID(), @draft_report_id, '2023-11-09', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'バグ修正とテスト', FALSE),
  (UUID(), @draft_report_id, '2023-11-10', '09:00:00', '17:00:00', 1.0, 7.0, '09:30:00', '17:30:00', 1.0, 7.0, TRUE, 'プロジェクトミーティングと進捗報告', FALSE),
  (UUID(), @draft_report_id, '2023-11-11', NULL, NULL, NULL, 0.0, NULL, NULL, NULL, NULL, FALSE, '', FALSE),
  (UUID(), @draft_report_id, '2023-11-12', NULL, NULL, NULL, 0.0, NULL, NULL, NULL, NULL, FALSE, '', FALSE);
INSERT INTO daily_records (id, weekly_report_id, date, start_time, end_time, break_time, work_hours, client_start_time, client_end_time, client_break_time, client_work_hours, has_client_work, remarks, is_holiday_work)
VALUES
  (UUID(), @submitted_report_id, '2023-10-30', '09:00:00', '18:00:00', 1.0, 8.0, '09:00:00', '18:00:00', 1.0, 8.0, TRUE, 'バックエンドAPI設計', FALSE),
  (UUID(), @submitted_report_id, '2023-10-31', '09:00:00', '19:00:00', 1.0, 9.0, '09:30:00', '19:30:00', 1.0, 9.0, TRUE, 'データベース設計と実装', FALSE),
  (UUID(), @submitted_report_id, '2023-11-01', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'バックエンドAPI実装', FALSE),
  (UUID(), @submitted_report_id, '2023-11-02', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'API連携テスト', FALSE),
  (UUID(), @submitted_report_id, '2023-11-03', '10:00:00', '15:00:00', 1.0, 4.0, '10:00:00', '15:00:00', 1.0, 4.0, TRUE, '祝日作業：バグ修正', TRUE),
  (UUID(), @submitted_report_id, '2023-11-04', '10:00:00', '14:30:00', 1.0, 3.5, NULL, NULL, NULL, NULL, FALSE, '土曜出勤：ドキュメント作成', TRUE),
  (UUID(), @submitted_report_id, '2023-11-05', '13:00:00', '16:00:00', 0.0, 3.0, NULL, NULL, NULL, NULL, FALSE, '日曜出勤：次週準備', TRUE);

-- UserDefaultWorkSettings
INSERT INTO user_default_work_settings (id, user_id, weekday_start_time, weekday_end_time, weekday_break_time)
VALUES 
  (UUID(), @admin_id, '09:00', '18:00', 1.00),
  (UUID(), @user1_id, '10:00', '19:00', 1.00),
  (UUID(), @user2_id, '09:30', '18:30', 1.00);

-- LeaveTypes
INSERT INTO leave_types (id, code, name, description, default_days, is_hourly_available, reason_required, gender_specific, display_order, is_active)
VALUES
  (@paid_leave_id, 'paid', '有給休暇', '年次有給休暇です。', 20.0, TRUE, FALSE, NULL, 1, TRUE),
  (@summer_leave_id, 'summer', '夏季休暇', '夏季特別休暇です。', 5.0, TRUE, FALSE, NULL, 2, TRUE),
  (@condolence_leave_id, 'condolence', '慶弔休暇', '冠婚葬祭等のための休暇です。理由の入力が必要です。', 5.0, FALSE, TRUE, NULL, 3, TRUE),
  (@special_leave_id, 'special', '特別休暇', 'その他特別事由による休暇です。理由の入力が必要です。', 5.0, TRUE, TRUE, NULL, 4, TRUE),
  (@substitute_leave_id, 'substitute', '振替特別休暇', 'GW休暇や年末年始休暇に出勤した場合の代替として取得できる特別休暇です。本来休日である日の振替として使用します。', 0.0, TRUE, FALSE, NULL, 5, TRUE),
  (@menstrual_leave_id, 'menstrual', '生理休暇', '女性社員向けの生理休暇です。', 12.0, TRUE, FALSE, 'female', 6, TRUE);

-- UserLeaveBalances
SET @current_year = YEAR(CURDATE());
INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date)
VALUES 
  (UUID(), @admin_id, @paid_leave_id, @current_year, 20.0, 5.0, 15.0, DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 1 YEAR)),
  (UUID(), @admin_id, @summer_leave_id, @current_year, 5.0, 2.0, 3.0, CONCAT(@current_year, '-09-30')),
  (UUID(), @admin_id, @condolence_leave_id, @current_year, 5.0, 0.0, 5.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @admin_id, @special_leave_id, @current_year, 5.0, 1.0, 4.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @admin_id, @substitute_leave_id, @current_year, 0.0, 0.0, 0.0, CONCAT(@current_year + 1, '-03-31'));
INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date)
VALUES 
  (UUID(), @user1_id, @paid_leave_id, @current_year, 20.0, 7.5, 12.5, DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 1 YEAR)),
  (UUID(), @user1_id, @summer_leave_id, @current_year, 5.0, 0.0, 5.0, CONCAT(@current_year, '-09-30')),
  (UUID(), @user1_id, @condolence_leave_id, @current_year, 5.0, 2.0, 3.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @user1_id, @special_leave_id, @current_year, 5.0, 0.0, 5.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @user1_id, @substitute_leave_id, @current_year, 0.0, 0.0, 0.0, CONCAT(@current_year + 1, '-03-31'));
UPDATE users SET gender = 'female' WHERE id = @user2_id;
INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date)
VALUES 
  (UUID(), @user2_id, @paid_leave_id, @current_year, 20.0, 10.0, 10.0, DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 1 YEAR)),
  (UUID(), @user2_id, @summer_leave_id, @current_year, 5.0, 0.0, 5.0, CONCAT(@current_year, '-09-30')),
  (UUID(), @user2_id, @condolence_leave_id, @current_year, 5.0, 0.0, 5.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @user2_id, @special_leave_id, @current_year, 5.0, 0.0, 5.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @user2_id, @substitute_leave_id, @current_year, 0.0, 0.0, 0.0, CONCAT(@current_year + 1, '-03-31')),
  (UUID(), @user2_id, @menstrual_leave_id, @current_year, 12.0, 1.0, 11.0, CONCAT(@current_year + 1, '-03-31'));

-- Holidays
INSERT INTO holidays (id, holiday_date, holiday_name, holiday_type)
VALUES
  (UUID(), '2023-01-01', '元日', 'national'), (UUID(), '2023-01-02', '元日の振替休日', 'national'), (UUID(), '2023-01-09', '成人の日', 'national'),
  (UUID(), '2023-02-11', '建国記念の日', 'national'), (UUID(), '2023-02-23', '天皇誕生日', 'national'), (UUID(), '2023-03-21', '春分の日', 'national'),
  (UUID(), '2023-04-29', '昭和の日', 'national'), (UUID(), '2023-05-03', '憲法記念日', 'national'), (UUID(), '2023-05-04', 'みどりの日', 'national'),
  (UUID(), '2023-05-05', 'こどもの日', 'national'), (UUID(), '2023-07-17', '海の日', 'national'), (UUID(), '2023-08-11', '山の日', 'national'),
  (UUID(), '2023-09-18', '敬老の日', 'national'), (UUID(), '2023-09-23', '秋分の日', 'national'), (UUID(), '2023-10-09', 'スポーツの日', 'national'),
  (UUID(), '2023-11-03', '文化の日', 'national'), (UUID(), '2023-11-23', '勤労感謝の日', 'national'),
  (UUID(), '2023-12-29', '年末休暇', 'company'), (UUID(), '2023-12-30', '年末休暇', 'company'), (UUID(), '2023-12-31', '年末休暇', 'company'),
  (UUID(), '2024-01-01', '年始休暇', 'company'), (UUID(), '2024-01-02', '年始休暇', 'company'), (UUID(), '2024-01-03', '年始休暇', 'company');

-- LeaveRequests and LeaveRequestDetails
SET @leave_request1_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01';
INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at)
VALUES (@leave_request1_id, @user1_id, @paid_leave_id, DATE_SUB(CURDATE(), INTERVAL 30 DAY), FALSE, NULL, 1.0, 'approved', @admin_id, DATE_SUB(CURDATE(), INTERVAL 28 DAY));
INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value)
VALUES (UUID(), @leave_request1_id, DATE_SUB(CURDATE(), INTERVAL 20 DAY), NULL, NULL, 1.0);

SET @leave_request2_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02';
INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at)
VALUES (@leave_request2_id, @user1_id, @paid_leave_id, DATE_SUB(CURDATE(), INTERVAL 15 DAY), TRUE, NULL, 0.5, 'approved', @admin_id, DATE_SUB(CURDATE(), INTERVAL 14 DAY));
INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value)
VALUES (UUID(), @leave_request2_id, DATE_SUB(CURDATE(), INTERVAL 10 DAY), '13:00', '17:30', 0.5);

SET @leave_request3_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03';
INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status)
VALUES (@leave_request3_id, @user1_id, @paid_leave_id, CURDATE(), FALSE, NULL, 2.0, 'pending');
INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value)
VALUES (UUID(), @leave_request3_id, DATE_ADD(CURDATE(), INTERVAL 7 DAY), NULL, NULL, 1.0),
       (UUID(), @leave_request3_id, DATE_ADD(CURDATE(), INTERVAL 8 DAY), NULL, NULL, 1.0);

SET @leave_request4_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04';
INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at)
VALUES (@leave_request4_id, @user2_id, @condolence_leave_id, DATE_SUB(CURDATE(), INTERVAL 45 DAY), FALSE, '親族の葬儀のため', 2.0, 'approved', @admin_id, DATE_SUB(CURDATE(), INTERVAL 44 DAY));
INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value)
VALUES (UUID(), @leave_request4_id, DATE_SUB(CURDATE(), INTERVAL 40 DAY), NULL, NULL, 1.0),
       (UUID(), @leave_request4_id, DATE_SUB(CURDATE(), INTERVAL 39 DAY), NULL, NULL, 1.0);

SET @leave_request5_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05';
INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at)
VALUES (@leave_request5_id, @user2_id, @menstrual_leave_id, DATE_SUB(CURDATE(), INTERVAL 20 DAY), FALSE, NULL, 1.0, 'approved', @admin_id, DATE_SUB(CURDATE(), INTERVAL 19 DAY));
INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value)
VALUES (UUID(), @leave_request5_id, DATE_SUB(CURDATE(), INTERVAL 15 DAY), NULL, NULL, 1.0);

SET @leave_request6_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06';
INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at, rejection_reason)
VALUES (@leave_request6_id, @admin_id, @paid_leave_id, DATE_SUB(CURDATE(), INTERVAL 10 DAY), TRUE, NULL, 0.5, 'rejected', @user1_id, DATE_SUB(CURDATE(), INTERVAL 8 DAY), '業務都合により承認できません。別の日での申請をお願いします。');
INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value)
VALUES (UUID(), @leave_request6_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '10:00', '14:00', 0.5);

-- SubstituteLeaveGrants
SET @admin_substitute1_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired) 
VALUES (@admin_substitute1_id, @admin_id, DATE_SUB(CURDATE(), INTERVAL 60 DAY), 1.0, 0.0, 1.0, DATE_SUB(CURDATE(), INTERVAL 65 DAY), 'GW期間（5/3）出勤', DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 0 DAY), FALSE);

SET @admin_substitute2_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02';
INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired)
VALUES (@admin_substitute2_id, @admin_id, DATE_SUB(CURDATE(), INTERVAL 30 DAY), 1.0, 0.0, 1.0, DATE_SUB(CURDATE(), INTERVAL 35 DAY), '年末年始期間（12/30）出勤', DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 0 DAY), FALSE);

SET @user1_substitute1_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03';
INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired)
VALUES (@user1_substitute1_id, @user1_id, DATE_SUB(CURDATE(), INTERVAL 60 DAY), 2.0, 0.0, 2.0, DATE_SUB(CURDATE(), INTERVAL 65 DAY), 'GW期間（5/4-5/5）出勤', DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 0 DAY), FALSE);

SET @user1_substitute2_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04';
INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired)
VALUES (@user1_substitute2_id, @user1_id, DATE_SUB(CURDATE(), INTERVAL 15 DAY), 1.0, 1.0, 0.0, DATE_SUB(CURDATE(), INTERVAL 20 DAY), '祝日（体育の日）出勤', DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 0 DAY), FALSE);

SET @user2_substitute1_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05';
INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired)
VALUES (@user2_substitute1_id, @user2_id, DATE_SUB(CURDATE(), INTERVAL 30 DAY), 1.0, 0.0, 1.0, DATE_SUB(CURDATE(), INTERVAL 35 DAY), '年末年始期間（1/2）出勤', DATE_ADD(CONCAT(@current_year + 1, '-03-31'), INTERVAL 0 DAY), FALSE);

-- Update user_leave_balances for substitute leaves (example, adjust as needed)
UPDATE user_leave_balances SET total_days = 2.0, remaining_days = 2.0 WHERE user_id = @admin_id AND leave_type_id = @substitute_leave_id;
UPDATE user_leave_balances SET total_days = 2.0, used_days = 1.0, remaining_days = 1.0 WHERE user_id = @user1_id AND leave_type_id = @substitute_leave_id; -- Note: user1 used one substitute day as per substitute_leave_grants
UPDATE user_leave_balances SET total_days = 1.0, remaining_days = 1.0 WHERE user_id = @user2_id AND leave_type_id = @substitute_leave_id;

-- Attendances (example data, adjust as needed)
INSERT INTO attendances (id, user_id, date, status, start_time, end_time, break_time, memo)
VALUES
  (UUID(), @user1_id, '2023-11-06 00:00:00', 'present', '2023-11-06 09:00:00', '2023-11-06 18:00:00', 60, '通常勤務'),
  (UUID(), @user1_id, '2023-11-07 00:00:00', 'paid_leave', NULL, NULL, 0, '有給休暇取得'); 
-- 技術カテゴリマスタデータ挿入
SET @category_programming_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01';
SET @category_servers_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02';
SET @category_tools_id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03';

INSERT INTO technology_categories (id, name, display_name, sort_order) VALUES
  (@category_programming_id, 'programming_languages', '使用言語／ライブラリ', 1),
  (@category_servers_id, 'servers_databases', 'サーバーOS／DBサーバー', 2),
  (@category_tools_id, 'tools', 'ツール等', 3);

-- よく使う資格のマスタデータ挿入
SET @cert_basic_info_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
SET @cert_applied_info_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02';
SET @cert_aws_saa_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03';
SET @cert_aws_dev_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04';
SET @cert_java_se11_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05';
SET @cert_lpic1_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06';
SET @cert_toeic_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07';
SET @cert_oracle_db_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08';
SET @cert_azure_fund_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d09';
SET @cert_gcp_ace_id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d10';

INSERT INTO certifications (id, name, issuer, description, is_common, display_order, category) VALUES
  (@cert_basic_info_id, '基本情報技術者', 'IPA（情報処理推進機構）', 'ITエンジニアの登竜門となる国家資格', true, 1, '国家資格'),
  (@cert_applied_info_id, '応用情報技術者', 'IPA（情報処理推進機構）', 'ITエンジニアとしての応用的な知識・技能を認定する国家資格', true, 2, '国家資格'),
  (@cert_aws_saa_id, 'AWS認定ソリューションアーキテクト - アソシエイト', 'Amazon Web Services', 'AWSクラウドアーキテクチャの設計スキルを認定', true, 10, 'ベンダー資格'),
  (@cert_aws_dev_id, 'AWS認定デベロッパー - アソシエイト', 'Amazon Web Services', 'AWSプラットフォームでの開発スキルを認定', true, 11, 'ベンダー資格'),
  (@cert_java_se11_id, 'Java SE 11 Programmer', 'Oracle', 'Java言語の基本的なプログラミングスキルを認定', true, 20, 'ベンダー資格'),
  (@cert_lpic1_id, 'LPIC-1', 'Linux Professional Institute', 'Linuxシステムの基本的な管理スキルを認定', true, 30, 'ベンダー資格'),
  (@cert_toeic_id, 'TOEIC', 'ETS', '英語コミュニケーション能力を測定するテスト', true, 40, 'その他'),
  (@cert_oracle_db_id, 'Oracle Master Bronze', 'Oracle', 'Oracleデータベースの基本的な管理スキルを認定', true, 25, 'ベンダー資格'),
  (@cert_azure_fund_id, 'Microsoft Azure Fundamentals', 'Microsoft', 'Azureクラウドサービスの基礎知識を認定', true, 12, 'ベンダー資格'),
  (@cert_gcp_ace_id, 'Google Cloud Associate Cloud Engineer', 'Google', 'GCPの基本的な運用スキルを認定', true, 13, 'ベンダー資格'); 