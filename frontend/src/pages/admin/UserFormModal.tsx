import {
  LuShieldCheck,
  LuShield,
  LuBus,
  LuChevronRight,
  LuX,
  LuKeyRound,
  LuEye,
  LuLoaderCircle,
} from 'react-icons/lu';
import { useState } from 'react';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { Modal, Button } from '../../components/ui';
import { cn } from '../../utils';
import type { ModulePermission } from '../../api/rolePermissions';
import { ROLES, DEPARTMENTS, PRESET_TAGS, type User } from './users.constants';
import UserAccessPanel from './UserAccessPanel';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  allBuses: any[];
  modules: string[];
  configData: any;

  register: UseFormRegister<any>;
  handleSubmit: UseFormHandleSubmit<any>;
  onSubmit: (data: any) => void | Promise<void>;
  errors: FieldErrors<any>;
  watchedRole: string;
  isSubmitting: boolean;

  tags: string[];
  tagInput: string;
  setTagInput: (v: string) => void;
  addCustomTag: () => void;
  removeTag: (tag: string) => void;
  handleTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  addPresetTag: (preset: string) => void;

  assignedBusId: number | '';
  setAssignedBusId: (v: number | '') => void;

  customPermissions: Record<string, ModulePermission>;
  setCustomPermissions: React.Dispatch<React.SetStateAction<Record<string, ModulePermission>>>;
  dashboardPreference?: string | null;
  setDashboardPreference?: (v: string | null) => void;
  onResetPassword?: (user: User) => void;
  onSetPassword?: (userId: number, password: string, passwordConfirmation: string) => Promise<void>;
  isSettingPassword?: boolean;
}

