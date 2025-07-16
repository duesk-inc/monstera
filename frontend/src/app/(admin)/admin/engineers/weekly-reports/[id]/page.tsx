'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Divider, Chip, Button, TextField, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Avatar } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as ArrowBackIcon,
  Comment as CommentIcon,
  Download as DownloadIcon,
  Mood as MoodIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { StatusChip, ExportMenu } from '@/components/common';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/dateUtils';
import { exportWeeklyReportAsPDF } from '@/utils/pdfExportUtils';
import { exportToCSV, formatWeeklyReportsForExport } from '@/utils/exportUtils';
import { useToast } from '@/components/common/Toast';

// ダミーデータ
const dummyReport = {
  id: '1',
  user_id: 'u1',
  user_name: '山田 太郎',
  user_email: 'yamada@duesk.co.jp',
  start_date: new Date('2024-01-08'),
  end_date: new Date('2024-01-14'),
  status: 'submitted',
  mood: 4,
  total_work_hours: 40,
  client_work_hours: 32,
  manager_comment: '良い調子で進んでいますね。引き続き頑張ってください。',
  commented_at: new Date('2024-01-15'),
  submitted_at: new Date('2024-01-14'),
  created_at: new Date('2024-01-14'),
  weekly_remarks: '今週は新機能の実装を進めました。来週はテストを重点的に行う予定です。',
  workplace_name: '株式会社ABC',
  workplace_hours: '9:00-18:00',
  daily_records: [
    {
      id: 'd1',
      record_date: new Date('2024-01-08'),
      is_holiday: false,
      is_holiday_work: false,
      company_work_hours: 2,
      client_work_hours: 6,
      total_work_hours: 8,
      remarks: '新機能の設計',
    },
    {
      id: 'd2',
      record_date: new Date('2024-01-09'),
      is_holiday: false,
      is_holiday_work: false,
      company_work_hours: 1,
      client_work_hours: 7,
      total_work_hours: 8,
      remarks: '実装作業',
    },
    {
      id: 'd3',
      record_date: new Date('2024-01-10'),
      is_holiday: false,
      is_holiday_work: false,
      company_work_hours: 1,
      client_work_hours: 7,
      total_work_hours: 8,
      remarks: '実装作業続き',
    },
    {
      id: 'd4',
      record_date: new Date('2024-01-11'),
      is_holiday: false,
      is_holiday_work: false,
      company_work_hours: 2,
      client_work_hours: 6,
      total_work_hours: 8,
      remarks: 'コードレビュー対応',
    },
    {
      id: 'd5',
      record_date: new Date('2024-01-12'),
      is_holiday: false,
      is_holiday_work: false,
      company_work_hours: 2,
      client_work_hours: 6,
      total_work_hours: 8,
      remarks: 'ドキュメント作成',
    },
  ],
};

const moodData = {
  1: { icon: '😞', label: 'サイテー', color: 'error' },
  2: { icon: '😕', label: 'イマイチ', color: 'warning' },
  3: { icon: '😐', label: 'ふつう', color: 'info' },
  4: { icon: '😊', label: 'イイ感じ', color: 'success' },
  5: { icon: '🤩', label: 'サイコー', color: 'success' },
} as const;

export default function WeeklyReportDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [comment, setComment] = useState(dummyReport.manager_comment || '');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleCommentSubmit = () => {
    // TODO: API呼び出し
    console.log('Comment updated:', comment);
    setIsEditingComment(false);
  };

  const handleExport = async (format: string) => {
    setExportLoading(true);
    try {
      if (format === 'pdf') {
        // PDFエクスポート
        exportWeeklyReportAsPDF(dummyReport as any);
        showSuccess('PDFエクスポートを開始しました');
      } else if (format === 'csv') {
        // CSVエクスポート
        const exportData = formatWeeklyReportsForExport([dummyReport as any]);
        const filename = `weekly_report_${dummyReport.user_name}_${formatDate(dummyReport.start_date, 'yyyyMMdd')}`;
        exportToCSV(exportData, filename);
        showSuccess('CSVファイルをダウンロードしました');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError('エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  const mood = moodData[dummyReport.mood as keyof typeof moodData];

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
                    {dummyReport.user_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{dummyReport.user_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dummyReport.user_email}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<CalendarIcon />}
                    label={`${formatDate(dummyReport.start_date)} 〜 ${formatDate(dummyReport.end_date)}`}
                    variant="outlined"
                  />
                  <StatusChip
                    status={dummyReport.status === 'submitted' ? '提出済み' : '下書き'}
                    color={dummyReport.status === 'submitted' ? 'success' : 'warning'}
                  />
                  <Chip
                    icon={<span style={{ fontSize: '1.2rem', marginRight: 4 }}>{mood.icon}</span>}
                    label={mood.label}
                    color={mood.color as any}
                    variant="outlined"
                  />
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
                      <Typography variant="h4" color="primary">
                        {dummyReport.total_work_hours}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        総勤務時間
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary">
                        {dummyReport.client_work_hours}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        クライアント先
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">
                        {dummyReport.total_work_hours - dummyReport.client_work_hours}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        社内業務
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">
                        {dummyReport.daily_records.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        勤務日数
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 勤務場所情報 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  勤務場所情報
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Chip
                    icon={<LocationIcon />}
                    label={dummyReport.workplace_name}
                    variant="outlined"
                  />
                  <Chip
                    icon={<TimeIcon />}
                    label={dummyReport.workplace_hours}
                    variant="outlined"
                  />
                </Box>
              </Box>

              {/* 週次コメント */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  週次コメント
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    {dummyReport.weekly_remarks || 'コメントなし'}
                  </Typography>
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
                      {dummyReport.daily_records.map((record) => (
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
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="週報に対するコメントを入力"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setComment(dummyReport.manager_comment || '');
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
                      {dummyReport.commented_at && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          最終更新: {formatDate(dummyReport.commented_at)}
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
                    {formatDate(dummyReport.created_at)}
                  </Typography>
                </Box>
                {dummyReport.submitted_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      提出日時
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(dummyReport.submitted_at)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}