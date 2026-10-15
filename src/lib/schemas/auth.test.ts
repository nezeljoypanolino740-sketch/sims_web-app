import { describe, expect, it } from 'vitest';
import { changePasswordSchema, linkStudentSchema, loginSchema, registerSchema } from './auth';

describe('auth schemas', () => {
  it('rejects an invalid email on login', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });

  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@school.edu', password: 'x' }).success).toBe(true);
  });

  it('requires a letter and a number in new passwords', () => {
    const base = { fullName: 'Ana Cruz', email: 'ana@school.edu', confirmPassword: 'abcdefgh' };
    expect(registerSchema.safeParse({ ...base, password: 'abcdefgh' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: '12345678', confirmPassword: '12345678' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'abcdefg1', confirmPassword: 'abcdefg1' }).success).toBe(true);
  });

  it('rejects mismatched confirmation', () => {
    const result = registerSchema.safeParse({
      fullName: 'Ana Cruz',
      email: 'ana@school.edu',
      password: 'abcdefg1',
      confirmPassword: 'abcdefg2',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a future date of birth', () => {
    expect(linkStudentSchema.safeParse({ studentNumber: '2026-0001', dateOfBirth: '2999-01-01' }).success).toBe(false);
    expect(linkStudentSchema.safeParse({ studentNumber: '2026-0001', dateOfBirth: '2008-05-14' }).success).toBe(true);
  });

  it('requires the new password to differ from the current one', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'abcdefg1',
      newPassword: 'abcdefg1',
      confirmPassword: 'abcdefg1',
    });
    expect(result.success).toBe(false);
  });
});
