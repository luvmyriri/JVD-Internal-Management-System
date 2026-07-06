import { LuCheck } from 'react-icons/lu';
import type { VisaProcessingData } from './customTransactionTypes';

interface CategoryFormVisaProcessingProps {
  value: VisaProcessingData;
  onChange: (patch: Partial<VisaProcessingData>) => void;
}

export default function CategoryFormVisaProcessing({ value, onChange }: CategoryFormVisaProcessingProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Visa Processing Custom Specifications</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Destination Country</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.country}
            onChange={(e) => onChange({ country: e.target.value })}
          >
            {['Japan', 'South Korea', 'USA', 'Canada', 'Schengen', 'Australia', 'United Kingdom', 'Others'].map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Visa Type</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.visaType}
            onChange={(e) => onChange({ visaType: e.target.value })}
          >
            {['Tourist', 'Business', 'Student', 'Sponsorship / Family Visit'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Applicant Name(s)</label>
        <textarea
          placeholder="e.g. Juan dela Cruz, Maria dela Cruz (one name per line or separated by comma)"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
          value={value.applicants}
          onChange={(e) => onChange({ applicants: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Requirements Submitted</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(value.requirements).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ requirements: { ...value.requirements, [key]: !val } })}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                val
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-gray-205'
              }`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                {val && <LuCheck className="w-3 h-3" />}
              </div>
              <span className="capitalize">{key === 'passport' ? 'Original Passport' : key === 'photo' ? 'Photos' : key === 'bankCert' ? 'Bank Certificate' : key === 'itr' ? 'ITR' : 'Birth Certificate'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
