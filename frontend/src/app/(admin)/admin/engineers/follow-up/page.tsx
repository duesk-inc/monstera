'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Avatar, Alert, AlertTitle, FormControlLabel, Checkbox, Divider, List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction, Paper, Skeleton } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Warning as WarningIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarMonth as CalendarIcon,
  Notes as NotesIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  TrendingDown as TrendingDownIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { DataTable, DataTableColumn } from '@/components/common';
import { StatusChip } from '@/components/common';
import { formatDate } from '@/utils/dateUtils';
import { useFollowUpUsers } from '@/hooks/admin/useFollowUpQuery';
import { FollowUpUser } from '@/types/admin/followUp';
import { useToast } from '@/components/common/Toast';
import { FONT_SIZE } from '@/constants/typography';

const issueTypeColors: Record<string, any> = {
  '週報未提出': 'error',
  '稼働率低下': 'warning',
  '健康問題': 'info',
  '勤怠不安定': 'warning',
};

export default function FollowUpManagement() {
  const { users, loading, error, refresh } = useFollowUpUsers();
  const { showToast } = useToast();
  
  const [selectedUser, setSelectedUser] = useState<FollowUpUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [contactMethods, setContactMethods] = useState({
    email: true,
    phone: false,
    inPerson: false,
  });
  const [localUsers, setLocalUsers] = useState<FollowUpUser[]>([]);

  // ローカルステートを更新
  React.useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const handleFollowUpClick = (user: FollowUpUser) => {
    setSelectedUser(user);
    setFollowUpNotes('');
    setDialogOpen(true);
  };

  const handleFollowUpSubmit = () => {
    if (!selectedUser) return;
    
    // ローカルで管理（実際のAPIが実装されたら置き換える）
    const followUpData = {
      user_id: selectedUser.user_id,
      notes: followUpNotes,
      contact_methods: contactMethods,
      date: new Date().toISOString(),
    };
    
    console.log('Follow up submitted:', followUpData);
    showToast('フォローアップを記録しました');
    
    // ユーザーの最終フォローアップ日を更新
    const updatedUsers = localUsers.map(u => 
      u.user_id === selectedUser.user_id 
        ? { ...u, last_follow_up_date: new Date().toISOString() }
        : u
    );
    setLocalUsers(updatedUsers);
    
    setDialogOpen(false);
  };

  const handleResolveClick = (user: FollowUpUser) => {
    setSelectedUser(user);
    setResolveDialogOpen(true);
  };

  const handleResolveConfirm = () => {
    if (!selectedUser) return;
    
    // ローカルで管理（実際のAPIが実装されたら置き換える）
    console.log('Resolved follow up for:', selectedUser);
    showToast(`${selectedUser.user_name}さんのフォローアップを解決済みにしました`);
    
    setLocalUsers(localUsers.filter(u => u.user_id !== selectedUser.user_id));
    setResolveDialogOpen(false);
  };

  const getSeverityColor = (days?: number) => {
    if (!days) return 'info';
    if (days >= 21) return 'error';
    if (days >= 14) return 'warning';
    return 'info';
  };

  const getIssuesFromUser = (user: FollowUpUser) => {
    const issues = [];
    if (user.days_since_last_report && user.days_since_last_report >= 7) {
      issues.push('週報未提出');
    }
    if (user.follow_up_reason?.includes('稼働率')) {
      issues.push('稼働率低下');
    }
    if (user.follow_up_reason?.includes('健康') || user.follow_up_reason?.includes('体調')) {
      issues.push('健康問題');
    }
    if (user.follow_up_reason?.includes('勤怠')) {
      issues.push('勤怠不安定');
    }
    return issues.length > 0 ? issues : ['その他'];
  };

  const columns: DataTableColumn<FollowUpUser>[] = [
    {
      id: 'user_name',
      label: 'エンジニア',
      minWidth: 250,
      format: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 40, height: 40 }}>
            {row.user_name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.user_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.user_email || row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'issue_type' as keyof FollowUpUser,
      label: '問題',
      minWidth: 200,
      format: (value, row) => {
        const issues = getIssuesFromUser(row);
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {issues.map((issue: string) => (
              <Chip
                key={issue}
                label={issue}
                size="small"
                color={issueTypeColors[issue] || 'default'}
              />
            ))}
          </Box>
        );
      },
    },
    {
      id: 'follow_up_reason' as keyof FollowUpUser,
      label: 'フォローアップ理由',
      minWidth: 300,
      format: (value, row) => (
        <Typography variant="body2">{row.follow_up_reason || '要確認'}</Typography>
      ),
    },
    {
      id: 'last_report_date' as keyof FollowUpUser,
      label: '最終週報',
      minWidth: 150,
      format: (value, row) => (
        <Box>
          {row.last_report_date && (
            <>
              <Typography variant="body2">
                {formatDate(row.last_report_date)}
              </Typography>
              {row.days_since_last_report && (
                <Chip
                  label={`${row.days_since_last_report}日前`}
                  size="small"
                  color={getSeverityColor(row.days_since_last_report)}
                  variant="outlined"
                />
              )}
            </>
          )}
        </Box>
      ),
    },
    {
      id: 'last_follow_up_date' as keyof FollowUpUser,
      label: '最終フォローアップ',
      minWidth: 150,
      format: (value, row) => (
        <Typography variant="body2" color={row.last_follow_up_date ? 'text.primary' : 'text.secondary'}>
          {row.last_follow_up_date ? formatDate(row.last_follow_up_date) : '未実施'}
        </Typography>
      ),
    },
    {
      id: 'id' as keyof FollowUpUser,
      label: 'アクション',
      minWidth: 200,
      format: (value, row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              handleFollowUpClick(row);
            }}
          >
            フォロー
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              handleResolveClick(row);
            }}
          >
            解決
          </Button>
        </Box>
      ),
    },
  ];

  const stats = {
    total: localUsers.length,
    critical: localUsers.filter(u => u.days_since_last_report && u.days_since_last_report >= 21).length,
    warning: localUsers.filter(u => u.days_since_last_report && u.days_since_last_report >= 14 && u.days_since_last_report < 21).length,
    needsFirstContact: localUsers.filter(u => !u.last_follow_up_date).length,
  };

  if (error) {
    return (
      <PageContainer title="フォローアップ管理">
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={refresh}>
            再読み込み
          </Button>
        }>
          データの読み込みに失敗しました。
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="フォローアップ管理"
      action={
        <IconButton onClick={refresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      }
    >
      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box>
                  {loading ? (
                    <Skeleton variant="text" width={40} height={40} />
                  ) : (
                    <Typography variant="h4">{stats.total}</Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    要フォロー
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingDownIcon sx={{ fontSize: 40, color: 'error.main' }} />
                <Box>
                  {loading ? (
                    <Skeleton variant="text" width={40} height={40} />
                  ) : (
                    <Typography variant="h4" color="error.main">{stats.critical}</Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    緊急対応
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box>
                  {loading ? (
                    <Skeleton variant="text" width={40} height={40} />
                  ) : (
                    <Typography variant="h4" color="warning.main">{stats.warning}</Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    要注意
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PhoneIcon sx={{ fontSize: 40, color: 'info.main' }} />
                <Box>
                  {loading ? (
                    <Skeleton variant="text" width={40} height={40} />
                  ) : (
                    <Typography variant="h4" color="info.main">{stats.needsFirstContact}</Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    初回連絡待ち
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* アラート */}
      {!loading && stats.critical > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>緊急対応が必要なエンジニアがいます</AlertTitle>
          3週間以上週報が未提出のエンジニアが{stats.critical}名います。早急にフォローアップを行ってください。
        </Alert>
      )}

      {/* フォローアップ対象者一覧 */}
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={localUsers}
            keyField="user_id"
            loading={loading}
            emptyMessage="フォローアップが必要なエンジニアはいません"
          />
        </CardContent>
      </Card>

      {/* フォローアップダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          フォローアップ記録
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar>{selectedUser.user_name.charAt(0)}</Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedUser.user_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        <EmailIcon sx={{ fontSize: FONT_SIZE.BASE, mr: 0.5, verticalAlign: 'middle' }} />
                        {selectedUser.user_email}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  フォローアップ理由:
                </Typography>
                <Typography variant="body2">
                  {selectedUser.follow_up_reason || '要確認'}
                </Typography>
              </Paper>

              <Typography variant="subtitle2" gutterBottom>
                連絡方法
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={contactMethods.email} 
                      onChange={(e) => setContactMethods({ ...contactMethods, email: e.target.checked })}
                    />
                  } 
                  label="メール" 
                />
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={contactMethods.phone} 
                      onChange={(e) => setContactMethods({ ...contactMethods, phone: e.target.checked })}
                    />
                  } 
                  label="電話" 
                />
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={contactMethods.inPerson} 
                      onChange={(e) => setContactMethods({ ...contactMethods, inPerson: e.target.checked })}
                    />
                  } 
                  label="対面" 
                />
              </Box>

              <TextField
                fullWidth
                multiline
                rows={6}
                label="フォローアップ内容"
                placeholder="実施した内容、エンジニアの状況、今後の対応などを記録してください"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleFollowUpSubmit}
            disabled={!followUpNotes.trim()}
          >
            記録を保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 解決確認ダイアログ */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>フォローアップを解決済みにする</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedUser?.user_name}さんのフォローアップを解決済みにしてよろしいですか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleResolveConfirm}
          >
            解決済みにする
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}