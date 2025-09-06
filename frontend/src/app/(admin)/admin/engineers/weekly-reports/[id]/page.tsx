'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Divider, Chip, Button, TextField, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Avatar } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Comment as CommentIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { ExportMenu, StatusChip } from '@/components/common';
import { useRouter, notFound } from 'next/navigation';
import { formatDate } from '@/utils/dateUtils';
import { exportWeeklyReportAsPDF } from '@/utils/pdfExportUtils';
import { exportToCSV } from '@/utils/exportUtils';
import { useToast } from '@/components/common/Toast';
import { queryClient, queryKeys } from '@/lib/tanstack-query';
import { adminWeeklyReportApi } from '@/lib/api/admin/weeklyReport';
import { useWeeklyReportDetailQuery } from '@/hooks/admin/useWeeklyReportsQuery';
import { WEEKLY_REPORT_STATUS_LABELS } from '@/constants/weeklyReport';

// 実データ取得に切り替え

export default function WeeklyReportDetail({ params }: any) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { data: report, isLoading, error, refetch } = useWeeklyReportDetailQuery(params.id);
  const [comment, setComment] = useState('');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'return' | null>(null);

  // データ取得後にコメント初期値を同期
  React.useEffect(() => {
    if (report) setComment(report.manager_comment || '');
  }, [report]);

  const handleCommentSubmit = async () => {
    try {
      await adminWeeklyReportApi.commentWeeklyReport(params.id, { comment: comment.trim() });
      showSuccess('コメントを保存しました');
      setIsEditingComment(false);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReports() });
    } catch (e: any) {
      showError(e?.message || 'コメントの保存に失敗しました');
    }
  };

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await adminWeeklyReportApi.approveWeeklyReport(params.id, comment || undefined);
      showSuccess('承認しました');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReports() });
    } catch (e: any) {
      showError(e?.message || '承認に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!comment || comment.trim().length === 0) {
      showError('却下にはコメントが必要です');
      return;
    }
    setActionLoading('reject');
    try {
      await adminWeeklyReportApi.rejectWeeklyReport(params.id, comment.trim());
      showSuccess('却下しました');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReports() });
    } catch (e: any) {
      showError(e?.message || '却下に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async () => {
    if (!comment || comment.trim().length === 0) {
      showError('差し戻しにはコメントが必要です');
      return;
    }
    setActionLoading('return');
    try {
      await adminWeeklyReportApi.returnWeeklyReport(params.id, comment.trim());
      showSuccess('差し戻しました');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWeeklyReports() });
    } catch (e: any) {
      showError(e?.message || '差し戻しに失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (format: string) => {
    setExportLoading(true);
    try {
      if (!report) return;
      if (format === 'pdf') {
        const pdfData = {
          user_name: report.user_name,
          start_date: report.start_date,
          end_date: report.end_date,
          status: (report as any).status,
          total_work_hours: (report as any).total_work_hours,
          manager_comment: report.manager_comment,
          project_summary: (report as any).project_summary,
          weekly_achievement: (report as any).weekly_achievement,
          issues: (report as any).issues,
          next_week_plan: (report as any).next_week_plan,
          mood: (report as any).mood,
          overtime_hours: (report as any).overtime_hours,
        };
        exportWeeklyReportAsPDF(pdfData as any);
        showSuccess('PDFエクスポートを開始しました');
      } else if (format === 'csv') {
        const filename = `weekly_report_${report.user_name}_${formatDate(report.start_date, 'yyyyMMdd')}`;
        const data = [{
          エンジニア名: report.user_name,
          メールアドレス: report.user_email,
          週開始日: formatDate(report.start_date),
          週終了日: formatDate(report.end_date),
          ステータス: WEEKLY_REPORT_STATUS_LABELS[(report as any).status as keyof typeof WEEKLY_REPORT_STATUS_LABELS] || String((report as any).status),
          総勤務時間: `${(report as any).total_work_hours ?? ''}`,
          管理者コメント: report.manager_comment || '',
          提出日時: report.submitted_at ? formatDate(report.submitted_at, 'yyyy/MM/dd HH:mm') : '',
        }];
        exportToCSV(data, filename);
        showSuccess('CSVファイルをダウンロードしました');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer
        title="週報詳細"
        backButton={{
          label: '週報一覧に戻る',
          onClick: () => router.push('/admin/engineers/weekly-reports'),
        }}
      >
        <Typography>読み込み中...</Typography>
      </PageContainer>
    );
  }

  if (error || !report) {
    const status = (error as any)?.response?.status;
    const code = (error as any)?.enhanced?.code || (error as any)?.code;
    if (status === 404 || code === 'not_found' || code === 'NOT_FOUND') {
      notFound();
    }
    return (
      <PageContainer
        title="週報詳細"
        backButton={{
          label: '週報一覧に戻る',
          onClick: () => router.push('/admin/engineers/weekly-reports'),
        }}
      >
        <Alert severity="error">週報の取得に失敗しました</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="週報詳細"
      backButton={{
        label: '週報一覧に戻る',
        onClick: () => router.push('/admin/engineers/weekly-reports'),
      }}
      action={
        <ExportMenu
          onExport={handleExport}
          formats={['pdf', 'csv']}
          buttonText="エクスポート"
          loading={exportLoading}
        />
      }
    >
      <Grid container spacing={3}>
        {/* 基本情報 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 48, height: 48 }}>
                    {report.user_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{report.user_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.user_email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<CalendarIcon />}
                    label={`${formatDate(report.start_date)} 〜 ${formatDate(report.end_date)}`}
                    variant="outlined"
                  />
                  <StatusChip status={(report as any).status} />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 週次サマリー */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  週次サマリー
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">{(report as any).total_work_hours ?? '-'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        総勤務時間
                      </Typography>
                    </Box>
                  </Grid>
                  {/* 必要に応じて指標を追加 */}
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{report.daily_records?.length ?? 0}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        勤務日数
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 勤務場所情報（API提供時に有効化） */}

              {/* 週次コメント */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  週次コメント
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{(report as any).weekly_remarks || 'コメントなし'}</Typography>
                </Paper>
              </Box>

              {/* 日次記録 */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  日次記録
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>日付</TableCell>
                        <TableCell align="right">社内</TableCell>
                        <TableCell align="right">クライアント</TableCell>
                        <TableCell align="right">合計</TableCell>
                        <TableCell>備考</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.daily_records?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {formatDate(record.record_date)}
                            {record.is_holiday && (
                              <Chip label="休日" size="small" sx={{ ml: 1 }} />
                            )}
                          </TableCell>
                          <TableCell align="right">{record.company_work_hours}h</TableCell>
                          <TableCell align="right">{record.client_work_hours}h</TableCell>
                          <TableCell align="right">
                            <strong>{record.total_work_hours}h</strong>
                          </TableCell>
                          <TableCell>{record.remarks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 管理者コメント */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">管理者コメント</Typography>
                {!isEditingComment && (
                  <IconButton onClick={() => setIsEditingComment(true)}>
                    <CommentIcon />
                  </IconButton>
                )}
              </Box>

              {isEditingComment ? (
                <Box data-testid="wr-reason">
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    inputProps={{ 'data-testid': 'wr-reason-input' }}
                    placeholder="週報に対するコメントを入力"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setComment(report.manager_comment || '');
                        setIsEditingComment(false);
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleCommentSubmit}
                    >
                      保存
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  {comment ? (
                    <>
                      <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                        <Typography variant="body2">{comment}</Typography>
                      </Paper>
                      {report.commented_at && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          最終更新: {formatDate(report.commented_at)}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Alert severity="info">
                      まだコメントがありません
                    </Alert>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* 提出情報 */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>提出情報</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    作成日時
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(report.created_at)}
                  </Typography>
                </Box>
                {report.submitted_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      提出日時
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(report.submitted_at)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 承認操作 */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>承認操作</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                却下/差し戻しにはコメントが必須です。承認時のコメントは任意です。
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button data-testid="wr-approve" variant="contained" color="success" onClick={handleApprove} disabled={actionLoading !== null}>
                  承認
                </Button>
                <Button data-testid="wr-reject" variant="contained" color="error" onClick={handleReject} disabled={actionLoading !== null}>
                  却下
                </Button>
                <Button data-testid="wr-remand" variant="outlined" color="warning" onClick={handleReturn} disabled={actionLoading !== null}>
                  差し戻し
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
