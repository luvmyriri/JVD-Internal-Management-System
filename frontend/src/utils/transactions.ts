import type { TransactionEngine, TransactionRecord } from '../api/transactions';

export const formatTransactionMoney = (value: unknown, currency = 'PHP') => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
}).format(Number(value ?? 0));

export const transactionEngine = (transaction: TransactionRecord): TransactionEngine => {
  const bookingType = transaction.booking?.type?.toLowerCase() ?? '';
  if (bookingType.includes('joiner')) return 'joiner';
  if (bookingType.includes('charter') || bookingType.includes('bus_rental')) return 'charter';
  if (bookingType.includes('educational')) return 'educational';
  if (bookingType.includes('private') || bookingType.includes('fixed')) return 'fixed_package';
  if (transaction.kind === 'cash_budget_disbursement') return 'cash_budget';

  const serviceTypes = transaction.product.service_types.map((type) => type.toLowerCase());
  if (serviceTypes.some((type) => type.includes('joiner'))) return 'joiner';
  if (serviceTypes.some((type) => type.includes('bus') || type.includes('charter'))) return 'charter';
  if (serviceTypes.some((type) => type.includes('educational'))) return 'educational';
  if (serviceTypes.some((type) => type.includes('private') || type.includes('fixed'))) return 'fixed_package';
  return 'custom';
};

export const transactionEngineLabel = (engine: TransactionEngine) => ({
  fixed_package: 'Fixed package',
  joiner: 'Joiner departure',
  charter: 'Bus charter',
  educational: 'Educational tour',
  custom: 'Custom service',
  cash_budget: 'Cash budget',
}[engine]);

export const transactionServiceDate = (transaction: TransactionRecord) => transaction.schedule.starts_at
  || transaction.schedule.travel_date
  || transaction.created_at;

export const transactionPaymentTerms = (transaction: TransactionRecord) => {
  const type = String(transaction.money.payment_type ?? '').toLowerCase();
  if (type === 'full') return 'Full payment';
  if (type === 'downpayment' || type === 'deposit') return 'Downpayment';
  if (transaction.money.gross_collected > 0 && transaction.money.balance > 0) return 'Partial payment';
  if (transaction.money.balance <= 0) return 'Fully settled';
  return 'Payment pending';
};

export const transactionContractLabel = (transaction: TransactionRecord) => {
  if (transaction.contract.status) return transaction.contract.status.replaceAll('_', ' ');
  if (transaction.contract.gate_status) return transaction.contract.gate_status.replaceAll('_', ' ');
  return transaction.contract.required ? 'Contract required' : 'No contract required';
};

export const transactionNavigation = (
  transaction: TransactionRecord,
  ...keys: Array<'transaction' | 'billing' | 'collection' | 'customer' | 'engine' | 'product'>
) => keys.map((key) => transaction.navigation[key]).find((target) => Boolean(target?.path)) ?? null;
