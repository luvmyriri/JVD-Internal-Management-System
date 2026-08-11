import type { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { PackageImageCarousel } from '../../../components/ui';

interface BookingWorkspaceHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  image?: string | null;
  images?: (string | null | undefined)[];
  badge: string;
  onBack: () => void;
  facts: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
}

export default function BookingWorkspaceHeader({
  eyebrow,
  title,
  description,
  image,
  images,
  badge,
  onBack,
  facts,
  actions,
}: BookingWorkspaceHeaderProps) {
  const imagesList = images && images.length > 0 ? images : image ? [image] : [];

  return (
    <header className="overflow-hidden rounded-3xl bg-[#071b33] text-white shadow-xl">
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="relative min-h-52 overflow-hidden bg-slate-900">
          <PackageImageCarousel
            images={imagesList}
            alt={title}
            badgeText={badge}
            className="absolute inset-0 h-full w-full"
          />
        </div>

        <div className="flex flex-col justify-between gap-6 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Back to package catalog
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">{eyebrow}</p>
              <h1 className="mt-1 text-2xl font-black md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            {facts.slice(0, 3).map((fact) => <div key={fact.label}><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{fact.label}</span><strong className="mt-1 block text-sm">{fact.value}</strong></div>)}
          </div>
        </div>
      </div>

      <div className="grid border-t border-white/10 bg-white/[0.04] sm:grid-cols-3">
        {[
          ['1', 'Package selected', 'Complete'],
          ['2', 'Trip details', 'In progress'],
          ['3', 'Customer & checkout', 'Next'],
        ].map(([number, label, state], index) => (
          <div key={number} className={`flex items-center gap-3 px-6 py-4 ${index < 2 ? 'sm:border-r sm:border-white/10' : ''}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${index === 0 ? 'bg-emerald-500 text-white' : index === 1 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
              {index === 0 ? <Check className="h-4 w-4" /> : number}
            </span>
            <div><strong className="block text-xs">{label}</strong><span className="text-[10px] text-slate-400">{state}</span></div>
          </div>
        ))}
      </div>
    </header>
  );
}
