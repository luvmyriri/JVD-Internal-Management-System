import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { settingsApi } from '../api/settings';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 1.5, ease: "easeInOut" as const }
  },
  slide: {
    initial: { opacity: 0, x: '100%' },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: '-100%' },
    transition: { duration: 1.2, ease: "easeInOut" as const }
  },
  zoom: {
    initial: { opacity: 0, scale: 1.15 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.85 },
    transition: { duration: 1.5, ease: "easeInOut" as const }
  },
  none: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 }
  }
};

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const defaultLandingPage = localStorage.getItem('jvd_landing_page') || '/dashboard';
      navigate(defaultLandingPage, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [step, setStep] = useState<'credentials' | '2fa' | 'setup2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [setupData, setSetupData] = useState<{ qr_code_url: string; secret: string } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Portal Customization States (Initialized from localStorage to prevent flash of default assets/color)
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('jvd_logo_url') || '/JVD 3D.png');
  const [bgList, setBgList] = useState<string[]>(() => {
    const cached = localStorage.getItem('jvd_bg_list');
    try {
      return cached ? JSON.parse(cached) : ['/bus-bg.png'];
    } catch {
      return ['/bus-bg.png'];
    }
  });
  const [btnColor, setBtnColor] = useState(() => localStorage.getItem('jvd_btn_color') || '#2563eb');
  const [slideDuration, setSlideDuration] = useState<number>(() => {
    const cached = localStorage.getItem('jvd_slide_duration');
    return cached ? parseInt(cached) : 6;
  });
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [pageTitle, setPageTitle] = useState(() => localStorage.getItem('jvd_page_title') || 'JVD ETMC');
  const [slideTransition, setSlideTransition] = useState(() => localStorage.getItem('jvd_slide_transition') || 'fade');

  useEffect(() => {
    // Load active branding configuration on mount
    const loadConfig = async () => {
      try {
        const response = await settingsApi.getPublicSettings();
        const { data } = response.data;
        if (data) {
          if (data.landing_page_logo) {
            setLogoUrl(data.landing_page_logo);
            localStorage.setItem('jvd_logo_url', data.landing_page_logo);
          }
          if (data.landing_page_bg && data.landing_page_bg.length > 0) {
            setBgList(data.landing_page_bg);
            localStorage.setItem('jvd_bg_list', JSON.stringify(data.landing_page_bg));
          }
          if (data.landing_page_btn_color) {
            setBtnColor(data.landing_page_btn_color);
            localStorage.setItem('jvd_btn_color', data.landing_page_btn_color);
          }
          if (data.landing_page_slide_duration) {
            setSlideDuration(data.landing_page_slide_duration);
            localStorage.setItem('jvd_slide_duration', data.landing_page_slide_duration.toString());
          }
          if (data.landing_page_title) {
            setPageTitle(data.landing_page_title);
            localStorage.setItem('jvd_page_title', data.landing_page_title);
          }
          if (data.landing_page_slide_transition) {
            setSlideTransition(data.landing_page_slide_transition);
            localStorage.setItem('jvd_slide_transition', data.landing_page_slide_transition);
          }
        }
      } catch (err) {
        console.error('Failed to load branding configurations:', err);
      }
    };
    loadConfig();
  }, []);

  // Cycle slideshow backgrounds
  useEffect(() => {
    if (bgList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % bgList.length);
    }, slideDuration * 1000);
    return () => clearInterval(interval);
  }, [bgList, slideDuration]);

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
        login(data.token, data.user, data.permissions);
        let defaultLandingPage = localStorage.getItem('jvd_landing_page');
        if (!defaultLandingPage) {
          defaultLandingPage = data.user.role === 'driver' ? '/driver/schedule' : '/dashboard';
        }
        navigate(defaultLandingPage);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setPassword('');
      if (err.response) {
        setError(err.response.data?.message || 'Invalid credentials');
      } else if (err.request) {
        setError('Cannot connect to the server. Please ensure the backend is running.');
      } else {
        setError('An unexpected error occurred.');
      }
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
      login(data.token, data.user, data.permissions);
      const defaultLandingPage = localStorage.getItem('jvd_landing_page') || '/dashboard';
      navigate(defaultLandingPage);
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
      login(data.token, data.user, data.permissions);
      const defaultLandingPage = localStorage.getItem('jvd_landing_page') || '/dashboard';
      navigate(defaultLandingPage);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-slate-950 relative overflow-hidden">

      {/* Logo glow keyframe: yellow → blue → red */}
      <style>{`
        @keyframes login-logo-glow {
          0%   { filter: drop-shadow(0 15px 30px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(250,204,21,0.9)) drop-shadow(0 0 70px rgba(250,204,21,0.35)); }
          33%  { filter: drop-shadow(0 15px 30px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(59,130,246,0.9)) drop-shadow(0 0 70px rgba(59,130,246,0.35)); }
          66%  { filter: drop-shadow(0 15px 30px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(239,68,68,0.9))  drop-shadow(0 0 70px rgba(239,68,68,0.35)); }
          100% { filter: drop-shadow(0 15px 30px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(250,204,21,0.9)) drop-shadow(0 0 70px rgba(250,204,21,0.35)); }
        }
        .login-logo-glow {
          animation: login-logo-glow 15s ease-in-out infinite;
        }
        .login-logo-glow:hover {
          animation-play-state: paused;
          transform: scale(1.05);
        }
      `}</style>
      {/* Background Image Slideshow with dynamic custom transition effects */}
      <div className="absolute inset-0 overflow-hidden bg-slate-950">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={bgList[currentBgIndex]}
            initial={transitionVariants[slideTransition as keyof typeof transitionVariants]?.initial || transitionVariants.fade.initial}
            animate={transitionVariants[slideTransition as keyof typeof transitionVariants]?.animate || transitionVariants.fade.animate}
            exit={transitionVariants[slideTransition as keyof typeof transitionVariants]?.exit || transitionVariants.fade.exit}
            transition={transitionVariants[slideTransition as keyof typeof transitionVariants]?.transition || transitionVariants.fade.transition}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgList[currentBgIndex]})` }}
          />
        </AnimatePresence>
      </div>

      {/* Premium Glossy Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/45 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-center justify-center lg:justify-between p-6 md:p-12 min-h-screen">
        
        {/* Left Branding Section */}
        <div className="lg:w-1/2 flex flex-col items-center text-center mb-12 lg:mb-0 relative z-10">
          <div className="flex flex-col items-center">
            <img
              src={logoUrl}
              alt="JVD Logo"
              className="h-80 md:h-100 w-auto mb-4 transition-transform duration-700 select-none login-logo-glow"
            />
            <div className="h-px w-48 bg-white/40 mb-6"></div>
          </div>
        </div>

        {/* Right Form Section (Premium Card) */}
        <div className="lg:w-1/2 flex justify-center lg:justify-end w-full max-w-lg relative z-10">
          <div className="w-full bg-white p-12 md:p-16 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.55)] border border-white/10">
            {step === 'credentials' ? (
              <form onSubmit={handleCredentials} className="space-y-10">
                <div className="text-left">
                  <h2 className="text-4xl md:text-[2.75rem] font-display font-black text-slate-900 tracking-tight leading-none">{pageTitle}</h2>
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
                      <div className="absolute left-5 text-slate-400 flex items-center h-full pointer-events-none">
                        <Lock className="w-5 h-5 opacity-60" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-14 pr-12 py-5 bg-slate-50/50 border-none rounded-2xl text-slate-900 placeholder-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/5 transition-all duration-300"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 hover:opacity-80 transition-opacity"
                        style={{ color: '#454444' }}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: isBtnHovered ? `${btnColor}e6` : btnColor,
                    boxShadow: isBtnHovered ? `0 15px 30px -5px ${btnColor}55` : `0 10px 25px -5px ${btnColor}35`
                  }}
                  onMouseEnter={() => setIsBtnHovered(true)}
                  onMouseLeave={() => setIsBtnHovered(false)}
                  className="w-full py-5 text-white font-black tracking-widest rounded-2xl active:scale-[0.98] transition-all duration-300 flex justify-center items-center mt-6 uppercase text-sm cursor-pointer"
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
              <form onSubmit={handleSetupTwoFactor} className="space-y-6">
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
                    style={{
                      backgroundColor: isBtnHovered ? `${btnColor}e6` : btnColor,
                      boxShadow: isBtnHovered ? `0 15px 30px -5px ${btnColor}55` : `0 10px 25px -5px ${btnColor}35`
                    }}
                    onMouseEnter={() => setIsBtnHovered(true)}
                    onMouseLeave={() => setIsBtnHovered(false)}
                    className="w-full py-4 text-white font-semibold rounded-xl transition-all duration-300 cursor-pointer"
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
              <form onSubmit={handleTwoFactor} className="space-y-6">
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
                    style={{
                      backgroundColor: isBtnHovered ? `${btnColor}e6` : btnColor,
                      boxShadow: isBtnHovered ? `0 15px 30px -5px ${btnColor}55` : `0 10px 25px -5px ${btnColor}35`
                    }}
                    onMouseEnter={() => setIsBtnHovered(true)}
                    onMouseLeave={() => setIsBtnHovered(false)}
                    className="w-full py-4 text-white font-semibold rounded-xl transition-all duration-300 cursor-pointer"
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
          &copy; 2026 JVD Events and Travels Management Co. 
        </p>
      </div>

    </div>
  );
}
