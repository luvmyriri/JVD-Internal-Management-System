import { Modal, Button } from '../../components/ui';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { computeBirTax } from './payrollTax';

interface EmployeeSalaryScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployee: any;
  baseSalary: string;
  setBaseSalary: (value: string) => void;
  allowances: string;
  setAllowances: (value: string) => void;
  deductions: string;
  setDeductions: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  formatCurrency: (val: any) => string;
}

export default function EmployeeSalaryScheduleModal({
  isOpen,
  onClose,
  selectedEmployee,
  baseSalary,
  setBaseSalary,
  allowances,
  setAllowances,
  deductions,
  setDeductions,
  onSubmit,
  isSubmitting,
  formatCurrency,
}: EmployeeSalaryScheduleModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee Salary Profile" size="md">
      {selectedEmployee && (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center font-black text-blue-600 text-lg">
              {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">{selectedEmployee.first_name} {selectedEmployee.last_name}</h4>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{selectedEmployee.employee_id} • {selectedEmployee.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Monthly Base Salary</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={baseSalary}
                  onChange={(e) => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setBaseSalary(formatted);
                  }}
                  className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Monthly Allowances</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={allowances}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      const formatted = formatMoneyInput(e.target.value);
                      setAllowances(formatted);
                    }}
                    className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Monthly Deductions</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={deductions}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      const formatted = formatMoneyInput(e.target.value);
                      setDeductions(formatted);
                    }}
                    className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Est. Monthly Net (after BIR tax)</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(Math.max(0, (parseFloat(parseMoneyInput(baseSalary)) || 0) + (parseFloat(parseMoneyInput(allowances)) || 0) - computeBirTax(parseFloat(parseMoneyInput(baseSalary)) || 0) * 2 - (parseFloat(parseMoneyInput(deductions)) || 0)))}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
