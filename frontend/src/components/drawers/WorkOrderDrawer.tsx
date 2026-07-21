import { LuWrench, LuClipboardList, LuClock } from 'react-icons/lu';
import { Drawer } from '../ds';
import { PipelineVisualizer } from '../ui';
import type { WorkOrder } from '../../types/procurement';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS } from '../../constants';

const statusStyles: Record<string, string> = {
  pending_validation: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  pending_approval:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  verified:           'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  open:               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled:          'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const priorityStyles: Record<string, string> = {
  routine:  'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400',
  urgent:   'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400',
  critical: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
      {WO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center w-fit ${priorityStyles[priority] ?? 'bg-gray-100'}`}>
      {WO_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

interface WorkOrderDrawerProps {
  wo: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkOrderDrawer({ wo, isOpen, onClose }: WorkOrderDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width={500}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <LuWrench size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{wo.wo_number}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={wo.status} />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {wo.auto_generated ? 'PMS Auto-System' : 'Manual Request'}
              </span>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        <PipelineVisualizer 
          pipelineType={wo.type === 'trip' ? 'transaction' : 'maintenance'}
          currentStatus={wo.status}
          metadata={{
            approved_by: wo.approver ? `${wo.approver.first_name} ${wo.approver.last_name}` : undefined,
            approved_at: wo.approved_at || undefined,
            bus_plate: wo.bus?.plate_number,
            driver_name: wo.assignee ? `${wo.assignee.first_name} ${wo.assignee.last_name}` : undefined,
            ticket_no: wo.trip_ticket_id ? `TT-${wo.trip_ticket_id}` : undefined,
          }}
        />

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Vehicle</p>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{wo.bus?.plate_number ?? `Bus #${wo.bus_id}`}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{wo.bus?.model ?? 'Vehicle Model Details'} {wo.bus?.bus_category ? `• ${wo.bus.bus_category}` : ''}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority Level</p>
            <div className="pt-1"><PriorityBadge priority={wo.priority} /></div>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <LuClipboardList size={14} /> Work Description
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">
            "{wo.description}"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Created Date</p>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
              <LuClock size={16} className="text-blue-500" />
              {new Date(wo.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned To</p>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-[10px]">
                {wo.assignee ? wo.assignee.first_name.charAt(0) : '?'}
              </div>
              {wo.assignee ? `${wo.assignee.first_name} ${wo.assignee.last_name}` : 'Unassigned'}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
