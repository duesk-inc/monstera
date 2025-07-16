// 管理者請求書関連の型定義

export interface Invoice {
  id: string;
  client_id: string;
  client_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax: number;
  total_amount: number;
  notes: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  project_id?: string;
  project_name?: string;
  user_id?: string;
  user_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  order_index: number;
}

export interface InvoiceDetail extends Invoice {
  details: InvoiceItem[];
}

export interface InvoiceSummary {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  overdue_amount: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  overdue_count: number;
}

// API レスポンス型
export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export interface InvoiceDetailResponse {
  invoice: InvoiceDetail;
}

export interface InvoiceSummaryResponse {
  summary: InvoiceSummary;
}

// API リクエスト型
export interface CreateInvoiceItemRequest {
  project_id?: string;
  user_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceCreateRequest {
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  details: CreateInvoiceItemRequest[];
}

export interface InvoiceUpdateRequest {
  invoice_date?: string;
  due_date?: string;
  notes?: string;
}

export interface InvoiceStatusUpdateRequest {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
}