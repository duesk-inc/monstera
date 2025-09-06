import { createPresetApiClient } from '@/lib/api';
import { convertSnakeToCamel } from '@/utils/apiUtils';

export type LightClientItem = {
  id: string;
  company_name: string;
};

export type LightClientsResponse = {
  items: LightClientItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type LightClientsQuery = {
  q?: string;
  page?: number;
  limit?: number;
};

const STUB_ITEMS: LightClientItem[] = [
  { id: 'cl_stub_001', company_name: 'サンプル株式会社' },
  { id: 'cl_stub_002', company_name: 'テック株式会社' },
  { id: 'cl_stub_003', company_name: 'ACME株式会社' },
];

const buildStub = (query: LightClientsQuery): LightClientsResponse => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const q = (query.q || '').toLowerCase();
  const filtered = q ? STUB_ITEMS.filter(i => i.company_name.toLowerCase().includes(q)) : STUB_ITEMS;
  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = filtered.slice(start, end);
  const total_pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, page, limit, total_pages };
};

export const listEngineerClientsLight = async (query: LightClientsQuery = {}): Promise<LightClientsResponse> => {
  // Allow forcing stub via env for local development
  if (process.env.NEXT_PUBLIC_USE_CLIENTS_STUB === 'true') {
    return buildStub(query);
  }

  const client = createPresetApiClient('auth');
  const params = new URLSearchParams();
  params.append('light', 'true');
  if (query.q) params.append('q', query.q);
  params.append('page', String(query.page ?? 1));
  params.append('limit', String(query.limit ?? 20));

  try {
    const res = await client.get(`/api/v1/engineer/clients?${params.toString()}`);
    return convertSnakeToCamel<LightClientsResponse>(res.data);
  } catch (e: any) {
    // If backend not ready (404/501/Not Implemented), serve stub to unblock FE
    const status = e?.response?.status;
    if (status === 404 || status === 501 || status === 500) {
      return buildStub(query);
    }
    throw e;
  }
};

