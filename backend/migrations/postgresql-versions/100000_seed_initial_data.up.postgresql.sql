-- PostgreSQL用初期データ投入
-- 固定のUUIDを使用して冪等性を保証

DO $$
DECLARE
    -- ユーザーID
    admin_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    user1_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    user2_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
    
    -- プロフィールID
    profile1_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
    profile2_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
    
    -- 週報ID
    draft_report_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
    submitted_report_id VARCHAR(36) := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';
    
    -- 休暇種別ID
    paid_leave_id VARCHAR(36) := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
    summer_leave_id VARCHAR(36) := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02';
    condolence_leave_id VARCHAR(36) := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03';
    special_leave_id VARCHAR(36) := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04';
    substitute_leave_id VARCHAR(36) := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05';
    menstrual_leave_id VARCHAR(36) := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06';
    
    -- 休暇申請ID
    leave_request1_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01';
    leave_request2_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02';
    leave_request3_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03';
    leave_request4_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04';
    leave_request5_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05';
    leave_request6_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06';
    
    -- 振替休暇付与ID
    admin_substitute1_id VARCHAR(36) := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
    admin_substitute2_id VARCHAR(36) := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02';
    user1_substitute1_id VARCHAR(36) := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03';
    user1_substitute2_id VARCHAR(36) := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04';
    user2_substitute1_id VARCHAR(36) := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05';
    
    -- 技術カテゴリID
    category_programming_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01';
    category_servers_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02';
    category_tools_id VARCHAR(36) := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03';
    
    -- 資格ID
    cert_basic_info_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01';
    cert_applied_info_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02';
    cert_aws_saa_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03';
    cert_aws_dev_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04';
    cert_java_se11_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05';
    cert_lpic1_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d06';
    cert_toeic_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d07';
    cert_oracle_db_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d08';
    cert_azure_fund_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d09';
    cert_gcp_ace_id VARCHAR(36) := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d10';
    
    -- 現在年
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    -- Users
    INSERT INTO users (id, email, password, first_name, last_name, first_name_kana, last_name_kana, phone_number, role, active) VALUES 
    (admin_id::text, 'daichiro.uesaka@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', '大地郎', '上坂', 'ダイチロウ', 'ウエサカ', '080-4555-5678', 2, true),
    (user1_id::text, 'test@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'テスト', 'ユーザー', 'テスト', 'ユーザー', '090-1234-5678', 4, true),
    (user2_id::text, 'test2@duesk.co.jp', '$2a$10$adIxMrFe4jXQD7cFGfx4P.5vnd4iXuHBfrbNEQY0JrLE/2vHtHoUy', 'テスト', 'ユーザー2', 'テスト', 'ユーザー', '080-8765-4321', 4, true)
    ON CONFLICT (id) DO NOTHING;

    -- Profiles
    INSERT INTO profiles (id, user_id, education, nearest_station, can_travel, is_temp_saved, temp_saved_at, current_version) VALUES 
    (profile1_id, user1_id, '東京大学工学部', '東京駅', 1, false, NULL, 1),
    (profile2_id, user2_id, '京都大学理学部', '京都駅', 3, true, CURRENT_TIMESTAMP, 1)
    ON CONFLICT (id) DO NOTHING;

    -- WorkHistories
    INSERT INTO work_histories (id, profile_id, user_id, project_name, start_date, end_date, industry, project_overview, responsibilities, achievements, notes, role, team_size, processes, technologies) VALUES 
    (gen_random_uuid()::text, profile1_id, user1_id, '大手銀行口座管理システム開発', '2021-04-01', '2022-03-31', 2, '既存の口座管理システムをモダン化するプロジェクト。バックエンドAPIの開発とフロントエンド実装を担当。', 'フロントエンドの開発、UIコンポーネントの設計・実装、バックエンドAPIとの連携実装、レスポンシブデザインの実装', 'パフォーマンスを30%向上、ユーザビリティの改善により顧客満足度が向上', '大規模システムでの開発経験を積むことができた。チームワークの重要性を学んだ。', 'フロントエンドエンジニア', 8, '要件定義,設計,開発,テスト', 'React,TypeScript,Node.js,MySQL')
    ON CONFLICT DO NOTHING;

    -- WeeklyReports
    INSERT INTO weekly_reports (id, user_id, start_date, end_date, status, mood, weekly_remarks, workplace_name, workplace_hours, workplace_change_requested, total_work_hours, client_total_work_hours, client_work_hours, created_at) VALUES 
    (draft_report_id, user1_id, '2023-11-06', '2023-11-12', 'draft', 4, '今週はフロントエンド開発に集中しました。React コンポーネントの最適化を行い、パフォーマンスが向上しました。','東京駅', '9:00 〜 18:00 (休憩: 12:00 〜 13:00)', FALSE, 40.0, 24.0, 24.0, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO weekly_reports (id, user_id, start_date, end_date, status, mood, weekly_remarks, workplace_name, workplace_hours, workplace_change_requested, total_work_hours, client_total_work_hours, client_work_hours, submitted_at, created_at) VALUES 
    (submitted_report_id, user1_id, '2023-10-30', '2023-11-05', 'submitted', 5, '先週はバックエンドAPIの設計と実装を完了しました。チームの協力もあり予定通り進めることができました。','東京駅', '9:00 〜 18:00 (休憩: 12:00 〜 13:00)', FALSE, 42.5, 21.0, 21.0, '2023-11-05 18:30:00', '2023-10-30 09:00:00')
    ON CONFLICT (id) DO NOTHING;

    -- DailyRecords
    INSERT INTO daily_records (id, weekly_report_id, date, start_time, end_time, break_time, work_hours, client_start_time, client_end_time, client_break_time, client_work_hours, has_client_work, remarks, is_holiday_work) VALUES 
    (gen_random_uuid()::text, draft_report_id, '2023-11-06', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'フロントエンド開発：コンポーネント設計', FALSE),
    (gen_random_uuid()::text, draft_report_id, '2023-11-07', '09:00:00', '19:00:00', 1.0, 9.0, '09:30:00', '19:30:00', 1.0, 9.0, TRUE, 'React Hooksの実装と最適化', FALSE),
    (gen_random_uuid()::text, draft_report_id, '2023-11-08', '09:00:00', '18:00:00', 1.0, 8.0, '09:00:00', '17:30:00', 0.5, 8.0, TRUE, 'API連携の実装', FALSE),
    (gen_random_uuid()::text, draft_report_id, '2023-11-09', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'バグ修正とテスト', FALSE),
    (gen_random_uuid()::text, draft_report_id, '2023-11-10', '09:00:00', '17:00:00', 1.0, 7.0, '09:30:00', '17:30:00', 1.0, 7.0, TRUE, 'プロジェクトミーティングと進捗報告', FALSE),
    (gen_random_uuid()::text, draft_report_id, '2023-11-11', NULL, NULL, NULL, 0.0, NULL, NULL, NULL, NULL, FALSE, '', FALSE),
    (gen_random_uuid()::text, draft_report_id, '2023-11-12', NULL, NULL, NULL, 0.0, NULL, NULL, NULL, NULL, FALSE, '', FALSE)
    ON CONFLICT DO NOTHING;

    INSERT INTO daily_records (id, weekly_report_id, date, start_time, end_time, break_time, work_hours, client_start_time, client_end_time, client_break_time, client_work_hours, has_client_work, remarks, is_holiday_work) VALUES 
    (gen_random_uuid()::text, submitted_report_id, '2023-10-30', '09:00:00', '18:00:00', 1.0, 8.0, '09:00:00', '18:00:00', 1.0, 8.0, TRUE, 'バックエンドAPI設計', FALSE),
    (gen_random_uuid()::text, submitted_report_id, '2023-10-31', '09:00:00', '19:00:00', 1.0, 9.0, '09:30:00', '19:30:00', 1.0, 9.0, TRUE, 'データベース設計と実装', FALSE),
    (gen_random_uuid()::text, submitted_report_id, '2023-11-01', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'バックエンドAPI実装', FALSE),
    (gen_random_uuid()::text, submitted_report_id, '2023-11-02', '09:00:00', '18:00:00', 1.0, 8.0, NULL, NULL, NULL, NULL, FALSE, 'API連携テスト', FALSE),
    (gen_random_uuid()::text, submitted_report_id, '2023-11-03', '10:00:00', '15:00:00', 1.0, 4.0, '10:00:00', '15:00:00', 1.0, 4.0, TRUE, '祝日作業：バグ修正', TRUE),
    (gen_random_uuid()::text, submitted_report_id, '2023-11-04', '10:00:00', '14:30:00', 1.0, 3.5, NULL, NULL, NULL, NULL, FALSE, '土曜出勤：ドキュメント作成', TRUE),
    (gen_random_uuid()::text, submitted_report_id, '2023-11-05', '13:00:00', '16:00:00', 0.0, 3.0, NULL, NULL, NULL, NULL, FALSE, '日曜出勤：次週準備', TRUE)
    ON CONFLICT DO NOTHING;

    -- UserDefaultWorkSettings
    INSERT INTO user_default_work_settings (id, user_id, weekday_start_time, weekday_end_time, weekday_break_time) VALUES 
    (gen_random_uuid()::text, admin_id, '09:00', '18:00', 1.00),
    (gen_random_uuid()::text, user1_id, '10:00', '19:00', 1.00),
    (gen_random_uuid()::text, user2_id, '09:30', '18:30', 1.00)
    ON CONFLICT DO NOTHING;

    -- LeaveTypes
    INSERT INTO leave_types (id, code, name, description, default_days, is_hourly_available, reason_required, gender_specific, display_order, is_active) VALUES 
    (paid_leave_id, 'paid', '有給休暇', '年次有給休暇です。', 20.0, TRUE, FALSE, NULL, 1, TRUE),
    (summer_leave_id, 'summer', '夏季休暇', '夏季特別休暇です。', 5.0, TRUE, FALSE, NULL, 2, TRUE),
    (condolence_leave_id, 'condolence', '慶弔休暇', '冠婚葬祭等のための休暇です。理由の入力が必要です。', 5.0, FALSE, TRUE, NULL, 3, TRUE),
    (special_leave_id, 'special', '特別休暇', 'その他特別事由による休暇です。理由の入力が必要です。', 5.0, TRUE, TRUE, NULL, 4, TRUE),
    (substitute_leave_id, 'substitute', '振替特別休暇', 'GW休暇や年末年始休暇に出勤した場合の代替として取得できる特別休暇です。本来休日である日の振替として使用します。', 0.0, TRUE, FALSE, NULL, 5, TRUE),
    (menstrual_leave_id, 'menstrual', '生理休暇', '女性社員向けの生理休暇です。', 12.0, TRUE, FALSE, 'female', 6, TRUE)
    ON CONFLICT (id) DO NOTHING;

    -- UserLeaveBalances
    INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date) VALUES 
    (gen_random_uuid()::text, admin_id, paid_leave_id, current_year, 20.0, 5.0, 15.0, MAKE_DATE(current_year + 2, 3, 31)),
    (gen_random_uuid()::text, admin_id, summer_leave_id, current_year, 5.0, 2.0, 3.0, MAKE_DATE(current_year, 9, 30)),
    (gen_random_uuid()::text, admin_id, condolence_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, admin_id, special_leave_id, current_year, 5.0, 1.0, 4.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, admin_id, substitute_leave_id, current_year, 0.0, 0.0, 0.0, MAKE_DATE(current_year + 1, 3, 31))
    ON CONFLICT DO NOTHING;

    INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date) VALUES 
    (gen_random_uuid()::text, user1_id, paid_leave_id, current_year, 20.0, 7.5, 12.5, MAKE_DATE(current_year + 2, 3, 31)),
    (gen_random_uuid()::text, user1_id, summer_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year, 9, 30)),
    (gen_random_uuid()::text, user1_id, condolence_leave_id, current_year, 5.0, 2.0, 3.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, user1_id, special_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, user1_id, substitute_leave_id, current_year, 0.0, 0.0, 0.0, MAKE_DATE(current_year + 1, 3, 31))
    ON CONFLICT DO NOTHING;

    -- Update user2 gender
    UPDATE users SET gender = 'female' WHERE id = user2_id;

    INSERT INTO user_leave_balances (id, user_id, leave_type_id, fiscal_year, total_days, used_days, remaining_days, expire_date) VALUES 
    (gen_random_uuid()::text, user2_id, paid_leave_id, current_year, 20.0, 10.0, 10.0, MAKE_DATE(current_year + 2, 3, 31)),
    (gen_random_uuid()::text, user2_id, summer_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year, 9, 30)),
    (gen_random_uuid()::text, user2_id, condolence_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, user2_id, special_leave_id, current_year, 5.0, 0.0, 5.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, user2_id, substitute_leave_id, current_year, 0.0, 0.0, 0.0, MAKE_DATE(current_year + 1, 3, 31)),
    (gen_random_uuid()::text, user2_id, menstrual_leave_id, current_year, 12.0, 1.0, 11.0, MAKE_DATE(current_year + 1, 3, 31))
    ON CONFLICT DO NOTHING;

    -- Holidays
    INSERT INTO holidays (id, holiday_date, holiday_name, holiday_type) VALUES 
    (gen_random_uuid()::text, '2023-01-01', '元日', 'national'),
    (gen_random_uuid()::text, '2023-01-02', '元日の振替休日', 'national'),
    (gen_random_uuid()::text, '2023-01-09', '成人の日', 'national'),
    (gen_random_uuid()::text, '2023-02-11', '建国記念の日', 'national'),
    (gen_random_uuid()::text, '2023-02-23', '天皇誕生日', 'national'),
    (gen_random_uuid()::text, '2023-03-21', '春分の日', 'national'),
    (gen_random_uuid()::text, '2023-04-29', '昭和の日', 'national'),
    (gen_random_uuid()::text, '2023-05-03', '憲法記念日', 'national'),
    (gen_random_uuid()::text, '2023-05-04', 'みどりの日', 'national'),
    (gen_random_uuid()::text, '2023-05-05', 'こどもの日', 'national'),
    (gen_random_uuid()::text, '2023-07-17', '海の日', 'national'),
    (gen_random_uuid()::text, '2023-08-11', '山の日', 'national'),
    (gen_random_uuid()::text, '2023-09-18', '敬老の日', 'national'),
    (gen_random_uuid()::text, '2023-09-23', '秋分の日', 'national'),
    (gen_random_uuid()::text, '2023-10-09', 'スポーツの日', 'national'),
    (gen_random_uuid()::text, '2023-11-03', '文化の日', 'national'),
    (gen_random_uuid()::text, '2023-11-23', '勤労感謝の日', 'national'),
    (gen_random_uuid()::text, '2023-12-29', '年末休暇', 'company'),
    (gen_random_uuid()::text, '2023-12-30', '年末休暇', 'company'),
    (gen_random_uuid()::text, '2023-12-31', '年末休暇', 'company'),
    (gen_random_uuid()::text, '2024-01-01', '年始休暇', 'company'),
    (gen_random_uuid()::text, '2024-01-02', '年始休暇', 'company'),
    (gen_random_uuid()::text, '2024-01-03', '年始休暇', 'company')
    ON CONFLICT DO NOTHING;

    -- LeaveRequests and LeaveRequestDetails
    INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at) VALUES 
    (leave_request1_id, user1_id, paid_leave_id, CURRENT_DATE - INTERVAL '30 days', FALSE, NULL, 1.0, 'approved', admin_id, CURRENT_DATE - INTERVAL '28 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
    (gen_random_uuid()::text, leave_request1_id, CURRENT_DATE - INTERVAL '20 days', NULL, NULL, 1.0)
    ON CONFLICT DO NOTHING;

    INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at) VALUES 
    (leave_request2_id, user1_id, paid_leave_id, CURRENT_DATE - INTERVAL '15 days', TRUE, NULL, 0.5, 'approved', admin_id, CURRENT_DATE - INTERVAL '14 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
    (gen_random_uuid()::text, leave_request2_id, CURRENT_DATE - INTERVAL '10 days', '13:00', '17:30', 0.5)
    ON CONFLICT DO NOTHING;

    INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status) VALUES 
    (leave_request3_id, user1_id, paid_leave_id, CURRENT_DATE, FALSE, NULL, 2.0, 'pending')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
    (gen_random_uuid()::text, leave_request3_id, CURRENT_DATE + INTERVAL '7 days', NULL, NULL, 1.0),
    (gen_random_uuid()::text, leave_request3_id, CURRENT_DATE + INTERVAL '8 days', NULL, NULL, 1.0)
    ON CONFLICT DO NOTHING;

    INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at) VALUES 
    (leave_request4_id, user2_id, condolence_leave_id, CURRENT_DATE - INTERVAL '45 days', FALSE, '親族の葬儀のため', 2.0, 'approved', admin_id, CURRENT_DATE - INTERVAL '44 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
    (gen_random_uuid()::text, leave_request4_id, CURRENT_DATE - INTERVAL '40 days', NULL, NULL, 1.0),
    (gen_random_uuid()::text, leave_request4_id, CURRENT_DATE - INTERVAL '39 days', NULL, NULL, 1.0)
    ON CONFLICT DO NOTHING;

    INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at) VALUES 
    (leave_request5_id, user2_id, menstrual_leave_id, CURRENT_DATE - INTERVAL '20 days', FALSE, NULL, 1.0, 'approved', admin_id, CURRENT_DATE - INTERVAL '19 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
    (gen_random_uuid()::text, leave_request5_id, CURRENT_DATE - INTERVAL '15 days', NULL, NULL, 1.0)
    ON CONFLICT DO NOTHING;

    INSERT INTO leave_requests (id, user_id, leave_type_id, request_date, is_hourly_based, reason, total_days, status, approver_id, processed_at, rejection_reason) VALUES 
    (leave_request6_id, admin_id, paid_leave_id, CURRENT_DATE - INTERVAL '10 days', TRUE, NULL, 0.5, 'rejected', user1_id, CURRENT_DATE - INTERVAL '8 days', '業務都合により承認できません。別の日での申請をお願いします。')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_request_details (id, leave_request_id, leave_date, start_time, end_time, day_value) VALUES 
    (gen_random_uuid()::text, leave_request6_id, CURRENT_DATE - INTERVAL '5 days', '10:00', '14:00', 0.5)
    ON CONFLICT DO NOTHING;

    -- SubstituteLeaveGrants
    INSERT INTO substitute_leave_grants (id, user_id, grant_date, granted_days, used_days, remaining_days, work_date, reason, expire_date, is_expired) VALUES 
    (admin_substitute1_id, admin_id, CURRENT_DATE - INTERVAL '60 days', 1.0, 0.0, 1.0, CURRENT_DATE - INTERVAL '65 days', 'GW期間（5/3）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE),
    (admin_substitute2_id, admin_id, CURRENT_DATE - INTERVAL '30 days', 1.0, 0.0, 1.0, CURRENT_DATE - INTERVAL '35 days', '年末年始期間（12/30）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE),
    (user1_substitute1_id, user1_id, CURRENT_DATE - INTERVAL '60 days', 2.0, 0.0, 2.0, CURRENT_DATE - INTERVAL '65 days', 'GW期間（5/4-5/5）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE),
    (user1_substitute2_id, user1_id, CURRENT_DATE - INTERVAL '15 days', 1.0, 1.0, 0.0, CURRENT_DATE - INTERVAL '20 days', '祝日（体育の日）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE),
    (user2_substitute1_id, user2_id, CURRENT_DATE - INTERVAL '30 days', 1.0, 0.0, 1.0, CURRENT_DATE - INTERVAL '35 days', '年末年始期間（1/2）出勤', MAKE_DATE(current_year + 1, 3, 31), FALSE)
    ON CONFLICT (id) DO NOTHING;

    -- Update user_leave_balances for substitute leaves
    UPDATE user_leave_balances SET total_days = 2.0, remaining_days = 2.0 WHERE user_id = admin_id AND leave_type_id = substitute_leave_id;
    UPDATE user_leave_balances SET total_days = 2.0, used_days = 1.0, remaining_days = 1.0 WHERE user_id = user1_id AND leave_type_id = substitute_leave_id;
    UPDATE user_leave_balances SET total_days = 1.0, remaining_days = 1.0 WHERE user_id = user2_id AND leave_type_id = substitute_leave_id;

    -- Attendances
    INSERT INTO attendances (id, user_id, date, status, start_time, end_time, break_time, memo) VALUES 
    (gen_random_uuid()::text, user1_id, '2023-11-06 00:00:00', 'present', '2023-11-06 09:00:00', '2023-11-06 18:00:00', 60, '通常勤務'),
    (gen_random_uuid()::text, user1_id, '2023-11-07 00:00:00', 'paid_leave', NULL, NULL, 0, '有給休暇取得')
    ON CONFLICT DO NOTHING;

    -- Technology Categories
    INSERT INTO technology_categories (id, name, display_name, sort_order) VALUES 
    (category_programming_id, 'programming_languages', '使用言語／ライブラリ', 1),
    (category_servers_id, 'servers_databases', 'サーバーOS／DBサーバー', 2),
    (category_tools_id, 'tools', 'ツール等', 3)
    ON CONFLICT (id) DO NOTHING;

    -- Certifications
    INSERT INTO certifications (id, name, issuer, description, is_common, display_order, category) VALUES 
    (cert_basic_info_id, '基本情報技術者', 'IPA（情報処理推進機構）', 'ITエンジニアの登竜門となる国家資格', true, 1, '国家資格'),
    (cert_applied_info_id, '応用情報技術者', 'IPA（情報処理推進機構）', 'ITエンジニアとしての応用的な知識・技能を認定する国家資格', true, 2, '国家資格'),
    (cert_aws_saa_id, 'AWS認定ソリューションアーキテクト - アソシエイト', 'Amazon Web Services', 'AWSクラウドアーキテクチャの設計スキルを認定', true, 10, 'ベンダー資格'),
    (cert_aws_dev_id, 'AWS認定デベロッパー - アソシエイト', 'Amazon Web Services', 'AWSプラットフォームでの開発スキルを認定', true, 11, 'ベンダー資格'),
    (cert_java_se11_id, 'Java SE 11 Programmer', 'Oracle', 'Java言語の基本的なプログラミングスキルを認定', true, 20, 'ベンダー資格'),
    (cert_lpic1_id, 'LPIC-1', 'Linux Professional Institute', 'Linuxシステムの基本的な管理スキルを認定', true, 30, 'ベンダー資格'),
    (cert_toeic_id, 'TOEIC', 'ETS', '英語コミュニケーション能力を測定するテスト', true, 40, 'その他'),
    (cert_oracle_db_id, 'Oracle Master Bronze', 'Oracle', 'Oracleデータベースの基本的な管理スキルを認定', true, 25, 'ベンダー資格'),
    (cert_azure_fund_id, 'Microsoft Azure Fundamentals', 'Microsoft', 'Azureクラウドサービスの基礎知識を認定', true, 12, 'ベンダー資格'),
    (cert_gcp_ace_id, 'Google Cloud Associate Cloud Engineer', 'Google', 'GCPの基本的な運用スキルを認定', true, 13, 'ベンダー資格')
    ON CONFLICT (id) DO NOTHING;
END $$;