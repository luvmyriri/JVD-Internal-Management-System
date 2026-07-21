import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ledgerApi, type JournalEntryLineInput } from '../../api/operations';
import { accountingApi, type Account } from '../../api/accounting';
import { Modal } from '../../components/ui';
import { DataTable, EmptyState, type Column } from '../../components/ds';
import { LuSearch, LuCalendar, LuPrinter, LuTrendingUp, LuTrendingDown, LuCheck, LuTriangleAlert, LuBookOpen, LuPlus, LuTrash2, LuUpload, LuDownload, LuFilePlus } from 'react-icons/lu';

function formatCurrency(value: number | string) {
  const num = typeof value === 'number' ? value : parseFloat(value || '0');
  return '₱ ' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function printJournalVoucher(entry: any) {
  const win = window.open('', '_blank', 'width=800,height=800');
  if (!win) return;

  // C-06: escape user-controlled values before interpolating into the print HTML (prevents XSS).
  const esc = (value: unknown): string =>
    String(value ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
    ));

  const totalDebits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
  const totalCredits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit || 0), 0) || 0;

  const rows = entry.ledger_lines?.map((line: any) => `
    <tr>
      <td>${esc(line.account?.code || 'TBA')}</td>
      <td>${esc(line.account?.name || 'TBA')}</td>
      <td>${esc(line.description || '')}</td>
      <td class="amount">${parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : ''}</td>
      <td class="amount">${parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : ''}</td>
    </tr>
  `).join('') || '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Journal Voucher - JV-${entry.id}</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; line-height: 1.5; padding: 30px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .meta-item { display: flex; gap: 6px; }
    .meta-label { font-weight: 700; color: #64748b; min-width: 110px; }
    .meta-val { font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
    th { bg-color: #f8fafc; font-weight: 700; color: #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .amount { text-align: right; font-weight: 600; }
    .total-row { font-weight: 800; background-color: #f8fafc; }
    .total-row td { border-top: 2px solid #0f172a; border-bottom: 2px double #0f172a; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
    .sig-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-weight: 700; color: #475569; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 20px;">
    <button onclick="window.print()" style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Print Voucher</button>
  </div>
  <div class="header">
    <h1>Journal Voucher</h1>
    <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px;">JVD EVENT & TRAVEL MANAGEMENT CO.</div>
  </div>
  <div class="meta-grid">
    <div>
      <div class="meta-item"><span class="meta-label">Voucher No:</span> <span class="meta-val">JV-${entry.id}</span></div>
      <div class="meta-item"><span class="meta-label">Posting Date:</span> <span class="meta-val">${esc(entry.date)}</span></div>
      <div class="meta-item"><span class="meta-label">Reference ID:</span> <span class="meta-val">${entry.reference_type ? `${entry.reference_type.split('\\').pop()} #${entry.reference_id}` : 'N/A'}</span></div>
    </div>
    <div>
      <div class="meta-item"><span class="meta-label">Status:</span> <span class="meta-val" style="text-transform: uppercase; color: #10b981;">${esc(entry.status)}</span></div>
      <div class="meta-item"><span class="meta-label">Notes:</span> <span class="meta-val">${esc(entry.notes || 'No notes provided')}</span></div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Account</th>
        <th>Description</th>
        <th style="text-align: right;">Debit</th>
        <th style="text-align: right;">Credit</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">Total</td>
        <td class="amount">${formatCurrency(totalDebits)}</td>
        <td class="amount">${formatCurrency(totalCredits)}</td>
      </tr>
    </tbody>
  </table>
  <div class="signatures">
    <div class="sig-box">Prepared By</div>
    <div class="sig-box">Approved By</div>
  </div>
</body>
</html>
  `;
  win.document.write(html);
  win.document.close();
}

function JournalEntryDetailModal({ entry, onClose }: { entry: any; onClose: () => void }) {
  const totalDebits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
  const totalCredits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit || 0), 0) || 0;
  // C-09: an empty entry (0 === 0) must not count as balanced — require at least 2 lines and a non-zero total.
  const isBalanced = (entry.ledger_lines?.length ?? 0) >= 2 && totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <Modal isOpen={true} onClose={onClose} title={`Journal Voucher detail: JV-${entry.id}`} size="xl">
      <div className="space-y-6 p-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{entry.date}</h4>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Polymorphic Ref</p>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {entry.reference_type ? `${entry.reference_type.split('\\').pop()} #${entry.reference_id}` : 'None'}
            </h4>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</p>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{entry.notes || 'N/A'}</h4>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Double-Entry Postings</h3>
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-950">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px] border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3">Account Code</th>
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Line Description</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {entry.ledger_lines?.map((line: any) => (
                  <tr key={line.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{line.account?.code}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{line.account?.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{line.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                      {parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                      {parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/20 dark:bg-slate-800/10 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                  <td colSpan={3} className="px-4 py-4 text-right text-gray-500 uppercase tracking-widest text-[10px] font-black">Total</td>
                  <td className="px-4 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(totalDebits)}</td>
                  <td className="px-4 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(totalCredits)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Balancing Verification Alert */}
        <div className={`p-4 border rounded-2xl flex items-center gap-3 ${
          isBalanced 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-400'
        }`}>
          {isBalanced ? <LuCheck className="w-5 h-5" /> : <LuTriangleAlert className="w-5 h-5" />}
          <div className="text-xs font-semibold">
            {isBalanced 
              ? '✔ Ledger compliance verified: Debits equal Credits. Journal entries are fully balanced and posted.'
              : '⚠ Ledger Alert: Journal entries are unbalanced. Total Debits and total Credits mismatch.'}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => printJournalVoucher(entry)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/10 active:scale-95 cursor-pointer"
          >
            <LuPrinter className="w-4 h-4" /> Print Voucher
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

const blankLine = (): JournalEntryLineInput => ({ account_id: '', debit: '', credit: '', description: '' });

function NewJournalEntryModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<JournalEntryLineInput[]>([blankLine(), blankLine()]);

  const num = (v: number | string) => {
    const n = typeof v === 'number' ? v : parseFloat(v || '0');
    return Number.isFinite(n) ? n : 0;
  };
  const totalDebit = lines.reduce((s, l) => s + num(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + num(l.credit), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.005 && totalDebit > 0;
  const everyLineValid = lines.every((l) => {
    const d = num(l.debit), c = num(l.credit);
    return l.account_id !== '' && !(d > 0 && c > 0) && (d > 0 || c > 0);
  });
  const canSubmit = lines.length >= 2 && balanced && everyLineValid;

  const updateLine = (i: number, patch: Partial<JournalEntryLineInput>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (i: number) => setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  const mutation = useMutation({
    mutationFn: () =>
      ledgerApi.createJournalEntry({
        date,
        notes,
        lines: lines.map((l) => ({
          account_id: l.account_id,
          debit: num(l.debit),
          credit: num(l.credit),
          description: l.description || '',
        })),
      }),
    onSuccess: () => {
      toast.success('Journal entry posted.');
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to post entry.');
    },
  });

  const inputCls = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Modal isOpen={true} onClose={onClose} title="New Manual Journal Entry" size="xl">
      <div className="space-y-6 p-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Posting Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes / Memo</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Opening balance, depreciation for July…" className={inputCls} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Debit / Credit Lines</h3>
            <button onClick={addLine} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-[11px] font-bold uppercase tracking-wider">
              <LuPlus className="w-3.5 h-3.5" /> Add line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={line.account_id}
                  onChange={(e) => updateLine(i, { account_id: e.target.value === '' ? '' : Number(e.target.value) })}
                  className={`col-span-4 ${inputCls}`}
                >
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <input
                  type="text" value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  placeholder="Description" className={`col-span-3 ${inputCls}`}
                />
                <input
                  type="number" min="0" step="0.01" value={line.debit}
                  onChange={(e) => updateLine(i, { debit: e.target.value, credit: '' })}
                  placeholder="Debit" className={`col-span-2 text-right ${inputCls}`}
                />
                <input
                  type="number" min="0" step="0.01" value={line.credit}
                  onChange={(e) => updateLine(i, { credit: e.target.value, debit: '' })}
                  placeholder="Credit" className={`col-span-2 text-right ${inputCls}`}
                />
                <button
                  onClick={() => removeLine(i)} disabled={lines.length <= 2}
                  className="col-span-1 flex justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Remove line"
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border rounded-2xl flex items-center justify-between gap-3 ${
          balanced
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            {balanced ? <LuCheck className="w-5 h-5" /> : <LuTriangleAlert className="w-5 h-5" />}
            {balanced ? 'Balanced — ready to post' : `Out of balance by ${formatCurrency(Math.abs(diff))}`}
          </div>
          <div className="text-xs font-semibold flex gap-4">
            <span>Debit: <b>{formatCurrency(totalDebit)}</b></span>
            <span>Credit: <b>{formatCurrency(totalCredit)}</b></span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            {mutation.isPending ? 'Posting…' : 'Post Entry'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<import('../../api/operations').JournalImportResult | null>(null);

  const downloadTemplate = () => {
    const header = 'entry_ref,date,notes,account_code,debit,credit,description';
    const sample = [
      'OPEN-1,2026-01-01,Opening balance,1000,50000,0,Cash on hand opening',
      'OPEN-1,2026-01-01,Opening balance,4000,0,50000,Owner equity contribution',
    ].join('\n');
    const blob = new Blob([`${header}\n${sample}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journal_entries_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const mutation = useMutation({
    mutationFn: () => ledgerApi.importJournalEntries(file as File),
    onSuccess: (data) => {
      setResult(data.data);
      if (data.data.posted_count > 0) qc.invalidateQueries({ queryKey: ['journal-entries'] });
      if (data.data.failed_count === 0) toast.success(data.message);
      else toast(data.message, { icon: '⚠️' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.response?.data?.errors?.file?.[0] || 'Import failed.');
    },
  });

  return (
    <Modal isOpen={true} onClose={onClose} title="Import Journal Entries from CSV" size="lg">
      <div className="space-y-5 p-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <p>Upload a CSV where each row is one debit/credit line. Rows sharing the same <code className="px-1 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs">entry_ref</code> are grouped into one balanced journal entry.</p>
          <p className="text-xs text-gray-500">Columns: <span className="font-mono">entry_ref, date, notes, account_code, debit, credit, description</span>. Each entry must balance (total debit = total credit) or it is rejected and itemised below.</p>
        </div>

        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs uppercase tracking-wider">
          <LuDownload className="w-4 h-4" /> Download template
        </button>

        <label className="block border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
          <input
            type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
          />
          <LuUpload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{file ? file.name : 'Click to choose a .csv file'}</p>
          <p className="text-xs text-gray-400 mt-1">Max 5 MB</p>
        </label>

        {result && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-center">
                <div className="text-2xl font-black">{result.posted_count}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest">Posted</div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-center">
                <div className="text-2xl font-black">{result.failed_count}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest">Rejected</div>
              </div>
            </div>
            {result.failed.length > 0 && (
              <div className="border border-red-100 dark:border-red-900/40 rounded-xl divide-y divide-red-100 dark:divide-red-900/30 max-h-48 overflow-y-auto">
                {result.failed.map((f, i) => (
                  <div key={i} className="px-4 py-2 text-xs flex gap-3">
                    <span className="font-bold text-red-600 dark:text-red-400 shrink-0">{f.entry_ref}</span>
                    <span className="text-gray-600 dark:text-gray-300">{f.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest">Close</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            <LuUpload className="w-4 h-4" /> {mutation.isPending ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function JournalEntries() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['journal-entries', search, startDate, endDate, page],
    queryFn: () => ledgerApi.getJournalEntries({ search, start_date: startDate, end_date: endDate, page }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountingApi.getAccounts,
    staleTime: 300_000,
  });
  const accounts = accountsResponse?.data ?? [];

  const entries = response?.data?.data || [];
  const meta = response?.data || { current_page: 1, last_page: 1 };

  const columns: Column<any>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortValue: (entry) => entry.date,
      render: (entry) => <span className="text-gray-900 dark:text-white font-semibold">{entry.date}</span>,
    },
    {
      key: 'reference',
      header: 'JV Reference',
      render: (entry) => (
        <div>
          <div className="font-bold text-blue-600 dark:text-blue-400">JV-{entry.id}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {entry.reference_type ? `${entry.reference_type.split('\\').pop()} #${entry.reference_id}` : 'Manual'}
          </div>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Description / Notes',
      render: (entry) => <span className="text-gray-600 dark:text-gray-300 max-w-xs truncate font-medium block">{entry.notes || '—'}</span>,
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      render: (entry) => {
        const debits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
        return <span className="font-black text-gray-900 dark:text-white">{formatCurrency(debits)}</span>;
      },
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      render: (entry) => {
        const credits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit || 0), 0) || 0;
        return <span className="font-black text-gray-900 dark:text-white">{formatCurrency(credits)}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => {
        const debits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
        const credits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit || 0), 0) || 0;
        // C-09: empty entries must not display as balanced.
        const isBalanced = (entry.ledger_lines?.length ?? 0) >= 2 && debits > 0 && Math.abs(debits - credits) < 0.01;
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isBalanced
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50'
              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50'
          }`}>
            {isBalanced ? <LuTrendingUp className="w-3 h-3" /> : <LuTrendingDown className="w-3 h-3" />}
            {isBalanced ? 'Balanced' : 'Unbalanced'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (entry) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedEntry(entry)}
            className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Audit Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            Accounting Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">General Ledger</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Audit double-entry compliance journal entries and sub-ledger sync postings.</p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setShowNewEntry(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/10 active:scale-95"
            >
              <LuFilePlus className="w-4 h-4" /> New Entry
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              <LuUpload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <LuSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search postings..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-11 pr-5 py-3 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm shadow-sm"
            />
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <LuCalendar className="w-3.5 h-3.5" />
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none"
              />
            </div>
            <span className="text-gray-400 text-xs font-bold">to</span>
            <div className="relative w-full sm:w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <LuCalendar className="w-3.5 h-3.5" />
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Journal table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className={`jvd overflow-x-auto transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
          <DataTable
            columns={columns}
            data={entries}
            rowKey={(entry: any) => entry.id}
            className="border-0 rounded-none bg-transparent"
            empty={
              isLoading ? (
                <div className="flex flex-col items-center py-16 text-muted">
                  <LuBookOpen size={22} className="mb-2 animate-spin text-brand" />
                  <p className="text-sm">Loading General Ledger…</p>
                </div>
              ) : (
                <EmptyState icon={<LuBookOpen size={22} />} title="No journal postings found" description="Journal entries appear here as sub-ledgers post." />
              )
            }
          />
        </div>

        {/* Pagination controls */}
        {meta.last_page > 1 && (
          <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage(p => Math.min(p + 1, meta.last_page))}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedEntry && (
        <JournalEntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
      {showNewEntry && (
        <NewJournalEntryModal accounts={accounts} onClose={() => setShowNewEntry(false)} />
      )}
      {showImport && (
        <ImportCsvModal onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
