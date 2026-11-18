import { isCampus } from '@/constants/campuses';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  if (!emailPattern.test(value.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Use at least 8 characters.';
  return null;
}

export function validateName(value: string): string | null {
  const length = value.trim().length;
  if (length < 1 || length > 80) return 'Enter your name (up to 80 characters).';
  return null;
}

export function validatePhone(value: string): string | null {
  const length = value.trim().length;
  if (length < 7 || length > 20) return 'Enter a phone number, 7 to 20 characters.';
  return null;
}

export function validateCampus(value: string): string | null {
  if (!isCampus(value.trim())) return 'Choose your campus.';
  return null;
}
