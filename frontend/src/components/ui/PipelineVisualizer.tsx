import React from 'react';
import {
  LuFileText,
  LuClipboardCheck,
  LuTicket,
  LuDollarSign,
  LuCalendarCheck,
  LuWrench,
  LuUserCheck,
  LuPackage,
  LuCircleCheck
} from 'react-icons/lu';
import { cn } from '../../utils';

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface PipelineVisualizerProps {
  pipelineType: 'transaction' | 'maintenance';
  currentStatus: string;
  metadata?: {
    approved_by?: string;
    approved_at?: string;
    driver_name?: string;
    bus_plate?: string;
    ticket_no?: string;
    budget_status?: string;
    po_no?: string;
    requires_po?: boolean;
    wo_no?: string;
  };
}

const TRANSACTION_STEPS: Step[] = [
  {
    id: 'reservation_confirmed',
    label: 'Reservation Confirmed',
    description: 'Transaction Success',
    icon: <LuFileText size={18} />
  },
  {
    id: 'ticket_issued',
    label: 'Ticket Issued',
    description: 'Trip Ticket drafted',
    icon: <LuTicket size={18} />
  },
  {
    id: 'budget_approved',
    label: 'Budget Approved',
    description: 'Accounting approved cash',
    icon: <LuDollarSign size={18} />
  },
  {
    id: 'disbursed',
    label: 'Disbursed',
    description: 'Reflected in driver schedule & billing',
    icon: <LuCalendarCheck size={18} />
  }
];

const MAINTENANCE_STEPS: Step[] = [
  {
    id: 'driver_request',
    label: 'Driver Request',
    description: 'Ad-hoc maintenance requested',
    icon: <LuWrench size={18} />
  },
  {
    id: 'mechanic_validated',
    label: 'Mechanic Validated',
    description: 'Verified by Head Mechanic',
    icon: <LuUserCheck size={18} />
  },
  {
    id: 'wo_approved',
    label: 'WO Approved',
    description: 'Service Adviser approved',
    icon: <LuClipboardCheck size={18} />
  },
  {
    id: 'jo_created',
    label: 'JO Created',
    description: 'Job Order for repairs created',
    icon: <LuPackage size={18} />
  },
  {
    id: 'po_budget',
    label: 'PO / Cash Budget',
    description: 'Approved & Disbursed (if needed)',
    icon: <LuDollarSign size={18} />
  },
  {
    id: 'completed',
    label: 'Archived',
    description: 'Repairs completed & verified',
    icon: <LuCircleCheck size={18} />
  }
];

export default function PipelineVisualizer({
  pipelineType,
  currentStatus,
  metadata = {}
}: PipelineVisualizerProps) {
  // Resolve current active step index
  const steps = pipelineType === 'transaction' ? TRANSACTION_STEPS : MAINTENANCE_STEPS;
  
  const getActiveIndex = (): number => {
    if (pipelineType === 'transaction') {
      switch (currentStatus) {
        case 'pending_approval':
        case 'verified':
        case 'open':
        case 'created':
        case 'confirmed':
          return 0;
        case 'draft':
        case 'ticket_draft':
          return 1;
        case 'budget_pending':
        case 'approved':
        case 'ticket_approved':
          return 2;
        case 'disbursed':
        case 'completed':
          return 3;
        default:
          return 0;
      }
    } else {
      // Maintenance
      switch (currentStatus) {
        case 'pending_validation':
          return 0;
        case 'pending_approval':
          return 1;
        case 'verified':
        case 'open':
          return 2;
        case 'jo_created':
        case 'jo_confirmed':
          return 3;
        case 'po_pending':
        case 'budget_pending':
          return 4;
        case 'disbursed':
        case 'completed':
          return 5;
        default:
          return 0;
      }
    }
  };

  const activeIndex = getActiveIndex();

  return (
    <div className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-[2rem] p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-widest block mb-0.5">
            Process Flow Pipeline
          </span>
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            {pipelineType === 'transaction' ? 'Sales & Logistics Pipeline' : 'Ad-hoc Maintenance Pipeline'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-gray-400">
            Active tracking
          </span>
        </div>
      </div>

      {/* Progress Line & Nodes */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 mt-2">
        {/* Horizontal Line for MD+ screens */}
        <div className="absolute top-[22px] left-[32px] right-[32px] h-[3px] bg-gray-100 dark:bg-gray-800 hidden md:block" />
        {/* Active Line Fill */}
        <div 
          className="absolute top-[22px] left-[32px] h-[3px] bg-gradient-to-r from-blue-500 to-indigo-600 hidden md:block transition-all duration-700" 
          style={{ width: `${(activeIndex / (steps.length - 1)) * 90}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;

          return (
            <div 
              key={step.id} 
              className={cn(
                "relative flex items-center md:flex-col md:text-center gap-4 md:gap-3 flex-1 transition-all duration-300",
                isActive ? "opacity-100 scale-105" : "opacity-75"
              )}
            >
              {/* Node Icon */}
              <div 
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center border-2 z-10 transition-all duration-500 shadow-sm shrink-0",
                  isCompleted 
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-500 text-emerald-600 dark:text-emerald-400" 
                    : isActive 
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-300/30" 
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600"
                )}
              >
                {step.icon}
              </div>

              {/* Step Labels */}
              <div className="flex flex-col md:items-center">
                <span 
                  className={cn(
                    "text-xs font-black tracking-tight",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-normal mt-0.5 max-w-[130px] md:mx-auto">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Meta details if available */}
      {Object.keys(metadata).length > 0 && (
        <div className="mt-6 pt-5 border-t border-gray-50 dark:border-gray-900 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {metadata.approved_by && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized By</p>
              <p className="font-bold text-gray-700 dark:text-gray-300 mt-0.5">{metadata.approved_by}</p>
            </div>
          )}
          {metadata.approved_at && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approval Date</p>
              <p className="font-bold text-gray-700 dark:text-gray-300 mt-0.5">{new Date(metadata.approved_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          )}
          {metadata.bus_plate && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Bus</p>
              <p className="font-bold text-gray-700 dark:text-gray-300 mt-0.5">{metadata.bus_plate} {metadata.driver_name ? `(${metadata.driver_name})` : ''}</p>
            </div>
          )}
          {metadata.ticket_no && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Ticket</p>
              <p className="font-bold text-gray-700 dark:text-gray-300 mt-0.5">{metadata.ticket_no}</p>
            </div>
          )}
          {metadata.po_no && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Purchase Order</p>
              <p className="font-bold text-gray-700 dark:text-gray-300 mt-0.5">{metadata.po_no}</p>
            </div>
          )}
          {metadata.wo_no && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Work Order</p>
              <p className="font-bold text-gray-700 dark:text-gray-300 mt-0.5">{metadata.wo_no}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
