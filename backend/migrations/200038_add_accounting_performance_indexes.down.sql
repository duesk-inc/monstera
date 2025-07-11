-- 経理機能パフォーマンスインデックスの削除

DROP INDEX IF EXISTS idx_clients_billing_status ON clients;
DROP INDEX IF EXISTS idx_invoices_billing_month_status ON invoices;
DROP INDEX IF EXISTS idx_invoices_client_billing_month ON invoices;
DROP INDEX IF EXISTS idx_invoices_freee_status_date ON invoices;
DROP INDEX IF EXISTS idx_invoices_due_date_status ON invoices;
DROP INDEX IF EXISTS idx_assignments_billing_type_dates ON project_assignments;
DROP INDEX IF EXISTS idx_assignments_project_active ON project_assignments;
DROP INDEX IF EXISTS idx_sync_logs_type_status_created ON freee_sync_logs;
DROP INDEX IF EXISTS idx_sync_logs_target_type ON freee_sync_logs;
DROP INDEX IF EXISTS idx_audit_logs_action_date ON invoice_audit_logs;
DROP INDEX IF EXISTS idx_audit_logs_invoice_action ON invoice_audit_logs;
DROP INDEX IF EXISTS idx_scheduled_jobs_status_next_run ON scheduled_jobs;
DROP INDEX IF EXISTS idx_scheduled_jobs_type_status ON scheduled_jobs;
DROP INDEX IF EXISTS idx_mappings_group_project_created ON project_group_mappings;
DROP INDEX IF EXISTS idx_projects_client_dates ON projects;
DROP INDEX IF EXISTS idx_invoices_month_amount ON invoices;