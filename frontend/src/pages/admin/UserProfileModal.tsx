import {
  LuMail,
  LuBadgeCheck,
  LuActivity,
  LuShield,
  LuShieldCheck,
  LuGlobe,
  LuChevronRight,
  LuUserCheck,
  LuUserMinus,
  LuPencil,
} from 'react-icons/lu';
import { Modal, Button } from '../../components/ui';
import { cn, fullName, formatDate } from '../../utils';
import type { ModulePermission } from '../../api/rolePermissions';
import { ROLES, type User } from './users.constants';

interface UserProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  customPermissions: Record<string, ModulePermission>;
  configData: any;
  modules: string[];
  watchedRole: string;
  canEditUser: boolean;
  onEdit: (user: User) => void;
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
  customPermissions,
  configData,
  modules,
  watchedRole,
  canEditUser,
  onEdit,
}: UserProfileModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Identity"
      size="xl"
    >
      {user && (
        <div className="space-y-6 p-1">
          {/* Header Profile Card */}
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-700" />

            <div className="relative shrink-0">
              <img
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=ffffff&color=3b82f6&size=256&bold=true`}
                className="w-28 h-28 rounded-[2rem] border-4 border-white dark:border-gray-800 shadow-2xl object-cover relative z-10"
                alt=""
              />
              <div className={cn(
                "absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg z-20 flex items-center justify-center text-white",
                user.is_active ? "bg-emerald-500" : "bg-rose-500"
              )}>
                {user.is_active ? <LuUserCheck size={14} /> : <LuUserMinus size={14} />}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{fullName(user)}</h2>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 dark:border-blue-500/20">
                      {user.department}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 dark:border-gray-700">
                      {ROLES.find(r => r.value === user.role)?.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300">
                  <LuMail size={16} className="text-blue-500 shrink-0" /> {user.email}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300">
                  <LuBadgeCheck size={16} className="text-emerald-500 shrink-0" /> {user.employee_id}
                </div>
              </div>
            </div>
          </div>

          {/* 2 Column Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <LuActivity size={16} className="text-blue-500" />
                System Access
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Last Login</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {user.last_login ? formatDate(user.last_login) : 'Never Active'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Registered</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{formatDate(user.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <LuShield size={16} className="text-emerald-500" />
                Security Level
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">Access Tier</span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 capitalize">{user.role.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">System Origin</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    <LuGlobe size={12} className="text-gray-400" /> Internal Network
                  </span>
                </div>

                {user.tags && user.tags.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-850">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Account Tags / Attributes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-blue-100/50 dark:border-blue-800/40">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom Permissions - Full Width Section */}
          {user.effective_permissions && Object.keys(user.effective_permissions).length > 0 && (
            <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <details className="group" open>
                <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <LuShieldCheck size={18} className="text-emerald-500" />
                    Custom Permissions (Overrides Role)
                  </span>
                  <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
                </summary>

                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

                         const basePerms = configData?.data?.[user?.role || watchedRole]?.[module];
                         let baseAccessLevel = 'none';
                         if (basePerms) {
                             if (basePerms.can_view && !basePerms.can_create && !basePerms.can_edit && !basePerms.can_delete) {
                                 baseAccessLevel = 'view';
                             } else if (basePerms.can_view) {
                                 baseAccessLevel = 'full';
                             }
                         }

                         const moduleName = configData?.meta?.modules?.[module] || module.replace(/_/g, ' ');
                         const effectiveAccessLevel = accessLevel === 'default' ? baseAccessLevel : accessLevel;

                         return (
                           <div
                             key={module}
                             className={cn(
                               "p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all",
                               effectiveAccessLevel === 'none' ? "bg-gray-50/60 border-gray-100 dark:bg-gray-800/40 dark:border-gray-800" :
                               effectiveAccessLevel === 'view' ? "bg-blue-50/40 border-blue-100/80 dark:bg-blue-900/20 dark:border-blue-800/40" :
                               "bg-emerald-50/40 border-emerald-100/80 dark:bg-emerald-900/20 dark:border-emerald-800/40"
                             )}
                           >
                             <div className="flex items-center justify-between gap-2">
                               <div className="flex items-center gap-1.5 min-w-0">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full shrink-0",
                                   effectiveAccessLevel === 'none' ? 'bg-rose-400' :
                                   effectiveAccessLevel === 'view' ? 'bg-blue-500' : 'bg-emerald-500'
                                 )} />
                                 <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate" title={moduleName}>
                                   {moduleName}
                                 </span>
                               </div>
                               <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
                                 Base: {baseAccessLevel}
                               </span>
                             </div>

                             <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                               <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Access:</span>
                               <span className={cn(
                                 "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider",
                                 accessLevel === 'default' ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" :
                                 accessLevel === 'full' ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" :
                                 accessLevel === 'view' ? "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" :
                                 "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                               )}>
                                 {accessLevel === 'default' ? `Default (${baseAccessLevel})` :
                                  accessLevel === 'full' ? 'Full Access' :
                                  accessLevel === 'view' ? 'View Only' : 'No Access'}
                               </span>
                             </div>
                           </div>
                         );
                     })}
                  </div>

                  <div className="p-3 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      * Modifying these permissions will override the user's role-based access for the specific module.
                    </p>

                    {Object.keys(customPermissions).length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Active Overrides:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(customPermissions).map(([mod, perms]) => {
                             let level = "View";
                             if (perms.can_create && perms.can_edit && perms.can_delete) level = "Full";
                             else if (perms.can_create || perms.can_edit) level = "Limited";

                             const modTitle = configData?.meta?.modules?.[mod] || mod.replace(/_/g, ' ');

                             return (
                               <div key={mod} className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300 capitalize flex items-center gap-1">
                                 {modTitle}
                                 <span className={cn(
                                   "text-[9px] px-1 rounded-sm",
                                   level === 'Full' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" :
                                   level === 'View' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" :
                                   "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                 )}>{level}</span>
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-8"
            >
              Close Profile
            </Button>
            {canEditUser && (
              <Button
                onClick={() => { onClose(); onEdit(user); }}
                className="px-8 flex items-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none"
              >
                <LuPencil size={16} /> Edit User
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
