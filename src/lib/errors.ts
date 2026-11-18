import { limits } from '@/constants/theme';

const invalidCredentials = 'That email or password is wrong.';
const emailNotConfirmed = 'Confirm your email before signing in.';
const alreadyRegistered = 'An account with that email already exists.';
const weakPassword = `Use at least ${limits.passwordMin} characters with a letter and a number.`;
const expiredCode = 'That code has expired. Request a new one.';
const rateLimit = 'Too many attempts. Wait a moment and try again.';
const noConnection = 'You are offline. Try again when you are back online.';
const unknown = 'That request failed. Try again.';

function readString(error: unknown, key: 'code' | 'message'): string {
  if (typeof error !== 'object' || error === null || !(key in error)) return '';
  const value = (error as { code?: unknown; message?: unknown })[key];
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function firstIssue(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('issues' in error)) return null;
  const issues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const message = (issues[0] as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}

function isOffline(error: unknown): boolean {
  const message = readString(error, 'message');
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('internet connection')
  );
}

export function toFriendlyError(error: unknown): string {
  if (isOffline(error)) return noConnection;

  const code = readString(error, 'code');
  const message = readString(error, 'message');

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return invalidCredentials;
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return emailNotConfirmed;
  }
  if (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return alreadyRegistered;
  }
  if (code === 'weak_password' || message.includes('password should be at least')) {
    return weakPassword;
  }
  if (code === 'otp_expired' || message.includes('expired') || message.includes('token has expired')) {
    return expiredCode;
  }
  if (code === 'over_request_rate_limit' || message.includes('rate limit')) {
    return rateLimit;
  }
  if (message.includes('email address not authorized')) {
    return 'Campus Plug cannot email that address yet.';
  }
  if (message.includes('redirect') && (message.includes('not allowed') || message.includes('invalid'))) {
    return 'The email link is not set up yet. Try again after the app link is allowed.';
  }
  if (code === '23505' || message.includes('vendors_owner_id')) {
    return 'You already have a shop application.';
  }
  if (code === '42501' || message.includes('row-level security')) {
    return 'You do not have permission to do that.';
  }
  if (code === 'pgrst116') return 'That could not be found.';
  if (message.includes('only an admin can set this product status')) {
    return 'An admin removed this listing, so buyers cannot see it.';
  }
  if (message.includes('maximum allowed size') || message.includes('payload too large')) {
    return 'That photo is too large. Use a smaller image.';
  }
  if (message.includes('violates check constraint')) {
    return 'Check the name, description, or price and try again.';
  }
  if (message.includes('one or more products are not available')) {
    return 'One of those products is no longer available.';
  }
  if (message.includes('vendor is not available')) {
    return 'This shop is paused or not open for orders.';
  }
  if (message.includes('quantity must be from 1 to 50')) {
    return 'Use a quantity from 1 to 50 for each item.';
  }
  if (message.includes('that status change is not allowed')) {
    return 'This order changed. Showing the latest status.';
  }
  if (message.includes('you cannot order from your own shop')) {
    return 'You cannot order from your own shop.';
  }
  if (message.includes('you cannot start a conversation with your own shop')) {
    return 'You cannot message your own shop.';
  }
  if (message.includes('order not found')) {
    return 'That order no longer exists.';
  }
  if (message.includes('conversation not found')) {
    return 'That chat no longer exists.';
  }
  if (message.includes('not authenticated')) {
    return 'Sign in to continue.';
  }
  if (message.includes('buyer note is too long')) {
    return 'Shorten the note and try again.';
  }
  if (message.includes('meeting point is too long')) {
    return 'Shorten the meeting point and try again.';
  }
  if (message.includes('items must be a non-empty array')) {
    return 'Add at least one item.';
  }
  if (message.includes('too many items')) {
    return 'An order can include at most 50 items.';
  }
  if (message.includes('each item needs a product_id')) {
    return 'Check the items and try again.';
  }
  if (message.includes('add your name before placing an order')) {
    return 'Add your name before placing an order.';
  }
  if (message.includes('order total is too large')) {
    return 'That order total is too large.';
  }
  if (message.includes('token is invalid')) {
    return 'This device could not be registered for notifications.';
  }
  if (message.includes('platform must be ios or android')) {
    return 'Push is only available on the iOS and Android app.';
  }
  if (message.includes('storage delete failed')) {
    return 'Your photos could not be removed, so the account is still here.';
  }
  if (message.includes('account delete failed')) {
    return 'The account could not be deleted. Try again.';
  }
  if (message.includes('admin only')) {
    return 'Only an admin can do that.';
  }
  if (message.includes('a reason is required to reject a vendor')) {
    return 'Add a reason before rejecting this shop.';
  }
  if (message.includes('a reason is required to remove a vendor')) {
    return 'Add a reason before removing this shop.';
  }
  if (message.includes('a reason is required to remove a product')) {
    return 'Add a reason before removing this product.';
  }
  if (message.includes('reason is too long')) {
    return `Use at most ${limits.moderationReasonMax} characters.`;
  }
  if (message.includes('decision must be approved or rejected')) {
    return 'Choose approve or reject.';
  }
  if (message.includes('vendor not found')) {
    return 'That shop could not be found.';
  }
  if (message.includes('product not found')) {
    return 'That product could not be found.';
  }
  if (message.includes('admin_audit_log is append-only')) {
    return 'That record cannot be changed.';
  }

  const issue = firstIssue(error);
  if (issue) return issue;
  if (message.length > 0) {
    const raw = readRaw(error, 'message');
    return raw.length > 0 ? raw : message;
  }
  if (error instanceof Error && error.message) return error.message;
  return unknown;
}

function readRaw(error: unknown, key: 'message'): string {
  if (typeof error !== 'object' || error === null || !(key in error)) return '';
  const value = (error as { message?: unknown }).message;
  return typeof value === 'string' ? value : '';
}

export function isOrderStatusConflict(error: unknown): boolean {
  return readString(error, 'message').includes('that status change is not allowed');
}
