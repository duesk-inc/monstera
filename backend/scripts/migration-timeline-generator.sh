#!/bin/bash

# PostgreSQL移行タイムライン生成スクリプト
# 詳細な作業スケジュールとチェックポイントを自動生成

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_MIGRATION_DATE="2024-12-15"
DEFAULT_START_TIME="02:00"
DEFAULT_MIGRATION_TYPE="blue-green"

echo "================================================"
echo "PostgreSQL Migration Timeline Generator"
echo "================================================"
echo ""

# 1. 基本情報入力
echo -e "${BLUE}1. Basic Information${NC}"
echo "==================="
echo ""

read -p "Migration date (YYYY-MM-DD) [${DEFAULT_MIGRATION_DATE}]: " MIGRATION_DATE
MIGRATION_DATE=${MIGRATION_DATE:-$DEFAULT_MIGRATION_DATE}

read -p "Start time (HH:MM) [${DEFAULT_START_TIME}]: " START_TIME
START_TIME=${START_TIME:-$DEFAULT_START_TIME}

echo "Migration type:"
echo "  1) Traditional (with maintenance window)"
echo "  2) Blue-Green (minimal downtime)"
read -p "Select migration type [2]: " MIGRATION_TYPE_NUM
MIGRATION_TYPE_NUM=${MIGRATION_TYPE_NUM:-2}

if [ "$MIGRATION_TYPE_NUM" = "1" ]; then
    MIGRATION_TYPE="traditional"
else
    MIGRATION_TYPE="blue-green"
fi

echo ""
echo "Configuration:"
echo "  Date: ${MIGRATION_DATE}"
echo "  Start Time: ${START_TIME} JST"
echo "  Type: ${MIGRATION_TYPE}"
echo ""

# 2. タイムライン計算
echo -e "${BLUE}2. Calculating Timeline${NC}"
echo "======================"
echo ""

# 時間計算用関数
add_minutes() {
    local base_time="$1"
    local minutes="$2"
    date -d "${MIGRATION_DATE} ${base_time} +${minutes} minutes" "+%H:%M" 2>/dev/null || \
    python3 -c "
from datetime import datetime, timedelta
base = datetime.strptime('${MIGRATION_DATE} ${base_time}', '%Y-%m-%d %H:%M')
result = base + timedelta(minutes=${minutes})
print(result.strftime('%H:%M'))
"
}

# 移行タイプ別スケジュール生成
if [ "$MIGRATION_TYPE" = "traditional" ]; then
    generate_traditional_timeline
else
    generate_blue_green_timeline
fi

