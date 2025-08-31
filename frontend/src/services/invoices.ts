import api from './api';
import { Invoice, CreateInvoiceRequest, DashboardMetrics, EmitInvoiceResponse } from '../types';

export const invoicesService = {
  createInvoice: async (data: CreateInvoiceRequest): Promise<Invoice> => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  getInvoices: async (params?: { 
    status?: string, 
    from_date?: string, 
    to_date?: string, 
    limit?: number, 
    offset?: number 
  }): Promise<Invoice[]> => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  emitInvoice: async (id: string): Promise<EmitInvoiceResponse> => {
    const response = await api.post(`/invoices/${id}/emit`);
    return response.data;
  },

  cancelInvoice: async (id: string): Promise<Invoice> => {
    const response = await api.post(`/invoices/${id}/cancel`);
    return response.data;
  },

  getDashboardMetrics: async (params?: { 
    from_date?: string, 
    to_date?: string 
  }): Promise<DashboardMetrics> => {
    const response = await api.get('/dashboard/metrics', { params });
    return response.data;
  }
};
