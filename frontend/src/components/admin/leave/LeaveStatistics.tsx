'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  TextField,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, startOfYear, endOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import apiClient from '@/lib/axios';

interface LeaveStatistics {
  totalRequests: number;
  totalDays: number;
  byStatus: Record<string, number>;
  byLeaveType: Record<string, {
    count: number;
    totalDays: number;
    typeName: string;
  }>;
  monthlyBreakdown: Array<{
    year: number;
    month: number;
    count: number;
    totalDays: number;
  }>;
}

interface UserLeaveStatistics {
  userId: string;
  userName: string;
  totalUsedDays: Record<string, number>;
  remainingDays: Record<string, number>;
  monthlyBreakdown: Array<{
    year: number;
    month: number;
    usedDays: Record<string, number>;
  }>;
}

interface User {
  id: string;
  name: string;
  employeeCode: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const statusLabels: Record<string, string> = {
  pending: '申請中',
  approved: '承認済み',
  rejected: '却下',
  cancelled: '取消',
};

export default function LeaveStatistics() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 全体統計の取得
  const { data: statistics, isLoading: isLoadingStats } = useQuery<LeaveStatistics>({
    queryKey: ['admin-leave-statistics', year, month],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
      });
      if (month !== null) {
        params.append('month', String(month));
      }

      const response = await apiClient.get(
        `/api/v1/admin/engineers/leave/statistics?${params}`
      );
      return response.data.data;
    },
  });

  // ユーザー一覧の取得
  const { data: users } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/users');
      return response.data.items;
    },
  });

  // ユーザー別統計の取得
  const { data: userStatistics, isLoading: isLoadingUserStats } = useQuery<UserLeaveStatistics>({
    queryKey: ['admin-user-leave-statistics', selectedUser?.id, year],
    queryFn: async () => {
      if (!selectedUser) return null;
      const response = await apiClient.get(
        `/api/v1/admin/engineers/leave/statistics/users/${selectedUser.id}?year=${year}`
      );
      return response.data.data;
    },
    enabled: !!selectedUser,
  });

  // グラフ用データの準備
  const monthlyChartData = statistics?.monthlyBreakdown?.map((item) => ({
    month: `${item.month}月`,
    件数: item.count,
    日数: item.totalDays,
  })) || [];

  const leaveTypePieData = Object.entries(statistics?.byLeaveType || {}).map(
    ([code, data]) => ({
      name: data.typeName,
      value: data.totalDays,
    })
  );

  const statusPieData = Object.entries(statistics?.byStatus || {}).map(
    ([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    })
  );

  return (
    <Box>
      {/* フィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>年</InputLabel>
              <Select
                value={year}
                label="年"
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[...Array(5)].map((_, i) => {
                  const y = currentYear - i;
                  return (
                    <MenuItem key={y} value={y}>
                      {y}年
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>月</InputLabel>
              <Select
                value={month ?? ''}
                label="月"
                onChange={(e) => setMonth(e.target.value === '' ? null : Number(e.target.value))}
              >
                <MenuItem value="">年間</MenuItem>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {i + 1}月
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={users || []}
              getOptionLabel={(option) => `${option.name} (${option.employeeCode})`}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="ユーザー別統計" placeholder="ユーザーを選択" />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 全体統計 */}
      {!selectedUser && (
        <>
          {/* サマリーカード */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    総申請件数
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalRequests || 0}件
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    総取得日数
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalDays || 0}日
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    承認率
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalRequests
                      ? Math.round(
                          ((statistics.byStatus.approved || 0) / statistics.totalRequests) * 100
                        )
                      : 0}
                    %
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    平均取得日数
                  </Typography>
                  <Typography variant="h4">
                    {statistics?.totalRequests
                      ? (statistics.totalDays / statistics.totalRequests).toFixed(1)
                      : 0}
                    日
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* グラフ */}
          <Grid container spacing={3}>
            {/* 月別推移 */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  月別推移
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="件数" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="日数" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* ステータス別 */}
            <Grid item xs={12} sm={6} lg={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  ステータス別
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* 休暇種別 */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  休暇種別別統計
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>休暇種別</TableCell>
                        <TableCell align="right">申請件数</TableCell>
                        <TableCell align="right">取得日数</TableCell>
                        <TableCell align="right">平均日数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(statistics?.byLeaveType || {}).map(([code, data]) => (
                        <TableRow key={code}>
                          <TableCell>{data.typeName}</TableCell>
                          <TableCell align="right">{data.count}件</TableCell>
                          <TableCell align="right">{data.totalDays}日</TableCell>
                          <TableCell align="right">
                            {(data.totalDays / data.count).toFixed(1)}日
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* ユーザー別統計 */}
      {selectedUser && userStatistics && (
        <>
          <Typography variant="h5" gutterBottom>
            {userStatistics.userName}の休暇取得状況
          </Typography>

          {/* 休暇残日数 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  休暇残日数
                </Typography>
                <Stack spacing={2}>
                  {Object.entries(userStatistics.remainingDays).map(([type, days]) => (
                    <Box key={type}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography>{type}</Typography>
                        <Typography variant="h6">{days}日</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={
                          userStatistics.totalUsedDays[type] && userStatistics.remainingDays[type]
                            ? (userStatistics.totalUsedDays[type] /
                                (userStatistics.totalUsedDays[type] + userStatistics.remainingDays[type])) *
                              100
                            : 0
                        }
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* 取得日数 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  年間取得日数
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>休暇種別</TableCell>
                        <TableCell align="right">取得日数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(userStatistics.totalUsedDays).map(([type, days]) => (
                        <TableRow key={type}>
                          <TableCell>{type}</TableCell>
                          <TableCell align="right">{days}日</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* 月別取得状況 */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              月別取得状況
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>月</TableCell>
                    {Object.keys(userStatistics.totalUsedDays).map((type) => (
                      <TableCell key={type} align="right">
                        {type}
                      </TableCell>
                    ))}
                    <TableCell align="right">合計</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userStatistics.monthlyBreakdown.map((monthly) => {
                    const total = Object.values(monthly.usedDays).reduce((sum, days) => sum + days, 0);
                    return (
                      <TableRow key={`${monthly.year}-${monthly.month}`}>
                        <TableCell>{monthly.month}月</TableCell>
                        {Object.keys(userStatistics.totalUsedDays).map((type) => (
                          <TableCell key={type} align="right">
                            {monthly.usedDays[type] || 0}
                          </TableCell>
                        ))}
                        <TableCell align="right">
                          <strong>{total}</strong>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* ローディング */}
      {(isLoadingStats || isLoadingUserStats) && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
}