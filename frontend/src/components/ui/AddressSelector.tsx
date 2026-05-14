import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { LuChevronDown, LuLoaderCircle, LuMapPin, LuSearch, LuX } from 'react-icons/lu';

// ─── PSGC Cloud API ──────────────────────────────────────────────────────────
const PSGC = 'https://psgc.cloud/api';

interface PsgcEntry {
  code: string;
  name: string;
  type?: string;
  zip_code?: string;
}

/**
 * Fixes double-encoded UTF-8 from the PSGC API.
 * e.g. "PiÃ±as" → "Piñas", "ParaÃ±aque" → "Parañaque"
 */
const fixEncoding = (str: string): string => {
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
};

const fixEntries = (entries: PsgcEntry[]): PsgcEntry[] =>
  entries.map(e => ({ ...e, name: fixEncoding(e.name) }));

const psgc = {
  regions: () =>
    axios.get<PsgcEntry[]>(`${PSGC}/regions`).then(r => fixEntries(r.data)),

  provinces: (regionCode: string) =>
    axios.get<PsgcEntry[]>(`${PSGC}/regions/${regionCode}/provinces`).then(r => fixEntries(r.data)),

  citiesInRegion: (regionCode: string) =>
    axios.get<PsgcEntry[]>(`${PSGC}/regions/${regionCode}/cities-municipalities`).then(r => fixEntries(r.data)),

  citiesInProvince: (provinceCode: string) =>
    axios.get<PsgcEntry[]>(`${PSGC}/provinces/${provinceCode}/cities-municipalities`).then(r => fixEntries(r.data)),

  barangays: (cityCode: string) =>
    axios.get<PsgcEntry[]>(`${PSGC}/cities-municipalities/${cityCode}/barangays`).then(r => fixEntries(r.data)),
};

// ─── Address Types ────────────────────────────────────────────────────────────
export interface AddressValue {
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  street: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  regionCode: '', regionName: '',
  provinceCode: '', provinceName: '',
  cityCode: '', cityName: '',
  barangayCode: '', barangayName: '',
  street: '',
};

export function formatFullAddress(v: AddressValue): string {
  return [v.street, v.barangayName, v.cityName, v.provinceName, v.regionName]
    .filter(Boolean)
    .join(', ');
}

