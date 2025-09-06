'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Stack,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
// レイアウトはCSS Gridで実装して型衝突を回避
import {
  CheckCircle,
  Cancel,
  FilterList,
  Search,
  CalendarMonth,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useToast } from '@/components/common/Toast';
import { createPresetApiClient } from '@/lib/api';

interface LeaveRequest {
  id: string;
  user: {
    id: string;
    name: string;
    employeeCode: string;
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
  };
  requestDate: string;
  totalDays: number;
  status: string;
  reason?: string;
  rejectionReason?: string;
  details: Array<{
    leaveDate: string;
    startTime?: string;
    endTime?: string;
    dayValue: number;
  }>;
}

interface LeaveRequestListResponse {
  items: LeaveRequest[];
  total: number;
  page: number;
  limit: number;
}

interface LeaveTypeResponse {
  id: string;
  code: string;
  name: string;
}

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

const statusLabels: Record<string, string> = {
  pending: '申請中',
  approved: '承認済み',
  rejected: '却下',
  cancelled: '取消',
};

export default function LeaveRequestList() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    userName: '',
    status: '',
    leaveTypeId: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Queries
  const { data: leaveTypes } = useQuery<LeaveTypeResponse[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const apiClient = createPresetApiClient('auth');
      const response = await apiClient.get('/leave/types');
      return response.data.data;
    },
  });

  const { data, isLoading, error } = useQuery<LeaveRequestListResponse>({
    queryKey: ['admin-leave-requests', page, rowsPerPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });

      if (filters.userName) {
        params.append('user_name', filters.userName);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.leaveTypeId) {
        params.append('leave_type_id', filters.leaveTypeId);
      }
      if (filters.startDate) {
        params.append('start_date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      if (filters.endDate) {
        params.append('end_date', format(filters.endDate, 'yyyy-MM-dd'));
      }

      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.get(
        `/engineers/leave/requests?${params}`
      );
      return response.data;
    },
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const apiClient = createPresetApiClient('admin');
      await apiClient.put(`/engineers/leave/requests/${requestId}/approve`);
    },
    onSuccess: () => {
      showSuccess('休暇申請を承認しました');
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || '承認に失敗しました');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const apiClient = createPresetApiClient('admin');
      await apiClient.put(`/engineers/leave/requests/${requestId}/reject`, {
        reason,
      });
    },
    onSuccess: () => {
      showSuccess('休暇申請を却下しました');
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || '却下に失敗しました');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      const apiClient = createPresetApiClient('admin');
      const response = await apiClient.post(
        '/engineers/leave/requests/bulk-approve',
        { request_ids: requestIds }
      );
      return response.data;
    },
    onSuccess: (data) => {
      const { summary } = data;
      showSuccess(
        `一括承認が完了しました（成功: ${summary.success}件 / 失敗: ${summary.failed}件）`
      );
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      setSelected([]);
    },
    onError: (error: any) => {
      showError(error.response?.data?.error || '一括承認に失敗しました');
    },
  });

  // Handlers
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked && data?.items) {
      const newSelected = data.items
        .filter((item) => item.status === 'pending')
        .map((item) => item.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelectClick = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleApprove = (requestId: string) => {
    approveMutation.mutate(requestId);
  };

  const handleReject = (requestId: string) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (rejectingId && rejectionReason) {
      rejectMutation.mutate({ requestId: rejectingId, reason: rejectionReason });
    }
  };

  const handleBulkApprove = () => {
    if (selected.length > 0) {
      bulkApproveMutation.mutate(selected);
    }
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  // Computed values
  const pendingRequests = useMemo(
    () => data?.items?.filter((item) => item.status === 'pending') || [],
    [data?.items]
  );

  const selectableCount = pendingRequests.length;
  const selectedCount = selected.length;

  // Format leave dates
  const formatLeaveDates = (details: LeaveRequest['details']) => {
    if (details.length === 0) return '-';
    if (details.length === 1) {
      const detail = details[0];
      if (detail.startTime && detail.endTime) {
        return `${format(new Date(detail.leaveDate), 'M/d(E)', { locale: ja })} ${
          detail.startTime
        }-${detail.endTime}`;
      }
      return format(new Date(detail.leaveDate), 'M/d(E)', { locale: ja });
    }
    const dates = details.map((d) => format(new Date(d.leaveDate), 'M/d')).join(', ');
    return `${dates} (${details.length}日間)`;
  };

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">データの取得に失敗しました</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* フィルター */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          startIcon={<FilterList />}
          onClick={() => setShowFilters(!showFilters)}
          variant={showFilters ? 'contained' : 'outlined'}
        >
          フィルター
        </Button>
        {selectedCount > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<CheckCircle />}
            onClick={handleBulkApprove}
            disabled={bulkApproveMutation.isPending}
          >
            一括承認 ({selectedCount}件)
          </Button>
        )}
      </Stack>

      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}>
            <Box>
              <TextField
                fullWidth
                label="申請者名"
                value={filters.userName}
                onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status}
                  label="ステータス"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>休暇種別</InputLabel>
                <Select
                  value={filters.leaveTypeId}
                  label="休暇種別"
                  onChange={(e) => setFilters({ ...filters, leaveTypeId: e.target.value })}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {leaveTypes?.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <DatePicker
                label="申請期間（開始）"
                value={filters.startDate as any}
                onChange={(newValue) => setFilters({ ...filters, startDate: newValue ? new Date(newValue as any) : null })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    InputProps: {
                      startAdornment: <CalendarMonth sx={{ mr: 1, color: 'text.secondary' }} />,
                    },
                  },
                }}
              />
            </Box>
            <Box>
              <DatePicker
                label="申請期間（終了）"
                value={filters.endDate as any}
                onChange={(newValue) => setFilters({ ...filters, endDate: newValue ? new Date(newValue as any) : null })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Box>
          </Box>
        </Paper>
      )}

      {/* テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selectedCount > 0 && selectedCount < selectableCount}
                  checked={selectableCount > 0 && selectedCount === selectableCount}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>申請者</TableCell>
              <TableCell>休暇種別</TableCell>
              <TableCell>休暇日</TableCell>
              <TableCell align="right">日数</TableCell>
              <TableCell>理由</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>申請日</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((request) => {
                const isItemSelected = isSelected(request.id);
                const isPending = request.status === 'pending';

                return (
                  <TableRow
                    key={request.id}
                    hover
                    onClick={() => isPending && handleSelectClick(request.id)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    selected={isItemSelected}
                    sx={{ cursor: isPending ? 'pointer' : 'default' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        disabled={!isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{request.user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.user.employeeCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{request.leaveType.name}</TableCell>
                    <TableCell>{formatLeaveDates(request.details)}</TableCell>
                    <TableCell align="right">{request.totalDays}日</TableCell>
                    <TableCell>
                      {request.reason || request.rejectionReason || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[request.status]}
                        color={statusColors[request.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.requestDate), 'yyyy/MM/dd')}
                    </TableCell>
                    <TableCell align="center">
                      {request.status === 'pending' && (
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="承認">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(request.id);
                              }}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="却下">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(request.id);
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={data?.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) =>
            `${count}件中 ${from}-${to}件を表示`
          }
        />
      </TableContainer>

      {/* 却下ダイアログ */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>休暇申請の却下</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="却下理由"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="却下理由を入力してください"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={!rejectionReason || rejectMutation.isPending}
          >
            却下
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
