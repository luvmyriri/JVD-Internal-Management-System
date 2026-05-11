import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Mail, Lock, Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      const { data } = response.data;

      if (data.requires_2fa) {
        setUserId(data.user.id);
        setStep('2fa');
      } else {
        login(data.token, data.user);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.verifyTwoFactor({
        user_id: userId!,
        code: totpCode,
      });
      const { data } = response.data;
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans">
      {/* Full Page Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 scale-105"
        style={{ backgroundImage: 'url("/JVDBG.png")' }}
      ></div>

      {/* Unified Overlay for Depth & Readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/80"></div>

      {/* Interactive Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Branding Section (Simplified & Clean) */}
        <div className="lg:w-1/2 flex flex-col items-center justify-center p-12">
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
            <img
              src="/JVDlogo-removebg-preview.png"
              alt="JVD Logo"
              className="h-48 md:h-80 w-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8"
            />
            <div className="flex items-center gap-6 w-full max-w-[400px]">
              <div className="h-[2px] flex-1 bg-white/30"></div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-[0.2em] uppercase whitespace-nowrap drop-shadow-lg">
                Management System
              </h2>
              <div className="h-[2px] flex-1 bg-white/30"></div>
            </div>
          </div>
        </div>

        {/* Right Form Section (Solid White Card) */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] p-10 md:p-16 relative overflow-hidden">
            {step === 'credentials' ? (
              <form onSubmit={handleCredentials} className="space-y-8">
                <header className="mb-10">
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                    JVD ETMS
                  </h1>
                  <p className="text-slate-500 font-medium">
                    Enter your company credentials
                  </p>
                </header>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-2xl text-slate-700 placeholder-slate-300 font-medium transition-all outline-none"
                        placeholder="employee@jvdtravels.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Password
                      </label>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-14 pr-14 py-5 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 rounded-2xl text-slate-700 placeholder-slate-300 font-medium transition-all outline-none"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-blue-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full group flex items-center justify-center gap-3 py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-[0.98]"
                >
                  {isLoading ? 'Processing...' : (
                    <>
                      Log-in
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>


              </form>
            ) : (
              <form onSubmit={handleTwoFactor} className="space-y-8">
                <header className="mb-10 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-blue-50 mb-6">
                    <Shield className="h-10 w-10 text-blue-600" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    2FA Verification
                  </h1>
                  <p className="text-slate-500 font-medium">
                    Enter the 6-digit code from your app
                  </p>
                </header>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-4">
                    {error}
                  </div>
                )}

                <div className="flex justify-center">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full max-w-[280px] px-4 py-8 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-slate-800 text-center text-5xl tracking-[0.4em] font-bold focus:outline-none transition-all shadow-inner"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/30 transition-all active:scale-[0.98]"
                >
                  {isLoading ? 'Verifying...' : 'Verify Access'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                  className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition"
                >
                  ← Back to login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Version Badge */}
      <div className="absolute bottom-8 left-12 z-20 hidden md:block">

      </div>
    </div>
  );
}
