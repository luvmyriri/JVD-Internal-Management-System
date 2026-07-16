import { useState } from 'react';
import { LuCopy, LuKeyRound, LuCheckCheck } from 'react-icons/lu';
import { Modal, Button } from '../../components/ui';
import toast from 'react-hot-toast';

export interface TempPasswordEntry { name: string; email: string; password: string; }

export default function TempPasswordModal({ entries, onClose }: { entries: TempPasswordEntry[]; onClose: () => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyAll = () => {
    const text = entries.map(e => `${e.name} | ${e.email} | ${e.password}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('All credentials copied!');
  };
  const copyOne = (idx: number, pw: string) => {
    navigator.clipboard.writeText(pw);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };
  return (
    <Modal isOpen onClose={onClose} title="Temporary Passwords" size="lg">
      <div className="space-y-5 p-2">
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
          <LuKeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800 dark:text-amber-300">✉️ Email sent + backup copy below</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Credentials were emailed to each employee. Save this backup. Employees will be forced to change their password on first login.</p>
          </div>
        </div>

        {/* Password list */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {entries.map((e, idx) => (
            <div key={idx} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{e.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{e.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest">
                  {e.password}
                </code>
                <button
                  onClick={() => copyOne(idx, e.password)}
                  className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors border border-blue-100 dark:border-blue-500/20"
                  title="Copy password"
                >
                  {copiedIdx === idx ? <LuCheckCheck className="w-4 h-4" /> : <LuCopy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={copyAll} className="flex items-center gap-2">
            <LuCopy className="w-4 h-4" /> Copy All
          </Button>
          <Button onClick={onClose}>Done — I've Saved These</Button>
        </div>
      </div>
    </Modal>
  );
}
