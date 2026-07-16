import { Modal, Button } from '../../components/ui';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

interface AdjustPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayslip: any;
  adjustCommissionPay: string;
  setAdjustCommissionPay: (value: string) => void;
  adjustOvertimePay: string;
  setAdjustOvertimePay: (value: string) => void;
  adjustHalfDayDeductions: string;
  setAdjustHalfDayDeductions: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  formatCurrency: (val: any) => string;
}

export default function AdjustPayslipModal({
  isOpen,
  onClose,
  selectedPayslip,
  adjustCommissionPay,
  setAdjustCommissionPay,
  adjustOvertimePay,
  setAdjustOvertimePay,
  adjustHalfDayDeductions,
  setAdjustHalfDayDeductions,
  onSubmit,
  isSubmitting,
  formatCurrency,
}: AdjustPayslipModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Draft Payslip" size="md">
      {selectedPayslip && (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center font-black text-amber-600 text-lg">
              {selectedPayslip.user?.first_name?.[0]}{selectedPayslip.user?.last_name?.[0]}
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white">{selectedPayslip.user?.first_name} {selectedPayslip.user?.last_name}</h4>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{selectedPayslip.user?.employee_id} • {selectedPayslip.user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Commission Pay (+)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={adjustCommissionPay}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      setAdjustCommissionPay(formatMoneyInput(e.target.value));
                    }}
                    className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-amber-600/5 transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Overtime Pay (+)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={adjustOvertimePay}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      setAdjustOvertimePay(formatMoneyInput(e.target.value));
                    }}
                    className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-amber-600/5 transition-all dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">Lates / Half Days Deduction (-)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-black">₱</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={adjustHalfDayDeductions}
                  onChange={(e) => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    setAdjustHalfDayDeductions(formatMoneyInput(e.target.value));
                  }}
                  className="w-full pl-8 pr-4 h-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-rose-600/5 transition-all dark:text-white text-rose-600 dark:text-rose-400"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preview Adjusted Net Pay</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(Math.max(0,
                parseFloat(selectedPayslip.base_salary) +
                parseFloat(selectedPayslip.allowances) +
                (parseFloat(parseMoneyInput(adjustCommissionPay)) || 0) +
                (parseFloat(parseMoneyInput(adjustOvertimePay)) || 0) -
                parseFloat(selectedPayslip.tax_amount) -
                parseFloat(selectedPayslip.deductions) -
                (parseFloat(parseMoneyInput(adjustHalfDayDeductions)) || 0)
              ))}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-amber-500 hover:bg-amber-600">
              Save Adjustments
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
