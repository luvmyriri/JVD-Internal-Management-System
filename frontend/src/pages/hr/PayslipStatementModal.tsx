import { Printer } from 'lucide-react';
import { Modal, Button, StatusBadge } from '../../components/ui';

interface PayslipStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayslip: any;
  formatCurrency: (val: any) => string;
  formatDate: (dateStr: string) => string;
}

export default function PayslipStatementModal({
  isOpen,
  onClose,
  selectedPayslip,
  formatCurrency,
  formatDate,
}: PayslipStatementModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payslip Statement" size="lg">
      {selectedPayslip && (
        <div className="space-y-6">

          {/* Printable Payslip Card Container */}
          <div id="printable-payslip" className="p-8 border border-gray-300 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative font-sans">

            {/* Company Logo / Header */}
            <div className="flex justify-between items-start border-b border-gray-300 dark:border-gray-800 pb-6 mb-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">JVD Trans Logistics</h2>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operations & Logistics Services Provider</p>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[9px] font-black uppercase tracking-widest rounded-lg">
                  Payslip Ref: #{selectedPayslip.id}
                </div>
                <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                  Period: {formatDate(selectedPayslip.cycle?.start_date)} - {formatDate(selectedPayslip.cycle?.end_date)}
                </p>
              </div>
            </div>

            {/* Employee Metadata */}
            <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60 mb-6">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Employee Name</span>
                <div className="text-sm font-black mt-0.5">{selectedPayslip.user?.first_name} {selectedPayslip.user?.last_name}</div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mt-3">Employee ID</span>
                <div className="text-xs font-bold mt-0.5">{selectedPayslip.user?.employee_id || 'N/A'}</div>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Department & Role</span>
                <div className="text-xs font-black mt-0.5 uppercase tracking-wide">{selectedPayslip.user?.department || 'Operations'}</div>
                <div className="text-[10px] text-blue-500 font-black mt-1 uppercase tracking-widest">{selectedPayslip.user?.role?.replace(/_/g, ' ')}</div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mt-3">Release Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedPayslip.status} variant={selectedPayslip.status === 'released' ? 'success' : 'warning'} />
                </div>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

              {/* Earnings Table */}
              <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 text-gray-500">
                  Earnings (Credit)
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Basic Pay (Cycle)</span>
                    <span className="font-bold">{formatCurrency(selectedPayslip.base_salary)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Allowances</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(selectedPayslip.allowances)}</span>
                  </div>
                  {parseFloat(selectedPayslip.commission_pay) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Commissions</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(selectedPayslip.commission_pay)}</span>
                    </div>
                  )}
                  {parseFloat(selectedPayslip.overtime_pay) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Overtime Pay</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(selectedPayslip.overtime_pay)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs pt-3 border-t border-dashed border-gray-300 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                    <span>Total Earnings (Gross)</span>
                    <span>{formatCurrency(parseFloat(selectedPayslip.base_salary) + parseFloat(selectedPayslip.allowances) + parseFloat(selectedPayslip.commission_pay || 0) + parseFloat(selectedPayslip.overtime_pay || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 text-gray-500">
                  Deductions (Debit)
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Withholding Tax (10%)</span>
                    <span className="font-bold text-rose-500">{formatCurrency(selectedPayslip.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Fixed Deductions</span>
                    <span className="font-bold text-rose-500">{formatCurrency(selectedPayslip.deductions)}</span>
                  </div>
                  {parseFloat(selectedPayslip.half_day_deductions) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Lates / Half Days</span>
                      <span className="font-bold text-rose-500">{formatCurrency(selectedPayslip.half_day_deductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs pt-3 border-t border-dashed border-gray-300 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(parseFloat(selectedPayslip.tax_amount) + parseFloat(selectedPayslip.deductions) + parseFloat(selectedPayslip.half_day_deductions || 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Disbursement Summary */}
            <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Net Pay Amount</span>
                <span className="text-xs text-gray-400 font-semibold italic">Credited via Bank Transfer / Cash Disbursement</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  {formatCurrency(selectedPayslip.net_salary)}
                </span>
              </div>
            </div>

            {/* Footer notes */}
            <div className="mt-8 text-center text-[9px] text-gray-400 font-medium uppercase tracking-wide border-t border-gray-100 dark:border-gray-800 pt-6">
              This is a system-generated statement. No physical signature is required.
            </div>
          </div>

          {/* Print Trigger */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const printContents = document.getElementById('printable-payslip')?.innerHTML;

                // Setup clean print layout page
                if (printContents) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Payslip Statement - JVD Trans Logistics</title>
                          <style>
                            body { font-family: sans-serif; padding: 40px; color: #111; }
                            .text-blue-600 { color: #2563eb; }
                            .text-emerald-600 { color: #059669; }
                            .text-rose-500 { color: #ef4444; }
                            .text-gray-400 { color: #9ca3af; }
                            .bg-gray-50 { background-color: #f9fafb; }
                            .bg-blue-50\\/50 { background-color: rgba(239, 246, 255, 0.5); }
                            .p-8 { padding: 32px; }
                            .p-5 { padding: 20px; }
                            .p-4 { padding: 16px; }
                            .pb-6 { padding-bottom: 24px; }
                            .mb-6 { margin-bottom: 24px; }
                            .mt-6 { margin-top: 24px; }
                            .mt-8 { margin-top: 32px; }
                            .pt-6 { padding-top: 24px; }
                            .grid { display: grid; }
                            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                            .gap-6 { gap: 24px; }
                            .border { border: 1px solid #e5e7eb; }
                            .border-b { border-bottom: 1px solid #e5e7eb; }
                            .border-t { border-top: 1px solid #e5e7eb; }
                            .rounded-3xl { rounded: 24px; border-radius: 24px; }
                            .rounded-2xl { rounded: 16px; border-radius: 16px; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            .font-black { font-weight: 900; }
                            .font-bold { font-weight: 700; }
                            .text-xl { font-size: 20px; }
                            .text-lg { font-size: 18px; }
                            .text-sm { font-size: 14px; }
                            .text-xs { font-size: 12px; }
                            .text-2xl { font-size: 24px; }
                            .text-center { text-align: center; }
                            .inline-block { display: inline-block; }
                            .px-3 { padding-left: 12px; padding-right: 12px; }
                            .py-1 { padding-top: 4px; padding-bottom: 4px; }
                            .space-y-3 > * + * { margin-top: 12px; }
                          </style>
                        </head>
                        <body>
                          ${printContents}
                          <script>
                            window.onload = function() {
                              window.print();
                              window.close();
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }
              }}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Payslip
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
