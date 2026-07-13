import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { StatCard, Chart } from '../../../components/ds';
import { Banknote } from 'lucide-react';

export default function RevenueWidget() {
  const { data } = useQuery({
    queryKey: ['widget_revenue'],
    queryFn: dashboardApi.getWidgetRevenue
  });

  const revData = data as any;
  const chartData = revData?.chart?.map((d: any) => ({
    label: d.month,
    value: d.revenue
  })) || [];

  return (
    <div className="space-y-4">
      <StatCard 
        label={revData?.label || "Revenue this month"}
        value={revData?.value || "₱0.00"}
        delta={revData?.trend ? parseFloat(revData.trend) : undefined}
        icon={<Banknote className="w-5 h-5 text-brand" />}
      />
      {chartData.length > 0 && (
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5">
           <h3 className="font-semibold text-ink mb-4">Revenue Trend (in Thousands)</h3>
           <Chart data={chartData} height={200} />
        </div>
      )}
    </div>
  )
}
