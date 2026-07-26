import {
  LuShieldCheck,
  LuBus,
  LuChevronRight,
  LuX,
  LuKeyRound,
  LuEyeOff,
  LuEye as LuEyeOn,
} from 'react-icons/lu';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { Modal, Button } from '../../components/ui';
import { cn } from '../../utils';
import type { ModulePermission } from '../../api/rolePermissions';
import { ROLES, DEPARTMENTS, PRESET_TAGS, type User } from './users.constants';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  isSuperAdmin: boolean;
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

  newPassword: string;
  setNewPassword: (v: string) => void;
  newPasswordConfirm: string;
  setNewPasswordConfirm: (v: string) => void;
  showNewPw: boolean;
  setShowNewPw: React.Dispatch<React.SetStateAction<boolean>>;

  customPermissions: Record<string, ModulePermission>;
  setCustomPermissions: React.Dispatch<React.SetStateAction<Record<string, ModulePermission>>>;
}

export default function UserFormModal({
  isOpen,
  onClose,
  selectedUser,
  isSuperAdmin,
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
  newPassword,
  setNewPassword,
  newPasswordConfirm,
  setNewPasswordConfirm,
  showNewPw,
  setShowNewPw,
  customPermissions,
  setCustomPermissions,
}: UserFormModalProps) {
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
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile / Contact Number</label>
          <input
            {...register('phone', { pattern: { value: /^[0-9+()\-\s]*$/, message: 'Enter a valid contact number' } })}
            className={cn("w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20", errors.phone && "border-red-300 bg-red-50/30")}
            placeholder="e.g. 0917 123 4567"
          />
          {errors.phone && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.phone.message as string}</p>}
        </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                  <select
                    {...register('department', { required: 'Department is required' })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </details>

          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
              <span className="flex items-center gap-1.5"><LuShieldCheck className="text-blue-500" /> Account Tags & Attributes</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              {/* Visual bubbles of current tags */}
              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
                {tags.length === 0 ? (
                  <span className="text-xs text-gray-400 font-medium italic my-auto">No tags assigned. Default fallback (personalized access only) will apply.</span>
                ) : (
                  tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-500/20">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-800 dark:hover:text-blue-200 shrink-0">
                        <LuX className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Input to add tag */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom tag (e.g. access:logistics:general)..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Button type="button" onClick={addCustomTag} variant="secondary" className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider">Add</Button>
              </div>

              {/* Quick-select options */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quick Add Preset Tags</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(preset => {
                    const exists = tags.includes(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        disabled={exists}
                        onClick={() => addPresetTag(preset.value)}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all active:scale-95",
                          exists
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                            : "bg-white hover:bg-blue-50/50 dark:bg-gray-900 dark:hover:bg-blue-500/10 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 border-gray-200 dark:border-gray-800"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </details>

        {/* ── Assigned Bus (driver role only) ── */}
        {(watchedRole === 'driver' || selectedUser?.role === 'driver') && watchedRole === 'driver' && (
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
              <span className="flex items-center gap-1.5"><LuBus className="text-indigo-500" /> Driver Assignment</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Bus</label>
              <select
                value={assignedBusId}
                onChange={e => setAssignedBusId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">— None / Unassigned —</option>
                {allBuses
                  .filter((b: any) => b.status !== 'decommissioned')
                  .map((bus: any) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.plate_number} · {bus.model}
                      {bus.driver && bus.driver.id !== selectedUser?.id
                        ? ` (Assigned to ${bus.driver.first_name} ${bus.driver.last_name})`
                        : ''}
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

        {/* ── Super Admin: Set Password (edit mode only) ── */}
        {selectedUser && isSuperAdmin && (
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
              <span className="flex items-center gap-1.5 text-rose-500"><LuKeyRound className="text-rose-500" /> Super Admin — Set Password</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-3">
              <div className="space-y-3 p-4 bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl">
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                  Leave blank to keep the existing password unchanged.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPw ? <LuEyeOff size={16} /> : <LuEyeOn size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPasswordConfirm}
                    onChange={e => setNewPasswordConfirm(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                    placeholder="Re-enter new password"
                  />
                </div>

                {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                  <p className="text-[10px] font-bold text-rose-500 ml-1">⚠ Passwords do not match.</p>
                )}
                {newPassword && newPassword.length < 8 && (
                  <p className="text-[10px] font-bold text-amber-500 ml-1">⚠ Must be at least 8 characters.</p>
                )}
                {newPassword && newPassword.length >= 8 && newPassword === newPasswordConfirm && (
                  <p className="text-[10px] font-bold text-emerald-500 ml-1">✓ Passwords match.</p>
                )}
              </div>
            </div>
          </details>
        )}

        {/* ── Super Admin: Custom Permissions ── */}
        {selectedUser && isSuperAdmin && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                <LuShieldCheck size={12} /> Custom Permissions (Overrides Role)
              </span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
               {modules.map((module: string) => {
                   const perms = customPermissions[module];

                   // Determine current access level
                   let accessLevel = 'default';
                   if (perms) {
                       if (!perms.can_view && !perms.can_create && !perms.can_edit && !perms.can_delete) {
                           accessLevel = 'none';
                       } else if (perms.can_view && !perms.can_create && !perms.can_edit && !perms.can_delete) {
                           accessLevel = 'view';
                       } else {
                           accessLevel = 'full';
                       }
                   }

                   const basePerms = configData?.data?.[selectedUser?.role || watchedRole]?.[module];
                   let baseAccessLevel = 'none';
                   if (basePerms) {
                       if (basePerms.can_view && !basePerms.can_create && !basePerms.can_edit && !basePerms.can_delete) {
                           baseAccessLevel = 'view';
                       } else if (basePerms.can_view) {
                           baseAccessLevel = 'full';
                       }
                   }

                   const effectiveAccessLevel = accessLevel === 'default' ? baseAccessLevel : accessLevel;

                   const handleLevelChange = (level: string) => {
                       setCustomPermissions(prev => {
                           const updated = { ...prev };
                           if (level === 'default') {
                               delete updated[module];
                           } else if (level === 'none') {
                               updated[module] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
                           } else if (level === 'view') {
                               updated[module] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                           } else if (level === 'full') {
                               updated[module] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                           }
                           return updated;
                       });
                   };

                   const moduleName = configData?.meta?.modules?.[module] || module.replace(/_/g, ' ');

                   return (
                       <div key={module} className={cn(
                         "flex flex-col justify-between p-3 rounded-xl border transition-colors gap-2",
                         effectiveAccessLevel === 'none' ? "bg-gray-50/50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700" :
                         effectiveAccessLevel === 'view' ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30" :
                         "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30"
                       )}>
                           <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    effectiveAccessLevel === 'none' ? 'bg-rose-400' :
                                    effectiveAccessLevel === 'view' ? 'bg-blue-400' : 'bg-emerald-400'
                                )} />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize truncate" title={moduleName}>
                                  {moduleName}
                                </span>
                              </div>
                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
                                Base: {baseAccessLevel}
                              </span>
                           </div>

                           <select
                             value={accessLevel}
                             onChange={(e) => handleLevelChange(e.target.value)}
                             className="w-full text-xs font-bold p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                           >
                             <option value="default">Default ({baseAccessLevel})</option>
                             <option value="none">No Access</option>
                             <option value="view">View Only</option>
                             <option value="full">Full Access</option>
                           </select>
                       </div>
                   );
               })}
            </div>
          </div>
        )}

        {!selectedUser && (
          <div className="space-y-4">
            <label htmlFor="send_invitation" className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
              <div className="flex-1">
                <div className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                  Send Account Invitation
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                  Invite user via email to set their own password
                </p>
              </div>
              <div className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  {...register('send_invitation')}
                  id="send_invitation"
                  className="sr-only peer"
                  defaultChecked={true}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </div>
            </label>

            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-[1.5rem] flex items-start gap-3">
              <LuKeyRound size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                <span className="font-black">Unchecked = Temp Password.</span> If invitation is disabled, a temporary password will be generated and shown to you immediately after account creation.
              </p>
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
