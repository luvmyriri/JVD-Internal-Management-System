import { LuShield } from 'react-icons/lu';


export default function VisaProcessing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm mt-10">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
        <LuShield size={32} strokeWidth={1.5} />
      </div>
      <p className="text-sm text-gray-500 font-medium">Visa case tracker is currently under development.</p>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Operational Module coming soon</p>
    </div>
  );
}
