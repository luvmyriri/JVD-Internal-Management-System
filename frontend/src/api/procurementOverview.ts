import api from './client';

export interface ProcurementStats {
  stats: {
    active_pos: number;
    total_suppliers: number;
    pending_pos: number;
    pending_accreditations: number;
    active_accreditations: number;
  };
  volume: { name: string; pos: number }[];
  distribution: { name: string; value: number }[];
}

export const procurementOverviewApi = {
  getStats: () => api.get<{ data: ProcurementStats }>('/procurement/overview'),
};
