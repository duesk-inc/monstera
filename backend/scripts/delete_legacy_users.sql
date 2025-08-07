-- Cognito Sub未設定のレガシーユーザーとその関連データを削除するスクリプト
-- 実行前に必ずバックアップを取得してください

BEGIN;

-- 削除対象ユーザーの確認
SELECT id, email, cognito_sub FROM users WHERE cognito_sub IS NULL OR cognito_sub = '';

-- 関連データの削除（外部キー制約の順序に注意）

-- 1. notification関連
DELETE FROM user_notifications 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM notification_settings 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 2. audit/change履歴
DELETE FROM audit_logs 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM change_histories 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 3. alert関連
DELETE FROM alert_histories 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM alert_settings 
WHERE updated_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 4. user_leave_balances
DELETE FROM user_leave_balances 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 5. leave_period_usages
DELETE FROM leave_period_usages 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 6. substitute_leave_grants
DELETE FROM substitute_leave_grants 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 7. user_default_work_settings
DELETE FROM user_default_work_settings 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 8. leave_requests関連
DELETE FROM leave_request_details 
WHERE leave_request_id IN (
    SELECT id FROM leave_requests 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM leave_requests 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM leave_requests 
WHERE approver_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 9. expenses関連
DELETE FROM expense_approvals 
WHERE expense_id IN (
    SELECT id FROM expenses 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM expense_approvals 
WHERE approver_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM expense_receipts 
WHERE expense_id IN (
    SELECT id FROM expenses 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM expenses 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM expenses 
WHERE approver_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 10. expense関連の他テーブル
DELETE FROM expense_drafts 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM expense_summaries 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM expense_approver_settings 
WHERE created_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM expense_approver_settings 
WHERE approver_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM expense_limits 
WHERE created_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 11. weekly_reports関連
DELETE FROM daily_records 
WHERE weekly_report_id IN (
    SELECT id FROM weekly_reports 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM weekly_reports 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM weekly_reports 
WHERE commented_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM weekly_reports 
WHERE manager_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 12. attendances
DELETE FROM attendances 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 13. profiles関連
-- work_history_histories
DELETE FROM work_history_histories 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- work_histories
DELETE FROM work_history_technologies 
WHERE work_history_id IN (
    SELECT id FROM work_histories 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM work_histories 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- profile_histories
DELETE FROM profile_histories 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- profile skills
DELETE FROM language_skills 
WHERE profile_id IN (
    SELECT id FROM profiles 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM framework_skills 
WHERE profile_id IN (
    SELECT id FROM profiles 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM business_experiences 
WHERE profile_id IN (
    SELECT id FROM profiles 
    WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '')
);

DELETE FROM profiles 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 14. project関連
DELETE FROM project_assignments 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM project_groups 
WHERE created_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 15. proposals
DELETE FROM proposals 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 16. sales関連
DELETE FROM sales_team_members 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM sales_teams 
WHERE manager_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 17. accounting関連
DELETE FROM accounting_department_members 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM accounting_departments 
WHERE manager_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 18. その他
DELETE FROM export_jobs 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM invoices 
WHERE created_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM reminder_settings 
WHERE updated_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

DELETE FROM scheduled_jobs 
WHERE created_by IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 19. departments (manager_idがある場合)
UPDATE departments 
SET manager_id = NULL 
WHERE manager_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 20. sessions
DELETE FROM sessions 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 21. user_roles
DELETE FROM user_roles 
WHERE user_id IN (SELECT id FROM users WHERE cognito_sub IS NULL OR cognito_sub = '');

-- 22. 最後にユーザー自体を削除
DELETE FROM users 
WHERE cognito_sub IS NULL OR cognito_sub = '';

-- 削除後の確認
SELECT COUNT(*) as remaining_users FROM users WHERE cognito_sub IS NULL OR cognito_sub = '';

COMMIT;

-- 削除後のアクティブユーザー一覧
SELECT id, email, cognito_sub, role FROM users WHERE active = true ORDER BY email;