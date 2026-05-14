import api from './client';
import type { ApiResponse, User } from '../types';

export const profileApi = {
  update: async (data: { first_name: string; last_name: string; email: string }): Promise<ApiResponse<User>> => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  updateAvatar: async (base64Avatar: string): Promise<ApiResponse<{ avatar_url: string }>> => {
    const response = await api.post('/auth/profile/avatar', { avatar: base64Avatar });
    return response.data;
  },

  changePassword: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  }
};
