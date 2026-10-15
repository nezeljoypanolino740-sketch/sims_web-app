import { AppLayout } from '@/layouts/AppLayout';
import { staffNav, studentNav } from '@/layouts/navigation';

const administratorItems = staffNav('/administrator');
const adminItems = staffNav('/admin');
const studentItems = studentNav();

export function AdministratorLayout() {
  return <AppLayout items={administratorItems} roleLabel="Administrator" profilePath="/administrator/profile" notificationsPath={undefined} />;
}

export function AdminLayout() {
  return <AppLayout items={adminItems} roleLabel="Admin" profilePath="/admin/profile" notificationsPath={undefined} />;
}

export function StudentLayout() {
  return <AppLayout items={studentItems} roleLabel="Student" profilePath="/student/settings" notificationsPath="/student/notifications" />;
}
