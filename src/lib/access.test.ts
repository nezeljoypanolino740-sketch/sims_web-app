import { describe, expect, it } from 'vitest';
import { resolveAccess } from './access';
import type { Profile } from '@/types/models';

const base: Profile = {
  id: '1',
  full_name: 'Test',
  email: 't@school.edu',
  role: 'user',
  account_status: 'active',
  created_at: '',
  updated_at: '',
};

describe('resolveAccess', () => {
  it('sends each active role to its own dashboard', () => {
    expect(resolveAccess({ ...base, role: 'administrator' })).toEqual({ status: 'ok', home: '/administrator' });
    expect(resolveAccess({ ...base, role: 'admin' })).toEqual({ status: 'ok', home: '/admin' });
    expect(resolveAccess({ ...base, role: 'user' })).toEqual({ status: 'ok', home: '/student' });
  });

  it('asks a pending student to link their student record', () => {
    expect(resolveAccess({ ...base, account_status: 'pending' })).toEqual({ status: 'needs-student-link' });
  });

  it('blocks pending staff and inactive accounts', () => {
    expect(resolveAccess({ ...base, role: 'admin', account_status: 'pending' })).toEqual({
      status: 'blocked',
      reason: 'pending',
    });
    expect(resolveAccess({ ...base, account_status: 'inactive' })).toEqual({ status: 'blocked', reason: 'inactive' });
  });
});
