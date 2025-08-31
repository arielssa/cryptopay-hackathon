import api from './api';
import { AuthResponse, CompanyRegisterRequest, LoginRequest } from '../types';

export const authService = {
  register: async (data: CompanyRegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/send-magic-link', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userEmail', data.email);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
  },

  getCurrentUser: (): string | null => {
    return localStorage.getItem('userEmail');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  sendMagicLink: async (email: string) => {
    const response = await api.post('/send-magic-link', { email });
    return response.data;
  },

  verifyMagicLink: async (token: string) => {
    const response = await api.post('/verify-magic-link', { token });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userEmail', response.data.user_email);
    }
    return response.data;
  }
};
