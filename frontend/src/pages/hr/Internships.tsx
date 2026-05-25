import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LuSearch, 
  LuPlus, 
  LuMail, 
  LuPhone,
  LuBook,
  LuPencil,
  LuTrash2
} from 'react-icons/lu';
import { Modal, StatusBadge, Button, Pagination } from '../../components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { internshipsApi, type Internship } from '../../api/internships';

export default function Internships() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['internships'],
    queryFn: internshipsApi.getAll
  });

  const internships = Array.isArray(response) ? response : (response?.data || []);

  const createMutation = useMutation({
    mutationFn: internshipsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      toast.success('Internship record created successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create internship')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Internship> }) => internshipsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      toast.success('Internship record updated successfully');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Failed to update internship')
  });

  const deleteMutation = useMutation({
    mutationFn: internshipsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      toast.success('Internship record deleted successfully');
    },
    onError: () => toast.error('Failed to delete internship')
  });

  const filteredInternships = internships.filter(intern => {
    const search = searchTerm.toLowerCase();
    return (
      intern.first_name.toLowerCase().includes(search) ||
      intern.last_name.toLowerCase().includes(search) ||
      intern.email.toLowerCase().includes(search) ||
      intern.school.toLowerCase().includes(search)
    );
  });

  const paginatedInternships = filteredInternships.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Internship>>({
    mode: 'onChange'
  });

  const openModal = (internship?: Internship) => {
    if (internship) {
      setSelectedInternship(internship);
      reset(internship);
    } else {
      setSelectedInternship(null);
      reset({ status: 'pending' });
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: Partial<Internship>) => {
    if (selectedInternship) {
      updateMutation.mutate({ id: selectedInternship.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
    pending: 'warning',
    active: 'info',
    completed: 'success',
    rejected: 'danger'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">OJT & Internships</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage student trainees and OJT hours</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <LuPlus className="w-4 h-4" /> Add Intern
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search interns or schools..."
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
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Intern</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">School & Course</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Contact</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Hours</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : paginatedInternships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No records found.</td>
                </tr>
              ) : (
                paginatedInternships.map((intern) => (
                  <tr key={intern.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {intern.first_name} {intern.last_name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2 font-medium">
                          <LuBook className="w-4 h-4 text-gray-400" />
                          {intern.school}
                        </div>
                        <div className="text-gray-500 text-xs ml-6">{intern.course}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2"><LuMail className="w-3.5 h-3.5" /> {intern.email}</div>
                        {intern.phone && <div className="flex items-center gap-2"><LuPhone className="w-3.5 h-3.5" /> {intern.phone}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-700 dark:text-gray-300">
                      {intern.hours_required} hrs
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={intern.status} variant={statusColors[intern.status]} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(intern)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this internship record?')) {
                              deleteMutation.mutate(intern.id);
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
        
        {filteredInternships.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <Pagination
              currentPage={currentPage}
              lastPage={Math.ceil(filteredInternships.length / itemsPerPage)}
              total={filteredInternships.length}
              perPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedInternship ? 'Edit Intern Record' : 'Add Intern Record'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input
                {...register('first_name', { 
                  required: 'First name is required',
                  pattern: {
                    value: /^[A-Za-z\s'-]+$/,
                    message: 'First name cannot contain numbers'
                  }
                })}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[0-9]/g, '');
                }}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input
                {...register('last_name', { 
                  required: 'Last name is required',
                  pattern: {
                    value: /^[A-Za-z\s'-]+$/,
                    message: 'Last name cannot contain numbers'
                  }
                })}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[0-9]/g, '');
                }}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="text"
                maxLength={11}
                {...register('phone', {
                  pattern: {
                    value: /^09\d{9}$/,
                    message: 'Must be a valid 11-digit PH number starting with 09 (e.g. 09123456789)'
                  }
                })}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                }}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">School/University</label>
              <input
                {...register('school', { required: 'School is required' })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Course/Program</label>
              <input
                {...register('course', { required: 'Course is required' })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.course && <p className="text-red-500 text-xs mt-1">{errors.course.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Hours Required</label>
              <input
                type="number"
                {...register('hours_required', { required: 'Hours required is required', valueAsNumber: true })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              {errors.hours_required && <p className="text-red-500 text-xs mt-1">{errors.hours_required.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
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
              {selectedInternship ? 'Update Record' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
