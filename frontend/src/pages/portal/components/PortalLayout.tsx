import { LuShieldCheck } from 'react-icons/lu';

export interface PortalTheme {
  gradient: string;
  bgBlob: string;
  badgeBg: string;
  iconColor: string;
  title: string;
}

interface PortalLayoutProps {
  theme: PortalTheme;
  children: React.ReactNode;
}

/** Shared branding/background chrome for the unified customer portal — extracted from
 * VisaUploadPublic.tsx so both document-upload and contract-signature views share one shell. */
export default function PortalLayout({ theme, children }: PortalLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} text-slate-800 py-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden`}>
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ${theme.bgBlob} rounded-full blur-[120px] pointer-events-none`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] ${theme.bgBlob} rounded-full blur-[120px] pointer-events-none`} />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 ${theme.badgeBg} rounded-full text-[10px] font-black uppercase tracking-wider`}>
            <LuShieldCheck size={12} className={theme.iconColor} /> Secure Customer Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
            {theme.title}
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-[0.25em] font-bold">
            Event and Travel Management Company
          </p>
        </div>

        {children}

        <div className="bg-white/80 border border-slate-200/80 rounded-[2rem] p-5 text-center text-xs text-slate-500 leading-relaxed max-w-xl mx-auto flex items-start gap-3 justify-center shadow-sm">
          <LuShieldCheck size={16} className={`${theme.iconColor} shrink-0 mt-0.5`} />
          <p className="font-semibold text-left">
            This link is secure and unique to you. Uploaded documents and signatures are directly
            synced with our Travel Operations Desk. For assistance, contact JVD at 0976 471 1294.
          </p>
        </div>
      </div>
    </div>
  );
}
