import React from 'react';
import RevenueChartCard from './widgets/RevenueChartCard';
import InvoicesSummaryCard from './widgets/InvoicesSummaryCard';
import HeadcountOverviewCard from './widgets/HeadcountOverviewCard';
import FleetStatusCard from './widgets/FleetStatusCard';
import TripTicketsCard from './widgets/TripTicketsCard';
import BookingsPipelineCard from './widgets/BookingsPipelineCard';
import CommissionsCard from './widgets/CommissionsCard';
import PurchaseOrdersCard from './widgets/PurchaseOrdersCard';
import WorkOrdersCard from './widgets/WorkOrdersCard';
import PassportCasesCard from './widgets/PassportCasesCard';
import LowStockAlertsCard from './widgets/LowStockAlertsCard';
import AuditLogsCard from './widgets/AuditLogsCard';
import PendingApprovalsCard from './widgets/PendingApprovalsCard';
import QuickActionsCard from './widgets/QuickActionsCard';

const WIDGET_COMPONENT_MAP: Record<string, React.FC> = {
  accounting_revenue: RevenueChartCard,
  accounting_invoices: InvoicesSummaryCard,
  hr_headcount: HeadcountOverviewCard,
  hr_applications: HeadcountOverviewCard, // fallback to headcount card
  fleet_status: FleetStatusCard,
  fleet_trips: TripTicketsCard,
  sales_bookings: BookingsPipelineCard,
  sales_commissions: CommissionsCard,
  procurement_pos: PurchaseOrdersCard,
  procurement_work_orders: WorkOrdersCard,
  travel_passports: PassportCasesCard,
  inventory_alerts: LowStockAlertsCard,
  system_approvals: PendingApprovalsCard,
  system_audit: AuditLogsCard,
  system_quick_actions: QuickActionsCard,
};

interface WidgetRendererProps {
  widgetId: string;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widgetId }) => {
  const Component = WIDGET_COMPONENT_MAP[widgetId];

  if (!Component) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 text-center text-gray-400 text-xs">
        Widget not found ({widgetId})
      </div>
    );
  }

  return <Component />;
};
