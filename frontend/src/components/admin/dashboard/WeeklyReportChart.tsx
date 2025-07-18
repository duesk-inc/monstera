'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SubmissionStats, MoodStats, DepartmentStats } from '@/types/admin/weeklyReportSummary';

interface WeeklyReportChartProps {
  submissionStats: SubmissionStats;
  moodStats: MoodStats;
  departmentStats: DepartmentStats[];
  onChartTypeChange?: (type: 'submission' | 'mood' | 'department') => void;
  selectedChartType?: 'submission' | 'mood' | 'department';
}

export default function WeeklyReportChart({
  submissionStats,
  moodStats,
  departmentStats,
  onChartTypeChange,
  selectedChartType = 'submission',
}: WeeklyReportChartProps) {
  const theme = useTheme();

  // 提出状況用の円グラフデータ
  const submissionChartData = [
    {
      name: '提出済み',
      value: submissionStats.submittedCount,
      color: theme.palette.success.main,
    },
    {
      name: '下書き',
      value: submissionStats.draftCount,
      color: theme.palette.warning.main,
    },
    {
      name: '期限超過',
      value: submissionStats.overdueCount,
      color: theme.palette.error.main,
    },
  ];

  // ムード分布用の円グラフデータ
  const moodChartData = Object.entries(moodStats.moodDistribution).map(([mood, count]) => ({
    name: getMoodLabel(mood),
    value: count,
    color: getMoodColor(mood),
  }));

  // 部署別統計用の棒グラフデータ
  const departmentChartData = departmentStats.map(dept => ({
    name: dept.departmentName.length > 8 ? `${dept.departmentName.slice(0, 8)}...` : dept.departmentName,
    fullName: dept.departmentName,
    submissionRate: dept.submissionRate,
    workHours: dept.averageWorkHours,
    mood: dept.averageMood,
  }));

  function getMoodLabel(mood: string): string {
    switch (mood) {
      case 'excellent': return '非常に良い';
      case 'good': return '良い';
      case 'neutral': return '普通';
      case 'bad': return '悪い';
      case 'terrible': return '非常に悪い';
      default: return mood;
    }
  }

  function getMoodColor(mood: string): string {
    switch (mood) {
      case 'excellent': return theme.palette.success.main;
      case 'good': return theme.palette.info.main;
      case 'neutral': return theme.palette.grey[500];
      case 'bad': return theme.palette.warning.main;
      case 'terrible': return theme.palette.error.main;
      default: return theme.palette.grey[400];
    }
  }

  const renderChart = () => {
    switch (selectedChartType) {
      case 'submission':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={submissionChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {submissionChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'mood':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={moodChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {moodChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'department':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={departmentChartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(label, payload) => {
                  if (payload && payload[0] && payload[0].payload) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
                formatter={(value, name) => {
                  switch (name) {
                    case 'submissionRate':
                      return [`${value}%`, '提出率'];
                    case 'workHours':
                      return [`${value}h`, '平均稼働時間'];
                    case 'mood':
                      return [`${value}`, '平均ムード'];
                    default:
                      return [value, name];
                  }
                }}
              />
              <Legend />
              <Bar 
                dataKey="submissionRate" 
                fill={theme.palette.primary.main} 
                name="提出率"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            統計チャート
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>表示内容</InputLabel>
            <Select
              value={selectedChartType}
              onChange={(e) => onChartTypeChange?.(e.target.value as any)}
              label="表示内容"
            >
              <MenuItem value="submission">提出状況</MenuItem>
              <MenuItem value="mood">ムード分布</MenuItem>
              <MenuItem value="department">部署別統計</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {renderChart()}

        {/* チャートごとの追加情報 */}
        {selectedChartType === 'submission' && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <Box>
              <Typography variant="h6" color="success.main">
                {submissionStats.submissionRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                全体提出率
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" color="primary.main">
                {submissionStats.onTimeRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                期限内提出率
              </Typography>
            </Box>
          </Box>
        )}

        {selectedChartType === 'mood' && moodStats.lowMoodUsers.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="warning.main" gutterBottom>
              ⚠️ ムードが低いメンバー: {moodStats.lowMoodUsers.length}名
            </Typography>
            <Typography variant="caption" color="text.secondary">
              平均ムード: {moodStats.averageMood.toFixed(1)}/5.0
            </Typography>
          </Box>
        )}

        {selectedChartType === 'department' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              各部署の提出率を比較しています。マウスオーバーで詳細情報を確認できます。
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}