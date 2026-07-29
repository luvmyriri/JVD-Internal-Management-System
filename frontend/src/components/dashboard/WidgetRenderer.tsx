import React, { Component, type ReactNode } from 'react';
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

class CardErrorBoundary extends Component<{ children: ReactNode; title: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; title: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn(`[Widget Error] ${this.props.title}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight mb-1">
            Card Unavailable
          </p>
          <p className="text-[11px] text-gray-400">This module card is restricted or temporarily offline.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const WIDGET_COMPONENT_MAP: Record<string, React.FC> = {
  accounting_revenue: RevenueChartCard,
  accounting_invoices: InvoicesSummaryCard,
  hr_headcount: HeadcountOverviewCard,
  hr_applications: HeadcountOverviewCard,
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
      <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 text-center text-gray-400 text-xs font-medium">
        Widget not found ({widgetId})
      </div>
    );
  }

  return (
    <CardErrorBoundary title={widgetId}>
      <Component />
    </CardErrorBoundary>
  );
};
