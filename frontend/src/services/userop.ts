import api from './api';

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

export const userOpService = {
  submitUserOp: async (data: UserOpRequest): Promise<UserOpResponse> => {
    const response = await api.post('/userop', data);
    return response.data;
  }
};
