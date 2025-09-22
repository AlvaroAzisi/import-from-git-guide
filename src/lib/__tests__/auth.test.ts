import { describe, it, expect } from 'vitest';
import {
  makeSafeUsername,
  validateEmail,
  validatePassword,
  validateSignUpForm,
} from '../auth';

describe('makeSafeUsername', () => {
  it('should remove disallowed characters', () => {
    expect(makeSafeUsername('user!@#name$')).toBe('username');
  });

  it('should handle undefined or empty input', () => {
    expect(makeSafeUsername(undefined)).toMatch(/^user[a-z0-9]{4}$/);
    expect(makeSafeUsername('')).toMatch(/^user[a-z0-9]{4}$/);
  });

  it('should trim username to max length', () => {
    expect(makeSafeUsername('averylongusernameforthispurpose')).toBe('averylongusernameforthispurpos');
  });

  it('should pad username to min length', () => {
    expect(makeSafeUsername('ab')).toMatch(/^abuser/);
  });

  it('should ensure regex compliance', () => {
    expect(makeSafeUsername('123username')).toBe('username');
    expect(makeSafeUsername('__username')).toBe('__username');
  });
});

describe('validateEmail', () => {
  it('should return true for valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('test@.com')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should return true for valid passwords (length >= 6)', () => {
    expect(validatePassword('password')).toBe(true);
    expect(validatePassword('123456')).toBe(true);
  });

  it('should return false for invalid passwords (length < 6)', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('123')).toBe(false);
  });
});

describe('validateSignUpForm', () => {
  it('should return isValid: true for valid sign-up data', () => {
    const result = validateSignUpForm('test@example.com', 'password123', 'password123');
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should return isValid: false and errors for invalid email', () => {
    const result = validateSignUpForm('invalid-email', 'password123', 'password123');
    expect(result.isValid).toBe(false);
    expect(result.errors?.email).toBe('Invalid email address');
  });

  it('should return isValid: false and errors for short password', () => {
    const result = validateSignUpForm('test@example.com', 'short', 'short');
    expect(result.isValid).toBe(false);
    expect(result.errors?.password).toBe('Password must be at least 6 characters long');
  });

  it('should return isValid: false and errors for mismatched passwords', () => {
    const result = validateSignUpForm('test@example.com', 'password123', 'password456');
    expect(result.isValid).toBe(false);
    expect(result.errors?.confirmPassword).toBe('Passwords do not match');
  });

  it('should return isValid: false and errors for missing email', () => {
    const result = validateSignUpForm('', 'password123', 'password123');
    expect(result.isValid).toBe(false);
    expect(result.errors?.email).toBe('Email is required');
  });

  it('should return isValid: false and errors for missing password', () => {
    const result = validateSignUpForm('test@example.com', '', '');
    expect(result.isValid).toBe(false);
    expect(result.errors?.password).toBe('Password is required');
  });
});
