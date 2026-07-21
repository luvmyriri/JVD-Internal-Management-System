import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { StatCard } from '../../../components/ds';
import { Bus } from 'lucide-react';

export default function FleetWidget() {
  const { data } = useQuery({
    queryKey: ['widget_fleet'],
    queryFn: dashboardApi.getWidgetFleet
  });

  const fleetData = data as any;

  return (
    <StatCard 
      label={fleetData?.label || "Available Fleet"}
      value={fleetData?.value || "0/0"}
      icon={<Bus className="w-5 h-5 text-success" />}
      unit={`Under Maintenance: ${fleetData?.details?.maintenance || 0} | On Trip: ${fleetData?.details?.on_trip || 0}`}
    />
  );
}
