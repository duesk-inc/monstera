import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarMonthIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useMonthlySummary } from '@/hooks/admin/useMonthlySummary';
import { ExportButton, ExportProgressDialog } from '@/components/features/export';
import { useExportJob } from '@/hooks/admin/useExportJob';
import type { ExportJobFormat, MonthlySummaryExportParams } from '@/types/export';
import { useToast } from '@/components/common/Toast';
import type { SelectChangeEvent } from '@mui/material';

export const MonthlyReportTab: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState<string>('');

  const { summary, isLoading, refetch } = useMonthlySummary({
    year: selectedYear,
    month: selectedMonth,
    departmentId: departmentId || undefined,
  });

  // エクスポートジョブ管理
  const { createJob, jobStatus, isPolling, cancelJob, resetJob } = useExportJob({
    onError: (error) => {
      showError('エクスポートに失敗しました');
    },
  });

  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(event.target.value as number);
  };

  const handleMonthChange = (event: SelectChangeEvent<number>) => {
    setSelectedMonth(event.target.value as number);
  };

  const handleExport = (format: ExportJobFormat) => {
    // パラメータを準備
    const params: MonthlySummaryExportParams = {
      year: selectedYear,
      month: selectedMonth,
    };

    if (departmentId) {
      params.department_id = departmentId;
    }

    // エクスポートジョブを作成
    createJob({
      job_type: 'monthly_summary',
      format,
      parameters: params,
    });

    // 進捗ダイアログを表示
    setShowExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
    if (!isPolling) {
      resetJob();
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon sx={{ color: 'success.main' }} />;
      case 'down':
        return <TrendingDownIcon sx={{ color: 'error.main' }} />;
      case 'stable':
        return <TrendingFlatIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <Box>
      {/* ヘッダー部分 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          <CalendarMonthIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          月次サマリー
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          {/* 年月選択 */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>年</InputLabel>
            <Select value={selectedYear} onChange={handleYearChange} label="年">
              {[2023, 2024, 2025].map((year) => (
                <MenuItem key={year} value={year}>
                  {year}年
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>月</InputLabel>
            <Select value={selectedMonth} onChange={handleMonthChange} label="月">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <MenuItem key={month} value={month}>
                  {month}月
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="更新">
            <IconButton onClick={() => refetch()} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <ExportButton
            onExport={handleExport}
            formats={['excel', 'csv']}
            buttonText="エクスポート"
            size="small"
            disabled={isLoading || !summary}
          />
        </Box>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : summary ? (
        <Grid container spacing={3}>
          {/* 概要カード */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      総エンジニア数
                    </Typography>
                    <Typography variant="h4">
                      <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {summary.total_users}名
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      提出率
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h4">
                        {summary.monthly_stats.overall_submission_rate.toFixed(1)}%
                      </Typography>
                      {summary.comparison_data?.changes && (
                        <Box ml={1}>
                          {getTrendIcon(summary.comparison_data.changes.submission_rate_trend)}
                        </Box>
                      )}
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={summary.monthly_stats.overall_submission_rate}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      平均稼働時間
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h4">
                        {summary.monthly_stats.average_work_hours.toFixed(1)}h
                      </Typography>
                      {summary.comparison_data?.changes && (
                        <Box ml={1}>
                          {getTrendIcon(summary.comparison_data.changes.work_hours_trend)}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

            </Grid>
          </Grid>

          {/* 週次サマリー */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  週次サマリー
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>週</TableCell>
                        <TableCell align="right">提出率</TableCell>
                        <TableCell align="right">平均稼働</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.weekly_summaries.map((week) => (
                        <TableRow key={week.week_number}>
                          <TableCell>第{week.week_number}週</TableCell>
                          <TableCell align="right">
                            {week.submission_rate.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            {week.average_work_hours.toFixed(1)}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* トップパフォーマー */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  トップパフォーマー
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>エンジニア</TableCell>
                        <TableCell align="right">提出率</TableCell>
                        <TableCell align="right">稼働時間</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.top_performers.slice(0, 5).map((performer) => (
                        <TableRow key={performer.user_id}>
                          <TableCell>
                            <Typography variant="body2">{performer.user_name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {performer.department_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {performer.submission_rate.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            {performer.total_work_hours.toFixed(1)}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* アラートサマリー */}
          {summary.alert_summary.total_alerts > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                    アラートサマリー
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        総アラート数
                      </Typography>
                      <Typography variant="h6">{summary.alert_summary.total_alerts}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        高優先度
                      </Typography>
                      <Typography variant="h6" color="error">
                        {summary.alert_summary.high_severity}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        解決済み
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {summary.alert_summary.resolved_alerts}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">
                        未対応
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {summary.alert_summary.pending_alerts}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* 部署別統計 */}
          {summary.department_stats.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    部署別統計
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>部署</TableCell>
                          <TableCell align="right">人数</TableCell>
                          <TableCell align="right">提出率</TableCell>
                          <TableCell align="right">平均稼働時間</TableCell>
                          <TableCell align="right">平均ムード</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary.department_stats.map((dept) => (
                          <TableRow key={dept.department_id}>
                            <TableCell>{dept.department_name}</TableCell>
                            <TableCell align="right">{dept.user_count}名</TableCell>
                            <TableCell align="right">{dept.submission_rate.toFixed(1)}%</TableCell>
                            <TableCell align="right">{dept.average_work_hours.toFixed(1)}h</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={dept.average_mood.toFixed(1)}
                                size="small"
                                sx={{
                                  backgroundColor: getMoodColor(dept.average_mood),
                                  color: 'white',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            データが見つかりませんでした
          </Typography>
        </Box>
      )}

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