# 従来方式タイムライン生成
generate_traditional_timeline() {
    echo "Generating Traditional Migration Timeline..."
    echo ""
    
    # 時間設定
    PREP_START="${START_TIME}"
    MAINTENANCE_START=$(add_minutes "$PREP_START" 30)
    DATA_EXPORT_START=$(add_minutes "$MAINTENANCE_START" 3)
    DATA_IMPORT_START=$(add_minutes "$DATA_EXPORT_START" 8)
    INDEX_CREATE_START=$(add_minutes "$DATA_IMPORT_START" 5)
    APP_RESTART_START=$(add_minutes "$INDEX_CREATE_START" 8)
    VALIDATION_START=$(add_minutes "$APP_RESTART_START" 5)
    SERVICE_RESUME=$(add_minutes "$VALIDATION_START" 10)
    POST_MIGRATION=$(add_minutes "$SERVICE_RESUME" 15)
    
    # タイムライン生成
    cat > migration-timeline-traditional.md << EOF
# PostgreSQL Migration Timeline - Traditional Method
**Date**: ${MIGRATION_DATE}  
**Start**: ${START_TIME} JST  
**Type**: Traditional Migration with Maintenance Window

## Pre-Migration Phase
### ${PREP_START} - Preparation Start
- [ ] **Team Assembly** (30 min)
  - All team members join migration call
  - Final GO/NO-GO decision
  - Environment status check
  - Backup verification
  
- [ ] **System Status Check**
  - MySQL health check
  - PostgreSQL environment validation
  - Network connectivity test
  - Monitoring systems ready

### $(add_minutes "$PREP_START" 15) - Pre-Migration Validation
- [ ] **Data Consistency Check**
  \`\`\`bash
  ./scripts/pre-migration-validation.sh
  \`\`\`
  
- [ ] **Performance Baseline**
  \`\`\`bash
  ./scripts/capture-baseline-metrics.sh
  \`\`\`

### $(add_minutes "$PREP_START" 25) - Final Preparation
- [ ] **User Notification**
  - Send maintenance start notification
  - Update status page
  
- [ ] **Team Role Confirmation**
  - Migration lead: Ready
  - DBA: Ready
  - Infrastructure: Ready
  - QA: Ready

## Migration Execution Phase
### ${MAINTENANCE_START} - Maintenance Window Start
- [ ] **Enable Maintenance Mode**
  \`\`\`bash
  ./scripts/enable-maintenance-mode.sh
  \`\`\`
  
- [ ] **Set MySQL Read-Only**
  \`\`\`bash
  ./scripts/set-mysql-readonly.sh
  \`\`\`
  
- [ ] **Stop Application Services**
  \`\`\`bash
  docker-compose stop backend frontend
  \`\`\`

### ${DATA_EXPORT_START} - Data Export Phase
- [ ] **Export MySQL Data**
  \`\`\`bash
  ./scripts/export-mysql-data.sh
  \`\`\`
  
- [ ] **Verify Export Integrity**
  \`\`\`bash
  ./scripts/verify-export-data.sh
  \`\`\`
  
- [ ] **Monitor Export Progress**
  - Expected duration: 5-8 minutes
  - Monitor disk space usage
  - Check for any export errors

### ${DATA_IMPORT_START} - Data Import Phase
- [ ] **Import to PostgreSQL**
  \`\`\`bash
  ./scripts/import-postgresql-data.sh
  \`\`\`
  
- [ ] **Monitor Import Progress**
  - Expected duration: 3-5 minutes
  - Monitor PostgreSQL logs
  - Check for constraint violations

### ${INDEX_CREATE_START} - Index Creation Phase
- [ ] **Create Performance Indexes**
  \`\`\`bash
  ./scripts/create-postgresql-indexes.sh
  \`\`\`
  
- [ ] **Monitor Index Creation**
  - Expected duration: 5-8 minutes
  - Use CONCURRENTLY where possible
  - Monitor system resources

### ${APP_RESTART_START} - Application Restart Phase
- [ ] **Update Configuration**
  \`\`\`bash
  ./scripts/switch-to-postgresql.sh
  \`\`\`
  
- [ ] **Start PostgreSQL Services**
  \`\`\`bash
  docker-compose -f docker-compose.postgresql.yml up -d
  \`\`\`
  
- [ ] **Health Check**
  \`\`\`bash
  ./scripts/health-check-postgresql.sh
  \`\`\`

### ${VALIDATION_START} - Validation Phase
- [ ] **Data Integrity Validation**
  \`\`\`bash
  ./scripts/validate-data-integrity.sh
  \`\`\`
  
- [ ] **Functional Testing**
  - Login/logout functionality
  - CRUD operations on weekly reports
  - File upload/download
  - Report generation
  
- [ ] **Performance Validation**
  \`\`\`bash
  ./scripts/performance-validation.sh
  \`\`\`

## Post-Migration Phase
### ${SERVICE_RESUME} - Service Resume
- [ ] **Disable Maintenance Mode**
  \`\`\`bash
  ./scripts/disable-maintenance-mode.sh
  \`\`\`
  
- [ ] **User Notification**
  - Send service restored notification
  - Update status page
  
- [ ] **Monitor Initial Traffic**
  - Watch error rates
  - Monitor response times
  - Check database connections

### ${POST_MIGRATION} - Post-Migration Monitoring
- [ ] **Extended Monitoring** (2 hours)
  - Database performance metrics
  - Application error rates
  - User feedback monitoring
  
- [ ] **Documentation Update**
  - Migration completion report
  - Lessons learned
  - Performance comparison

## Rollback Procedures
### Emergency Rollback (if needed)
- [ ] **Immediate Actions**
  \`\`\`bash
  ./scripts/emergency-rollback.sh
  \`\`\`
  
- [ ] **Restore MySQL Service**
  \`\`\`bash
  ./scripts/restore-mysql-service.sh
  \`\`\`
  
- [ ] **Incident Response**
  - Notify stakeholders
  - Document issues
  - Plan recovery strategy

## Success Criteria
- [ ] Data integrity: 100% validation passed
- [ ] Performance: Response times within 120% of baseline
- [ ] Error rate: < 0.1% in first hour
- [ ] User impact: Minimal complaints
- [ ] Migration completed within planned window

## Team Responsibilities
| Role | Responsibilities |
|------|-----------------|
| Migration Lead | Overall coordination, decision making |
| DBA | Database operations, data validation |
| Infrastructure | System operations, monitoring |
| QA | Testing, validation, user acceptance |
| Product Owner | Business validation, user communication |

EOF

    echo -e "${GREEN}✅ Traditional migration timeline generated: migration-timeline-traditional.md${NC}"
}

# Blue-Green方式タイムライン生成
generate_blue_green_timeline() {
    echo "Generating Blue-Green Migration Timeline..."
    echo ""
    
    # 時間設定
    PREP_START="${START_TIME}"
    GREEN_DEPLOY_START=$(add_minutes "$PREP_START" 30)
    TRAFFIC_10_START=$(add_minutes "$GREEN_DEPLOY_START" 20)
    MONITOR_1_START=$(add_minutes "$TRAFFIC_10_START" 5)
    TRAFFIC_50_START=$(add_minutes "$MONITOR_1_START" 30)
    MONITOR_2_START=$(add_minutes "$TRAFFIC_50_START" 5)
    TRAFFIC_100_START=$(add_minutes "$MONITOR_2_START" 20)
    FINAL_VALIDATION=$(add_minutes "$TRAFFIC_100_START" 10)
    CLEANUP_START=$(add_minutes "$FINAL_VALIDATION" 15)
    
    # タイムライン生成
    cat > migration-timeline-blue-green.md << EOF
# PostgreSQL Migration Timeline - Blue-Green Method
**Date**: ${MIGRATION_DATE}  
**Start**: ${START_TIME} JST  
**Type**: Blue-Green Deployment (Minimal Downtime)

## Pre-Migration Phase
### ${PREP_START} - Preparation Start
- [ ] **Team Assembly** (30 min)
  - All team members join migration call
  - Final GO/NO-GO decision
  - Blue environment (MySQL) status check
  - Green environment (PostgreSQL) readiness

- [ ] **Environment Validation**
  - Blue environment health: ✅
  - Green environment health: ✅
  - Load balancer configuration: ✅
  - Monitoring systems: ✅

### $(add_minutes "$PREP_START" 15) - Data Synchronization Check
- [ ] **Final Data Sync**
  \`\`\`bash
  ./scripts/final-data-sync.sh
  \`\`\`
  
- [ ] **Data Integrity Verification**
  \`\`\`bash
  ./scripts/verify-data-consistency.sh
  \`\`\`

### $(add_minutes "$PREP_START" 25) - Traffic Routing Preparation
- [ ] **Load Balancer Configuration**
  \`\`\`bash
  ./scripts/configure-blue-green-routing.sh
  \`\`\`
  
- [ ] **Monitoring Enhancement**
  \`\`\`bash
  ./scripts/enable-migration-monitoring.sh
  \`\`\`

## Green Environment Deployment
### ${GREEN_DEPLOY_START} - Green Environment Final Setup
- [ ] **PostgreSQL Service Validation**
  \`\`\`bash
  ./scripts/validate-green-environment.sh
  \`\`\`
  
- [ ] **Performance Baseline Capture**
  \`\`\`bash
  ./scripts/capture-green-baseline.sh
  \`\`\`
  
- [ ] **Canary Deployment Ready**
  - Green environment fully operational
  - All services healthy
  - Monitoring active

## Phase 1: 10% Traffic Migration
### ${TRAFFIC_10_START} - Start 10% Traffic Shift
- [ ] **Initiate Traffic Shift**
  \`\`\`bash
  ./scripts/shift-traffic.sh --percentage 10 --target green
  \`\`\`
  
- [ ] **Immediate Monitoring**
  - Error rate: Target < 0.1%
  - Response time: Target < 2x baseline
  - Database connections: Monitor pool usage

### ${MONITOR_1_START} - Extended Monitoring Phase 1 (30 min)
- [ ] **Performance Metrics Tracking**
  \`\`\`bash
  ./scripts/monitor-migration-metrics.sh --phase 1 --duration 30m
  \`\`\`
  
- [ ] **Quality Gates Check**
  - [ ] Error rate < 0.1% ✅
  - [ ] Response time < 2000ms ✅
  - [ ] Database health green ✅
  - [ ] No critical alerts ✅
  
- [ ] **User Feedback Monitoring**
  - Monitor support channels
  - Check for user-reported issues
  - Validate core functionality

### $(add_minutes "$MONITOR_1_START" 15) - Phase 1 Mid-Point Review
- [ ] **Decision Point: Continue or Rollback**
  - Review metrics dashboard
  - Team consensus on quality
  - GO/NO-GO for Phase 2

## Phase 2: 50% Traffic Migration
### ${TRAFFIC_50_START} - Start 50% Traffic Shift
- [ ] **Increase Traffic Shift**
  \`\`\`bash
  ./scripts/shift-traffic.sh --percentage 50 --target green
  \`\`\`
  
- [ ] **Load Testing Validation**
  - Higher load on PostgreSQL
  - Connection pool stress test
  - Performance under load

### ${MONITOR_2_START} - Extended Monitoring Phase 2 (20 min)
- [ ] **Performance Metrics Tracking**
  \`\`\`bash
  ./scripts/monitor-migration-metrics.sh --phase 2 --duration 20m
  \`\`\`
  
- [ ] **Capacity Validation**
  - Database CPU usage < 80%
  - Memory usage < 85%
  - Connection pool utilization < 70%
  
- [ ] **Business Logic Validation**
  - Weekly report operations
  - File upload/download
  - User authentication
  - Report generation

### $(add_minutes "$MONITOR_2_START" 10) - Phase 2 Review
- [ ] **Final Decision Point**
  - All metrics within acceptable range
  - No critical issues detected
  - Team approval for full migration

## Phase 3: 100% Traffic Migration
### ${TRAFFIC_100_START} - Complete Traffic Shift
- [ ] **Full Migration Execution**
  \`\`\`bash
  ./scripts/shift-traffic.sh --percentage 100 --target green
  \`\`\`
  
- [ ] **Blue Environment Graceful Shutdown**
  \`\`\`bash
  ./scripts/graceful-shutdown-blue.sh
  \`\`\`
  
- [ ] **Connection Cleanup**
  - Drain existing connections
  - Close MySQL connections
  - Validate all traffic on PostgreSQL

### ${FINAL_VALIDATION} - Final Validation
- [ ] **Comprehensive Testing**
  \`\`\`bash
  ./scripts/full-system-validation.sh
  \`\`\`
  
- [ ] **Data Consistency Final Check**
  \`\`\`bash
  ./scripts/final-data-validation.sh
  \`\`\`
  
- [ ] **Performance Validation**
  - End-to-end response times
  - Database query performance
  - User session handling

## Post-Migration Cleanup
### ${CLEANUP_START} - Cleanup and Documentation
- [ ] **MySQL Environment Preparation for Backup**
  \`\`\`bash
  ./scripts/prepare-mysql-backup.sh
  \`\`\`
  
- [ ] **Update Documentation**
  - Migration completion report
  - Performance comparison report
  - Lessons learned documentation
  
- [ ] **Team Retrospective**
  - What went well
  - Areas for improvement
  - Process enhancements

## Continuous Monitoring (24 hours)
### Extended Monitoring Period
- [ ] **First 2 hours**: Intensive monitoring
  - Every 15 minutes status check
  - Real-time metrics dashboard
  - Immediate response to any issues
  
- [ ] **Next 6 hours**: Active monitoring
  - Hourly status reports
  - Performance trend analysis
  - User feedback collection
  
- [ ] **Following 16 hours**: Standard monitoring
  - Standard alerting procedures
  - Daily performance reports
  - Business as usual operations

## Rollback Procedures
### Immediate Rollback (if needed during any phase)
- [ ] **Emergency Rollback**
  \`\`\`bash
  ./scripts/emergency-rollback-blue-green.sh
  \`\`\`
  
- [ ] **Traffic Restoration**
  \`\`\`bash
  ./scripts/restore-blue-traffic.sh --percentage 100
  \`\`\`
  
- [ ] **Incident Management**
  - Immediate stakeholder notification
  - Issue documentation
  - Recovery planning

## Success Criteria
- [ ] **Zero Data Loss**: All data successfully migrated
- [ ] **Minimal Downtime**: < 5 minutes user-visible impact
- [ ] **Performance Maintained**: < 120% of baseline response times
- [ ] **Error Rate**: < 0.1% throughout migration
- [ ] **User Satisfaction**: < 5% complaint rate

## Quality Gates
### Phase 1 Gates (10% traffic)
- [ ] Error rate < 0.1%
- [ ] P95 response time < 2000ms
- [ ] Database health: GREEN
- [ ] No critical alerts

### Phase 2 Gates (50% traffic)
- [ ] Error rate < 0.1%
- [ ] P95 response time < 2000ms
- [ ] CPU usage < 80%
- [ ] Memory usage < 85%

### Phase 3 Gates (100% traffic)
- [ ] Error rate < 0.1%
- [ ] All core functionality verified
- [ ] Performance within acceptable range
- [ ] No user-reported critical issues

## Team Communication
### Communication Channels
- **Primary**: Slack #migration-live
- **Secondary**: Microsoft Teams Migration Room
- **Emergency**: Phone bridge + SMS escalation

### Status Update Schedule
- Every 15 minutes during active phases
- Every 30 minutes during monitoring phases
- Immediate updates on any issues or decisions

### Stakeholder Updates
- **Start of migration**: All stakeholders
- **After Phase 1**: Management team
- **After Phase 2**: Management team  
- **Completion**: All stakeholders + users

EOF

    echo -e "${GREEN}✅ Blue-Green migration timeline generated: migration-timeline-blue-green.md${NC}"
}

# 3. チェックリスト生成
echo -e "${BLUE}3. Generating Pre-Migration Checklist${NC}"
echo "====================================="
echo ""

cat > pre-migration-checklist.md << EOF
# Pre-Migration Checklist

## 1 Week Before Migration
- [ ] **Team Training**
  - All team members familiar with procedures
  - Rollback procedures tested and understood
  - Emergency contact list verified
  
- [ ] **Environment Preparation**
  - PostgreSQL environment fully configured
  - Blue-Green infrastructure tested
  - Monitoring and alerting configured
  
- [ ] **Testing Completion**
  - Data migration tested with sample data
  - Performance testing completed
  - Rollback procedures validated
  
- [ ] **Communication**
  - User notification sent (1 week advance)
  - Stakeholder approval obtained
  - Maintenance window scheduled

## 3 Days Before Migration
- [ ] **Final Validation**
  - All migration scripts tested
  - Backup procedures verified
  - Team availability confirmed
  
- [ ] **Documentation Review**
  - Migration timeline reviewed
  - Runbooks updated
  - Emergency procedures documented
  
- [ ] **Infrastructure Check**
  - Server capacity verified
  - Network connectivity tested
  - Monitoring systems ready

## 1 Day Before Migration
- [ ] **Final Preparation**
  - User reminder notification sent
  - Team final briefing completed
  - All tools and scripts ready
  
- [ ] **System Status**
  - Both environments healthy
  - No ongoing incidents
  - Backup completed and verified
  
- [ ] **Go/No-Go Decision**
  - Weather conditions acceptable
  - No major business events
  - Team consensus achieved

## Day of Migration (2 hours before)
- [ ] **Final Checks**
  - System health verified
  - Data sync up to date
  - Team assembled and ready
  
- [ ] **Last Minute Validation**
  - No critical issues detected
  - User activity at expected low levels
  - All stakeholders notified

EOF

echo -e "${GREEN}✅ Pre-migration checklist generated: pre-migration-checklist.md${NC}"

# 4. 監視スクリプト生成
echo ""
echo -e "${BLUE}4. Generating Monitoring Scripts${NC}"
echo "================================"
echo ""

cat > migration-monitor.sh << 'EOF'
#!/bin/bash

# PostgreSQL移行監視スクリプト
# リアルタイムでの移行状況監視とアラート

set -e

PHASE=${1:-"unknown"}
DURATION=${2:-"30m"}
ALERT_THRESHOLD_ERROR_RATE=0.1
ALERT_THRESHOLD_RESPONSE_TIME=2000

echo "================================================"
echo "PostgreSQL Migration Monitor"
echo "Phase: $PHASE | Duration: $DURATION"
echo "================================================"

start_time=$(date +%s)
duration_seconds=$(echo "$DURATION" | sed 's/m/*60/' | sed 's/h/*3600/' | bc)
end_time=$((start_time + duration_seconds))

while [ $(date +%s) -lt $end_time ]; do
    current_time=$(date '+%Y-%m-%d %H:%M:%S')
    echo ""
    echo "[$current_time] Migration Status Check"
    echo "======================================"
    
    # Error rate check
    error_rate=$(curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | \
                jq -r '.data.result[0].value[1] // 0' | \
                awk '{printf "%.3f", $1 * 100}')
    
    # Response time check  
    response_time=$(curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | \
                   jq -r '.data.result[0].value[1] // 0' | \
                   awk '{printf "%.0f", $1 * 1000}')
    
    # Database connections
    db_connections=$(curl -s "http://localhost:9090/api/v1/query?query=postgresql_connections_active" | \
                    jq -r '.data.result[0].value[1] // 0')
    
    echo "  Error Rate: ${error_rate}% (threshold: ${ALERT_THRESHOLD_ERROR_RATE}%)"
    echo "  P95 Response Time: ${response_time}ms (threshold: ${ALERT_THRESHOLD_RESPONSE_TIME}ms)"
    echo "  Active DB Connections: ${db_connections}"
    
    # Alert checks
    if (( $(echo "$error_rate > $ALERT_THRESHOLD_ERROR_RATE" | bc -l) )); then
        echo "  🚨 ALERT: Error rate exceeded threshold!"
        # Send alert notification
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"🚨 Migration Alert: Error rate ${error_rate}% exceeded threshold ${ALERT_THRESHOLD_ERROR_RATE}%\"}" \
             "${SLACK_WEBHOOK_URL}" || true
    fi
    
    if (( $(echo "$response_time > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        echo "  🚨 ALERT: Response time exceeded threshold!"
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"🚨 Migration Alert: Response time ${response_time}ms exceeded threshold ${ALERT_THRESHOLD_RESPONSE_TIME}ms\"}" \
             "${SLACK_WEBHOOK_URL}" || true
    fi
    
    sleep 60  # Check every minute
done

echo ""
echo "Monitoring period completed for Phase: $PHASE"
EOF

chmod +x migration-monitor.sh
echo -e "${GREEN}✅ Monitoring script generated: migration-monitor.sh${NC}"

# 5. 最終サマリー
echo ""
echo "================================================"
echo -e "${CYAN}Timeline Generation Complete${NC}"
echo "================================================"
echo ""

echo "Generated files:"
if [ "$MIGRATION_TYPE" = "traditional" ]; then
    echo "  📄 migration-timeline-traditional.md"
else
    echo "  📄 migration-timeline-blue-green.md"
fi
echo "  📄 pre-migration-checklist.md"
echo "  📄 migration-monitor.sh"
echo ""

echo "Migration Summary:"
echo "  📅 Date: ${MIGRATION_DATE}"
echo "  🕐 Start Time: ${START_TIME} JST"
echo "  🔄 Type: ${MIGRATION_TYPE}"
echo ""

echo "Next steps:"
echo "  1. Review generated timeline document"
echo "  2. Complete pre-migration checklist"
echo "  3. Schedule team review meeting"
echo "  4. Obtain final stakeholder approval"
echo "  5. Execute migration as planned"
echo ""

echo -e "${GREEN}Timeline generation completed successfully!${NC}"