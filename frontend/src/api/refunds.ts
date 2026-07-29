import client from './client';

export const refundApi = {
  requestCancellation: (invoiceId: number, reason: string) =>
    client.post(`/sales/invoices/${invoiceId}/cancellation`, { reason }).then((response) => response.data),
  approveAdjustment: (adjustmentId: number) =>
    client.post(`/sales/order-adjustments/${adjustmentId}/approve`).then((response) => response.data),
  requestRefund: (creditNoteId: number, data: { amount: number; refund_method: string; reason: string }) =>
    client.post(`/sales/credit-notes/${creditNoteId}/refunds`, data).then((response) => response.data),
  approveRefund: (refundId: number) =>
    client.post(`/sales/refunds/${refundId}/approve`).then((response) => response.data),
  processRefund: (refundId: number, destination_reference?: string) =>
    client.post(`/sales/refunds/${refundId}/process`, { destination_reference }).then((response) => response.data),
};
