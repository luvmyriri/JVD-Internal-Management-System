import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/profile';
import { useTheme } from '../context/ThemeContext';
import { LuUser, LuMail, LuCamera, LuCheck, LuX, LuZoomIn, LuZoomOut, LuLock, LuEye, LuEyeOff, LuShieldCheck } from 'react-icons/lu';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { getAvatarUrl } from '../utils';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  // Avatar states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password states
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password validation state
  const passwordRequirements = {
    length: passwordData.password.length >= 8,
    uppercase: /[A-Z]/.test(passwordData.password),
    number: /[0-9]/.test(passwordData.password),
    symbol: /[@$!%*?&]/.test(passwordData.password),
    match: passwordData.password === passwordData.password_confirmation && passwordData.password !== '',
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setLoading(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      const response = await profileApi.updateAvatar(croppedImage);
      
      if (response.success && user) {
        setUser({ ...user, avatar_url: response.data.avatar_url });
        toast.success('Profile picture updated!');
        setIsCropping(false);
        setImageSrc(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await profileApi.update(formData);
      if (response.success) {
        setUser(response.data);
        toast.success('Profile information updated!');
        setIsEditing(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.values(passwordRequirements).every(Boolean)) {
      toast.error('Please meet all password requirements');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await profileApi.changePassword(passwordData);
      if (response.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          current_password: '',
          password: '',
          password_confirmation: '',
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const cancelEditing = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Account Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal information and profile settings.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
          >
            <LuUser className="w-4 h-4 text-blue-600" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Avatar Management */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm text-center">
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-md ring-1 ring-gray-100 dark:ring-gray-800 mx-auto">
                {user.avatar_url ? (
                  <img src={getAvatarUrl(user.avatar_url) || ''} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-3xl font-bold">
                    {user.first_name[0]}{user.last_name[0]}
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform group-hover:scale-110"
                title="Change Avatar"
              >
                <LuCamera className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            
            <div className="mt-4">
              <h3 className="font-bold text-gray-900 dark:text-white">{user.first_name} {user.last_name}</h3>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-wider mb-2">Security Note</h4>
            <p className="text-[11px] text-blue-700 dark:text-blue-500 leading-relaxed">
              Your profile information is visible to administrators. Please ensure your email remains up to date for 2FA purposes.
            </p>
          </div>
        </div>

        {/* Right: Personal Info Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <LuUser className="w-3 h-3 text-blue-600" />
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none transition ${
                    isEditing 
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white' 
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <LuUser className="w-3 h-3 text-blue-600" />
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none transition ${
                    isEditing 
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white' 
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <LuMail className="w-3 h-3 text-blue-600" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition ${
                  isEditing 
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white' 
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed'
                }`}
                placeholder="Enter email address"
                required
              />
            </div>

            {isEditing && (
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-6 py-2.5 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200"
                >
                  {loading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>

          {/* Change Password Section */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
            {!isChangingPassword ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Security & Password</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Update your account password regularly for security.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="px-5 py-2.5 bg-gray-900 dark:bg-gray-800 text-white text-sm font-bold rounded-xl hover:bg-black dark:hover:bg-gray-700 transition shadow-md"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Update Password</h3>
                    <p className="text-xs text-gray-500 mt-1">Please enter your current and new password.</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <LuLock className="w-3 h-3 text-gray-400" />
                      Current Password
                    </label>
                    <div className="relative group">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-12"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 transition"
                      >
                        {showPasswords ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <LuLock className="w-3 h-3 text-blue-600" />
                        New Password
                      </label>
                      <div className="relative group">
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={passwordData.password}
                          onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-12"
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 transition"
                        >
                          {showPasswords ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <LuLock className="w-3 h-3 text-blue-600" />
                        Confirm New Password
                      </label>
                      <div className="relative group">
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={passwordData.password_confirmation}
                          onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-12"
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 transition"
                        >
                          {showPasswords ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RequirementItem 
                      label="At least 8 characters" 
                      met={passwordRequirements.length} 
                    />
                    <RequirementItem 
                      label="Uppercase letter" 
                      met={passwordRequirements.uppercase} 
                    />
                    <RequirementItem 
                      label="Include a number" 
                      met={passwordRequirements.number} 
                    />
                    <RequirementItem 
                      label="Special symbol (@$!%*?&)" 
                      met={passwordRequirements.symbol} 
                    />
                    <RequirementItem 
                      label="Passwords match" 
                      met={passwordRequirements.match} 
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({
                          current_password: '',
                          password: '',
                          password_confirmation: '',
                        });
                      }}
                      className="px-6 py-2.5 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black disabled:opacity-50 transition shadow-lg shadow-gray-200 flex items-center gap-2"
                    >
                      {passwordLoading ? 'Updating...' : (
                        <>
                          <LuShieldCheck className="w-4 h-4" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cropping Modal */}
      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Adjust Profile Picture</h3>
              <button onClick={() => setIsCropping(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <LuX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="relative flex-1 bg-gray-900 min-h-[400px]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />
            </div>

            <div className="p-6 space-y-6 bg-white">
              <div className="flex items-center gap-4">
                <LuZoomOut className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <LuZoomIn className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCropping(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAvatar}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {loading ? 'Processing...' : (
                    <>
                      <LuCheck className="w-4 h-4" />
                      Set as Profile Picture
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementItem({ label, met }: { label: string, met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? <LuCheck className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />}
      {label}
    </div>
  );
}

