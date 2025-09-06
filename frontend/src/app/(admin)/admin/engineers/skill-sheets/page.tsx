'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, InputAdornment, Avatar, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Star as StarIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common/DataTable';
import { formatDate } from '@/utils/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import axios from '@/lib/axios';
import { FONT_SIZE } from '@/constants/typography';

// ダミーデータ
const dummyEngineers = [
  {
    id: 'u1',
    name: '山田 太郎',
    email: 'yamada@duesk.co.jp',
    department: '開発部',
    it_experience_years: 5,
    it_experience_months: 3,
    specialties: 'Java, Spring Boot, AWS',
    project_count: 8,
    last_updated: new Date('2024-01-15'),
    profile_completion: 100,
  },
  {
    id: 'u2',
    name: '鈴木 花子',
    email: 'suzuki@duesk.co.jp',
    department: '開発部',
    it_experience_years: 3,
    it_experience_months: 6,
    specialties: 'React, TypeScript, Node.js',
    project_count: 5,
    last_updated: new Date('2024-01-10'),
    profile_completion: 90,
  },
  {
    id: 'u3',
    name: '田中 次郎',
    email: 'tanaka@duesk.co.jp',
    department: 'インフラ部',
    it_experience_years: 7,
    it_experience_months: 0,
    specialties: 'AWS, Kubernetes, Terraform',
    project_count: 12,
    last_updated: new Date('2023-12-20'),
    profile_completion: 85,
  },
];

export default function SkillSheetManagement() {
  const { user } = useAuth();
  const [engineers, setEngineers] = useState(dummyEngineers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // 検索フィルタリング
  const filteredEngineers = engineers.filter(engineer => 
    engineer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    engineer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    engineer.specialties.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // PDF出力（v0除外）

  const handlePreview = (engineer: any) => {
    setSelectedEngineer(engineer);
    setPreviewDialogOpen(true);
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 80) return 'warning';
    return 'error';
  };

  type Row = typeof dummyEngineers[number];
  const columns: DataTableColumn<Row>[] = [
    {
      id: 'name',
      label: 'エンジニア',
      minWidth: 300,
      format: (_value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 40, height: 40 }}>
            {row.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'it_experience_years',
      label: 'IT経験',
      minWidth: 120,
      format: (_value, row) => (
        <Typography variant="body2">{row.it_experience_years}年{row.it_experience_months > 0 && `${row.it_experience_months}ヶ月`}</Typography>
      )
    },
    {
      id: 'specialties',
      label: '得意分野',
      minWidth: 300,
      format: (_value, row) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {row.specialties.split(', ').slice(0, 3).map((skill: string) => (
            <Chip key={skill} label={skill} size="small" />
          ))}
          {row.specialties.split(', ').length > 3 && (
            <Chip label={`+${row.specialties.split(', ').length - 3}`} size="small" variant="outlined" />
          )}
        </Box>
      ),
    },
    {
      id: 'project_count',
      label: '案件数',
      minWidth: 100,
      format: (value) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2">{value as number}件</Typography>
        </Box>
      ),
    },
    {
      id: 'profile_completion',
      label: '完成度',
      minWidth: 120,
      format: (value, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={row.profile_completion}
              size={30}
              thickness={4}
              color={getCompletionColor(row.profile_completion)}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" component="div" color="text.secondary">{row.profile_completion}%</Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      id: 'last_updated',
      label: '最終更新',
      minWidth: 120,
      format: (value) => (
        <Typography variant="body2" color="text.secondary">{formatDate(value as Date)}</Typography>
      ),
    },
    {
      id: 'id',
      label: '',
      minWidth: 120,
      format: (_value, row: Row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="プレビュー">
            <IconButton size="small" onClick={() => handlePreview(row)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          {/* PDF出力（v0除外） */}
        </Box>
      ),
    },
  ];

  return (
    <PageContainer title="スキルシート管理">
      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonIcon sx={{ fontSize: FONT_SIZE['4XL'], color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4">{engineers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    エンジニア総数
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
                <StarIcon sx={{ fontSize: FONT_SIZE['4XL'], color: 'success.main' }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {engineers.filter(e => e.profile_completion >= 100).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    完成済み
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
                <SchoolIcon sx={{ fontSize: FONT_SIZE['4XL'], color: 'info.main' }} />
                <Box>
                  <Typography variant="h4">
                    {Math.round(engineers.reduce((sum, e) => sum + e.it_experience_years, 0) / engineers.length)}年
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均経験年数
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
                <PdfIcon sx={{ fontSize: FONT_SIZE['4XL'], color: 'error.main' }} />
                <Box>
                  <Typography variant="h4">
                    {engineers.reduce((sum, e) => sum + e.project_count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    総案件数
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* メインカード */}
      <Card>
        <CardContent>
          {/* ヘッダー */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
              <TextField
                size="small"
                placeholder="名前、メール、スキルで検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: 400 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => {
                // TODO: 一括出力機能
                console.log('Bulk export');
              }}
            >
              一括出力
            </Button>
          </Box>

          {/* データテーブル */}
          <DataTable
            columns={columns}
            data={filteredEngineers}
            keyField="id"
            emptyMessage="エンジニアが登録されていません"
          />
        </CardContent>
      </Card>

      {/* プレビューダイアログ */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          スキルシートプレビュー
        </DialogTitle>
        <DialogContent>
          {selectedEngineer && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={12}>
                <Typography variant="h6" gutterBottom>
                  基本情報
                </Typography>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">氏名</Typography>
                    <Typography variant="body1">{selectedEngineer.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">メール</Typography>
                    <Typography variant="body1">{selectedEngineer.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">所属</Typography>
                    <Typography variant="body1">{selectedEngineer.department}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={12}>
                <Typography variant="h6" gutterBottom>
                  スキル情報
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">IT経験年数</Typography>
                    <Typography variant="body1">
                      {selectedEngineer.it_experience_years}年
                      {selectedEngineer.it_experience_months > 0 && `${selectedEngineer.it_experience_months}ヶ月`}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">案件数</Typography>
                    <Typography variant="body1">{selectedEngineer.project_count}件</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    得意分野
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedEngineer.specialties.split(', ').map((skill: string) => (
                      <Chip key={skill} label={skill} />
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            閉じる
          </Button>
          {/* PDF出力（v0除外） */}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
