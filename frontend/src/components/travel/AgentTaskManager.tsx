import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LuPlus, LuTrash2, LuCheck, LuClock, LuLoaderCircle } from 'react-icons/lu';
import { customerApi } from '../../api/customers';
import { Button, Modal } from '../ui';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  due_date?: string;
  assigned_to: number;
  assignee?: { id: number; name: string };
  created_at: string;
}

export default function AgentTaskManager({ customerId }: { customerId: number }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '' });

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'tasks'],
    queryFn: () => customerApi.getTasks(customerId),
  });

  const tasks: Task[] = response?.data || [];

  const addMutation = useMutation({
    mutationFn: () => customerApi.addTask(customerId, form),
    onSuccess: () => {
      toast.success('Task created.');
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'tasks'] });
      setShowAdd(false);
      setForm({ title: '', description: '', due_date: '' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      customerApi.updateTask(customerId, id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'tasks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.deleteTask(customerId, id),
    onSuccess: () => {
      toast.success('Task deleted.');
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'tasks'] });
    },
  });

  const getStatusIcon = (status: string) => {
    if (status === 'resolved') return <LuCheck className="text-emerald-500" size={20} />;
    if (status === 'in_progress') return <LuLoaderCircle className="text-blue-500 animate-spin" size={20} />;
    return <LuClock className="text-gray-400" size={20} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Agent Task Tracker</h3>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2" size="sm">
          <LuPlus size={16} /> New Task
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-400 animate-pulse">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          No pending tasks for this customer.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className={`p-4 rounded-2xl border transition-colors ${task.status === 'resolved' ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 opacity-75' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
              <div className="flex items-start gap-4">
                <button
                  onClick={() => statusMutation.mutate({ id: task.id, status: task.status === 'resolved' ? 'pending' : 'resolved' })}
                  className="mt-1 hover:scale-110 transition-transform"
                >
                  {getStatusIcon(task.status)}
                </button>
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${task.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</h4>
                  {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>}
                  <div className="flex gap-4 mt-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                    {task.due_date && <span>Due: {task.due_date}</span>}
                    {task.assignee && <span>Assignee: {task.assignee.name}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                >
                  <LuTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create Task" size="md">
        <div className="p-6">
          <form id="task-form" onSubmit={e => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Task Title *</label>
              <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
            </div>
          </form>
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button form="task-form" type="submit" isLoading={addMutation.isPending} disabled={!form.title}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
