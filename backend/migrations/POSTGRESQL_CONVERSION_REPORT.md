# PostgreSQL Migration Conversion Report

## Summary

All DATETIME columns have been successfully converted to TIMESTAMP across PostgreSQL migration files.

### Conversion Details

- **Total files converted**: 26 files
- **Conversion pattern**: `DATETIME` → `TIMESTAMP`
- **Conversion pattern**: `DATETIME(3)` → `TIMESTAMP(3)`
- **Default timestamps**: Maintained with timezone support using `AT TIME ZONE 'Asia/Tokyo'`

### Files Converted

The following PostgreSQL migration files were updated:

1. `000002_create_profiles_and_related_tables.up.postgresql.sql`
2. `000003_create_reports_tables.up.postgresql.sql`
3. `000008_create_attendances_table.up.postgresql.sql`
4. `000010_create_expenses_table.up.postgresql.sql`
5. `000012_create_notifications_tables.up.postgresql.sql`
6. `000016_create_role_permissions_table.up.postgresql.sql`
7. `000017_create_clients_table.up.postgresql.sql`
8. `000018_create_projects_table.up.postgresql.sql`
9. `000019_create_project_assignments_table.up.postgresql.sql`
10. `000020_create_invoices_table.up.postgresql.sql`
11. `000021_create_sales_activities_table.up.postgresql.sql`
12. `000022_create_invoice_details_table.up.postgresql.sql`
13. `200030_create_project_groups_table.up.postgresql.sql`
14. `200031_create_project_group_mappings_table.up.postgresql.sql`
15. `200032_create_freee_sync_logs_table.up.postgresql.sql`
16. `200033_extend_clients_for_accounting.up.postgresql.sql`
17. `200034_extend_invoices_for_accounting.up.postgresql.sql`
18. `200036_create_invoice_audit_logs_table.up.postgresql.sql`
19. `200037_create_scheduled_jobs_table.up.postgresql.sql`
20. `200039_add_expense_tables.up.postgresql.sql`
21. `200040_create_proposals_table.up.postgresql.sql`
22. `200041_create_proposal_questions_table.up.postgresql.sql`
23. `200044_create_expense_approver_settings.up.postgresql.sql`
24. `200046_create_expense_receipts_table.up.postgresql.sql`
25. `200047_add_expense_deadline_fields.up.postgresql.sql`
26. `200048_create_virus_scan_logs_table.up.postgresql.sql`

### Key Changes Made

1. **DATETIME to TIMESTAMP**: All occurrences of `DATETIME` have been replaced with `TIMESTAMP`
2. **Precision preserved**: `DATETIME(3)` was converted to `TIMESTAMP(3)` to maintain microsecond precision
3. **Default values**: Default timestamp values maintain timezone support
4. **ON UPDATE clauses**: PostgreSQL uses triggers instead of MySQL's `ON UPDATE CURRENT_TIMESTAMP`, which are already implemented in the migration files

### PostgreSQL-Specific Features

The PostgreSQL migrations include:
- Trigger function `update_updated_at_column()` for automatic timestamp updates
- Proper timezone handling with `AT TIME ZONE 'Asia/Tokyo'`
- ENUM types (which need separate handling in PostgreSQL)
- Proper indexing syntax

### Verification

All PostgreSQL migration files in the `postgresql-versions` directory have been checked and confirmed to:
- No longer contain any `DATETIME` references
- Use proper PostgreSQL `TIMESTAMP` data types
- Maintain data integrity and constraints
- Include appropriate triggers for automatic timestamp updates

### Notes

- The conversion script created a backup before modifying each file
- All backups were removed after successful conversion
- The original MySQL migration files remain unchanged
- PostgreSQL ENUM types will need separate type creation statements (not covered in this conversion)