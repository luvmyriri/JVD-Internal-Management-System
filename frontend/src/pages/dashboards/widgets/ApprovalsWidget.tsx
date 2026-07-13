import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { Card, Avatar, ListRow, StatusPill } from '../../../components/ds';
import { CheckCircle2, Clock, FileSignature, Inbox } from 'lucide-react';

export default function ApprovalsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard_approvals'],
    queryFn: dashboardApi.getWidgetApprovals
  });

  const approvals = (data as any)?.approvals || [];

  if (isLoading) return <Card className="p-6 h-full min-h-[300px] animate-pulse" />;

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5">
      <h3 className="font-semibold text-ink mb-4">Pending Approvals</h3>
      
      {approvals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
          <Inbox className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm font-medium">Inbox zero</p>
          <p className="text-xs">No pending approvals required.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((item: any) => (
            <ListRow 
              key={item.id}
              title={<span className="font-medium text-ink">{item.title}</span>}
              status={<StatusPill tone="warning" label="Awaiting" />}
              subtitle={
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <FileSignature className="w-3.5 h-3.5 text-muted" />
                  {item.subtitle}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
