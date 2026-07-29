import type { ReactNode } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '../../../components/ds';

interface PackageBuilderShellProps {
  eyebrow: string;
  title: string;
  description: string;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  isSaving?: boolean;
  preview: ReactNode;
  children: ReactNode;
}

export default function PackageBuilderShell({
  eyebrow,
  title,
  description,
  onCancel,
  onSave,
  saveLabel,
  isSaving = false,
  preview,
  children,
}: PackageBuilderShellProps) {
  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-5 rounded-3xl bg-[#071b33] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-4xl">
          <button type="button" onClick={onCancel} className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to package library
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} className="!border !border-white/20 !text-white hover:!bg-white/10">Cancel</Button>
          <Button type="button" onClick={onSave} disabled={isSaving} className="!bg-amber-500 !text-white hover:!bg-amber-600">
            <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">{children}</main>
        <aside className="h-fit 2xl:sticky 2xl:top-4">{preview}</aside>
      </div>
    </div>
  );
}
