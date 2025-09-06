import { createPresetApiClient } from '@/lib/api';
import { convertSnakeToCamel } from '@/utils/apiUtils';

export type ProjectItemDto = {
  id: string;
  project_name: string;
  status: 'draft' | 'active' | 'archived';
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
  client_id: string;
  client_name?: string;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponseDto = {
  items: ProjectItemDto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type ProjectListQuery = {
  q?: string;
  status?: 'draft' | 'active' | 'archived';
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'status' | 'project_name';
  sortOrder?: 'asc' | 'desc';
};

export const listProjects = async (query: ProjectListQuery = {}): Promise<ProjectListResponseDto> => {
  const client = createPresetApiClient('auth');
  const params = new URLSearchParams();
  if (query.q) params.append('q', query.q);
  if (query.status) params.append('status', query.status);
  params.append('page', String(query.page ?? 1));
  params.append('limit', String(query.limit ?? 20));
  if (query.sortBy) params.append('sort_by', query.sortBy);
  if (query.sortOrder) params.append('sort_order', query.sortOrder);

  const res = await client.get(`/api/v1/projects?${params.toString()}`);
  return convertSnakeToCamel<ProjectListResponseDto>(res.data);
};

export const getProject = async (id: string): Promise<ProjectItemDto> => {
  const client = createPresetApiClient('auth');
  const res = await client.get(`/api/v1/projects/${id}`);
  // Accept both plain Project or wrapped { project }
  const dataCamel = convertSnakeToCamel<any>(res.data);
  return (dataCamel?.project as ProjectItemDto) ?? (dataCamel as ProjectItemDto);
};

export type ProjectCreateRequest = {
  project_name: string;
  client_id: string;
  status?: 'draft' | 'active';
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
};

export type ProjectUpdateRequest = {
  project_name?: string;
  client_id?: string;
  status?: 'draft' | 'active' | 'archived';
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
  version?: number;
};

// Returns created/updated project or throws with {code,message,errors}
export const createProject = async (req: ProjectCreateRequest): Promise<ProjectItemDto> => {
  const client = createPresetApiClient('auth');
  try {
    const res = await client.post(`/api/v1/projects`, req);
    const dataCamel = convertSnakeToCamel<any>(res.data);
    return (dataCamel?.project as ProjectItemDto) ?? (dataCamel as ProjectItemDto);
  } catch (e: any) {
    // 上位のUIで共通エラーエンベロープ(code/message/errors)を扱う
    throw e;
  }
};

export const updateProject = async (id: string, req: ProjectUpdateRequest): Promise<ProjectItemDto> => {
  const client = createPresetApiClient('auth');
  try {
    const res = await client.put(`/api/v1/projects/${id}`, req);
    const dataCamel = convertSnakeToCamel<any>(res.data);
    return (dataCamel?.project as ProjectItemDto) ?? (dataCamel as ProjectItemDto);
  } catch (e: any) {
    throw e;
  }
};
