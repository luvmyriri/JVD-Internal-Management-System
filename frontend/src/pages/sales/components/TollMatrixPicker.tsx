import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Calculator, ChevronDown, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { charterApi, type TollMatrixCalculation } from '../../../api/charters';

type Segment = { network_id: string; entry_point_id: string; exit_point_id: string };

interface Props {
  onApply: (calculation: TollMatrixCalculation) => void;
}

const blankSegment = (networkId = ''): Segment => ({ network_id: networkId, entry_point_id: '', exit_point_id: '' });

export default function TollMatrixPicker({ onApply }: Props) {
  const [segments, setSegments] = useState<Segment[]>([blankSegment()]);
  const { data: catalog, isLoading } = useQuery({ queryKey: ['toll-matrix-class-2'], queryFn: charterApi.tollMatrix });
  const firstNetworkId = catalog?.networks[0]?.id ?? '';

  useEffect(() => {
    if (firstNetworkId) {
      setSegments(current => current.map(segment => segment.network_id ? segment : blankSegment(firstNetworkId)));
    }
  }, [firstNetworkId]);

  const validSegments = useMemo(() => segments.every(segment => segment.network_id && segment.entry_point_id && segment.exit_point_id && segment.entry_point_id !== segment.exit_point_id), [segments]);
  const calculation = useMutation({
    mutationFn: () => charterApi.calculateTolls(segments.map(segment => ({
      network_id: segment.network_id,
      entry_point_id: Number(segment.entry_point_id),
      exit_point_id: Number(segment.exit_point_id),
    }))),
    onSuccess: result => {
      onApply(result);
      toast.success(`Applied Class 2 tolls: ₱${result.total.toLocaleString()}`);
    },
    onError: (error: any) => toast.error(error?.response?.data?.errors?.['segments.0']?.[0] ?? error?.response?.data?.message ?? 'The selected toll route could not be calculated.'),
  });

  const update = (index: number, values: Partial<Segment>) => setSegments(current => current.map((segment, position) => position === index ? { ...segment, ...values } : segment));

  return (
    <details className="group mb-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div><p className="text-xs font-black text-blue-950">Calculate Class 2 bus tolls</p><p className="mt-0.5 text-[11px] text-blue-700">Select each expressway entry and exit; add another segment for connected routes.</p></div>
        <ChevronDown className="h-4 w-4 shrink-0 text-blue-600 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-blue-200 p-4">
        {segments.map((segment, index) => {
          const network = catalog?.networks.find(item => item.id === segment.network_id);
          return <div key={index} className="grid gap-2 rounded-xl border border-blue-100 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="text-[11px] font-bold text-slate-600">Expressway
              <select value={segment.network_id} onChange={event => update(index, { network_id: event.target.value, entry_point_id: '', exit_point_id: '' })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs" disabled={isLoading}>
                {catalog?.networks.map(item => <option key={item.id} value={item.id}>{item.name} · {item.rfid === 'toll_gate_fees' ? 'Other' : item.rfid}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-bold text-slate-600">Entry
              <select value={segment.entry_point_id} onChange={event => update(index, { entry_point_id: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">Select entry…</option>{network?.points.map(point => <option key={point.id} value={point.id}>{point.name} · {point.expressway}</option>)}</select>
            </label>
            <label className="text-[11px] font-bold text-slate-600">Exit
              <select value={segment.exit_point_id} onChange={event => update(index, { exit_point_id: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">Select exit…</option>{network?.points.map(point => <option key={point.id} value={point.id}>{point.name} · {point.expressway}</option>)}</select>
            </label>
            <button type="button" aria-label="Remove toll segment" onClick={() => setSegments(current => current.filter((_, position) => position !== index))} disabled={segments.length === 1} className="mt-5 grid h-10 w-10 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
          </div>;
        })}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setSegments(current => [...current, blankSegment(firstNetworkId)])} className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700"><Plus className="h-3.5 w-3.5" /> Add expressway segment</button>
          <button type="button" onClick={() => calculation.mutate()} disabled={!validSegments || calculation.isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-black text-white disabled:opacity-40"><Calculator className="h-4 w-4" />{calculation.isPending ? 'Calculating…' : 'Apply toll total'}</button>
        </div>
        {catalog && <p className="text-[10px] leading-4 text-slate-500">Published Vehicle Class 2 matrix synced {new Date(catalog.synced_at).toLocaleDateString()}. <a href={catalog.source_url} target="_blank" rel="noreferrer" className="font-bold underline">View source</a>. Confirm operational changes against the <a href={catalog.official_verification_url} target="_blank" rel="noreferrer" className="font-bold underline">Toll Regulatory Board</a>.</p>}
      </div>
    </details>
  );
}
