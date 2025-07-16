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
  Chip,
  Alert,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Close,
  Add,
  Delete,
  VideoCall,
  LocationOn,
  Group,
  AccessTime,
  Warning
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useTheme } from '@mui/material/styles';

import { StatusChip } from '@/components/common';
import { INTERVIEW_STATUS, INTERVIEW_STATUS_COLORS, MEETING_TYPE } from '@/constants/sales';
import { SPACING } from '@/constants/dimensions';
import type { InterviewSchedule, InterviewAttendee, ConflictCheckResult } from '@/types/sales';

interface InterviewDialogProps {
  open: boolean;
  interview?: InterviewSchedule;
  isEdit?: boolean;
  proposalId?: string;
  initialDate?: Date;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  onConflictCheck?: (data: any) => Promise<ConflictCheckResult>;
  isLoading?: boolean;
}

/**
 * 面談詳細・編集ダイアログ
 */
export const InterviewDialog: React.FC<InterviewDialogProps> = ({
  open,
  interview,
  isEdit = false,
  proposalId,
  initialDate,
  onClose,
  onSave,
  onDelete,
  onConflictCheck,
  isLoading = false
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<any>({
    proposalId: proposalId || '',
    scheduledDate: initialDate || new Date(),
    durationMinutes: 60,
    location: '',
    meetingType: 'online',
    meetingUrl: '',
    clientAttendees: [],
    engineerAttendees: [],
    reminderSettings: {
      enabled: true,
      daysBefore: 1,
      channels: ['email']
    },
    notes: ''
  });

  const [conflicts, setConflicts] = useState<ConflictCheckResult | null>(null);
  const [newAttendee, setNewAttendee] = useState<InterviewAttendee>({
    name: '',
    email: '',
    role: '',
    company: ''
  });
  const [attendeeType, setAttendeeType] = useState<'client' | 'engineer'>('client');

  useEffect(() => {
    if (interview) {
      setFormData({
        proposalId: interview.proposalId,
        scheduledDate: new Date(interview.scheduledDate),
        durationMinutes: interview.durationMinutes,
        location: interview.location || '',
        meetingType: interview.meetingType,
        meetingUrl: interview.meetingUrl || '',
        clientAttendees: interview.clientAttendees || [],
        engineerAttendees: interview.engineerAttendees || [],
        reminderSettings: interview.reminderSettings || {
          enabled: true,
          daysBefore: 1,
          channels: ['email']
        },
        notes: interview.notes || '',
        interviewResult: interview.interviewResult || '',
        nextSteps: interview.nextSteps || ''
      });
    }
  }, [interview]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));

    // 日時や時間が変更された場合、重複チェックを実行
    if ((field === 'scheduledDate' || field === 'durationMinutes') && onConflictCheck) {
      checkConflicts();
    }
  };

  const checkConflicts = async () => {
    if (!onConflictCheck) return;

    try {
      const result = await onConflictCheck({
        scheduledDate: formData.scheduledDate.toISOString(),
        durationMinutes: formData.durationMinutes,
        excludeId: interview?.id
      });
      setConflicts(result);
    } catch (error) {
      console.error('Conflict check failed:', error);
    }
  };

  const handleAddAttendee = () => {
    if (!newAttendee.name.trim()) return;

    const targetField = attendeeType === 'client' ? 'clientAttendees' : 'engineerAttendees';
    setFormData((prev: any) => ({
      ...prev,
      [targetField]: [...prev[targetField], { ...newAttendee }]
    }));

    setNewAttendee({ name: '', email: '', role: '', company: '' });
  };

  const handleRemoveAttendee = (type: 'client' | 'engineer', index: number) => {
    const targetField = type === 'client' ? 'clientAttendees' : 'engineerAttendees';
    setFormData((prev: any) => ({
      ...prev,
      [targetField]: prev[targetField].filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSave = () => {
    const saveData = {
      ...formData,
      scheduledDate: formData.scheduledDate.toISOString()
    };
    onSave(saveData);
  };

  const handleDelete = () => {
    if (interview?.id && onDelete) {
      onDelete(interview.id);
    }
  };

  const canEdit = !interview || ['scheduled', 'rescheduled'].includes(interview.status);
  const isCreate = !interview;
  const title = isCreate ? '面談作成' : isEdit ? '面談編集' : '面談詳細';

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
        {/* 重複チェック結果 */}
        {conflicts?.hasConflict && (
          <Alert severity="warning" sx={{ mb: SPACING.md }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning />
              <Typography variant="body2">
                指定された時間に他の面談が予定されています（{conflicts.conflicts.length}件）
              </Typography>
            </Box>
          </Alert>
        )}

        <Grid container spacing={SPACING.md}>
          {/* 基本情報 */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              基本情報
            </Typography>
          </Grid>

          {/* 面談日時 */}
          <Grid item xs={12} md={6}>
            <DateTimePicker
              label="面談日時"
              value={formData.scheduledDate}
              onChange={(date) => handleInputChange('scheduledDate', date)}
              disabled={!canEdit}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
            />
          </Grid>

          {/* 面談時間 */}
          <Grid item xs={12} md={6}>
            <TextField
              label="面談時間（分）"
              type="number"
              value={formData.durationMinutes}
              onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value))}
              disabled={!canEdit}
              fullWidth
              required
              inputProps={{ min: 15, max: 480 }}
            />
          </Grid>

          {/* 面談形式 */}
          <Grid item xs={12} md={6}>
            <TextField
              label="面談形式"
              select
              value={formData.meetingType}
              onChange={(e) => handleInputChange('meetingType', e.target.value)}
              disabled={!canEdit}
              fullWidth
              required
            >
              {Object.entries(MEETING_TYPE).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {value === 'online' && <VideoCall fontSize="small" />}
                    {value === 'onsite' && <LocationOn fontSize="small" />}
                    {value === 'hybrid' && <Group fontSize="small" />}
                    {label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 場所 */}
          <Grid item xs={12} md={6}>
            <TextField
              label="場所"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              disabled={!canEdit}
              fullWidth
              placeholder={formData.meetingType === 'online' ? 'オンライン会議' : '会議室名や住所'}
            />
          </Grid>

          {/* 会議URL */}
          {['online', 'hybrid'].includes(formData.meetingType) && (
            <Grid item xs={12}>
              <TextField
                label="会議URL"
                value={formData.meetingUrl}
                onChange={(e) => handleInputChange('meetingUrl', e.target.value)}
                disabled={!canEdit}
                fullWidth
                placeholder="https://meet.google.com/xxx または https://zoom.us/j/xxx"
              />
            </Grid>
          )}

          {/* 参加者 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              参加者
            </Typography>
          </Grid>

          {/* クライアント参加者 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              クライアント側参加者
            </Typography>
            <Box sx={{ mb: 2 }}>
              {formData.clientAttendees.map((attendee: InterviewAttendee, index: number) => (
                <Chip
                  key={index}
                  label={`${attendee.name}${attendee.role ? ` (${attendee.role})` : ''}`}
                  onDelete={canEdit ? () => handleRemoveAttendee('client', index) : undefined}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>

            {canEdit && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  label="参加者名"
                  size="small"
                  value={attendeeType === 'client' ? newAttendee.name : ''}
                  onChange={(e) => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && attendeeType === 'client' && handleAddAttendee()}
                />
                <TextField
                  label="役職"
                  size="small"
                  value={attendeeType === 'client' ? newAttendee.role : ''}
                  onChange={(e) => setNewAttendee(prev => ({ ...prev, role: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && attendeeType === 'client' && handleAddAttendee()}
                />
                <IconButton
                  onClick={() => {
                    setAttendeeType('client');
                    handleAddAttendee();
                  }}
                  disabled={!newAttendee.name.trim()}
                >
                  <Add />
                </IconButton>
              </Box>
            )}
          </Grid>

          {/* エンジニア側参加者 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              エンジニア側参加者
            </Typography>
            <Box sx={{ mb: 2 }}>
              {formData.engineerAttendees.map((attendee: InterviewAttendee, index: number) => (
                <Chip
                  key={index}
                  label={`${attendee.name}${attendee.role ? ` (${attendee.role})` : ''}`}
                  onDelete={canEdit ? () => handleRemoveAttendee('engineer', index) : undefined}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>

            {canEdit && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  label="参加者名"
                  size="small"
                  value={attendeeType === 'engineer' ? newAttendee.name : ''}
                  onChange={(e) => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && attendeeType === 'engineer' && handleAddAttendee()}
                />
                <TextField
                  label="役職"
                  size="small"
                  value={attendeeType === 'engineer' ? newAttendee.role : ''}
                  onChange={(e) => setNewAttendee(prev => ({ ...prev, role: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && attendeeType === 'engineer' && handleAddAttendee()}
                />
                <IconButton
                  onClick={() => {
                    setAttendeeType('engineer');
                    handleAddAttendee();
                  }}
                  disabled={!newAttendee.name.trim()}
                >
                  <Add />
                </IconButton>
              </Box>
            )}
          </Grid>

          {/* リマインダー設定 */}
          <Grid item xs={12}>
            <Divider sx={{ my: SPACING.md }} />
            <Typography variant="h6" gutterBottom>
              リマインダー設定
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.reminderSettings?.enabled || false}
                  onChange={(e) => handleInputChange('reminderSettings', {
                    ...formData.reminderSettings,
                    enabled: e.target.checked
                  })}
                  disabled={!canEdit}
                />
              }
              label="リマインダーを有効にする"
            />
          </Grid>

          {formData.reminderSettings?.enabled && (
            <Grid item xs={12} md={6}>
              <TextField
                label="リマインダー送信日数前"
                type="number"
                value={formData.reminderSettings?.daysBefore || 1}
                onChange={(e) => handleInputChange('reminderSettings', {
                  ...formData.reminderSettings,
                  daysBefore: parseInt(e.target.value)
                })}
                disabled={!canEdit}
                fullWidth
                inputProps={{ min: 0, max: 7 }}
              />
            </Grid>
          )}

          {/* メモ */}
          <Grid item xs={12}>
            <TextField
              label="メモ"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              disabled={!canEdit}
              fullWidth
            />
          </Grid>

          {/* 面談結果（完了済みの場合） */}
          {interview && ['completed'].includes(interview.status) && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: SPACING.md }} />
                <Typography variant="h6" gutterBottom>
                  面談結果
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="面談結果"
                  multiline
                  rows={3}
                  value={formData.interviewResult}
                  onChange={(e) => handleInputChange('interviewResult', e.target.value)}
                  disabled={!canEdit}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="次のステップ"
                  multiline
                  rows={2}
                  value={formData.nextSteps}
                  onChange={(e) => handleInputChange('nextSteps', e.target.value)}
                  disabled={!canEdit}
                  fullWidth
                />
              </Grid>
            </>
          )}

          {/* ステータス表示 */}
          {interview && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">ステータス:</Typography>
                <StatusChip
                  status={interview.status}
                  statusLabels={INTERVIEW_STATUS}
                  statusColors={INTERVIEW_STATUS_COLORS}
                  size="small"
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        
        {interview && canEdit && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            startIcon={<Delete />}
          >
            削除
          </Button>
        )}
        
        {canEdit && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
          >
            {isCreate ? '作成' : '更新'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};