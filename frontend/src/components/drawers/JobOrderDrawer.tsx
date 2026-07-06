import { LuClipboardList, LuCalendar, LuMapPin, LuArrowRight } from 'react-icons/lu';
import { Drawer } from '../ds';
import { PipelineVisualizer } from '../ui';
import type { JobOrder } from '../../types/procurement';
import { JO_STATUS_LABELS, SERVICE_TYPE_LABELS } from '../../constants';

const statusStyles: Record<string, string> = {
  created: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
      {JO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface JobOrderDrawerProps {
  jo: JobOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function JobOrderDrawer({ jo, isOpen, onClose }: JobOrderDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width={500}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <LuClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{jo.jo_number}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={jo.status} />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {SERVICE_TYPE_LABELS[jo.service_type] ?? jo.service_type}
              </span>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        <PipelineVisualizer
          pipelineType={jo.service_type === 'maintenance' ? 'maintenance' : 'transaction'}
          currentStatus={jo.status}
          metadata={{
            bus_plate: jo.bus?.plate_number,
            driver_name: jo.driver ? `${jo.driver.first_name} ${jo.driver.last_name}` : undefined,
            ticket_no: jo.trip_ticket ? `TT-${jo.trip_ticket.id}` : undefined,
            po_no: jo.purchase_order?.po_number,
          }}
        />

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {jo.customer ? `${jo.customer.first_name} ${jo.customer.last_name}` : jo.service_type === 'maintenance' ? 'PMS Maintenance' : `Customer #${jo.customer_id}`}
            </h3>
            {jo.customer && <p className="text-xs text-gray-500 dark:text-gray-400">{jo.customer.email || 'No email provided'}</p>}
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(jo.total_cost)}
            </h3>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <LuMapPin size={14} /> Destination / Work Summary
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-bold leading-relaxed">
            {jo.destination}
          </p>
          {jo.notes && (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed italic">
              "{jo.notes}"
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Schedule Date</p>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
              <LuCalendar size={16} className="text-blue-500" />
              {new Date(jo.service_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Vehicle</p>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
              <LuArrowRight size={16} className="text-sky-500" />
              {jo.bus?.plate_number ?? `Bus #${jo.bus_id}`} {jo.bus?.bus_category ? `• ${jo.bus.bus_category}` : ''}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
