/**
 * M-02: BIR TRAIN Law progressive withholding tax (semi-monthly share).
 * Mirrors the backend computeBirTax() for accurate live preview.
 *
 * Shared by Payroll.tsx and EmployeeSalaryScheduleModal.tsx — do not duplicate,
 * import from here.
 */
export function computeBirTax(monthlyBase: number): number {
  const annual = monthlyBase * 12;
  let annualTax: number;
  if (annual <= 250000) {
    annualTax = 0;
  } else if (annual <= 400000) {
    annualTax = (annual - 250000) * 0.15;
  } else if (annual <= 800000) {
    annualTax = 22500 + (annual - 400000) * 0.20;
  } else if (annual <= 2000000) {
    annualTax = 102500 + (annual - 800000) * 0.25;
  } else if (annual <= 8000000) {
    annualTax = 402500 + (annual - 2000000) * 0.30;
  } else {
    annualTax = 2202500 + (annual - 8000000) * 0.35;
  }
  return Math.round((annualTax / 24) * 100) / 100;
}
