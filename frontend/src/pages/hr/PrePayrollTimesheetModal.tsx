import { Modal, Button } from '../../components/ui';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

interface PrePayrollAdjustment {
  commission_pay: string;
  overtime_pay: string;
  half_day_deductions: string;
}

interface PrePayrollTimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  prePayrollAdjustments: Record<number, PrePayrollAdjustment>;
  setPrePayrollAdjustments: React.Dispatch<React.SetStateAction<Record<number, PrePayrollAdjustment>>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  formatCurrency: (val: any) => string;
}

export default function PrePayrollTimesheetModal({
  isOpen,
  onClose,
  employees,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  prePayrollAdjustments,
  setPrePayrollAdjustments,
  onSubmit,
  isSubmitting,
  formatCurrency,
}: PrePayrollTimesheetModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pre-Payroll Timesheet Worksheet" size="full">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">End Date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-2xl">
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-64">Employee</th>
                  <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Base/Mo</th>
                  <th className="py-3 px-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Commission (+)</th>
                  <th className="py-3 px-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Overtime (+)</th>
                  <th className="py-3 px-4 text-[10px] font-black text-rose-500 uppercase tracking-widest">Lates / Half Days (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {employees.map((emp: any) => {
                  const adj = prePayrollAdjustments[emp.id] || { commission_pay: '', overtime_pay: '', half_day_deductions: '' };
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                      <td className="py-3 px-4">
                        <div className="font-black text-xs text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{emp.role?.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-gray-500">
                        {formatCurrency(parseFloat(emp.salary?.base_salary || 0))}
                      </td>
                      <td className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50 text-[10px] font-black">₱</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={adj.commission_pay}
                            onChange={(e) => {
                              const clean = parseMoneyInput(e.target.value);
                              if ((clean.split('.').length - 1) > 1) return;
                              setPrePayrollAdjustments(prev => ({
                                ...prev,
                                [emp.id]: { ...prev[emp.id], commission_pay: formatMoneyInput(e.target.value) }
                              }));
                            }}
                            className="w-full pl-6 pr-3 h-9 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-emerald-400 placeholder-emerald-600/30"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50 text-[10px] font-black">₱</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={adj.overtime_pay}
                            onChange={(e) => {
                              const clean = parseMoneyInput(e.target.value);
                              if ((clean.split('.').length - 1) > 1) return;
                              setPrePayrollAdjustments(prev => ({
                                ...prev,
                                [emp.id]: { ...prev[emp.id], overtime_pay: formatMoneyInput(e.target.value) }
                              }));
                            }}
                            className="w-full pl-6 pr-3 h-9 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-emerald-400 placeholder-emerald-600/30"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/50 text-[10px] font-black">₱</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={adj.half_day_deductions}
                            onChange={(e) => {
                              const clean = parseMoneyInput(e.target.value);
                              if ((clean.split('.').length - 1) > 1) return;
                              setPrePayrollAdjustments(prev => ({
                                ...prev,
                                [emp.id]: { ...prev[emp.id], half_day_deductions: formatMoneyInput(e.target.value) }
                              }));
                            }}
                            className="w-full pl-6 pr-3 h-9 bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-rose-500 transition-all dark:text-rose-400 placeholder-rose-500/30 text-rose-600"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-[10px] font-bold text-gray-400">
            Leave inputs blank or at 0.00 for employees with no adjustments.
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Generate Payroll
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
