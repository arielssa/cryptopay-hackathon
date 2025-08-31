import api from './api';
import { PaymentRequest, PublicInvoice } from '../types';

export const paymentsService = {
  getPublicInvoice: async (invoiceId: string): Promise<PublicInvoice> => {
    const response = await api.get(`/pay/${invoiceId}`);
    return response.data;
  },

  confirmPayment: async (invoiceId: string, data: PaymentRequest) => {
    const response = await api.post(`/pay/${invoiceId}/confirm`, data);
    return response.data;
  },

  webhookPayment: async (data: any) => {
    const response = await api.post('/webhook/payment', data);
    return response.data;
  }
};
