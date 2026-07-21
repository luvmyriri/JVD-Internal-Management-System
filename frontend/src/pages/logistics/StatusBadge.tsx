import { cn } from '../../utils';
import { statusStyles } from './statusStyles';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block shadow-sm",
      statusStyles[status] ?? 'bg-gray-100 text-gray-600'
    )}>
      {status}
    </span>
  );
}
