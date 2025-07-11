#!/bin/bash

# VACUUM/ANALYZE設定サマリースクリプト
# 現在の設定と実装状況をまとめて表示

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================"
echo "VACUUM/ANALYZE Configuration Summary"
echo "================================================"
echo ""

# 1. 設定概要
echo -e "${BLUE}1. Configuration Overview${NC}"
echo "========================="
echo ""
echo "PostgreSQL autovacuum settings are configured in:"
echo "  • docker-compose.postgresql.yml (command section)"
echo "  • docker/postgres/postgresql.conf"
echo "  • migrations/200005_configure_autovacuum_settings.up.postgresql.sql"
echo ""

# 2. グローバル設定
echo -e "${BLUE}2. Global Settings${NC}"
echo "=================="
echo ""
echo "Current global autovacuum configuration:"
echo "  • autovacuum = on"
echo "  • autovacuum_max_workers = 4"
echo "  • autovacuum_naptime = 30s"
echo "  • autovacuum_vacuum_scale_factor = 0.1 (10%)"
echo "  • autovacuum_analyze_scale_factor = 0.05 (5%)"
echo "  • autovacuum_vacuum_cost_delay = 10ms"
echo ""
echo -e "${GREEN}✅ Optimized for web application workload${NC}"
echo ""

# 3. テーブル別設定
echo -e "${BLUE}3. Table-specific Settings${NC}"
echo "=========================="
echo ""
echo -e "${YELLOW}High-frequency update tables (1-2% threshold):${NC}"
echo "  ├─ audit_logs (1%)"
echo "  └─ sessions (2%)"
echo ""
echo -e "${YELLOW}Medium-frequency update tables (5% threshold):${NC}"
echo "  ├─ weekly_reports"
echo "  ├─ daily_records"
echo "  ├─ expenses"
echo "  ├─ attendances"
echo "  ├─ leave_requests"
echo "  └─ project_assignments"
echo ""
echo -e "${YELLOW}Low-frequency/Archive tables (20% threshold):${NC}"
echo "  ├─ archived_weekly_reports"
echo "  └─ archived_daily_records"
echo ""

# 4. メンテナンススクリプト
echo -e "${BLUE}4. Maintenance Scripts${NC}"
echo "====================="
echo ""
echo -e "${GREEN}Available scripts:${NC}"
echo "  • monitor-vacuum-analyze.sh - Real-time monitoring"
echo "  • vacuum-maintenance.sh - Scheduled maintenance"
echo "  • test-vacuum-performance - Performance testing"
echo ""
echo "Maintenance schedule:"
echo "  • Daily: High-frequency tables (2 AM)"
echo "  • Weekly: Medium-frequency tables (Sunday 3 AM)"
echo "  • Monthly: VACUUM FULL & REINDEX (1st day 4 AM)"
echo ""

# 5. 監視クエリ
echo -e "${BLUE}5. Monitoring Queries${NC}"
echo "===================="
echo ""
echo "-- Check autovacuum activity:"
echo "SELECT * FROM pg_stat_user_tables"
echo "WHERE last_autovacuum > now() - interval '1 day';"
echo ""
echo "-- Check dead tuple ratio:"
echo "SELECT tablename, n_dead_tup, n_live_tup,"
echo "  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) AS dead_pct"
echo "FROM pg_stat_user_tables"
echo "WHERE n_dead_tup > 1000;"
echo ""

# 6. ベストプラクティス
echo -e "${BLUE}6. Best Practices${NC}"
echo "================="
echo ""
echo -e "${GREEN}DO:${NC}"
echo "  ✓ Monitor dead tuple ratios regularly"
echo "  ✓ Run ANALYZE after bulk data operations"
echo "  ✓ Schedule VACUUM FULL during maintenance windows"
echo "  ✓ Keep autovacuum enabled at all times"
echo ""
echo -e "${YELLOW}DON'T:${NC}"
echo "  ✗ Disable autovacuum in production"
echo "  ✗ Run VACUUM FULL during business hours"
echo "  ✗ Ignore high dead tuple ratios (>20%)"
echo "  ✗ Set thresholds too low (causes excessive I/O)"
echo ""

# 7. トラブルシューティング
echo -e "${BLUE}7. Troubleshooting${NC}"
echo "=================="
echo ""
echo "Common issues and solutions:"
echo "  • Autovacuum not running: Check autovacuum setting"
echo "  • High dead tuples: Lower scale_factor for the table"
echo "  • Slow queries: Run ANALYZE to update statistics"
echo "  • Table bloat: Schedule VACUUM FULL"
echo ""

# 8. 実装状況
echo -e "${BLUE}8. Implementation Status${NC}"
echo "========================"
echo ""
echo -e "${GREEN}Completed:${NC}"
echo "  ✅ Global autovacuum configuration"
echo "  ✅ Table-specific settings migration"
echo "  ✅ Monitoring scripts"
echo "  ✅ Maintenance scripts"
echo "  ✅ Performance test tools"
echo "  ✅ Cron job examples"
echo ""

# 9. 次のステップ
echo -e "${BLUE}9. Next Steps${NC}"
echo "============="
echo ""
echo "1. Apply migration:"
echo "   migrate -path migrations -database \$DATABASE_URL up"
echo ""
echo "2. Set up cron jobs:"
echo "   crontab scripts/cron/vacuum-crontab.example"
echo ""
echo "3. Monitor performance:"
echo "   ./scripts/monitor-vacuum-analyze.sh"
echo ""
echo "4. Test configuration:"
echo "   go run cmd/test-vacuum-performance/main.go"
echo ""

echo "================================================"
echo -e "${GREEN}✅ VACUUM/ANALYZE Configuration Complete${NC}"
echo "================================================"