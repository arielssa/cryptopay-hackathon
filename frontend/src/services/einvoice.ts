import api from './api';
import { EInvoiceResponse } from '../types';

export const einvoiceService = {
  submitEInvoice: async (invoiceId: string): Promise<EInvoiceResponse> => {
    const response = await api.post(`/einvoice/${invoiceId}/send`);
    return response.data;
  },

  retryEInvoice: async (invoiceId: string): Promise<EInvoiceResponse> => {
    const response = await api.post(`/einvoice/${invoiceId}/retry`);
    return response.data;
  },

  getEInvoiceStatus: async (invoiceId: string) => {
    const response = await api.get(`/einvoice/${invoiceId}/status`);
    return response.data;
  },

  downloadXML: async (invoiceId: string) => {
    const response = await api.get(`/einvoice/${invoiceId}/xml`, {
      responseType: 'blob'
    });
    return response.data;
  },

  downloadPDF: async (invoiceId: string) => {
    const response = await api.get(`/einvoice/${invoiceId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
