// Types based on the backend models
export interface User {
  email: string;
  name?: string;
  company?: string;
}

export interface InvoiceItem {
  name: string;
  qty: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  merchant_email: string;
  customer_email: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  total_usdc: number;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
  invoice_id?: string;
  qr_url?: string;
  checkout_url?: string;
  tx_hash?: string;
  einvoice_number?: string;
  einvoice_url?: string;
  einvoice_status?: EInvoiceStatus;
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  PAID = "PAID",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED"
}

export enum EInvoiceStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED"
}

export interface CreateInvoiceRequest {
  customer_email: string;
  items: InvoiceItem[];
  tax: number;
}

export interface EmitInvoiceResponse {
  invoice_id: string;
  qr_url: string;
  checkout_url: string;
}

export interface QRRequest {
  to_address: string;
  amount: number;
  gas_limit?: number;
}

export interface QRResponse {
  uri: string;
  qr_base64: string;
}

export interface PaymentRequest {
  tx_hash: string;
}

export interface PublicInvoice {
  merchant: string;
  customer_email: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  total_usdc: number;
  status: InvoiceStatus;
  qr_url?: string;
  checkout_url?: string;
}

export interface EInvoiceRequest {
  invoice_id: string;
}

export interface EInvoiceResponse {
  einvoice_number: string;
  einvoice_url: string;
  status: EInvoiceStatus;
}

export interface DashboardMetrics {
  issued: number;
  paid: number;
  canceled: number;
  expired: number;
  total_usdc: number;
}

export interface UserOpRequest {
  sender: string;
  to: string;
  value: number;
  data?: string;
  gas_limit?: number;
  nonce?: number;
}

export interface UserOpResponse {
  status: string;
  user_op: Record<string, any>;
  tx_hash?: string;
}

export interface AuthResponse {
  status: string;
  user_email: string;
  token?: string;
}

export interface CompanyRegisterRequest {
  name?: string;
  country?: string;
  city?: string;
  postal_code?: string;
  address?: string;
  email: string;
  tax_number?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  tokenJWT: string;
}
