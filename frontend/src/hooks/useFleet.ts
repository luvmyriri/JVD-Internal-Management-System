import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fleetApi } from '../api/fleet';
import toast from 'react-hot-toast';
import type { Bus } from '../types/inventory';

/** Fetch all buses (no pagination — used for dropdowns/selectors). */
export function useBuses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['buses', params],
    queryFn: async (): Promise<{ data: Bus[]; meta?: unknown }> => {
      const response = await fleetApi.list({ per_page: 999, ...params });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Assign or unassign a driver from a bus. */
export function useAssignDriverToBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, driverId }: { busId: number; driverId: number | null }) =>
      fleetApi.patch(busId, { assigned_driver: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update bus assignment.');
    },
  });
}
