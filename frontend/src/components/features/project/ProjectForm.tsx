"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import dayjs from 'dayjs';
import { ValidationErrorAlert, FieldValidationError } from '@/components/common/ValidationErrorAlert';
import { useToast } from '@/components/common/Toast/ToastProvider';
import { createProject, updateProject, type ProjectCreateRequest, type ProjectUpdateRequest, type ProjectItemDto } from '@/lib/api/projects';
import { listEngineerClientsLight, type LightClientItem } from '@/lib/api/clients';

export type ProjectFormMode = 'create' | 'edit';

export interface ProjectFormProps {
  mode: ProjectFormMode;
  initial?: ProjectItemDto;
  projectId?: string;
  onSuccess?: (project: ProjectItemDto) => void;
}

type ErrorMap = Record<string, string>;

const toISO = (v?: string) => (v ? v : undefined);

export default function ProjectForm({ mode, initial, projectId, onSuccess }: ProjectFormProps) {
  // fields
  const [projectName, setProjectName] = useState(initial?.project_name ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [clientInput, setClientInput] = useState('');
  const [status, setStatus] = useState<'draft'|'active'|'archived'>(initial?.status ?? 'draft');
  const [startDate, setStartDate] = useState<string | undefined>(initial?.start_date ?? undefined);
  const [endDate, setEndDate] = useState<string | undefined>(initial?.end_date ?? undefined);
  const [description, setDescription] = useState(initial?.description ?? '');

  const isEdit = mode === 'edit';

  // clients light
  const [clientOptions, setClientOptions] = useState<LightClientItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let abort = false;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        setLoadingClients(true);
        const res = await listEngineerClientsLight(clientInput, 1, 20);
        if (!abort) setClientOptions(res.items);
      } catch {
        if (!abort) setClientOptions([]);
      } finally {
        if (!abort) setLoadingClients(false);
      }
    }, 300);
    return () => { abort = true; if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [clientInput]);

  // error envelope
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ErrorMap>({});
  const clearErrors = () => { setSubmitError(null); setFieldErrors({}); };
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    // client-side validation
    const vErrors: ErrorMap = {};
    const max = (v: string, n: number) => (v && v.length > n);
    const isDate = (v?: string) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
    // project_name
    if (!isEdit && (!projectName || projectName.trim().length === 0)) {
      vErrors.project_name = '案件名は必須です';
    } else if (projectName && (projectName.trim().length < 1 || projectName.trim().length > 200)) {
      vErrors.project_name = '案件名は1〜200文字で入力してください';
    }
    // client_id
    if (!isEdit && (!clientId || clientId.trim() === '')) {
      vErrors.client_id = '取引先は必須です';
    }
    // description
    if (max(description, 1000)) {
      vErrors.description = '詳細は1000文字以内で入力してください';
    }
    // status
    if (isEdit) {
      if (!['draft','active','archived'].includes(status)) {
        vErrors.status = 'ステータスが不正です';
      }
    } else {
      if (!['draft','active'].includes(status)) {
        vErrors.status = 'ステータスが不正です';
      }
    }
    // dates format
    if (!isDate(startDate)) vErrors.start_date = '開始日はYYYY-MM-DD形式で入力してください';
    if (!isDate(endDate)) vErrors.end_date = '終了日はYYYY-MM-DD形式で入力してください';
    // start <= end
    if (startDate && endDate && isDate(startDate) && isDate(endDate)) {
      const s = new Date(startDate);
      const e2 = new Date(endDate);
      if (s.getTime() > e2.getTime()) {
        vErrors.start_date = '開始日は終了日以前である必要があります';
        vErrors.end_date = '終了日は開始日以降である必要があります';
      }
    }
    if (Object.keys(vErrors).length > 0) {
      setFieldErrors(vErrors);
      setSubmitError('入力内容に誤りがあります');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        const payload: ProjectUpdateRequest = {
          project_name: projectName || undefined,
          client_id: clientId || undefined,
          status,
          start_date: toISO(startDate ?? undefined) ?? null,
          end_date: toISO(endDate ?? undefined) ?? null,
          description: description || undefined,
        };
        const p = await updateProject(projectId!, payload);
        showSuccess('案件を更新しました');
        onSuccess?.(p);
      } else {
        const payload: ProjectCreateRequest = {
          project_name: projectName,
          client_id: clientId,
          status: status === 'archived' ? 'draft' : status,
          start_date: toISO(startDate ?? undefined) ?? undefined,
          end_date: toISO(endDate ?? undefined) ?? undefined,
          description: description || undefined,
        };
        const p = await createProject(payload);
        showSuccess('案件を作成しました');
        onSuccess?.(p);
      }
    } catch (err: any) {
      // 共通エラーエンベロープ {code,message,errors}
      const data = err?.response?.data;
      if (data?.message) setSubmitError(data.message);
      if (data?.errors && typeof data.errors === 'object') setFieldErrors(data.errors as ErrorMap);
      if (!data?.message) showError('送信に失敗しました');
    }
    finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 720 }}>
      <ValidationErrorAlert customErrors={fieldErrors} error={submitError} />

      <Stack spacing={2}>
        <Box>
          <TextField
            label="案件名"
            value={projectName}
            onChange={(e) => { setProjectName(e.target.value); setFieldErrors((m) => ({ ...m, project_name: '' })); }}
            required
            fullWidth
            inputProps={{ maxLength: 200 }}
          />
          <FieldValidationError error={fieldErrors.project_name} />
        </Box>

        <Box>
          <Autocomplete
            options={clientOptions}
            loading={loadingClients}
            getOptionLabel={(o) => o.company_name}
            onInputChange={(_, v) => setClientInput(v)}
            value={clientOptions.find((o) => o.id === clientId) || null}
            onChange={(_, v) => { setClientId(v?.id || ''); setFieldErrors((m) => ({ ...m, client_id: '' })); }}
            renderInput={(params) => (
              <TextField {...params} label="取引先" required />
            )}
          />
          <FieldValidationError error={fieldErrors.client_id} />
        </Box>

        <TextField
          select
          label="ステータス"
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); setFieldErrors((m) => ({ ...m, status: '' })); }}
          helperText={isEdit ? 'draft/active/archived' : 'draft/active'}
        >
          <MenuItem value="draft">下書き</MenuItem>
          <MenuItem value="active">進行中</MenuItem>
          {isEdit && <MenuItem value="archived">アーカイブ</MenuItem>}
        </TextField>
        <FieldValidationError error={fieldErrors.status} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ width: '100%' }}>
            <TextField
              label="開始日 (YYYY-MM-DD)"
              value={startDate ?? ''}
              onChange={(e) => { setStartDate(e.target.value || undefined); setFieldErrors((m)=>({ ...m, start_date: '' })); }}
              placeholder="2025-01-01"
              fullWidth
            />
            <FieldValidationError error={fieldErrors.start_date} />
          </Box>
          <Box sx={{ width: '100%' }}>
            <TextField
              label="終了日 (YYYY-MM-DD)"
              value={endDate ?? ''}
              onChange={(e) => { setEndDate(e.target.value || undefined); setFieldErrors((m)=>({ ...m, end_date: '' })); }}
              placeholder="2025-12-31"
              fullWidth
            />
            <FieldValidationError error={fieldErrors.end_date} />
          </Box>
        </Stack>

        <Box>
          <TextField
            label="詳細"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setFieldErrors((m)=>({ ...m, description: '' })); }}
            multiline rows={4}
            fullWidth
            inputProps={{ maxLength: 1000 }}
          />
          <FieldValidationError error={fieldErrors.description} />
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            type="button"
            variant="outlined"
            onClick={() => (typeof window !== 'undefined' ? window.history.back() : undefined)}
            disabled={submitting}
          >
            キャンセル
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={submitting || (!isEdit && (!projectName || !clientId))}>
            {submitting ? (isEdit ? '更新中...' : '作成中...') : (isEdit ? '更新' : '作成')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
