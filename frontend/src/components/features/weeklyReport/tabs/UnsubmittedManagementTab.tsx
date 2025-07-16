import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { DataGridTable, DataGridColumn, TableToolbar } from '@/components/common/table';
import { FilterBar, StatusCard } from '@/components/common';
import { BulkActionDialog, ExportMenu } from '@/components/common';
import { useUnsubmittedReports } from '@/hooks/admin/useUnsubmittedReports';
import { formatDate } from '@/utils/dateUtils';
import { 
  exportToCSV, 
  exportToExcel, 
  formatUnsubmittedReportsForExport,
  generateExportFilename 
} from '@/utils/exportUtils';
import { useToast } from '@/components/common/Toast';

interface UnsubmittedReport {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  department: string;
  manager_name: string;
  start_date: string;
  end_date: string;
  days_overdue: number;
  reminder_sent_at?: string;
  reminder_count: number;
}

export const UnsubmittedManagementTab: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState('');
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { 
    reports, 
    summary, 
    loading, 
    error, 
    refresh,
    sendReminders 
  } = useUnsubmittedReports({
    department_id: departmentFilter,
    min_days_overdue: daysFilter ? parseInt(daysFilter) : undefined,
  });

  const handleBulkReminder = async () => {
    try {
      await sendReminders(selectedIds);
      setBulkReminderOpen(false);
      setSelectedIds([]);
      refresh();
    } catch (error) {
      console.error('Failed to send reminders:', error);
    }
  };

  const handleExport = async (format: string) => {
    if (reports.length === 0) {
      showError('エクスポートするデータがありません');
      return;
    }

    setExportLoading(true);
    try {
      // エクスポート用にデータを整形
      const exportData = formatUnsubmittedReportsForExport(reports);
      const filename = generateExportFilename('unsubmitted_reports');

      if (format === 'csv') {
        exportToCSV(exportData, filename);
        showSuccess('CSVファイルをダウンロードしました');
      } else if (format === 'excel') {
        await exportToExcel(exportData, filename);
        showSuccess('Excelファイルをダウンロードしました');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  const columns: DataGridColumn<UnsubmittedReport>[] = [
    {
      id: 'user',
      label: 'エンジニア',
      minWidth: 200,
      format: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {row.user_name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium" data-testid="user-name">
              {row.user_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" data-testid="user-department">
              {row.department}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'week',
      label: '未提出週',
      minWidth: 180,
      format: (value, row) => (
        <Box data-testid="week-period">
          <Typography variant="body2">
            {formatDate(row.start_date)} 〜
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(row.end_date)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'days_overdue',
      label: '経過日数',
      minWidth: 120,
      sortable: true,
      format: (value, row) => {
        const severity = row.days_overdue >= 14 ? 'error' : 
                        row.days_overdue >= 7 ? 'warning' : 
                        'info';
        return (
          <Chip
            label={`${row.days_overdue}日`}
            size="small"
            color={severity}
            icon={row.days_overdue >= 14 ? <WarningIcon /> : undefined}
            data-testid="days-overdue-chip"
            data-severity={severity}
          />
        );
      },
    },
    {
      id: 'manager_name',
      label: 'マネージャー',
      minWidth: 150,
      format: (value) => (
        <Typography data-testid="manager-name">{value}</Typography>
      ),
    },
    {
      id: 'reminder_status',
      label: 'リマインド',
      minWidth: 150,
      format: (value, row) => {
        if (row.reminder_count === 0) {
          return <Typography variant="caption" color="text.secondary" data-testid="reminder-status">未送信</Typography>;
        }
        return (
          <Box data-testid="reminder-status">
            <Typography variant="caption">
              {row.reminder_count}回送信
            </Typography>
            {row.reminder_sent_at && (
              <Typography variant="caption" color="text.secondary" display="block">
                最終: {formatDate(row.reminder_sent_at)}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'アクション',
      minWidth: 120,
      align: 'center',
      format: (value, row) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<SendIcon />}
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await sendReminders([row.id]);
              showSuccess('リマインドを送信しました');
              refresh();
            } catch (error) {
              console.error('Failed to send reminder:', error);
            }
          }}
          data-testid="send-reminder-button"
        >
          送信
        </Button>
      ),
    },
  ];

  const selectedReports = reports.filter(r => selectedIds.includes(r.id));

  return (
    <Box data-testid="unsubmitted-management-tab">
      {/* サマリーカード */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatusCard
            title="未提出者数"
            value={summary?.total_unsubmitted || 0}
            icon={<PeopleIcon />}
            color="warning"
            data-testid="unsubmitted-total-card"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatusCard
            title="7日以上"
            value={summary?.overdue_7days || 0}
            icon={<ScheduleIcon />}
            color="warning"
            data-testid="overdue-7days-card"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatusCard
            title="14日以上"
            value={summary?.overdue_14days || 0}
            icon={<WarningIcon />}
            color="error"
            data-testid="overdue-14days-card"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatusCard
            title="エスカレーション対象"
            value={summary?.escalation_targets || 0}
            icon={<WarningIcon />}
            color="error"
            data-testid="escalation-targets-card"
          />
        </Grid>
      </Grid>

      {/* フィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FilterBar
            filterValue={departmentFilter}
            onFilterChange={(e) => setDepartmentFilter(e.target.value as string)}
            filterLabel="部署"
            filterOptions={[
              { value: '', label: 'すべて' },
              { value: 'dept1', label: '開発部' },
              { value: 'dept2', label: '営業部' },
            ]}
            onRefresh={refresh}
            refreshDisabled={loading}
            actions={
              <ExportMenu
                onExport={handleExport}
                formats={['excel', 'csv']}
                buttonText="エクスポート"
                loading={exportLoading}
                disabled={reports.length === 0}
                data-testid="export-button"
              />
            }
          />
        </CardContent>
      </Card>

      {/* データテーブル */}
      <Card>
        {selectedIds.length > 0 && (
          <TableToolbar
            numSelected={selectedIds.length}
            title="未提出者一覧"
            onBulkAction={() => setBulkReminderOpen(true)}
            bulkActionLabel="リマインド送信"
            bulkActionIcon={<SendIcon />}
            data-testid="bulk-send-reminder-button"
          />
        )}
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          <DataGridTable
            columns={columns}
            data={reports}
            keyField="id"
            loading={loading}
            emptyMessage="未提出者はいません"
            selectable
            selected={selectedIds}
            onSelectionChange={setSelectedIds}
            stickyHeader
            maxHeight={600}
            data-testid="unsubmitted-table"
          />
        </CardContent>
      </Card>

      {/* 一括リマインドダイアログ */}
      <BulkActionDialog
        open={bulkReminderOpen}
        onClose={() => setBulkReminderOpen(false)}
        onConfirm={handleBulkReminder}
        title="リマインド送信確認"
        message="選択したエンジニアにリマインドを送信します。"
        selectedCount={selectedIds.length}
        selectedItems={selectedReports.map(r => ({
          primary: r.user_name,
          secondary: `${r.department} • ${r.days_overdue}日経過`,
        }))}
        confirmText="送信"
        confirmColor="primary"
      />
    </Box>
  );
};