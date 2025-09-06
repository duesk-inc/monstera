import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  IconButton,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { DataGridTable, DataGridColumn } from '@/components/common/table';
import { FilterBar, FilterOption } from '@/components/common/layout';
import { DateRangePicker, StatusChip, CommonPagination } from '@/components/common';
import { useWeeklyReports } from '@/hooks/admin/useWeeklyReportsQuery';
import { AdminWeeklyReport } from '@/types/admin/weeklyReport';
import { formatDate } from '@/utils/dateUtils';
import dayjs, { Dayjs } from 'dayjs';
import { PAGINATION } from '@/constants/pagination';
import { CommentDialog } from '../dialogs/CommentDialog';
import { ExportButton, ExportProgressDialog } from '@/components/features/export';
import { useExportJob } from '@/hooks/admin/useExportJob';
import { adminWeeklyReportApi } from '@/lib/api/admin/weeklyReport';
import type { ExportJobFormat, WeeklyReportExportParams } from '@/types/export';
import { useToast } from '@/components/common/Toast';
import { WEEKLY_REPORT_STATUS } from '@/constants/weeklyReport';

const statusOptions: FilterOption[] = [
  { value: '', label: 'すべて' },
  { value: WEEKLY_REPORT_STATUS.NOT_SUBMITTED, label: '未提出' },
  { value: WEEKLY_REPORT_STATUS.DRAFT, label: '下書き' },
  { value: WEEKLY_REPORT_STATUS.SUBMITTED, label: '提出済み' },
  { value: WEEKLY_REPORT_STATUS.APPROVED, label: '承認済み' },
  { value: WEEKLY_REPORT_STATUS.REJECTED, label: '却下' },
  { value: WEEKLY_REPORT_STATUS.RETURNED, label: '差し戻し' },
];

export const WeeklyReportListTab: React.FC = () => {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<AdminWeeklyReport | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { reports, total, loading, error, refresh } = useWeeklyReports({
    status,
    search,
    date_from: startDate?.format('YYYY-MM-DD') || '',
    date_to: endDate?.format('YYYY-MM-DD') || '',
    page,
    limit: PAGINATION.DEFAULT_SIZES.WEEKLY_REPORTS,
  });

  // エクスポートジョブ管理
  const { createJob, jobStatus, isPolling, cancelJob, resetJob } = useExportJob({
    onError: (error) => {
      showError('エクスポートに失敗しました');
    },
  });

  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExport = async (format: ExportJobFormat) => {
    // パラメータを準備
    const params: WeeklyReportExportParams = {
      start_date: startDate?.format('YYYY-MM-DD') || '',
      end_date: endDate?.format('YYYY-MM-DD') || '',
    };

    if (status) {
      params.status = [status];
    }

    // CSVは同期ダウンロードでContent-Disposition対応
    if (format === 'csv') {
      try {
        await adminWeeklyReportApi.exportWeeklyReports({
          format: 'csv',
          status,
          start_date: params.start_date,
          end_date: params.end_date,
        });
        showSuccess('CSVエクスポートを開始しました');
      } catch (e) {
        showError('エクスポートに失敗しました');
      }
      return;
    }

    // それ以外（例: excel）はジョブで実行
    createJob({ job_type: 'weekly_report', format, parameters: params });
    setShowExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
    if (!isPolling) {
      resetJob();
    }
  };

  const handleCommentClick = (report: AdminWeeklyReport) => {
    setSelectedReport(report);
    setCommentDialogOpen(true);
  };

  const columns: DataGridColumn<AdminWeeklyReport>[] = [
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
            <Typography variant="body2" fontWeight="medium">
              {row.user_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.user_email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'week',
      label: '週',
      minWidth: 180,
      format: (value, row) => (
        <Box>
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
      id: 'status',
      label: 'ステータス',
      minWidth: 120,
      format: (value, row) => (
        <StatusChip status={row.status as any} />
      ),
    },
    {
      id: 'total_work_hours',
      label: '総勤務時間',
      minWidth: 100,
      format: (value) => `${value}時間`,
    },
    {
      id: 'comment_status',
      label: 'コメント',
      minWidth: 100,
      format: (value, row) => (
        <Chip
          label={row.manager_comment ? '返信済' : '未返信'}
          size="small"
          color={row.manager_comment ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      id: 'actions',
      label: 'アクション',
      minWidth: 120,
      format: (value, row) => (
        <Button
          size="small"
          startIcon={<CommentIcon />}
          onClick={(e) => {
            e.stopPropagation();
            handleCommentClick(row);
          }}
        >
          {row.manager_comment ? '編集' : 'コメント'}
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={refresh}>
          再読み込み
        </Button>
      }>
        データの読み込みに失敗しました。
      </Alert>
    );
  }

  return (
    <Box>
      {/* フィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FilterBar
            searchValue={search}
            onSearchChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            searchPlaceholder="エンジニア名で検索"
            filterValue={status}
            onFilterChange={(e) => {
              setStatus(e.target.value as string);
              setPage(1);
            }}
            filterLabel="ステータス"
            filterOptions={statusOptions}
            onRefresh={refresh}
            refreshDisabled={loading}
            actions={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span data-testid="wr-csv-button">
                  <ExportButton
                    onExport={handleExport}
                    formats={['csv']}
                    buttonText="エクスポート"
                    loading={false}
                    disabled={loading}
                  />
                </span>
                <Typography variant="caption" color="text.secondary">
                  CSV (UTF-8+BOM)
                </Typography>
              </Box>
            }
          />
          <Box sx={{ mt: 2 }}>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(date) => {
                setStartDate(date);
                setPage(1);
              }}
              onEndDateChange={(date) => {
                setEndDate(date);
                setPage(1);
              }}
              startLabel="開始日"
              endLabel="終了日"
            />
          </Box>
        </CardContent>
      </Card>

      {/* データテーブル */}
      <Card>
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          <DataGridTable
            columns={columns}
            data={reports}
            keyField="id"
            loading={loading}
            emptyMessage="週報がありません"
            onRowClick={(row) => router.push(`/admin/engineers/weekly-reports/${row.id}`)}
            stickyHeader
            maxHeight={600}
          />
          {total > 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                全{total}件中 {reports.length}件を表示
              </Typography>
              <CommonPagination
                page={page}
                count={Math.ceil(total / PAGINATION.DEFAULT_SIZES.WEEKLY_REPORTS)}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* コメントダイアログ */}
      <CommentDialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        report={selectedReport}
        onSubmit={refresh}
      />

      {/* エクスポート進捗ダイアログ */}
      <ExportProgressDialog
        open={showExportDialog}
        onClose={handleCloseExportDialog}
        jobStatus={jobStatus}
        isPolling={isPolling}
        onCancel={cancelJob}
      />
    </Box>
  );
};
