import { lazy, type ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireActive, RequireRole, RequireSession, RootRedirect } from '@/components/auth/RouteGuards';
import { ModulePlaceholder } from '@/components/ModulePlaceholder';
import { AuthProvider } from '@/context/AuthProvider';
import { AdminLayout, AdministratorLayout, StudentLayout } from '@/layouts/RoleLayouts';
import { STAFF_MODULES, STUDENT_MODULES } from '@/layouts/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';
import AccountDisabledPage from '@/pages/auth/AccountDisabledPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import LinkStudentPage from '@/pages/auth/LinkStudentPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import UnauthorizedPage from '@/pages/auth/UnauthorizedPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProfileSettingsPage from '@/pages/ProfileSettingsPage';

const DashboardPage = lazy(() => import('@/pages/staff/DashboardPage'));
const StudentsPage = lazy(() => import('@/pages/staff/StudentsPage'));
const TeachersPage = lazy(() => import('@/pages/staff/TeachersPage'));
const SubjectsPage = lazy(() => import('@/pages/staff/SubjectsPage'));
const AttendancePage = lazy(() => import('@/pages/staff/AttendancePage'));
const GradesPage = lazy(() => import('@/pages/staff/GradesPage'));
const AcademicYearsPage = lazy(() => import('@/pages/staff/AcademicYearsPage'));
const ReportsPage = lazy(() => import('@/pages/staff/ReportsPage'));
const UsersPage = lazy(() => import('@/pages/staff/UsersPage'));
const ActivityLogsPage = lazy(() => import('@/pages/staff/ActivityLogsPage'));
const SchoolSettingsPage = lazy(() => import('@/pages/staff/SchoolSettingsPage'));

const StudentOverviewPage = lazy(() => import('@/pages/student/StudentOverviewPage'));
const MyProfilePage = lazy(() => import('@/pages/student/MyProfilePage'));
const MyGradesPage = lazy(() => import('@/pages/student/MyGradesPage'));
const MyAttendancePage = lazy(() => import('@/pages/student/MyAttendancePage'));
const AcademicHistoryPage = lazy(() => import('@/pages/student/AcademicHistoryPage'));
const StudentNotificationsPage = lazy(() => import('@/pages/student/NotificationsPage'));

/** Student module path -> page ('settings' is the shared profile and password page). */
const studentPages: Record<string, ReactElement> = {
  profile: <MyProfilePage />,
  grades: <MyGradesPage />,
  attendance: <MyAttendancePage />,
  history: <AcademicHistoryPage />,
  notifications: <StudentNotificationsPage />,
  settings: <ProfileSettingsPage />,
};

/** Staff module path -> page. Administrator-only paths are not routed under /admin at all. */
const staffPages: Record<string, ReactElement> = {
  students: <StudentsPage />,
  teachers: <TeachersPage />,
  subjects: <SubjectsPage />,
  attendance: <AttendancePage />,
  grades: <GradesPage />,
  'academic-years': <AcademicYearsPage />,
  reports: <ReportsPage />,
  users: <UsersPage />,
  'activity-logs': <ActivityLogsPage />,
  'school-settings': <SchoolSettingsPage />,
};

function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold text-brand-800">Connect Supabase to continue</h1>
      <p className="text-slate-600">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then restart <code>npm run dev</code>.
      </p>
    </main>
  );
}

const administratorModules = STAFF_MODULES;
const adminModules = STAFF_MODULES.filter((m) => !m.administratorOnly);

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequired />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<RequireSession />}>
            <Route path="/link-student" element={<LinkStudentPage />} />
            <Route path="/account-disabled" element={<AccountDisabledPage />} />
          </Route>

          <Route element={<RequireActive />}>
            <Route element={<RequireRole roles={['administrator']} />}>
              <Route path="/administrator" element={<AdministratorLayout />}>
                <Route index element={<DashboardPage />} />
                {administratorModules.map((m) => (
                  <Route key={m.path} path={m.path} element={staffPages[m.path] ?? <ModulePlaceholder title={m.label} stage="a later stage" />} />
                ))}
                <Route path="profile" element={<ProfileSettingsPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                {adminModules.map((m) => (
                  <Route key={m.path} path={m.path} element={staffPages[m.path] ?? <ModulePlaceholder title={m.label} stage="a later stage" />} />
                ))}
                <Route path="profile" element={<ProfileSettingsPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole roles={['user']} />}>
              <Route path="/student" element={<StudentLayout />}>
                <Route index element={<StudentOverviewPage />} />
                {STUDENT_MODULES.map((m) => (
                  <Route key={m.path} path={m.path} element={studentPages[m.path] ?? <ModulePlaceholder title={m.label} stage="a later stage" />} />
                ))}
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
