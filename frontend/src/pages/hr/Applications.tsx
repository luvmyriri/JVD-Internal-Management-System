import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LuSearch, 
  LuPlus, 
  LuMail, 
  LuPhone,
  LuBriefcase,
  LuPencil,
  LuTrash2
} from 'react-icons/lu';
import { Modal, StatusBadge, Button, Pagination } from '../../components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { jobApplicationsApi, type JobApplication } from '../../api/jobApplications';
import { formatDate } from '../../utils';

export default function Applications() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['job-applications'],
    queryFn: jobApplicationsApi.getAll
  });

  const applications = Array.isArray(response) ? response : (response?.data || []);

  const createMutation = useMutation({
    mutationFn: jobApplicationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application created successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create application')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<JobApplication> }) => jobApplicationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application updated successfully');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Failed to update application')
  });

  const deleteMutation = useMutation({
    mutationFn: jobApplicationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application deleted successfully');
    },
    onError: () => toast.error('Failed to delete application')
  });

  const filteredApps = applications.filter(app => {
    const search = searchTerm.toLowerCase();
    return (
      app.first_name.toLowerCase().includes(search) ||
      app.last_name.toLowerCase().includes(search) ||
      app.email.toLowerCase().includes(search) ||
      app.position_applied.toLowerCase().includes(search)
    );
  });

  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<JobApplication>>();

  const openModal = (app?: JobApplication) => {
    if (app) {
      setSelectedApp(app);
      reset(app);
    } else {
      setSelectedApp(null);
      reset({ status: 'pending' });
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: Partial<JobApplication>) => {
    if (selectedApp) {
      updateMutation.mutate({ id: selectedApp.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
    pending: 'warning',
    reviewed: 'info',
    interviewed: 'info',
    hired: 'success',
    rejected: 'danger'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Job Applications</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage candidates and interview processes</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <LuPlus className="w-4 h-4" /> Add Application
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Candidate</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Position</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Contact</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Applied</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No applications found.</td>
                </tr>
              ) : (
                paginatedApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {app.first_name} {app.last_name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <LuBriefcase className="w-4 h-4 text-gray-400" />
                        {app.position_applied}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2"><LuMail className="w-3.5 h-3.5" /> {app.email}</div>
                        {app.phone && <div className="flex items-center gap-2"><LuPhone className="w-3.5 h-3.5" /> {app.phone}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={app.status} variant={statusColors[app.status]} />
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(app)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this application?')) {
                              deleteMutation.mutate(app.id);
                            }
                          }}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredApps.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <Pagination
              currentPage={currentPage}
              lastPage={Math.ceil(filteredApps.length / itemsPerPage)}
              total={filteredApps.length}
              perPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedApp ? 'Edit Application' : 'Add Application'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input
                {...register('first_name', { required: 'First name is required' })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input
                {...register('last_name', { required: 'Last name is required' })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                {...register('phone')}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Position Applied</label>
            <input
              {...register('position_applied', { required: 'Position is required' })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="interviewing">Interviewing</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {selectedApp ? 'Update Application' : 'Create Application'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
