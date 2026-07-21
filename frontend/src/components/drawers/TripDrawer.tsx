import { Drawer, Button } from '../ds';
import { PipelineVisualizer } from '../ui';
import type { TripTicket } from '../../types';
import { useAuth } from '../../context/AuthContext';

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

interface TripDrawerProps {
  ticket: TripTicket;
  isOpen: boolean;
  onClose: () => void;
  onCustomizeApprove?: (ticket: TripTicket) => void;
  onPrint?: (ticket: TripTicket) => void;
}

export default function TripDrawer({ ticket, isOpen, onClose, onCustomizeApprove, onPrint }: TripDrawerProps) {
  const { user } = useAuth();
  
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width={500}
      title={
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Ticket #{ticket.control_no}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-8">
        <PipelineVisualizer
          pipelineType="transaction"
          currentStatus={ticket.status === 'approved' ? (ticket.cash_budget_request?.status === 'disbursed' ? 'disbursed' : 'approved') : ticket.status}
          metadata={{
            approved_by: ticket.approvedBy?.name,
            bus_plate: ticket.bus?.plate_number || ticket.plate_no,
            driver_name: ticket.driver?.name,
            ticket_no: ticket.control_no,
            budget_status: ticket.cash_budget_request?.status,
          }}
        />

        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</p>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{ticket.date_of_travel}</h3>
            {ticket.duration && <p className="text-xs text-gray-500 mt-1">{ticket.duration}</p>}
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passengers</p>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{ticket.no_of_passengers} pax</h3>
            {ticket.passenger_name && <p className="text-xs text-gray-500 mt-1">{ticket.passenger_name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Route</p>
            <div className="mt-2 space-y-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 shadow-sm z-10" />
                  <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-800" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Pick Up</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.pick_up}</p>
                </div>
              </div>
              {ticket.destination && ticket.destination !== 'TBD' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-900 shadow-sm z-10" />
                    <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Destination</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.destination}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Drop Off</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.drop_off}</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle & Driver</p>
            <div className="mt-2 space-y-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.bus?.plate_number || ticket.plate_no || 'TBA'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.driver?.name || 'TBA'}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Allowances</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-sm text-gray-500">Meal</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.meal_allowance?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-sm text-gray-500">Diesel</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.diesel?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-sm text-gray-500">SOP</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.sop?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <span className="text-sm text-gray-500">Tolls</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {((ticket.easy_trip || 0) + (ticket.autosweep || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button
            onClick={() => { if(onPrint) onPrint(ticket); }}
            className="w-full justify-center"
          >
            Print DTT
          </Button>
          {ticket.status === 'draft' && user?.role !== 'driver' && onCustomizeApprove && (
            <Button
              variant="secondary"
              onClick={() => { onCustomizeApprove(ticket); onClose(); }}
              className="w-full justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              Customize & Approve
            </Button>
          )}
          {ticket.status === 'approved' && user?.role === 'super_admin' && onCustomizeApprove && (
            <Button
              variant="secondary"
              onClick={() => { onCustomizeApprove(ticket); onClose(); }}
              className="w-full justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Edit Customized DTT
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
