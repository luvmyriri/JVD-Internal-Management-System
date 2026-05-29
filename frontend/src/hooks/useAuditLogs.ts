import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../api/client';

export interface AuditLog {
  id: number;
  action: string;
  module: string;
  entity_type: string;
  entity_id: number | null;
  old_values: any;
  new_values: any;
  ip_address: string;
  performed_by: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  created_at: string;
}

interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface UseAuditLogsParams {
  page?: number;
  user_id?: number;
  module?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}

export function useAuditLogs(params: UseAuditLogsParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const { data } = await api.get<AuditLogsResponse>('/audit-logs', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
