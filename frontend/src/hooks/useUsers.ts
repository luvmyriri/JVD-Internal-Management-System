import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
    placeholderData: keepPreviousData,
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

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.resetPassword(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(response?.data?.message || 'Password reset link sent to employee email');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send password reset link');
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: ({ id, password, passwordConfirmation }: { id: number; password: string; passwordConfirmation: string }) =>
      userApi.setPassword(id, password, passwordConfirmation),
    onSuccess: (response: any) => {
      toast.success(response?.data?.message || 'Password updated successfully');
    },
    onError: (error: any) => {
      const errors = error.response?.data?.errors;
      if (errors?.password) {
        toast.error(errors.password[0]);
      } else {
        toast.error(error.response?.data?.message || 'Failed to update password');
      }
    },
  });
}