// ─── Searchable Combobox ──────────────────────────────────────────────────────
interface ComboboxProps {
  label: string;
  selectedCode: string;
  selectedName: string;
  placeholder: string;
  options: PsgcEntry[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (code: string, name: string) => void;
}

function PsgcCombobox({
  label,
  selectedCode,
  selectedName,
  placeholder,
  options,
  loading = false,
  disabled = false,
  onChange,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlighted, setHighlighted] = useState(0);

  // Sort once
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));

  // Filter by search query (accent-insensitive)
  const filtered = query.trim()
    ? sorted.filter(o =>
        o.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
          .includes(query.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))
      )
    : sorted;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setHighlighted(0);
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const select = (opt: PsgcEntry) => {
    onChange(opt.code, opt.name);
    setOpen(false);
    setQuery('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
  };

  const isSelected = !!selectedCode;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Label */}
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
        {loading && <LuLoaderCircle size={10} className="animate-spin text-blue-400" />}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { if (!disabled && !loading) setOpen(o => !o); }}
        disabled={disabled || loading}
        className={`
          w-full flex items-center justify-between gap-2
          px-4 py-3 rounded-xl border text-sm text-left
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${open
            ? 'border-blue-400 ring-2 ring-blue-500/20 bg-white'
            : isSelected
              ? 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
          }
        `}
      >
        <span className={`truncate flex-1 ${isSelected ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
          {isSelected ? selectedName : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {isSelected && !disabled && !loading && (
            <span
              role="button"
              onClick={clear}
              className="p-0.5 rounded-full hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
              title="Clear"
            >
              <LuX size={12} />
            </span>
          )}
          {loading
            ? <LuLoaderCircle size={14} className="animate-spin text-blue-400" />
            : <LuChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          }
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search bar */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
              <LuSearch size={13} className="text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
                placeholder={`Search ${label.replace(' *', '')}...`}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none min-w-0"
              />
              {query && (
                <button onClick={() => { setQuery(''); setHighlighted(0); }} className="text-gray-400 hover:text-gray-600 transition">
                  <LuX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-400">
                {loading ? 'Loading…' : `No results for "${query}"`}
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const isActive = opt.code === selectedCode;
                const isHighlighted = idx === highlighted;
                return (
                  <li
                    key={opt.code}
                    onMouseEnter={() => setHighlighted(idx)}
                    onMouseDown={e => { e.preventDefault(); select(opt); }}
                    className={`
                      flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors
                      ${isHighlighted ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                      ${isActive ? 'font-semibold' : ''}
                    `}
                  >
                    <span>{opt.name}</span>
                    {isActive && (
                      <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Count footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 text-[10px] text-gray-400 font-medium">
              {filtered.length} of {sorted.length} {label.replace(' *', '').toLowerCase()}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main AddressSelector ─────────────────────────────────────────────────────
interface AddressSelectorProps {
  value?: AddressValue;
  onChange: (address: AddressValue, fullString: string) => void;
  compact?: boolean;
}

export default function AddressSelector({
  value = EMPTY_ADDRESS,
  onChange,
  compact = false,
}: AddressSelectorProps) {
  const [sel, setSel] = useState<AddressValue>(value);
  const prevValueRef = useRef(JSON.stringify(value));

  useEffect(() => {
    const s = JSON.stringify(value);
    if (s !== prevValueRef.current) {
      prevValueRef.current = s;
      setSel(value);
    }
  }, [value]);

  const emit = (next: AddressValue) => {
    setSel(next);
    onChange(next, formatFullAddress(next));
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: regions = [], isLoading: loadingRegions } = useQuery({
    queryKey: ['psgc', 'regions'],
    queryFn: psgc.regions,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: provinces = [], isLoading: loadingProvinces } = useQuery({
    queryKey: ['psgc', 'provinces', sel.regionCode],
    queryFn: () => psgc.provinces(sel.regionCode),
    enabled: !!sel.regionCode,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const isProvinceless = !!sel.regionCode && !loadingProvinces && provinces.length === 0;

  const { data: cities = [], isLoading: loadingCities } = useQuery({
    queryKey: ['psgc', 'cities', sel.provinceCode || (isProvinceless ? sel.regionCode : '')],
    queryFn: () =>
      isProvinceless
        ? psgc.citiesInRegion(sel.regionCode)
        : psgc.citiesInProvince(sel.provinceCode),
    enabled: isProvinceless ? !!sel.regionCode && !loadingProvinces : !!sel.provinceCode,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: barangays = [], isLoading: loadingBarangays } = useQuery({
    queryKey: ['psgc', 'barangays', sel.cityCode],
    queryFn: () => psgc.barangays(sel.cityCode),
    enabled: !!sel.cityCode,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onRegion = (code: string, name: string) =>
    emit({ ...EMPTY_ADDRESS, regionCode: code, regionName: name, street: sel.street });

  const onProvince = (code: string, name: string) =>
    emit({ ...sel, provinceCode: code, provinceName: name, cityCode: '', cityName: '', barangayCode: '', barangayName: '' });

  const onCity = (code: string, name: string) =>
    emit({ ...sel, cityCode: code, cityName: name, barangayCode: '', barangayName: '' });

  const onBarangay = (code: string, name: string) =>
    emit({ ...sel, barangayCode: code, barangayName: name });

  const fullAddress = formatFullAddress(sel);

  return (
    <div className="col-span-1 sm:col-span-2 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Region */}
        <PsgcCombobox
          label="Region *"
          selectedCode={sel.regionCode}
          selectedName={sel.regionName}
          placeholder="— Select Region —"
          options={regions}
          loading={loadingRegions}
          onChange={onRegion}
        />

        {/* Province — N/A for province-less regions like NCR */}
        {isProvinceless ? (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Province
            </label>
            <div className="w-full px-4 py-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 bg-gray-50 italic">
              Not applicable for this region
            </div>
          </div>
        ) : (
          <PsgcCombobox
            label="Province *"
            selectedCode={sel.provinceCode}
            selectedName={sel.provinceName}
            placeholder="— Select Province —"
            options={provinces}
            loading={loadingProvinces}
            disabled={!sel.regionCode || loadingProvinces}
            onChange={onProvince}
          />
        )}

        {/* City / Municipality */}
        <PsgcCombobox
          label="City / Municipality *"
          selectedCode={sel.cityCode}
          selectedName={sel.cityName}
          placeholder="— Select City / Municipality —"
          options={cities}
          loading={loadingCities}
          disabled={isProvinceless ? !sel.regionCode : !sel.provinceCode}
          onChange={onCity}
        />

        {/* Barangay */}
        <PsgcCombobox
          label="Barangay *"
          selectedCode={sel.barangayCode}
          selectedName={sel.barangayName}
          placeholder="— Select Barangay —"
          options={barangays}
          loading={loadingBarangays}
          disabled={!sel.cityCode}
          onChange={onBarangay}
        />
      </div>

      {/* Street */}
      {!compact && (
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Street / Building / House No.
          </label>
          <input
            type="text"
            value={sel.street}
            onChange={e => emit({ ...sel, street: e.target.value })}
            placeholder="e.g. 123 Rizal Street, Blk 5 Lot 3"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
          />
        </div>
      )}

      {/* Live full-address preview */}
      {!compact && fullAddress && (
        <div className="flex items-start gap-2.5 text-xs bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
          <LuMapPin size={13} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mr-1">
              Full Address:
            </span>
            <span className="font-medium text-gray-700">{fullAddress}</span>
          </div>
        </div>
      )}
    </div>
  );
}
