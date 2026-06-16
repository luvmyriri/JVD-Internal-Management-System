import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ledgerApi } from '../../api/operations';
import { Modal } from '../../components/ui';
import { LuSearch, LuCalendar, LuPrinter, LuTrendingUp, LuTrendingDown, LuCheck, LuTriangleAlert } from 'react-icons/lu';

function formatCurrency(value: number | string) {
  const num = typeof value === 'number' ? value : parseFloat(value || '0');
  return '₱ ' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function printJournalVoucher(entry: any) {
  const win = window.open('', '_blank', 'width=800,height=800');
  if (!win) return;

  const totalDebits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
  const totalCredits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit || 0), 0) || 0;

  const rows = entry.ledger_lines?.map((line: any) => `
    <tr>
      <td>${line.account?.code || 'TBA'}</td>
      <td>${line.account?.name || 'TBA'}</td>
      <td>${line.description || ''}</td>
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
      <div class="meta-item"><span class="meta-label">Posting Date:</span> <span class="meta-val">${entry.date}</span></div>
      <div class="meta-item"><span class="meta-label">Reference ID:</span> <span class="meta-val">${entry.reference_type ? `${entry.reference_type.split('\\').pop()} #${entry.reference_id}` : 'N/A'}</span></div>
    </div>
    <div>
      <div class="meta-item"><span class="meta-label">Status:</span> <span class="meta-val" style="text-transform: uppercase; color: #10b981;">${entry.status}</span></div>
      <div class="meta-item"><span class="meta-label">Notes:</span> <span class="meta-val">${entry.notes || 'No notes provided'}</span></div>
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
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

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

export default function JournalEntries() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['journal-entries', search, startDate, endDate, page],
    queryFn: () => ledgerApi.getJournalEntries({ search, start_date: startDate, end_date: endDate, page }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const entries = response?.data?.data || [];
  const meta = response?.data || { current_page: 1, last_page: 1 };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            Accounting Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">General Ledger</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">Audit double-entry compliance journal entries and sub-ledger sync postings.</p>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-6 rounded-tl-[2rem]">Date</th>
                <th className="px-8 py-6">JV Reference</th>
                <th className="px-8 py-6">Description / Notes</th>
                <th className="px-8 py-6 text-right">Debit</th>
                <th className="px-8 py-6 text-right">Credit</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right rounded-tr-[2rem]">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">Loading General Ledger...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">No journal postings found.</td></tr>
              ) : (
                entries.map((entry: any) => {
                  const debits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.debit || 0), 0) || 0;
                  const credits = entry.ledger_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.credit || 0), 0) || 0;
                  const isBalanced = Math.abs(debits - credits) < 0.01;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5 text-gray-900 dark:text-white font-semibold">{entry.date}</td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-blue-600 dark:text-blue-400">JV-{entry.id}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {entry.reference_type ? `${entry.reference_type.split('\\').pop()} #${entry.reference_id}` : 'Manual'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-gray-600 dark:text-gray-300 max-w-xs truncate font-medium">{entry.notes || '—'}</td>
                      <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white">{formatCurrency(debits)}</td>
                      <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white">{formatCurrency(credits)}</td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isBalanced
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50'
                        }`}>
                          {isBalanced ? <LuTrendingUp className="w-3 h-3" /> : <LuTrendingDown className="w-3 h-3" />}
                          {isBalanced ? 'Balanced' : 'Unbalanced'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Audit Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
    </div>
  );
}
