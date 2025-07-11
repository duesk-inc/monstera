-- 経理機能パフォーマンス向上のためのインデックス追加

-- clientsテーブルのコンポジットインデックス
-- freee_sync_statusカラムが存在する場合のみ作成
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'freee_sync_status') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_billing_status ON clients(freee_sync_status, billing_closing_day) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- billing_closing_dayのみのインデックス（代替）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'billing_closing_day') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_billing_closing_day ON clients(billing_closing_day) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- invoicesテーブルのパフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month_status ON invoices(billing_month, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_client_billing_month ON invoices(client_id, billing_month) WHERE deleted_at IS NULL;

-- freee_sync_status と freee_synced_at カラムが存在する場合のみ作成
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'freee_sync_status') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'freee_synced_at') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_freee_status_date ON invoices(freee_sync_status, freee_synced_at);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status ON invoices(due_date, status) WHERE status != 'paid';

-- project_assignmentsテーブルのパフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_assignments_billing_type_dates ON project_assignments(billing_type, start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_project_active ON project_assignments(project_id, end_date) WHERE deleted_at IS NULL;

-- freee_sync_logsテーブルのパフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status_created ON freee_sync_logs(sync_type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_target_type ON freee_sync_logs(target_id, sync_type);

-- invoice_audit_logsテーブルのパフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_action_date ON invoice_audit_logs(action, changed_at);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_invoice_action ON invoice_audit_logs(invoice_id, action, changed_at);

-- scheduled_jobsテーブルのパフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_next_run ON scheduled_jobs(status, next_run_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type_status ON scheduled_jobs(job_type, status) WHERE deleted_at IS NULL;

-- project_group_mappingsテーブルのパフォーマンスインデックス
CREATE INDEX IF NOT EXISTS idx_mappings_group_project_created ON project_group_mappings(project_group_id, project_id, created_at);

-- 請求処理でよく使用されるクエリ用のコンポジットインデックス
CREATE INDEX IF NOT EXISTS idx_projects_client_dates ON projects(client_id, start_date, end_date) WHERE deleted_at IS NULL;

-- 月次請求レポート用のインデックス
CREATE INDEX IF NOT EXISTS idx_invoices_month_amount ON invoices(billing_month, total_amount) WHERE deleted_at IS NULL AND status != 'cancelled';