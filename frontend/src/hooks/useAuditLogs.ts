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
  performed_by?: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    role: string;
    department?: string;
    avatar_url?: string | null;
  } | null;
  created_at: string;
}

export interface AuditLogStats {
  total_events: number;
  mutations_today: number;
  active_users_today: number;
  top_module: string;
  action_breakdown: Record<string, number>;
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
  search?: string;
  user_id?: number;
  module?: string;
  action?: string;
  entity_type?: string;
  entity_id?: number;
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
    staleTime: 10_000,
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: AuditLogStats }>('/audit-logs/stats');
      return data.data;
    },
    staleTime: 30_000,
  });
}
