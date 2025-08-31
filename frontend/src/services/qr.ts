import api from './api';
import { QRRequest, QRResponse } from '../types';

export const qrService = {
  generateQR: async (data: QRRequest): Promise<QRResponse> => {
    const response = await api.post('/qr-generator', data);
    return response.data;
  }
};
