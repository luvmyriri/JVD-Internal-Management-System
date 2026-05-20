import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/users';
import toast from 'react-hot-toast';

export function useUsers(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      // Strip empty/null/undefined values so they don't accidentally filter results
      const cleanParams = params
        ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
        : undefined;
      const response = await userApi.list(cleanParams);
      return response.data;
    },
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await userApi.get(id);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => userApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Employee created successfully');
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Employee updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Employee deactivated');
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Employee reactivated');
    },
  });
}
export function useToggleStatus() {
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();

  return {
    mutate: ({ id, currentStatus }: { id: number; currentStatus: boolean }) => {
      if (currentStatus) {
        deactivate.mutate(id);
      } else {
        activate.mutate(id);
      }
    },
    isLoading: deactivate.isPending || activate.isPending,
  };
}

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { new_password: string; new_password_confirmation: string } }) =>
      userApi.setPassword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Password updated. The user must log in again.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    },
  });
}
