-- アーカイブ処理用ストアドプロシージャを作成

DELIMITER $$

-- 週報を一括アーカイブするストアドプロシージャ
-- 指定された条件に基づいて週報とその関連データをアーカイブテーブルに移動
CREATE PROCEDURE IF NOT EXISTS ArchiveWeeklyReports(
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_fiscal_year YEAR,
    IN p_fiscal_quarter TINYINT,
    IN p_archived_by CHAR(36),
    IN p_archive_reason ENUM('retention_policy', 'manual', 'data_migration'),
    IN p_department_id CHAR(36),
    IN p_max_records INT,
    OUT p_archived_count INT,
    OUT p_failed_count INT,
    OUT p_statistics_id CHAR(36)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_report_id CHAR(36);
    DECLARE v_user_id CHAR(36);
    DECLARE v_user_name VARCHAR(255);
    DECLARE v_user_email VARCHAR(255);
    DECLARE v_dept_id CHAR(36);
    DECLARE v_dept_name VARCHAR(255);
    DECLARE v_archive_id CHAR(36);
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_success_count INT DEFAULT 0;
    DECLARE v_total_count INT DEFAULT 0;
    DECLARE v_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    
    -- 例外ハンドラー
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        SET v_error_count = v_error_count + 1;
        ROLLBACK;
    END;
    
    -- カーソル定義（アーカイブ対象の週報を取得）
    DECLARE archive_cursor CURSOR FOR
        SELECT 
            wr.id,
            wr.user_id,
            u.name as user_name,
            u.email as user_email,
            u.department_id,
            d.name as department_name
        FROM weekly_reports wr
        JOIN users u ON wr.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE wr.start_date >= p_start_date 
          AND wr.end_date <= p_end_date
          AND (p_department_id IS NULL OR u.department_id = p_department_id)
          AND wr.deleted_at IS NULL
          AND u.deleted_at IS NULL
        ORDER BY wr.start_date
        LIMIT IFNULL(p_max_records, 999999);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- アーカイブ統計レコードを作成
    SET p_statistics_id = UUID();
    
    -- 対象レコード数を取得
    SELECT COUNT(*) INTO v_total_count
    FROM weekly_reports wr
    JOIN users u ON wr.user_id = u.id
    WHERE wr.start_date >= p_start_date 
      AND wr.end_date <= p_end_date
      AND (p_department_id IS NULL OR u.department_id = p_department_id)
      AND wr.deleted_at IS NULL
      AND u.deleted_at IS NULL;
    
    -- 統計レコードを挿入
    INSERT INTO archive_statistics (
        id, archive_type, fiscal_year, fiscal_quarter, start_date, end_date,
        total_records, executed_by, execution_method, archive_reason,
        status, started_at
    ) VALUES (
        p_statistics_id, 'bulk_archive', p_fiscal_year, p_fiscal_quarter, 
        p_start_date, p_end_date, v_total_count, p_archived_by, 'batch', 
        p_archive_reason, 'processing', v_start_time
    );
    
    -- カーソルを開く
    OPEN archive_cursor;
    
    -- メインループ：各週報をアーカイブ
    read_loop: LOOP
        FETCH archive_cursor INTO v_report_id, v_user_id, v_user_name, v_user_email, v_dept_id, v_dept_name;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- トランザクション開始
        START TRANSACTION;
        
        BEGIN
            -- 週報アーカイブレコードを作成
            SET v_archive_id = UUID();
            
            INSERT INTO weekly_reports_archive (
                id, original_id, user_id, user_name, user_email,
                department_id, department_name, start_date, end_date,
                status, mood, total_work_hours, client_total_work_hours,
                overtime_hours, comment, manager_comment, submitted_at,
                commented_at, archived_by, archive_reason, fiscal_year,
                fiscal_quarter, original_created_at, original_updated_at
            )
            SELECT 
                v_archive_id, wr.id, wr.user_id, v_user_name, v_user_email,
                v_dept_id, v_dept_name, wr.start_date, wr.end_date,
                wr.status, wr.mood, wr.total_work_hours, wr.client_total_work_hours,
                wr.overtime_hours, wr.comment, wr.manager_comment, wr.submitted_at,
                wr.commented_at, p_archived_by, p_archive_reason, p_fiscal_year,
                p_fiscal_quarter, wr.created_at, wr.updated_at
            FROM weekly_reports wr
            WHERE wr.id = v_report_id;
            
            -- 日次記録をアーカイブ
            INSERT INTO daily_records_archive (
                id, original_id, weekly_report_archive_id, original_weekly_report_id,
                record_date, is_holiday, is_holiday_work, company_work_hours,
                client_work_hours, total_work_hours, break_time, overtime_hours,
                remarks, original_created_at, original_updated_at
            )
            SELECT 
                UUID(), dr.id, v_archive_id, dr.weekly_report_id,
                dr.date, dr.is_holiday, dr.is_holiday_work, dr.company_work_hours,
                dr.client_work_hours, dr.total_work_hours, dr.break_time, dr.overtime_hours,
                dr.remarks, dr.created_at, dr.updated_at
            FROM daily_records dr
            WHERE dr.weekly_report_id = v_report_id
              AND dr.deleted_at IS NULL;
            
            -- 勤怠時間をアーカイブ
            INSERT INTO work_hours_archive (
                id, original_id, weekly_report_archive_id, original_weekly_report_id,
                date, start_time, end_time, break_time, overtime_start_time,
                overtime_end_time, remarks, original_created_at, original_updated_at
            )
            SELECT 
                UUID(), wh.id, v_archive_id, wh.weekly_report_id,
                wh.date, wh.start_time, wh.end_time, wh.break_time, wh.overtime_start_time,
                wh.overtime_end_time, wh.remarks, wh.created_at, wh.updated_at
            FROM work_hours wh
            WHERE wh.weekly_report_id = v_report_id
              AND wh.deleted_at IS NULL;
            
            -- 元データを削除
            DELETE FROM work_hours WHERE weekly_report_id = v_report_id;
            DELETE FROM daily_records WHERE weekly_report_id = v_report_id;
            DELETE FROM weekly_reports WHERE id = v_report_id;
            
            -- 成功カウントを増加
            SET v_success_count = v_success_count + 1;
            
            COMMIT;
        END;
        
    END LOOP;
    
    -- カーソルを閉じる
    CLOSE archive_cursor;
    
    -- 結果を設定
    SET p_archived_count = v_success_count;
    SET p_failed_count = v_error_count;
    
    -- 統計を更新
    UPDATE archive_statistics 
    SET archived_records = v_success_count,
        failed_records = v_error_count,
        status = CASE 
            WHEN v_error_count = 0 THEN 'completed'
            WHEN v_success_count = 0 THEN 'failed'
            ELSE 'completed'
        END,
        completed_at = CURRENT_TIMESTAMP,
        duration_seconds = TIMESTAMPDIFF(SECOND, v_start_time, CURRENT_TIMESTAMP)
    WHERE id = p_statistics_id;
    
END$$

-- 古いアーカイブデータを削除するストアドプロシージャ
CREATE PROCEDURE IF NOT EXISTS CleanupExpiredArchives(
    IN p_retention_years INT,
    IN p_executed_by CHAR(36),
    OUT p_deleted_count INT,
    OUT p_statistics_id CHAR(36)
)
BEGIN
    DECLARE v_cutoff_date DATE;
    DECLARE v_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    DECLARE v_deleted_reports INT DEFAULT 0;
    DECLARE v_deleted_daily_records INT DEFAULT 0;
    DECLARE v_deleted_work_hours INT DEFAULT 0;
    DECLARE v_total_deleted INT DEFAULT 0;
    
    -- 保存期限を計算（現在日時から指定年数前）
    SET v_cutoff_date = DATE_SUB(CURRENT_DATE, INTERVAL p_retention_years YEAR);
    
    -- 統計レコードを作成
    SET p_statistics_id = UUID();
    
    INSERT INTO archive_statistics (
        id, archive_type, fiscal_year, fiscal_quarter, start_date, end_date,
        total_records, executed_by, execution_method, archive_reason,
        status, started_at
    ) VALUES (
        p_statistics_id, 'bulk_archive', YEAR(CURRENT_DATE), QUARTER(CURRENT_DATE),
        v_cutoff_date, CURRENT_DATE, 0, p_executed_by, 'batch',
        'retention_policy', 'processing', v_start_time
    );
    
    -- 関連データを削除（外部キー制約に従って順序を守る）
    
    -- 勤怠時間アーカイブを削除
    DELETE FROM work_hours_archive 
    WHERE weekly_report_archive_id IN (
        SELECT id FROM weekly_reports_archive 
        WHERE archived_at < v_cutoff_date
    );
    SET v_deleted_work_hours = ROW_COUNT();
    
    -- 日次記録アーカイブを削除
    DELETE FROM daily_records_archive 
    WHERE weekly_report_archive_id IN (
        SELECT id FROM weekly_reports_archive 
        WHERE archived_at < v_cutoff_date
    );
    SET v_deleted_daily_records = ROW_COUNT();
    
    -- 週報アーカイブを削除
    DELETE FROM weekly_reports_archive 
    WHERE archived_at < v_cutoff_date;
    SET v_deleted_reports = ROW_COUNT();
    
    SET v_total_deleted = v_deleted_reports + v_deleted_daily_records + v_deleted_work_hours;
    SET p_deleted_count = v_total_deleted;
    
    -- 統計を更新
    UPDATE archive_statistics 
    SET archived_records = v_total_deleted,
        failed_records = 0,
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        duration_seconds = TIMESTAMPDIFF(SECOND, v_start_time, CURRENT_TIMESTAMP)
    WHERE id = p_statistics_id;
    
END$$

-- 特定ユーザーの週報をアーカイブするストアドプロシージャ
CREATE PROCEDURE IF NOT EXISTS ArchiveUserWeeklyReports(
    IN p_user_id CHAR(36),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_archived_by CHAR(36),
    IN p_archive_reason ENUM('retention_policy', 'manual', 'data_migration'),
    OUT p_archived_count INT,
    OUT p_failed_count INT
)
BEGIN
    DECLARE v_fiscal_year YEAR;
    DECLARE v_fiscal_quarter TINYINT;
    DECLARE v_statistics_id CHAR(36);
    
    -- 会計年度と四半期を計算（4月始まりの会計年度）
    IF MONTH(p_start_date) >= 4 THEN
        SET v_fiscal_year = YEAR(p_start_date);
    ELSE
        SET v_fiscal_year = YEAR(p_start_date) - 1;
    END IF;
    
    SET v_fiscal_quarter = CASE
        WHEN MONTH(p_start_date) IN (4, 5, 6) THEN 1
        WHEN MONTH(p_start_date) IN (7, 8, 9) THEN 2
        WHEN MONTH(p_start_date) IN (10, 11, 12) THEN 3
        ELSE 4
    END;
    
    -- メインのアーカイブプロシージャを呼び出し
    CALL ArchiveWeeklyReports(
        p_start_date, p_end_date, v_fiscal_year, v_fiscal_quarter,
        p_archived_by, p_archive_reason, NULL, NULL,
        p_archived_count, p_failed_count, v_statistics_id
    );
    
END$$

-- アーカイブ統計レポートを生成するストアドプロシージャ
CREATE PROCEDURE IF NOT EXISTS GenerateArchiveReport(
    IN p_fiscal_year YEAR,
    IN p_department_id CHAR(36)
)
BEGIN
    -- 年度別サマリー
    SELECT 
        fiscal_year,
        COUNT(*) as total_archives,
        SUM(total_work_hours) as total_work_hours,
        AVG(total_work_hours) as avg_work_hours,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT department_id) as unique_departments,
        MIN(archived_at) as oldest_archive,
        MAX(archived_at) as latest_archive
    FROM weekly_reports_archive
    WHERE (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
      AND (p_department_id IS NULL OR department_id = p_department_id)
    GROUP BY fiscal_year
    ORDER BY fiscal_year DESC;
    
    -- 四半期別サマリー
    SELECT 
        fiscal_year,
        fiscal_quarter,
        COUNT(*) as total_archives,
        SUM(total_work_hours) as total_work_hours,
        AVG(total_work_hours) as avg_work_hours,
        COUNT(DISTINCT user_id) as unique_users
    FROM weekly_reports_archive
    WHERE (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
      AND (p_department_id IS NULL OR department_id = p_department_id)
    GROUP BY fiscal_year, fiscal_quarter
    ORDER BY fiscal_year DESC, fiscal_quarter;
    
    -- 部署別サマリー
    SELECT 
        department_id,
        department_name,
        COUNT(*) as total_archives,
        SUM(total_work_hours) as total_work_hours,
        AVG(total_work_hours) as avg_work_hours,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT fiscal_year) as covered_years
    FROM weekly_reports_archive
    WHERE (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
      AND (p_department_id IS NULL OR department_id = p_department_id)
      AND department_id IS NOT NULL
    GROUP BY department_id, department_name
    ORDER BY total_archives DESC;
    
    -- アーカイブ理由別サマリー
    SELECT 
        archive_reason,
        COUNT(*) as total_archives,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(archived_at) as first_archive,
        MAX(archived_at) as latest_archive
    FROM weekly_reports_archive
    WHERE (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
      AND (p_department_id IS NULL OR department_id = p_department_id)
    GROUP BY archive_reason
    ORDER BY total_archives DESC;
    
END$$

-- アーカイブデータの整合性をチェックするストアドプロシージャ
CREATE PROCEDURE IF NOT EXISTS ValidateArchiveIntegrity(
    OUT p_integrity_issues INT,
    OUT p_report TEXT
)
BEGIN
    DECLARE v_orphaned_daily_records INT DEFAULT 0;
    DECLARE v_orphaned_work_hours INT DEFAULT 0;
    DECLARE v_missing_user_data INT DEFAULT 0;
    DECLARE v_duplicate_archives INT DEFAULT 0;
    DECLARE v_report TEXT DEFAULT '';
    
    -- 孤立した日次記録をチェック
    SELECT COUNT(*) INTO v_orphaned_daily_records
    FROM daily_records_archive da
    LEFT JOIN weekly_reports_archive wa ON da.weekly_report_archive_id = wa.id
    WHERE wa.id IS NULL;
    
    -- 孤立した勤怠時間をチェック
    SELECT COUNT(*) INTO v_orphaned_work_hours
    FROM work_hours_archive wha
    LEFT JOIN weekly_reports_archive wa ON wha.weekly_report_archive_id = wa.id
    WHERE wa.id IS NULL;
    
    -- ユーザー情報が欠落しているレコードをチェック
    SELECT COUNT(*) INTO v_missing_user_data
    FROM weekly_reports_archive
    WHERE user_name IS NULL OR user_name = '' 
       OR user_email IS NULL OR user_email = '';
    
    -- 重複アーカイブをチェック
    SELECT COUNT(*) - COUNT(DISTINCT original_id) INTO v_duplicate_archives
    FROM weekly_reports_archive;
    
    -- 問題の総数を計算
    SET p_integrity_issues = v_orphaned_daily_records + v_orphaned_work_hours + 
                           v_missing_user_data + v_duplicate_archives;
    
    -- レポートを生成
    SET v_report = CONCAT(
        'Archive Integrity Report:\n',
        '- Orphaned daily records: ', v_orphaned_daily_records, '\n',
        '- Orphaned work hours: ', v_orphaned_work_hours, '\n',
        '- Missing user data: ', v_missing_user_data, '\n',
        '- Duplicate archives: ', v_duplicate_archives, '\n',
        'Total issues: ', p_integrity_issues
    );
    
    SET p_report = v_report;
    
    -- 詳細情報を返す（問題がある場合）
    IF p_integrity_issues > 0 THEN
        -- 問題のあるレコードの詳細
        SELECT 
            'orphaned_daily_records' as issue_type,
            da.id as record_id,
            da.weekly_report_archive_id as parent_id,
            'Daily record without parent weekly report archive' as description
        FROM daily_records_archive da
        LEFT JOIN weekly_reports_archive wa ON da.weekly_report_archive_id = wa.id
        WHERE wa.id IS NULL
        
        UNION ALL
        
        SELECT 
            'orphaned_work_hours' as issue_type,
            wha.id as record_id,
            wha.weekly_report_archive_id as parent_id,
            'Work hour without parent weekly report archive' as description
        FROM work_hours_archive wha
        LEFT JOIN weekly_reports_archive wa ON wha.weekly_report_archive_id = wa.id
        WHERE wa.id IS NULL
        
        UNION ALL
        
        SELECT 
            'missing_user_data' as issue_type,
            wa.id as record_id,
            wa.user_id as parent_id,
            'Weekly report archive with missing user information' as description
        FROM weekly_reports_archive wa
        WHERE wa.user_name IS NULL OR wa.user_name = '' 
           OR wa.user_email IS NULL OR wa.user_email = '';
    END IF;
    
END$$

DELIMITER ;