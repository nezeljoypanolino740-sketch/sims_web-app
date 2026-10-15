import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '@/context/auth-context';
import type { Profile, Role, AccountStatus } from '@/types/models';

const auth = vi.hoisted(() => ({ value: null as unknown as AuthContextValue }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.value }));

import { PublicOnly, RequireActive, RequireRole, RootRedirect } from './RouteGuards';

function profile(role: Role, account_status: AccountStatus = 'active'): Profile {
  return { id: 'u1', full_name: 'Test', email: 't@school.edu', role, account_status, created_at: '', updated_at: '' };
}

function setAuth(p: Profile | null, options: { session?: boolean; loading?: boolean } = {}) {
  const { session = true, loading = false } = options;
  auth.value = {
    session: session ? ({ user: { id: 'u1' } } as unknown as AuthContextValue['session']) : null,
    profile: p,
    loading,
    signOut: async () => undefined,
    refreshProfile: async () => undefined,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<p>login page</p>} />
        </Route>
        <Route path="/link-student" element={<p>link page</p>} />
        <Route path="/account-disabled" element={<p>disabled page</p>} />
        <Route path="/unauthorized" element={<p>unauthorized page</p>} />
        <Route path="/administrator" element={<p>administrator home</p>} />
        <Route path="/admin" element={<p>admin home</p>} />
        <Route path="/student" element={<p>student home</p>} />
        <Route element={<RequireActive />}>
          <Route element={<RequireRole roles={['administrator']} />}>
            <Route path="/secret" element={<p>secret page</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('route guards', () => {
  it('sends signed-out visitors to login', () => {
    setAuth(null, { session: false });
    renderAt('/secret');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('sends each role to its own dashboard from "/"', () => {
    setAuth(profile('administrator'));
    renderAt('/');
    expect(screen.getByText('administrator home')).toBeInTheDocument();
  });

  it('sends an admin to the admin dashboard and a student to the student dashboard', () => {
    setAuth(profile('admin'));
    const first = renderAt('/');
    expect(screen.getByText('admin home')).toBeInTheDocument();
    first.unmount();

    setAuth(profile('user'));
    renderAt('/');
    expect(screen.getByText('student home')).toBeInTheDocument();
  });

  it('blocks the wrong role from an administrator page', () => {
    setAuth(profile('admin'));
    renderAt('/secret');
    expect(screen.getByText('unauthorized page')).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('lets the right role in', () => {
    setAuth(profile('administrator'));
    renderAt('/secret');
    expect(screen.getByText('secret page')).toBeInTheDocument();
  });

  it('asks a pending student to link their record, and blocks inactive accounts', () => {
    setAuth(profile('user', 'pending'));
    const first = renderAt('/secret');
    expect(screen.getByText('link page')).toBeInTheDocument();
    first.unmount();

    setAuth(profile('user', 'inactive'));
    renderAt('/secret');
    expect(screen.getByText('disabled page')).toBeInTheDocument();
  });

  it('keeps signed-in people away from the login page', () => {
    setAuth(profile('administrator'));
    renderAt('/login');
    expect(screen.getByText('administrator home')).toBeInTheDocument();
  });
});
