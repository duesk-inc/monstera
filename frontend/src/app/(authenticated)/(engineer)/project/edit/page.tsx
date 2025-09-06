'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import { PageContainer, PageHeader, ContentCard } from '@/components/common/layout';
import { useToast } from '@/components/common';
import EngineerGuard from '@/components/common/EngineerGuard';
import { getProject, updateProject, type ProjectUpdateRequest } from '@/lib/api/projects';
import { listEngineerClientsLight, type LightClientItem } from '@/lib/api/clients';
import ValidationErrorAlert from '@/components/common/ValidationErrorAlert';
import { handleApiError } from '@/lib/api/error';

type FieldErrors = Record<string, string>;

function EditProjectPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<LightClientItem[]>([]);
  const [form, setForm] = useState<ProjectUpdateRequest>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      try {
        setLoading(true);
        const [project, clientsRes] = await Promise.all([
          id ? getProject(id) : Promise.reject(new Error('IDが不正です')),
          listEngineerClientsLight({ page: 1, limit: 50 }),
        ]);
        if (aborted) return;
        setClients(clientsRes.items);
        setForm({
          project_name: project.project_name,
          client_id: project.client_id,
          status: project.status,
          start_date: project.start_date ?? undefined,
          end_date: project.end_date ?? null,
          description: project.description ?? '',
        });
      } catch (e: any) {
        setError(e?.message || '読み込みに失敗しました');
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [id]);

  const handleChange = (field: keyof ProjectUpdateRequest, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (form.project_name && form.project_name.length > 200) {
      errs.project_name = '案件名は200文字以内で入力してください';
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

  useEffect(() => {
    setFieldErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.project_name, form.client_id, form.start_date, form.end_date, form.description, form.status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setFieldErrors({});
    const v = validate();
    if (Object.keys(v).length > 0) {
      setFieldErrors(v);
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateProject(id, {
        ...form,
        start_date: form.start_date || undefined,
        end_date: (form.end_date as any) || null,
      });
      showSuccess('案件を更新しました');
      router.push(`/project/detail?id=${updated.id}`);
    } catch (e: any) {
      const err = handleApiError(e, '案件更新', { logContext: 'project/edit' });
      const enhanced = (err as any).enhanced;
      const fieldErrs = enhanced?.details || e?.response?.data?.errors;
      if (fieldErrs && typeof fieldErrs === 'object') setFieldErrors(fieldErrs);
      const msg = enhanced?.userMessage || err.message || '更新に失敗しました';
      setError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <EngineerGuard>
        <PageContainer maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </PageContainer>
      </EngineerGuard>
    );
  }

  return (
    <EngineerGuard>
      <PageContainer maxWidth="md">
        <PageHeader title="案件の編集" subtitle="必要な項目を更新します" />
        <ContentCard>
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <ValidationErrorAlert error={error} customErrors={fieldErrors} />

              <TextField
                label="案件名"
                value={form.project_name || ''}
                onChange={(e) => handleChange('project_name', e.target.value)}
                inputProps={{ maxLength: 200 }}
                error={!!fieldErrors.project_name}
                helperText={fieldErrors.project_name}
              />

              <TextField
                select
                label="クライアント"
                value={form.client_id || ''}
                onChange={(e) => handleChange('client_id', e.target.value)}
                required
              >
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
                onChange={(e) => handleChange('status', e.target.value as 'draft' | 'active' | 'archived')}
              >
                <MenuItem value="draft">下書き</MenuItem>
                <MenuItem value="active">進行中</MenuItem>
                <MenuItem value="archived">アーカイブ</MenuItem>
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
                <Button variant="outlined" onClick={() => router.back()}>キャンセル</Button>
                <Button variant="contained" type="submit" disabled={submitting || Object.keys(fieldErrors).length > 0}>
                  {submitting ? '保存中...' : '保存する'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ContentCard>
      </PageContainer>
    </EngineerGuard>
  );
}

export default function EditProjectPage() {
  return (
    <Suspense fallback={null}>
      <EditProjectPageInner />
    </Suspense>
  );
}
