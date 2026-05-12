import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'credentials' | '2fa' | 'setup2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [setupData, setSetupData] = useState<{ qr_code_url: string; secret: string } | null>(null);
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

      if (data.requires_2fa_setup) {
        setUserId(data.user.id);
        setSetupData(data.setup_data!);
        setStep('setup2fa');
      } else if (data.requires_2fa) {
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

  const handleSetupTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.confirmSetup({
        user_id: userId!,
        code: totpCode,
        secret: setupData!.secret,
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
    <div
      className="min-h-screen flex font-sans bg-slate-950 relative overflow-hidden"
    >
      {/* Background Image with Parallax-like effect */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: 'url("/bus-bg.png")' }}
      ></div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none"></div>


      <div className="relative z-10 flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-center justify-center lg:justify-between p-6 md:p-12 min-h-screen">
        {/* Left Branding Section */}
        <div className="lg:w-1/2 flex flex-col items-center lg:items-center text-center mb-12 lg:mb-0 relative z-10">
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 flex flex-col items-center">
            <img
              src="/JVD 3D.png"
              alt="JVD Logo"
              className="h-80 md:h-100 w-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] mb-4"
            />
            <div className="h-px w-48 bg-white/40 mb-6"></div>
          </div>
        </div>



        {/* Right Form Section (Premium Card) */}
        <div className="lg:w-1/2 flex justify-center lg:justify-end w-full max-w-lg relative z-10">
          <div className="w-full bg-white p-12 md:p-16 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)]">
            {step === 'credentials' ? (
              <form onSubmit={handleCredentials} className="space-y-10 animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="text-left">
                  <h2 className="text-4xl md:text-[2.75rem] font-display font-black text-slate-900 tracking-tight leading-none">JVD ETMS</h2>
                  <p className="text-sm text-slate-500 mt-3 font-semibold">Enter your company credentials</p>
                </div>



                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm flex items-center shadow-sm">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-5 text-slate-400 flex items-center h-full pointer-events-none">
                        <Mail className="w-5 h-5 opacity-60" />
                      </div>

                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-14 pr-4 py-5 bg-slate-50/50 border-none rounded-2xl text-slate-900 placeholder-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/5 transition-all duration-300"
                        placeholder="employee@jvdtravels.com"
                      />


                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-5 text-blue-600 flex items-center h-full pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="absolute left-12 h-6 w-[1.5px] bg-slate-100 flex items-center"></div>

                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-16 pr-12 py-5 bg-white border border-blue-100/50 rounded-2xl text-slate-900 placeholder-slate-200 font-medium focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-200 transition-all duration-300 shadow-sm"
                        placeholder="••••••••••••"
                      />


                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 text-slate-300 hover:text-slate-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>

                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black tracking-widest rounded-2xl shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all duration-200 flex justify-center items-center mt-6 uppercase text-sm"
                >


                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      Sign In <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : step === 'setup2fa' ? (
              <form onSubmit={handleSetupTwoFactor} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="mb-6 text-center">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Secure Your Account</h2>
                  <p className="text-sm text-gray-500 mt-2 px-4">Scan the QR code below with your Google Authenticator app.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm shadow-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-center bg-gray-50 p-6 rounded-2xl border border-gray-100 mx-auto w-max mb-6 shadow-inner">
                  <img src={setupData?.qr_code_url} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                </div>

                <div>
                  <label htmlFor="setup_totp" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    id="setup_totp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-center text-3xl tracking-[0.5em] font-mono placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || totpCode.length !== 6}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all duration-200"
                  >
                    {isLoading ? 'Verifying...' : 'Complete Setup'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                    className="w-full mt-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                  >
                    Cancel and return
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleTwoFactor} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="mb-6 text-center">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Two-Factor Auth</h2>
                  <p className="text-sm text-gray-500 mt-2 px-4">Enter the 6-digit code from your authenticator app.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm shadow-sm">
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <label htmlFor="totp" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                    Authentication Code
                  </label>
                  <input
                    id="totp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-center text-3xl tracking-[0.5em] font-mono placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || totpCode.length !== 6}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all duration-200"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Identity'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                    className="w-full mt-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                  >
                    Use a different account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-10 px-6">
        <p className="text-center text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase">
          &copy; 2026 JVD Events and Travels Management Co. <span className="mx-2">|</span> Powered by Enterprise Core
        </p>
      </div>

    </div>
  );
}