export default function UserFormModal({
  isOpen,
  onClose,
  selectedUser,
  allBuses,
  modules,
  configData,
  register,
  handleSubmit,
  onSubmit,
  errors,
  watchedRole,
  isSubmitting,
  tags,
  tagInput,
  setTagInput,
  addCustomTag,
  removeTag,
  handleTagKeyDown,
  addPresetTag,
  assignedBusId,
  setAssignedBusId,
  customPermissions,
  setCustomPermissions,
  dashboardPreference,
  setDashboardPreference,
  onResetPassword,
  onSetPassword,
  isSettingPassword,
}: UserFormModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const handleSetPassword = async () => {
    if (!selectedUser || !onSetPassword) return;
    await onSetPassword(selectedUser.id, newPassword, confirmPassword);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedUser ? 'Modify User' : 'Add User'}
      size="xl"
    >
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Basic Information</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                  <input
                    {...register('first_name', {
                      required: 'First name is required',
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/[^A-Za-z\s-']/g, '');
                      },
                      pattern: {
                        value: /^[A-Za-z\s-']+$/i,
                        message: 'Numbers are not allowed'
                      }
                    })}
                    className={cn(
                      "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.first_name && "border-red-300 bg-red-50/30"
                    )}
                    placeholder="e.g. John"
                  />
                  {errors.first_name && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.first_name.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input
                    {...register('last_name', {
                      required: 'Last name is required',
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/[^A-Za-z\s-']/g, '');
                      },
                      pattern: {
                        value: /^[A-Za-z\s-']+$/i,
                        message: 'Numbers are not allowed'
                      }
                    })}
                    className={cn(
                      "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.last_name && "border-red-300 bg-red-50/30"
                    )}
                    placeholder="e.g. Doe"
                  />
                  {errors.last_name && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.last_name.message as string}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Corporate Email</label>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    className={cn(
                      "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.email && "border-red-300 bg-red-50/30"
                    )}
                    placeholder="john.doe@jvd.com"
                  />
                  {errors.email && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.email.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee Reference ID</label>
                  <input
                    {...register('employee_id')}
                    placeholder={selectedUser ? "e.g. JVD-EMP-1001" : "Leave blank to auto-generate (e.g. JVD-EMP-1001)"}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile / Contact Number</label>
                <input
                  {...register('phone', {
                    pattern: {
                      value: /^[0-9+()\-\s]*$/,
                      message: 'Invalid phone number format'
                    }
                  })}
                  className={cn(
                    "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    errors.phone && "border-red-300 bg-red-50/30"
                  )}
                  placeholder="e.g. 0917 123 4567"
                />
                {errors.phone && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.phone.message as string}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
                  <select
                    {...register('role')}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                  <select
                    {...register('department')}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </details>

          {/* ── Security & Password Management (for existing employees) ── */}
          {selectedUser && (
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="flex items-center gap-2">
                  <LuKeyRound className="text-amber-500" />
                  <span>Security &amp; Password Management</span>
                </span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-4">
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl space-y-3">
                  <div>
                    <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">Set Employee Password</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Directly set a new password for <strong className="text-gray-700 dark:text-gray-300">{selectedUser.email}</strong>. Their existing sessions will be revoked immediately.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min. 8 chars)"
                        className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <LuEye size={15} />
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                      <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <LuEye size={15} />
                      </button>
                    </div>

                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[10px] text-red-500 font-bold">Passwords do not match</p>
                    )}

                    <Button
                      type="button"
                      onClick={handleSetPassword}
                      disabled={isSettingPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
                      className="w-full flex items-center justify-center gap-2 text-xs"
                    >
                      {isSettingPassword
                        ? <><LuLoaderCircle size={14} className="animate-spin" /> Updating Password...</>
                        : <><LuKeyRound size={14} /> Set Password</>}
                    </Button>
                  </div>
                </div>
              </div>
            </details>
          )}

          {/* ── Account Tags & Attributes ── */}
          <details className="group">
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span className="flex items-center gap-2">
                <LuShield className="text-blue-500" />
                <span>Account Tags & Attributes</span>
              </span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Tags</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 min-h-[48px] items-center">
                  {tags.length === 0 && (
                    <span className="text-xs text-gray-400 font-medium">No tags assigned.</span>
                  )}
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-black rounded-xl shadow-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <LuX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Enter custom tag (e.g. access:logistics:general)..."
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Button type="button" variant="secondary" onClick={addCustomTag} className="text-xs px-4">
                  Add
                </Button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quick Add Preset Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map((preset) => {
                    const isAdded = tags.includes(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => !isAdded && addPresetTag(preset.value)}
                        disabled={isAdded}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all",
                          isAdded
                            ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 active:scale-95"
                        )}
                      >
                        + {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </details>

          {/* ── Bus Assignment (Driver Only) ── */}
          {watchedRole === 'driver' && (
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="flex items-center gap-2">
                  <LuBus className="text-blue-500" />
                  <span>Bus Assignment</span>
                </span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Unit</label>
                <select
                  value={assignedBusId}
                  onChange={(e) => setAssignedBusId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">No Bus Assigned (Unassigned Driver)</option>
                  {allBuses
                    .filter((bus: any) => bus.status !== 'maintenance')
                    .map((bus: any) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.plate_number} {bus.model ? `— ${bus.model}` : ''}
                        {bus.driver && bus.driver.id !== selectedUser?.id
                          ? ` (Currently: ${bus.driver.first_name} ${bus.driver.last_name})`
                          : ''}
                        {bus.driver && bus.driver.id === selectedUser?.id ? ' (Current)' : ''}
                      </option>
                    ))}
                </select>
                {assignedBusId && allBuses.find((b: any) => b.id === Number(assignedBusId))?.driver?.id &&
                  allBuses.find((b: any) => b.id === Number(assignedBusId))?.driver?.id !== selectedUser?.id && (
                  <p className="text-[10px] font-bold text-amber-500 ml-1">
                    ⚠ This bus is currently assigned to another driver. Saving will reassign it.
                  </p>
                )}
              </div>
            </details>
          )}

          {/* ── Access & Dashboard Overrides ── */}
          {selectedUser && (
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="flex items-center gap-2">
                  <LuShieldCheck className="text-emerald-500" />
                  <span>Access & Dashboard Overrides</span>
                </span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1">
                <UserAccessPanel
                  role={watchedRole || selectedUser.role}
                  initialCustomPermissions={customPermissions}
                  initialDashboardPreference={dashboardPreference}
                  onPermissionsChange={(perms) => setCustomPermissions(perms)}
                  onDashboardPreferenceChange={(pref) => setDashboardPreference && setDashboardPreference(pref)}
                />
              </div>
            </details>
          )}

          {!selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 px-4 py-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                <div className="flex-1">
                  <div className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                    Secure Account Setup
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                    A one-time setup link is emailed to the employee
                  </p>
                </div>
                <LuKeyRound size={18} className="shrink-0 text-blue-600" />
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-[1.5rem] flex items-start gap-3">
                <LuShield size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium">Passwords are chosen by employees through the expiring setup link and are never shown to administrators.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              {selectedUser ? 'Save' : 'Register User'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
