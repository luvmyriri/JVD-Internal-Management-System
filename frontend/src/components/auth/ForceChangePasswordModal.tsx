import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuLock, LuEye, LuEyeOff, LuShieldCheck, LuKeyRound, LuArrowRight } from 'react-icons/lu';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: '1 uppercase letter (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { label: '1 number (0–9)', test: (v: string) => /[0-9]/.test(v) },
  { label: '1 special character (@$!%*?&)', test: (v: string) => /[@$!%*?&]/.test(v) },
];

export default function ForceChangePasswordModal() {
  const { user, refreshUser } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user?.must_change_password) return null;

  const allRulesPassed = RULES.every(r => r.test(newPw));
  const passwordsMatch = newPw === confirmPw && confirmPw.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRulesPassed) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPw,
        password: newPw,
        password_confirmation: confirmPw,
      });
      toast.success('Password changed successfully! Welcome aboard.');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        {/* Blurred overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.45)] overflow-hidden border border-gray-100 dark:border-gray-800">

            {/* Header banner */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-b border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <LuKeyRound className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    Password Change Required
                  </h2>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                    Hi {user.first_name}! You must set a new password before continuing.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5">

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl text-sm font-bold text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Current password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Temporary / Current Password
                </label>
                <div className="relative flex items-center">
                  <LuLock className="absolute left-4 w-4 h-4 text-gray-400" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    required
                    placeholder="Enter your temporary password"
                    className="w-full pl-11 pr-11 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showCurrent ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <LuLock className="absolute left-4 w-4 h-4 text-gray-400" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                    placeholder="Create a strong password"
                    className="w-full pl-11 pr-11 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNew ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength rules */}
                {newPw.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {RULES.map(rule => (
                      <div key={rule.label} className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${rule.test(newPw) ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <LuShieldCheck className={`w-3 h-3 shrink-0 ${rule.test(newPw) ? 'text-emerald-500' : 'text-gray-300'}`} />
                        {rule.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <LuLock className="absolute left-4 w-4 h-4 text-gray-400" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    required
                    placeholder="Re-enter your new password"
                    className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                      confirmPw.length > 0
                        ? passwordsMatch
                          ? 'border-emerald-300 focus:ring-emerald-500/20'
                          : 'border-red-300 focus:ring-red-500/20'
                        : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
                {confirmPw.length > 0 && !passwordsMatch && (
                  <p className="text-[10px] font-bold text-red-500 ml-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !allRulesPassed || !passwordsMatch || !currentPw}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-black tracking-widest rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 uppercase text-sm mt-2"
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>Set New Password <LuArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-bold">
                🔐 This action is required for account security. You cannot skip this step.
              </p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
