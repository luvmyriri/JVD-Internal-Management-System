import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !email) {
      toast.error('Invalid or expired invitation link');
      navigate('/login');
    }
  }, [token, email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.setPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setIsSuccess(true);
      toast.success('Password set successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error('Set password error:', err);
      setError(err.response?.data?.message || 'Failed to set password. Link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex font-sans bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" style={{ backgroundImage: 'url("/bus-bg.png")' }}></div>
        <div className="absolute inset-0 bg-slate-900/60"></div>
        <div className="relative z-10 flex w-full max-w-lg mx-auto items-center justify-center p-6">
          <div className="w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900">All Set!</h2>
            <p className="text-slate-500 font-medium">Your password has been configured successfully. Redirecting you to login...</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" style={{ backgroundImage: 'url("/bus-bg.png")' }}></div>
      <div className="absolute inset-0 bg-slate-900/40 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-center justify-center lg:justify-between p-6 md:p-12 min-h-screen">
        <div className="lg:w-1/2 flex flex-col items-center text-center mb-12 lg:mb-0">
          <img src="/JVD 3D.png" alt="JVD Logo" className="h-64 md:h-80 w-auto drop-shadow-2xl mb-4" />
          <div className="h-px w-48 bg-white/40 mb-6"></div>
          <h1 className="text-white text-2xl font-bold tracking-widest uppercase opacity-80">Account Setup</h1>
        </div>

        <div className="lg:w-1/2 flex justify-center lg:justify-end w-full max-w-lg">
          <div className="w-full bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Setup Password</h2>
              <p className="text-sm text-slate-500 mt-2 font-semibold">Configuration for: <span className="text-blue-600">{email}</span></p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">New Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-5 w-5 h-5 text-blue-600" />
                  <div className="absolute left-12 h-6 w-[1px] bg-slate-200"></div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-16 pr-12 py-5 bg-slate-50 border border-transparent rounded-2xl text-slate-900 font-medium focus:bg-white focus:border-blue-200 transition-all outline-none"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 text-slate-300">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 px-2">Min 8 chars, 1 uppercase, 1 number, 1 special char.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">Confirm Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-5 w-5 h-5 text-blue-600" />
                  <div className="absolute left-12 h-6 w-[1px] bg-slate-200"></div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full pl-16 pr-12 py-5 bg-slate-50 border border-transparent rounded-2xl text-slate-900 font-medium focus:bg-white focus:border-blue-200 transition-all outline-none"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex justify-center items-center uppercase text-sm"
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>Complete Setup <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
