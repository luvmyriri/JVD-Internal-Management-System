import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { AVAILABLE_WIDGETS, WIDGET_CATEGORIES } from '../config/dashboardWidgets';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  User, 
  Phone, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Layers,
  Banknote,
  Users,
  Bus,
  Ticket,
  ShoppingBag,
  Globe,
  Box,
  Shield,
  Rocket
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  LuLayers: Layers,
  LuBanknote: Banknote,
  LuUsers: Users,
  LuBus: Bus,
  LuTicket: Ticket,
  LuShoppingBag: ShoppingBag,
  LuGlobe: Globe,
  LuBox: Box,
  LuShield: Shield,
};

const DEFAULT_WIDGET_IDS = [
  'accounting_revenue',
  'fleet_status',
  'sales_bookings',
  'hr_headcount',
  'system_approvals',
  'system_quick_actions',
];

export default function AccountSetupWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [step, setStep] = useState<number>(1);

  // Step 1: Password State
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Step 2: Profile State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 3: Workspace Cards State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>(DEFAULT_WIDGET_IDS);

  // General State
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If not arriving with token/email (e.g. launching from inside app), prefill email if user logged in
    if (!token && !email) {
      // User can still explore the wizard in demo/re-setup mode
    }
  }, [token, email]);

  const handleToggleWidget = (id: string) => {
    setSelectedWidgetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== passwordConfirmation) {
      setPasswordError('Passwords do not match.');
      return;
    }

    // If token and email exist, submit password set call
    if (token && email) {
      setIsLoading(true);
      try {
        await authApi.setPassword({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        });
        toast.success('Password configured successfully!');
        setStep(2);
      } catch (err: any) {
        console.error('Set password error:', err);
        setPasswordError(err.response?.data?.message || 'Failed to set password. Link may be expired.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep(2);
    }
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleStep3Next = () => {
    // Save selected widget layout to localStorage
    localStorage.setItem('jvd_custom_dashboard_layout', JSON.stringify(selectedWidgetIds));
    localStorage.setItem('jvd_active_dashboard_view', 'custom');
    toast.success('Custom dashboard cards saved!');
    setStep(4);
  };

  const handleFinishWizard = () => {
    if (token && email) {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
  };

  const filteredWidgets = AVAILABLE_WIDGETS.filter((widget) =>
    selectedCategory === 'all' ? true : widget.category === selectedCategory
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 scale-105 pointer-events-none" 
        style={{ backgroundImage: 'url("/bus-bg.png")' }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 md:p-12">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <img src="/JVD 3D.png" alt="JVD Logo" className="h-12 w-auto drop-shadow-lg" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase">JVD Management System</h1>
              <p className="text-xs text-slate-400 font-medium">Welcome & Account Setup Wizard</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 backdrop-blur-md">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                    : step > s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800/60 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 size={14} /> : <span>{s}</span>}
                <span className="hidden md:inline">
                  {s === 1 && 'Password'}
                  {s === 2 && 'Profile'}
                  {s === 3 && 'Workspace Cards'}
                  {s === 4 && 'Launch'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Card Body */}
        <div className="flex-1 bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-800 shadow-2xl p-6 md:p-10 flex flex-col justify-between">
          
          {/* STEP 1: PASSWORD SETUP */}
          {step === 1 && (
            <div className="max-w-md mx-auto w-full my-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Set Secure Password</h2>
                <p className="text-xs text-slate-400 font-medium">
                  {email ? `Create a new password for account: ${email}` : 'Create a secure password for your system login.'}
                </p>
              </div>

              {passwordError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-400 text-center">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleStep1Next} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer mt-6"
                >
                  {isLoading ? 'Configuring Password...' : <>Continue to Profile <ArrowRight size={16} /></>}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: PROFILE VERIFICATION */}
          {step === 2 && (
            <div className="max-w-md mx-auto w-full my-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <User className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Confirm Personnel Profile</h2>
                <p className="text-xs text-slate-400 font-medium">Verify your display name and contact mobile number.</p>
              </div>

              <form onSubmit={handleStep2Next} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Maria Santos"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile / Contact Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +63 917 123 4567"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wider rounded-2xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    Customize Dashboard Cards <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: WORKSPACE DASHBOARD CARDS PICKER */}
          {step === 3 && (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-amber-400" /> Customize Your Workspace Cards
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Pick and pull off dashboard cards from each module to build your personal dashboard workspace.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black rounded-xl">
                    {selectedWidgetIds.length} Cards Selected
                  </span>
                </div>

                {/* Category Selector Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
                  {WIDGET_CATEGORIES.map((cat) => {
                    const isActive = selectedCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Cards Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                  {filteredWidgets.map((widget) => {
                    const isSelected = selectedWidgetIds.includes(widget.id);
                    const IconComponent = ICON_MAP[widget.iconName] || Layers;

                    return (
                      <div
                        key={widget.id}
                        onClick={() => handleToggleWidget(widget.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              <IconComponent size={18} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                                {widget.title}
                              </h4>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                {widget.category}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isSelected && <Check size={14} />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mt-1">
                          {widget.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleStep3Next}
                  className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer"
                >
                  Save & Preview Setup <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: LAUNCH & WELCOME */}
          {step === 4 && (
            <div className="max-w-md mx-auto w-full my-auto text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl border border-emerald-500/30 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                <Rocket className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">You're All Set!</h2>
                <p className="text-sm text-slate-400 mt-2 font-semibold">
                  Your account and customized workspace cards are ready.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Account:</span>
                  <span className="text-slate-200 font-black">{email || 'Verified Account'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Active Dashboard Cards:</span>
                  <span className="text-amber-400 font-black">{selectedWidgetIds.length} Module Widgets</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">Default Workspace:</span>
                  <span className="text-emerald-400 font-black">My Custom Dashboard</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishWizard}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                Launch My Workspace <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
