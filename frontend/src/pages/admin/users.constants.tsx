import {
  LuShieldCheck,
  LuBadgeCheck,
  LuShield,
  LuBriefcase,
  LuUsers,
  LuTruck,
} from 'react-icons/lu';
import { type UserRole } from '../../types/auth';

export interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  is_online?: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  custom_permissions?: any;
  effective_permissions?: any;
  tags?: string[];
}

export const PRESET_TAGS = [
  { value: 'access:general', label: 'Access: General' },
  { value: 'access:personalized', label: 'Access: Personalized' },
  { value: 'process:approve_commission', label: 'Approve Commission' },
  { value: 'process:approve_cash_budget', label: 'Approve Cash Budget' },
  { value: 'process:disburse_cash_budget', label: 'Disburse Cash Budget' },
  { value: 'process:settle_liquidation', label: 'Settle Liquidation' },
];

export const ROLES = [
  { value: 'super_admin', label: 'Super Admin', icon: LuShieldCheck, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { value: 'executive_vice_president', label: 'Executive VP', icon: LuShield, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { value: 'operations_manager', label: 'Operations Manager', icon: LuShieldCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { value: 'reservation_officer', label: 'Reservation Officer', icon: LuBriefcase, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'office_staff', label: 'Office Staff', icon: LuBriefcase, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'accounting_executive', label: 'Accounting Executive', icon: LuBadgeCheck, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { value: 'corporate_secretary', label: 'Corporate Secretary', icon: LuUsers, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { value: 'logistics_in_charge', label: 'Logistics In Charge', icon: LuShield, color: 'text-lime-500', bg: 'bg-lime-500/10' },
  { value: 'dispatcher', label: 'Dispatcher', icon: LuShield, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
  { value: 'purchasing_manager', label: 'Purchasing Manager', icon: LuShield, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { value: 'service_adviser', label: 'Service Adviser', icon: LuShield, color: 'text-stone-500', bg: 'bg-stone-500/10' },
  { value: 'head_mechanic', label: 'Head Mechanic', icon: LuShield, color: 'text-neutral-500', bg: 'bg-neutral-500/10' },
  { value: 'driver', label: 'Driver', icon: LuTruck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

export const DEPARTMENTS = [
  'Administration',
  'Accounting',
  'Operations',
  'Maintenance',
  'Human Resources',
  'Logistics',
];
