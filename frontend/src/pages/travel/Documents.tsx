import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuFileCheck, LuPlus, LuSearch, LuLoaderCircle, LuX, LuTrash2,
  LuDownload, LuFile, LuFileText, LuImage, LuUpload,
} from 'react-icons/lu';
import { legalDocumentApi } from '../../api/legalDocuments';
import { Pagination, Modal, Button } from '../../components/ui';

interface LegalDoc {
  id: number;
  title: string;
  document_type: string;
  file_path: string;
  notes?: string;
  created_at: string;
  job_order?: { id: number };
  uploader?: { first_name: string; last_name: string };
}

const DOC_TYPES = [
  'passport_copy',
  'visa_copy',
  'birth_certificate',
  'nso_clearance',
  'medical_certificate',
  'police_clearance',
  'employment_contract',
  'other',
];

const DOC_TYPE_LABELS: Record<string, string> = {
  passport_copy: 'Passport Copy',
  visa_copy: 'Visa Copy',
  birth_certificate: 'Birth Certificate',
  nso_clearance: 'NSO Clearance',
  medical_certificate: 'Medical Certificate',
  police_clearance: 'Police Clearance',
  employment_contract: 'Employment Contract',
  other: 'Other',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  passport_copy: 'bg-blue-50 text-blue-700 border-blue-200',
  visa_copy: 'bg-violet-50 text-violet-700 border-violet-200',
  birth_certificate: 'bg-amber-50 text-amber-700 border-amber-200',
  nso_clearance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medical_certificate: 'bg-rose-50 text-rose-700 border-rose-200',
  police_clearance: 'bg-orange-50 text-orange-700 border-orange-200',
  employment_contract: 'bg-teal-50 text-teal-700 border-teal-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

function fileIcon(path: string) {
  const ext = path?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return <LuImage size={20} className="text-rose-400" />;
  if (['pdf'].includes(ext ?? '')) return <LuFileText size={20} className="text-red-500" />;
  return <LuFile size={20} className="text-gray-400" />;
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    document_type: 'other',
    notes: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected');
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('document_type', form.document_type);
      fd.append('notes', form.notes);
      fd.append('file', file);
      return legalDocumentApi.create(fd as any);
    },
    onSuccess: () => {
      toast.success('Document uploaded!');
      qc.invalidateQueries({ queryKey: ['legal_documents'] });
      onClose();
    },
    onError: () => toast.error('Failed to upload document.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Upload Document" size="lg">
      <div className="p-6 space-y-5">
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            file ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              {fileIcon(file.name)}
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null); }}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <LuX size={16} />
              </button>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <LuUpload size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Click to upload a file</p>
              <p className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG, DOC — max 20 MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Document Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Juan dela Cruz — Passport Copy"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Document Type *</label>
          <select
            value={form.document_type}
            onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DOC_TYPES.map(t => (
              <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Optional remarks..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={!file || !form.title}
            className="flex items-center gap-2"
          >
            <LuUpload size={14} /> Upload Document
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteModal({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => legalDocumentApi.delete(doc.id),
    onSuccess: () => {
      toast.success('Document deleted.');
      qc.invalidateQueries({ queryKey: ['legal_documents'] });
      onClose();
    },
    onError: () => toast.error('Failed to delete document.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Delete Document" size="sm">
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto border border-red-100">
          <LuTrash2 size={28} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Delete Document?</h3>
          <p className="text-sm text-gray-500 mt-2">
            Are you sure you want to delete <strong>"{doc.title}"</strong>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 pt-2 justify-center">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}
            className="bg-red-600 hover:bg-red-700 shadow-red-200">
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Documents() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LegalDoc | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['legal_documents', search, page, typeFilter],
    queryFn: () => legalDocumentApi.list({
      search: search || undefined,
      document_type: typeFilter || undefined,
      page,
      per_page: 15,
    }),
  });

  const docs: LegalDoc[] = response?.data?.data ?? [];
  const meta = response?.data?.meta;




  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Documents
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Travel Document Vault</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="flex items-center gap-2">
          <LuPlus size={16} /> Upload Document
        </Button>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setTypeFilter(''); setPage(1); }}
          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
            !typeFilter
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
              : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          All Types
        </button>
        {DOC_TYPES.map(t => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
              typeFilter === t
                ? DOC_TYPE_COLORS[t]
                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            {DOC_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
          <LuSearch size={18} />
        </div>
        <input
          type="text"
          placeholder="Search document title..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
            <LuX size={16} />
          </button>
        )}
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LuLoaderCircle size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading documents...</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-4">
            <LuFileCheck size={28} />
          </div>
          <h3 className="text-gray-900 dark:text-white font-bold mb-1">No documents found</h3>
          <p className="text-sm text-gray-500 max-w-sm">Upload travel documents such as passports, visas, clearances, and contracts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 group hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900 transition-all"
            >
              {/* File icon */}
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4">
                {fileIcon(doc.file_path)}
              </div>

              {/* Title */}
              <h3 className="text-sm font-black text-gray-900 dark:text-white leading-snug mb-2 line-clamp-2">
                {doc.title}
              </h3>

              {/* Type badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${DOC_TYPE_COLORS[doc.document_type] ?? DOC_TYPE_COLORS.other}`}>
                {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </span>

              {/* Notes */}
              {doc.notes && (
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed line-clamp-2">{doc.notes}</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Uploaded by</p>
                  <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                    {doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
                    title="Download"
                  >
                    <LuDownload size={14} />
                  </a>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <LuTrash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-2">
                {new Date(doc.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination currentPage={page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onPageChange={setPage} />
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {deleteTarget && <DeleteModal doc={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
