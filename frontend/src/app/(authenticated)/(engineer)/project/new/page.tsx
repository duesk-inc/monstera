'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack,
} from '@mui/material';
import { PageContainer, PageHeader, ContentCard } from '@/components/common/layout';
import { useToast } from '@/components/common';
import EngineerGuard from '@/components/common/EngineerGuard';
import { createProject, type ProjectCreateRequest } from '@/lib/api/projects';
import { listEngineerClientsLight, type LightClientItem } from '@/lib/api/clients';
import ValidationErrorAlert from '@/components/common/ValidationErrorAlert';
import { handleApiError } from '@/lib/api/error';

type FieldErrors = Record<string, string>;

export default function NewProjectPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [clients, setClients] = useState<LightClientItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [form, setForm] = useState<ProjectCreateRequest>({
    project_name: '',
    client_id: '',
    status: 'draft',
    start_date: '',
    end_date: null,
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      try {
        setLoadingClients(true);
        const res = await listEngineerClientsLight({ page: 1, limit: 50 });
        if (aborted) return;
        setClients(res.items);
      } catch (e) {
        // fallback stub already handled in API layer
      } finally {
        if (!aborted) setLoadingClients(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, []);

  const handleChange = (field: keyof ProjectCreateRequest, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.project_name || form.project_name.trim().length === 0) {
      errs.project_name = '案件名は必須です (1..200)';
    } else if (form.project_name.length > 200) {
      errs.project_name = '案件名は200文字以内で入力してください';
    }
    if (!form.client_id) {
      errs.client_id = 'クライアントは必須です';
    }
    if (form.description && form.description.length > 1000) {
      errs.description = '説明は1000文字以内で入力してください';
    }
    if (form.start_date && form.end_date && typeof form.end_date === 'string' && form.end_date.length > 0) {
      if (new Date(form.start_date) > new Date(form.end_date)) {
        errs.end_date = '終了日は開始日以降に設定してください';
      }
    }
    return errs;
  };

  // 入力のたびに軽量バリデーションを走らせ、UX向上
  useEffect(() => {
    setFieldErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.project_name, form.client_id, form.start_date, form.end_date, form.description]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const v = validate();
    if (Object.keys(v).length > 0) {
      setFieldErrors(v);
      return;
    }

    try {
      setSubmitting(true);
      const payload: ProjectCreateRequest = {
        ...form,
        // ensure empty strings treated as null where appropriate
        start_date: form.start_date || undefined,
        end_date: (form.end_date as any) || null,
      };
      const project = await createProject(payload);
      showSuccess('案件を作成しました');
      router.push(`/project/detail?id=${project.id}`);
    } catch (e: any) {
      const err = handleApiError(e, '案件作成', { logContext: 'project/new' });
      const enhanced = (err as any).enhanced;
      const fieldErrs = enhanced?.details || e?.response?.data?.errors;
      if (fieldErrs && typeof fieldErrs === 'object') setFieldErrors(fieldErrs);
      const msg = enhanced?.userMessage || err.message || '作成に失敗しました';
      setError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EngineerGuard>
      <PageContainer maxWidth="md">
        <PageHeader title="案件の新規作成" subtitle="最小項目で案件を登録します" />
        <ContentCard>
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <ValidationErrorAlert error={error} customErrors={fieldErrors} />

              <TextField
                label="案件名"
                value={form.project_name}
                onChange={(e) => handleChange('project_name', e.target.value)}
                required
                inputProps={{ maxLength: 200 }}
                error={!!fieldErrors.project_name}
                helperText={fieldErrors.project_name}
                autoComplete="off"
              />

              <TextField
                select
                label="クライアント"
                value={form.client_id}
                onChange={(e) => handleChange('client_id', e.target.value)}
                required
                disabled={loadingClients}
                error={!!fieldErrors.client_id}
                helperText={fieldErrors.client_id}
              >
                {loadingClients && (
                  <MenuItem value="" disabled>読み込み中...</MenuItem>
                )}
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>
                ))}
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  type="date"
                  label="開始日"
                  value={form.start_date || ''}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  label="終了日"
                  value={(form.end_date as string | null) || ''}
                  onChange={(e) => handleChange('end_date', e.target.value || null)}
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldErrors.end_date}
                  helperText={fieldErrors.end_date}
                />
              </Stack>

              <TextField
                select
                label="ステータス"
                value={form.status || 'draft'}
                onChange={(e) => handleChange('status', e.target.value as 'draft' | 'active')}
              >
                <MenuItem value="draft">下書き</MenuItem>
                <MenuItem value="active">進行中</MenuItem>
              </TextField>

              <TextField
                label="説明"
                value={form.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                minRows={3}
                inputProps={{ maxLength: 1000 }}
                error={!!fieldErrors.description}
                helperText={fieldErrors.description}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => router.push('/project')}>キャンセル</Button>
                <Button variant="contained" type="submit" disabled={submitting || Object.keys(fieldErrors).length > 0}>
                  {submitting ? '作成中...' : '作成する'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ContentCard>
      </PageContainer>
    </EngineerGuard>
  );
}
