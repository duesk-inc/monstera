'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  SwapHoriz as StatusChangeIcon,
  GetApp as ExportIcon,
  Publish as ImportIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { DataTable, DataTableColumn } from '@/components/common';
import { EngineerSearch } from '@/components/admin/engineers';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/dateUtils';
import { useEngineers, useEngineerMutations } from '@/hooks/admin/useEngineersQuery';
import { 
  EngineerSummary, 
  EngineerStatus
} from '@/types/engineer';
import { 
  ENGINEER_STATUS_LABELS,
  ENGINEER_STATUS_COLORS,
  DEFAULT_PAGE_SIZE
} from '@/constants/engineer';
import { FONT_SIZE } from '@/constants/typography';

export default function EngineerManagement() {
  const router = useRouter();
  
  const { 
    engineers, 
    total, 
    page,
    limit,
    pages,
    loading, 
    error, 
    params, 
    updateParams,
    setPage,
    setLimit,
    setKeyword,
    setFilters,
    resetFilters,
    refresh 
  } = useEngineers({
    page: 1,
    limit: DEFAULT_PAGE_SIZE
  });

  const { deleteEngineer, exportCSV, submitting } = useEngineerMutations();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerSummary | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAdd = () => {
    router.push('/admin/engineers/new');
  };

  const handleEdit = (engineer: EngineerSummary) => {
    router.push(`/admin/engineers/${engineer.id}/edit`);
    setAnchorEl(null);
  };

  const handleView = (engineer: EngineerSummary) => {
    router.push(`/admin/engineers/${engineer.id}`);
  };

  const handleStatusChange = (engineer: EngineerSummary) => {
    // TODO: ステータス変更ダイアログを開く
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (!selectedEngineer) return;
    
    try {
      await deleteEngineer(selectedEngineer.id);
      setDeleteDialogOpen(false);
      setAnchorEl(null);
      refresh();
    } catch (error) {
      // エラーはフック内で処理される
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, engineer: EngineerSummary) => {
    setAnchorEl(event.currentTarget);
    setSelectedEngineer(engineer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async () => {
    try {
      await exportCSV({
        engineerStatus: params.engineerStatus || undefined,
        departmentId: params.departmentId || undefined,
        includeSkills: true,
        includeProjects: true,
        includeStatusHistory: false
      });
    } catch (error) {
      // エラーはフック内で処理される
    }
  };

  const handleImport = () => {
    router.push('/admin/engineers/import');
  };

  const getStatusColor = (status: EngineerStatus): string => {
    return ENGINEER_STATUS_COLORS[status] || 'default';
  };

  const columns: DataTableColumn<EngineerSummary>[] = [
    {
      id: 'employeeNumber',
      label: '社員番号',
      minWidth: 120,
      format: (value, row) => (
        <Typography variant="body2" fontWeight="medium">
          {row.employeeNumber}
        </Typography>
      ),
    },
    {
      id: 'fullName',
      label: '氏名',
      minWidth: 200,
      format: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.fullNameKana}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'email',
      label: 'メールアドレス',
      minWidth: 250,
      format: (value, row) => (
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EmailIcon sx={{ fontSize: FONT_SIZE.SM }} />
          {row.email}
        </Typography>
      ),
    },
    {
      id: 'department',
      label: '部署',
      minWidth: 150,
      format: (value, row) => (
        <Typography variant="body2">
          {row.department || '-'}
        </Typography>
      ),
    },
    {
      id: 'position',
      label: '役職',
      minWidth: 120,
      format: (value, row) => (
        <Typography variant="body2">
          {row.position || '-'}
        </Typography>
      ),
    },
    {
      id: 'engineerStatus',
      label: 'ステータス',
      minWidth: 120,
      format: (value, row) => (
        <Chip 
          label={ENGINEER_STATUS_LABELS[row.engineerStatus]}
          size="small"
          color={getStatusColor(row.engineerStatus) as any}
        />
      ),
    },
    {
      id: 'hireDate',
      label: '入社日',
      minWidth: 120,
      format: (value, row) => (
        <Typography variant="body2">
          {row.hireDate ? formatDate(row.hireDate) : '-'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: '登録日',
      minWidth: 120,
      format: (value, row) => (
        <Typography variant="body2">
          {formatDate(row.createdAt)}
        </Typography>
      ),
    },
    {
      id: 'id',
      label: '',
      minWidth: 80,
      format: (value, row) => (
        <IconButton 
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClick(e, row);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer title="エンジニア管理">
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
      title="エンジニア管理"
    >
      <Card>
        <CardContent>
          {/* 検索・フィルタリングUI */}
          <EngineerSearch
            params={params}
            onParamsChange={updateParams}
            onReset={resetFilters}
            loading={loading}
          />
          
          {/* アクションボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 3 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ImportIcon />}
              onClick={handleImport}
            >
              インポート
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={submitting}
            >
              エクスポート
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
            >
              エンジニアを追加
            </Button>
          </Box>

          {/* データテーブル */}
          <DataTable
            columns={columns}
            data={engineers}
            keyField="id"
            loading={loading}
            emptyMessage="エンジニアが登録されていません"
            onRowClick={(row) => handleView(row)}
          />
          
          {total > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              全{total}件中 {engineers.length}件を表示 (ページ {page}/{pages})
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* アクションメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedEngineer && handleView(selectedEngineer)}>
          <PersonIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          詳細表示
        </MenuItem>
        <MenuItem onClick={() => selectedEngineer && handleEdit(selectedEngineer)}>
          <EditIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          編集
        </MenuItem>
        <MenuItem onClick={() => selectedEngineer && handleStatusChange(selectedEngineer)}>
          <StatusChangeIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          ステータス変更
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: FONT_SIZE.LG }} />
          削除
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>エンジニアの削除</DialogTitle>
        <DialogContent>
          <Typography>
            「{selectedEngineer?.fullName}」を削除してよろしいですか？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            この操作は取り消すことができません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}