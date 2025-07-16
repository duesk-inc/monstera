// 管理者取引先関連の型定義

export interface Client {
  id: string;
  company_name: string;
  company_name_kana: string;
  billing_type: 'monthly' | 'hourly' | 'fixed';
  payment_terms: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDetail extends Client {
  active_projects: number;
  total_invoices: number;
  last_invoice_date?: string;
}

export interface Project {
  id: string;
  client_id: string;
  client_name?: string;
  project_name: string;
  project_code: string;
  status: string;
  start_date?: string;
  end_date?: string;
  monthly_rate: number;
  contract_type: string;
  work_location: string;
  description: string;
  requirements: string;
  assigned_count: number;
  created_at: string;
}

// API レスポンス型
export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientDetailResponse {
  client: ClientDetail;
}

export interface ClientProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

// API リクエスト型
export interface ClientCreateRequest {
  company_name: string;
  company_name_kana: string;
  billing_type: 'monthly' | 'hourly' | 'fixed';
  payment_terms: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  notes: string;
}

export interface ClientUpdateRequest {
  company_name?: string;
  company_name_kana?: string;
  billing_type?: 'monthly' | 'hourly' | 'fixed';
  payment_terms?: number;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
}