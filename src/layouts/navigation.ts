import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  ScrollText,
  Settings,
  UserCircle,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface ModuleDef {
  /** Path segment under the role's base path, e.g. 'students'. */
  path: string;
  label: string;
  icon: LucideIcon;
  /** Only the Administrator sees and can open this module. */
  administratorOnly?: boolean;
}

/** Staff modules, shared by Administrator and Admin. */
export const STAFF_MODULES: readonly ModuleDef[] = [
  { path: 'students', label: 'Students', icon: Users },
  { path: 'teachers', label: 'Teachers', icon: GraduationCap },
  { path: 'subjects', label: 'Subjects', icon: BookOpen },
  { path: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { path: 'grades', label: 'Grades', icon: ClipboardList },
  { path: 'academic-years', label: 'Academic years', icon: CalendarRange },
  { path: 'reports', label: 'Reports', icon: BarChart3 },
  { path: 'users', label: 'User management', icon: UserCog, administratorOnly: true },
  { path: 'activity-logs', label: 'Activity logs', icon: ScrollText, administratorOnly: true },
  { path: 'school-settings', label: 'School settings', icon: Settings, administratorOnly: true },
];

export const STUDENT_MODULES: readonly ModuleDef[] = [
  { path: 'profile', label: 'My profile', icon: UserCircle },
  { path: 'grades', label: 'My grades', icon: ClipboardList },
  { path: 'attendance', label: 'My attendance', icon: CalendarCheck },
  { path: 'history', label: 'Academic history', icon: History },
  { path: 'notifications', label: 'Notifications', icon: Bell },
  { path: 'settings', label: 'Account settings', icon: Settings },
];

export type StaffBase = '/administrator' | '/admin';

export function staffNav(base: StaffBase): NavItem[] {
  const isAdministrator = base === '/administrator';
  return [
    { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true },
    ...STAFF_MODULES.filter((m) => isAdministrator || !m.administratorOnly).map((m) => ({
      to: `${base}/${m.path}`,
      label: m.label,
      icon: m.icon,
    })),
    { to: `${base}/profile`, label: 'My profile', icon: UserCircle },
  ];
}

export function studentNav(): NavItem[] {
  return [
    { to: '/student', label: 'Overview', icon: LayoutDashboard, end: true },
    ...STUDENT_MODULES.map((m) => ({ to: `/student/${m.path}`, label: m.label, icon: m.icon })),
  ];
}
