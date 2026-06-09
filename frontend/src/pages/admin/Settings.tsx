import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useHasRole } from '../../hooks/useHasRole';
import { settingsApi } from '../../api/settings';
import { 
  LuSun, 
  LuMoon, 
  LuHouse, 
  LuUpload, 
  LuTrash2, 
  LuPlus, 
  LuPalette, 
  LuImage, 
  LuSettings,
  LuLoader
} from 'react-icons/lu';
import toast from 'react-hot-toast';

// Native Frontend Image Compression and Optimization Utility
const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    // If the browser doesn't support FileReader or Canvas, fallback immediately
    if (!window.FileReader || !window.HTMLCanvasElement) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Convert blob to File with a clean name
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
};

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [landingPage, setLandingPage] = useState('/dashboard');
  
  // Super Admin Role Check
  const isSuperAdmin = useHasRole(['super_admin']);

  // Landing Page custom settings state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/JVD 3D.png');
  const [bgUrls, setBgUrls] = useState<string[]>(['/bus-bg.png']);
  const [btnColor, setBtnColor] = useState('#2563eb');
  const [slideDuration, setSlideDuration] = useState<number>(6);
  const [landingPageTitle, setLandingPageTitle] = useState<string>('JVD ETMC');
  const [slideTransition, setSlideTransition] = useState<string>('fade');

  // File Upload State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newBgFiles, setNewBgFiles] = useState<File[]>([]);
  const [newBgPreviews, setNewBgPreviews] = useState<string[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load local landing page redirect config
    const saved = localStorage.getItem('jvd_landing_page');
    if (saved) {
      setLandingPage(saved);
    }

    // Load active system-wide branding configurations
    fetchLandingPageSettings();
  }, []);

  const fetchLandingPageSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getPublicSettings();
      const { data } = response.data;
      if (data) {
        setLogoUrl(data.landing_page_logo);
        setBgUrls(data.landing_page_bg || []);
        setBtnColor(data.landing_page_btn_color || '#2563eb');
        setSlideDuration(data.landing_page_slide_duration || 6);
        setLandingPageTitle(data.landing_page_title || 'JVD ETMC');
        setSlideTransition(data.landing_page_slide_transition || 'fade');
      }
    } catch (error) {
      console.error('Failed to load branding configurations:', error);
      toast.error('Failed to load portal branding configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleLandingPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setLandingPage(value);
    localStorage.setItem('jvd_landing_page', value);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const toastId = toast.loading('Optimizing logo for instant loading...');
      try {
        // Compress logo to max 300x300 at 75% quality
        const optimized = await compressImage(file, 300, 300, 0.75);
        setLogoFile(optimized);
        setLogoPreview(URL.createObjectURL(optimized));
        toast.success('Logo optimized successfully!', { id: toastId });
      } catch (err) {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        toast.dismiss(toastId);
      }
    }
  };

  const handleBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const toastId = toast.loading('Compressing and scaling images for speed...');
      
      try {
        // Compress and scale each frame to max 1280x720 at 65% quality (Super lightweight!)
        const optimizedFiles = await Promise.all(
          filesArray.map(file => compressImage(file, 1280, 720, 0.65))
        );
        
        setNewBgFiles(prev => [...prev, ...optimizedFiles]);
        
        const newPreviews = optimizedFiles.map(file => URL.createObjectURL(file));
        setNewBgPreviews(prev => [...prev, ...newPreviews]);
        toast.success('Backgrounds optimized successfully!', { id: toastId });
      } catch (err) {
        setNewBgFiles(prev => [...prev, ...filesArray]);
        const newPreviews = filesArray.map(file => URL.createObjectURL(file));
        setNewBgPreviews(prev => [...prev, ...newPreviews]);
        toast.dismiss(toastId);
      }
    }
  };

  const removeExistingBg = (urlToRemove: string) => {
    setBgUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const removeNewBg = (indexToRemove: number) => {
    setNewBgFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    
    // Revoke the Object URL to avoid memory leaks
    URL.revokeObjectURL(newBgPreviews[indexToRemove]);
    setNewBgPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveLandingSettings = async () => {
    setSaving(true);
    const formData = new FormData();

    if (logoFile) {
      formData.append('logo_file', logoFile);
    }

    newBgFiles.forEach(file => {
      formData.append('bg_files[]', file);
    });

    bgUrls.forEach(url => {
      formData.append('existing_bg_urls[]', url);
    });

    formData.append('landing_page_btn_color', btnColor);
    formData.append('landing_page_slide_duration', slideDuration.toString());
    formData.append('landing_page_title', landingPageTitle);
    formData.append('landing_page_slide_transition', slideTransition);

    try {
      const response = await settingsApi.updateLandingPageSettings(formData);
      toast.success(response.data.message || 'Landing page configuration saved successfully!');
      
      // Update UI state with returned configuration
      const updatedData = response.data.data;
      if (updatedData) {
        setLogoUrl(updatedData.landing_page_logo);
        setBgUrls(updatedData.landing_page_bg || []);
        setBtnColor(updatedData.landing_page_btn_color || '#2563eb');
        setSlideDuration(updatedData.landing_page_slide_duration || 6);
        setLandingPageTitle(updatedData.landing_page_title || 'JVD ETMC');
        setSlideTransition(updatedData.landing_page_slide_transition || 'fade');
      }

      // Reset local file upload states
      setLogoFile(null);
      setLogoPreview(null);
      setNewBgFiles([]);
      setNewBgPreviews([]);
    } catch (error: any) {
      console.error('Failed to update landing page branding:', error);
      const errMsg = error.response?.data?.message || 'Error occurred while saving configurations.';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 md:p-8">
      {/* Overview Block */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter flex items-center gap-3">
          <LuSettings className="w-8 h-8 text-indigo-500" /> System Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium">Manage your portal appearance, theme preferences, and default routing settings.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dark Mode Config */}
          <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'}`}>
                {theme === 'dark' ? <LuMoon className="w-6 h-6" /> : <LuSun className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Switch between light and dark themes.</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Default Start Page Config */}
          <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-emerald-500 text-white">
                <LuHouse className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Landing Page</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Set your default start page upon login.</p>
              </div>
            </div>
            <div className="relative">
              <select
                value={landingPage}
                onChange={handleLandingPageChange}
                className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-4 pr-10 py-2 transition-colors cursor-pointer outline-none"
              >
                <option value="/dashboard">Dashboard</option>
                <option value="/accounting/billing">Accounting / Billing</option>
                <option value="/accounting/liquidations">Accounting / Liquidations</option>
                <option value="/procurement/overview">Procurement / Overview</option>
                <option value="/inventory/supplies">Inventory / Supplies</option>
                <option value="/travel/passporting">Travel / Passporting</option>
                <option value="/hr/employees">HR / Employees</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Branding Customization Block */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-8 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 z-20 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <LuLoader className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Fetching Active Branding...</span>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                <LuPalette className="w-7 h-7 text-indigo-500" /> Portal Branding Configuration
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Super Admin Exclusive. Customize the logo, button theme color, and background slideshow on the portal landing screen.</p>
            </div>
            <button
              onClick={handleSaveLandingSettings}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2 uppercase cursor-pointer"
            >
              {saving ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                'Save Configurations'
              )}
            </button>
          </div>

          <div className="space-y-8">
            {/* Logo and Accent Color Picker Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logo Settings */}
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-850 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 mb-4 tracking-wider uppercase">Portal Landing Logo</label>
                  <div className="flex flex-col items-center gap-4">
                    {/* Logo Preview */}
                    <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center border border-gray-250 dark:border-gray-700 shadow-md overflow-hidden p-2">
                      <img 
                        src={logoPreview || logoUrl} 
                        alt="Logo Preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="w-full space-y-2">
                      <button 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full py-2.5 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-gray-750 dark:text-gray-200 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LuUpload className="w-4 h-4 shrink-0" /> Upload Logo
                      </button>
                      <input 
                        type="file" 
                        ref={logoInputRef}
                        onChange={handleLogoChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-550 font-medium leading-tight mt-3">Optimized automatically for speed. SVG, PNG, JPG, or WebP.</p>
              </div>

              {/* Accent Color Settings */}
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-850 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 mb-2 tracking-wider uppercase">Landing Button Accent Color</label>
                  <p className="text-[10px] text-gray-400 dark:text-gray-550 font-medium mb-6">Choose a hex color for the main action buttons on the Login page.</p>
                </div>
                <div className="flex items-center gap-6">
                  <div 
                    className="w-16 h-16 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md transition-all animate-pulse"
                    style={{ backgroundColor: btnColor }}
                  />
                  <div className="flex-1 flex gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={btnColor}
                        onChange={(e) => setBtnColor(e.target.value)}
                        placeholder="#2563eb"
                        maxLength={7}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm uppercase outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-250 dark:border-gray-700 cursor-pointer">
                      <input 
                        type="color" 
                        value={btnColor}
                        onChange={(e) => setBtnColor(e.target.value)}
                        className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer scale-125"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal brand / title settings */}
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-850 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 mb-2 tracking-wider uppercase">Portal Brand Name / Title</label>
                  <p className="text-[10px] text-gray-400 dark:text-gray-550 font-medium mb-6">Change the branding name shown on the Login Page and Sidebar headers.</p>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={landingPageTitle}
                    onChange={(e) => setLandingPageTitle(e.target.value)}
                    placeholder="JVD ETMC"
                    maxLength={50}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Background Slideshow Settings */}
            <div className="p-6 bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-850">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-550 mb-1 tracking-wider uppercase flex items-center gap-2">
                    <LuImage className="w-4 h-4 text-indigo-500" /> Background Slideshow Images
                  </label>
                  <p className="text-[10px] text-gray-400 dark:text-gray-550 font-medium">Manage background images that will elegantly rotate on the landing screen. Click any image's delete icon to remove it.</p>
                </div>
                
                {/* Slideshow Duration and Transition Selectors */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wide">Slide Speed:</span>
                    <select
                      value={slideDuration}
                      onChange={(e) => setSlideDuration(parseInt(e.target.value))}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
                    >
                      <option value={3}>3 seconds</option>
                      <option value={5}>5 seconds</option>
                      <option value={6}>6 seconds (Default)</option>
                      <option value={8}>8 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={20}>20 seconds</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wide">Transition:</span>
                    <select
                      value={slideTransition}
                      onChange={(e) => setSlideTransition(e.target.value)}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => bgInputRef.current?.click()}
                    className="py-2.5 px-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <LuPlus className="w-4 h-4" /> Add Frame
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={bgInputRef}
                  onChange={handleBgChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>

              {/* Slideshow Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Render Existing Backgrounds */}
                {bgUrls.map((url, index) => (
                  <div key={`existing-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md group bg-slate-950">
                    <img 
                      src={url} 
                      alt={`Active Slide ${index}`} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <button 
                        onClick={() => removeExistingBg(url)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition-transform active:scale-95 cursor-pointer"
                        title="Delete background slide"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white uppercase tracking-widest">Active</span>
                  </div>
                ))}

                {/* Render New Previews */}
                {newBgPreviews.map((previewUrl, index) => (
                  <div key={`new-${index}`} className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-indigo-400 shadow-md group bg-slate-950">
                    <img 
                      src={previewUrl} 
                      alt={`Pending Slide ${index}`} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <button 
                        onClick={() => removeNewBg(index)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition-transform active:scale-95 cursor-pointer"
                        title="Remove pending upload"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-indigo-600 rounded text-[9px] font-bold text-white uppercase tracking-widest animate-pulse">Pending</span>
                  </div>
                ))}

                {/* Empty State / Call to Action */}
                {bgUrls.length === 0 && newBgFiles.length === 0 && (
                  <div className="col-span-full py-10 bg-gray-50/50 dark:bg-gray-800/10 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2">
                    <LuImage className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-xs text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">No backgrounds configured</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version Footer */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">JVD ETMC v1.2.0-stable</p>
      </div>
    </div>
  );
}
