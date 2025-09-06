// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Chip, Grid, Card, CardContent, Avatar, List, ListItem, ListItemText, ListItemAvatar } from '@mui/material';
import { Add, People, Settings, TrendingUp } from '@mui/icons-material';

import { SalesLayout } from '@/components/features/sales/layout/SalesLayout';
import { SalesTeamDialog } from '@/components/features/sales/team/SalesTeamDialog';
import { SPACING } from '@/constants/dimensions';
import { SALES_ROLES } from '@/constants/sales';
import { useToast } from '@/components/common/Toast';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { salesTeamApi, userApi } from '@/lib/api/sales';
import type { SalesTeam, User } from '@/types/sales';

/**
 * 営業チーム管理ページ
 */
export default function TeamsPage() {
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<SalesTeam | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view');

  const { showSuccess, showError } = useToast();
  const { handleSubmissionError } = useErrorHandler();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [teamsResponse, usersResponse] = await Promise.all([
        salesTeamApi.getList({}),
        userApi.getList({ role: 'sales' }) // 営業関連ユーザーのみ取得
      ]);
      
      setTeams(teamsResponse.items || []);
      setAvailableUsers(usersResponse.items || []);
    } catch (error) {
      handleSubmissionError(error, 'チームデータ取得');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setDialogMode('create');
    setShowDialog(true);
  };

  const handleEditTeam = (team: SalesTeam) => {
    setSelectedTeam(team);
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleViewTeam = (team: SalesTeam) => {
    setSelectedTeam(team);
    setDialogMode('view');
    setShowDialog(true);
  };

  const handleTeamSave = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await salesTeamApi.create(data);
        showSuccess('営業チームを作成しました');
      } else {
        await salesTeamApi.update(selectedTeam!.id, data);
        showSuccess('営業チームを更新しました');
      }
      
      setShowDialog(false);
      setSelectedTeam(null);
      loadData();
    } catch (error) {
      handleSubmissionError(error, dialogMode === 'create' ? 'チーム作成' : 'チーム更新');
    }
  };

  const handleTeamDelete = async (id: string) => {
    if (!confirm('このチームを削除してもよろしいですか？\nメンバーの割り当ては解除されます。')) {
      return;
    }

    try {
      await salesTeamApi.delete(id);
      showSuccess('営業チームを削除しました');
      setShowDialog(false);
      setSelectedTeam(null);
      loadData();
    } catch (error) {
      handleSubmissionError(error, 'チーム削除');
    }
  };

  const handleTeamSettings = (team: SalesTeam) => {
    // チーム設定ダイアログを開く
    console.log('Open team settings:', team.id);
  };

  // 統計情報の計算
  const totalTeams = teams.length;
  const activeTeams = teams.filter(t => t.isActive !== false).length;
  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const managersCount = teams.reduce((sum, team) => 
    sum + (team.members?.filter(m => m.role === 'sales_manager').length || 0), 0);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'sales_manager':
        return 'primary';
      case 'sales_lead':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <SalesLayout
      title="営業チーム管理"
      actions={
        <Box sx={{ display: 'flex', gap: SPACING.SM }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateTeam}
          >
            チーム作成
          </Button>
        </Box>
      }
    >
      {/* 統計情報 */}
      <Box sx={{ mb: SPACING.LG }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {totalTeams}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  総チーム数
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {activeTeams}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  アクティブチーム
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {totalMembers}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  総メンバー数
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {managersCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  マネージャー数
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* チーム一覧 */}
      {teams.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body2">
            まだ営業チームが作成されていません。
            「チーム作成」ボタンから最初のチームを作成してください。
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {teams.map((team) => (
            <Grid item xs={12} md={6} lg={4} key={team.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 4,
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.2s ease-in-out',
                  opacity: team.isActive === false ? 0.6 : 1
                }}
                onClick={() => handleViewTeam(team)}
              >
                <CardContent>
                  {/* チーム基本情報 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {team.name}
                      </Typography>
                      {team.description && (
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {team.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        startIcon={<Settings />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTeamSettings(team);
                        }}
                      >
                        設定
                      </Button>
                    </Box>
                  </Box>

                  {/* ステータスとメンバー数 */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={team.isActive === false ? '無効' : 'アクティブ'} 
                      color={team.isActive === false ? 'default' : 'success'}
                      size="small"
                    />
                    <Chip 
                      label={`${team.members?.length || 0}人`} 
                      color="primary"
                      size="small"
                    />
                  </Box>

                  {/* メンバー一覧 */}
                  {team.members && team.members.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        メンバー
                      </Typography>
                      <List dense sx={{ py: 0 }}>
                        {team.members.slice(0, 3).map((member) => (
                          <ListItem key={member.userId} sx={{ px: 0, py: 0.5 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                {member.userName.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    {member.userName}
                                  </Typography>
                                  <Chip
                                    label={SALES_ROLES[member.role]}
                                    size="small"
                                    color={getRoleColor(member.role) as any}
                                    sx={{ height: 16, fontSize: '0.625rem' }}
                                  />
                                </Box>
                              }
                              primaryTypographyProps={{ 
                                component: 'div',
                                sx: { lineHeight: 1.2 }
                              }}
                            />
                          </ListItem>
                        ))}
                        {team.members.length > 3 && (
                          <ListItem sx={{ px: 0, py: 0.5 }}>
                            <ListItemText
                              primary={
                                <Typography variant="caption" color="textSecondary">
                                  他 {team.members.length - 3} 人...
                                </Typography>
                              }
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  )}

                  {/* チーム設定サマリー */}
                  {team.settings && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid #eee` }}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        設定: 
                        {team.settings.autoAssignProposals && ' 自動割当'}
                        {team.settings.requireApproval && ' 承認必須'}
                        {team.settings.notifySlack && ' Slack通知'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* チーム作成・編集ダイアログ */}
      <SalesTeamDialog
        open={showDialog}
        team={selectedTeam || undefined}
        isEdit={dialogMode === 'edit'}
        availableUsers={availableUsers}
        onClose={() => {
          setShowDialog(false);
          setSelectedTeam(null);
        }}
        onSave={handleTeamSave}
        onDelete={handleTeamDelete}
        isLoading={false}
      />
    </SalesLayout>
  );
}
