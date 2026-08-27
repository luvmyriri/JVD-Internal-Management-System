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
          {ticket.tour_name && <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{ticket.tour_name}</p>}
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

        {ticket.sales_order_item && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">Sales handoff</p>
                <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">{ticket.sales_order_item.title}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Customer: {ticket.invoice?.customer_name || 'Recorded on invoice'}
                </p>
              </div>
              <div className="text-right text-xs font-bold text-blue-700 dark:text-blue-300">
                <p>{ticket.invoice?.invoice_number || 'Invoice linked'}</p>
                <p className="mt-1 opacity-70">{ticket.sales_order_item.order?.order_number}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-blue-200 pt-3 text-xs leading-5 text-blue-800 dark:border-blue-800 dark:text-blue-200">
              Continue here with the pre-trip inspection, allowances, approval, dispatch, and completion. Vehicle or driver reassignment stays synchronized with the private-tour fulfillment and fleet allocation.
            </p>
          </div>
        )}

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
