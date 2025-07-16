'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  FormControlLabel,
  Switch,
  Divider,
  Avatar,
  Autocomplete
} from '@mui/material';
import {
  Close,
  Save,
  Delete,
  Add,
  Remove,
  Person,
  Business,
  Settings
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { SPACING } from '@/constants/dimensions';
import { SALES_ROLES, SALES_PERMISSIONS } from '@/constants/sales';
import type { SalesTeam, SalesTeamMember, User } from '@/types/sales';

interface SalesTeamDialogProps {
  open: boolean;
  team?: SalesTeam;
  isEdit?: boolean;
  availableUsers?: User[];
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

/**
 * 営業チーム作成・編集ダイアログ
 */
export const SalesTeamDialog: React.FC<SalesTeamDialogProps> = ({
  open,
  team,
  isEdit = false,
  availableUsers = [],
  onClose,
  onSave,
  onDelete,
  isLoading = false
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    members: [],
    settings: {
      autoAssignProposals: false,
      requireApproval: true,
      notifySlack: true,
      trackPerformance: true
    },
    isActive: true
  });

  const [newMember, setNewMember] = useState<{ user: User | null; role: string }>({
    user: null,
    role: 'sales_member'
  });
  const [validationErrors, setValidationErrors] = useState<any>({});

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || '',
        members: team.members || [],
        settings: team.settings || {
          autoAssignProposals: false,
          requireApproval: true,
          notifySlack: true,
          trackPerformance: true
        },
        isActive: team.isActive !== false
      });
    }
  }, [team]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });

    // バリデーションエラーをクリア
    if (validationErrors[field]) {
      setValidationErrors((prev: any) => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleAddMember = () => {
    if (!newMember.user) return;

    // 既に追加済みかチェック
    const exists = formData.members.some((member: SalesTeamMember) => 
      member.userId === newMember.user!.id
    );

    if (exists) {
      setValidationErrors((prev: any) => ({
        ...prev,
        newMember: 'このユーザーは既にチームに追加されています'
      }));
      return;
    }

    const member: SalesTeamMember = {
      userId: newMember.user.id,
      userName: newMember.user.name,
      userEmail: newMember.user.email,
      role: newMember.role,
      joinedDate: new Date().toISOString()
    };

    setFormData((prev: any) => ({
      ...prev,
      members: [...prev.members, member]
    }));

    setNewMember({ user: null, role: 'sales_member' });
    setValidationErrors((prev: any) => ({
      ...prev,
      newMember: null
    }));
  };

  const handleRemoveMember = (userId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      members: prev.members.filter((member: SalesTeamMember) => member.userId !== userId)
    }));
  };

  const handleMemberRoleChange = (userId: string, newRole: string) => {
    setFormData((prev: any) => ({
      ...prev,
      members: prev.members.map((member: SalesTeamMember) =>
        member.userId === userId ? { ...member, role: newRole } : member
      )
    }));
  };

  const validateForm = () => {
    const errors: any = {};

    if (!formData.name.trim()) {
      errors.name = 'チーム名は必須です';
    }

    if (formData.members.length === 0) {
      errors.members = '最低1人のメンバーが必要です';
    }

    // マネージャーが最低1人いるかチェック
    const hasManager = formData.members.some((member: SalesTeamMember) => 
      member.role === 'sales_manager'
    );

    if (!hasManager) {
      errors.members = 'チームには最低1人のマネージャーが必要です';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    onSave(formData);
  };

  const handleDelete = () => {
    if (team?.id && onDelete) {
      onDelete(team.id);
    }
  };

  const isCreate = !team;
  const title = isCreate ? '営業チーム作成' : isEdit ? '営業チーム編集' : '営業チーム詳細';

  const roleOptions = Object.entries(SALES_ROLES).map(([value, label]) => ({
    value,
    label
  }));

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

  const getPermissions = (role: string) => {
    return SALES_PERMISSIONS[role] || [];
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={SPACING.md}>
          {/* 基本情報 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="チーム名"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              fullWidth
              required
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              InputProps={{
                startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              placeholder="例: 東京営業チーム"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                />
              }
              label="アクティブ"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="説明"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              fullWidth
              placeholder="チームの役割や担当範囲を入力してください"
            />
          </Grid>

          {/* メンバー管理 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                チームメンバー ({formData.members.length}人)
              </Typography>
              {validationErrors.members && (
                <Typography variant="caption" color="error">
                  {validationErrors.members}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* 新規メンバー追加 */}
          <Grid item xs={12}>
            <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                メンバー追加
              </Typography>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={availableUsers.filter(user => 
                      !formData.members.some((member: SalesTeamMember) => member.userId === user.id)
                    )}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={newMember.user}
                    onChange={(_, value) => setNewMember(prev => ({ ...prev, user: value }))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="ユーザー選択"
                        size="small"
                        error={!!validationErrors.newMember}
                        helperText={validationErrors.newMember}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                          {option.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{option.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {option.email}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="役割"
                    select
                    size="small"
                    value={newMember.role}
                    onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                    fullWidth
                  >
                    {roleOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddMember}
                    disabled={!newMember.user}
                    fullWidth
                  >
                    追加
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* メンバー一覧 */}
          <Grid item xs={12}>
            <List sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
              {formData.members.map((member: SalesTeamMember, index: number) => (
                <React.Fragment key={member.userId}>
                  <ListItem>
                    <Avatar sx={{ mr: 2 }}>
                      {member.userName.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{member.userName}</Typography>
                          <Chip
                            label={SALES_ROLES[member.role]}
                            size="small"
                            color={getRoleColor(member.role) as any}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {member.userEmail}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            権限: {getPermissions(member.role).join(', ')}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          select
                          size="small"
                          value={member.role}
                          onChange={(e) => handleMemberRoleChange(member.userId, e.target.value)}
                          sx={{ minWidth: 120 }}
                        >
                          {roleOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveMember(member.userId)}
                          color="error"
                        >
                          <Remove />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < formData.members.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              
              {formData.members.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="メンバーが追加されていません"
                    secondary="上記のフォームからメンバーを追加してください"
                  />
                </ListItem>
              )}
            </List>
          </Grid>

          {/* チーム設定 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              チーム設定
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.autoAssignProposals || false}
                  onChange={(e) => handleInputChange('settings.autoAssignProposals', e.target.checked)}
                />
              }
              label="提案自動割り当て"
            />
            <Typography variant="caption" color="textSecondary" display="block">
              新規提案をチームメンバーに自動で割り当てます
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.requireApproval || false}
                  onChange={(e) => handleInputChange('settings.requireApproval', e.target.checked)}
                />
              }
              label="承認フロー必須"
            />
            <Typography variant="caption" color="textSecondary" display="block">
              重要な操作にマネージャーの承認を必要とします
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.notifySlack || false}
                  onChange={(e) => handleInputChange('settings.notifySlack', e.target.checked)}
                />
              }
              label="Slack通知"
            />
            <Typography variant="caption" color="textSecondary" display="block">
              チーム活動をSlackに通知します
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.trackPerformance || false}
                  onChange={(e) => handleInputChange('settings.trackPerformance', e.target.checked)}
                />
              }
              label="パフォーマンス追跡"
            />
            <Typography variant="caption" color="textSecondary" display="block">
              チームメンバーの成果を自動追跡します
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        
        {team && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            startIcon={<Delete />}
          >
            削除
          </Button>
        )}
        
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading}
          startIcon={<Save />}
        >
          {isCreate ? '作成' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};