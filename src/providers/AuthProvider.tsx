import type { EmailOtpType, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { toFriendlyError } from '@/lib/errors';
import type { Profile } from '@/lib/profile';
import { deactivateDevicePushToken, registerDevicePushToken } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { validateCampus, validateName, validatePhone } from '@/lib/validate';
import type { Database } from '../../types/database.types';

const profileColumns = 'id, full_name, phone, avatar_url, campus_location, role';

export type Vendor = Database['public']['Tables']['vendors']['Row'];

type AuthContextValue = {
  ready: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  vendor: Vendor | null;
  profileComplete: boolean;
  profileError: string | null;
  linkError: string | null;
  clearLinkError: () => void;
  recovery: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<'session' | 'confirm'>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, password: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (input: { fullName: string; phone: string; campus: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const otpTypes = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function firstParam(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) return value[0];
  return null;
}

function raise(error: unknown): never {
  throw new Error(toFriendlyError(error));
}

function authRedirect(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  return trimmed.length > 0 ? `campusplug://${trimmed}` : 'campusplug://';
}

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function fetchVendor(userId: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createSessionFromUrl(url: string): Promise<'recovery' | 'session' | 'ignore'> {
  const parsed = Linking.parse(url);
  const code = firstParam(parsed.queryParams?.code);
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return 'session';
  }

  const tokenHash = firstParam(parsed.queryParams?.token_hash);
  const type = firstParam(parsed.queryParams?.type);
  if (tokenHash && type && otpTypes.has(type as EmailOtpType)) {
    const otpType = type as EmailOtpType;
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) throw error;
    return otpType === 'recovery' ? 'recovery' : 'session';
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return 'ignore';
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return 'ignore';
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return params.get('type') === 'recovery' ? 'recovery' : 'session';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const handledUrls = useRef(new Set<string>());

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const [nextProfile, nextVendor] = await Promise.all([
        fetchProfile(userId),
        fetchVendor(userId),
      ]);
      setProfile(nextProfile);
      setVendor(nextVendor);
      setProfileError(null);
    } catch (error) {
      setProfile(null);
      setVendor(null);
      setProfileError(toFriendlyError(error));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        setVendor(null);
        setProfileError(null);
        if (event === 'SIGNED_OUT') setRecovery(false);
        setReady(true);
        return;
      }
      const userId = next.user.id;
      queueMicrotask(() => {
        if (!active) return;
        void loadProfile(userId);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    let active = true;

    const openUrl = (url: string | null) => {
      if (!url || handledUrls.current.has(url) || !active) return;
      if (!url.includes('code=') && !url.includes('token_hash=') && !url.includes('access_token=')) {
        return;
      }
      handledUrls.current.add(url);
      void createSessionFromUrl(url)
        .then((result) => {
          if (active && result === 'recovery') setRecovery(true);
        })
        .catch((error: unknown) => {
          handledUrls.current.delete(url);
          if (active) setLinkError(toFriendlyError(error));
        });
    };

    void Linking.getInitialURL().then(openUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => openUrl(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    await loadProfile(userId);
  }, [loadProfile, session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadProfile(userId);
    });
    return () => subscription.remove();
  }, [loadProfile, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;
    void registerDevicePushToken();
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) raise(error);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: authRedirect('/'),
      },
    });
    if (error) raise(error);
    return data.session ? 'session' : 'confirm';
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'signup',
    });
    if (error) raise(error);
  }, []);

  const resendSignupCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: authRedirect('/') },
    });
    if (error) raise(error);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: authRedirect('/reset-password'),
    });
    if (error) raise(error);
  }, []);

  const confirmPasswordReset = useCallback(async (email: string, code: string, password: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'recovery',
    });
    if (error) raise(error);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) raise(updateError);
    setRecovery(false);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) raise(error);
    setRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    await deactivateDevicePushToken();
    const { error } = await supabase.auth.signOut();
    if (error) raise(error);
  }, []);

  const completeOnboarding = useCallback(
    async (input: { fullName: string; phone: string; campus: string }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Sign in before saving your profile.');
      const nameError = validateName(input.fullName);
      const phoneError = validatePhone(input.phone);
      const campusError = validateCampus(input.campus);
      if (nameError || phoneError || campusError) {
        throw new Error(nameError ?? phoneError ?? campusError ?? 'Check the form.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          campus_location: input.campus.trim(),
        })
        .eq('id', userId)
        .select(profileColumns)
        .single();
      if (error) raise(error);
      setProfile(data);
    },
    [session?.user.id],
  );

  const clearLinkError = useCallback(() => setLinkError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      loading: !ready,
      session,
      profile,
      vendor,
      profileComplete: Boolean(profile?.phone && profile?.campus_location),
      profileError,
      linkError,
      clearLinkError,
      recovery,
      refreshProfile,
      signIn,
      signUp,
      verifyEmailCode,
      resendSignupCode,
      requestPasswordReset,
      sendPasswordReset: requestPasswordReset,
      confirmPasswordReset,
      updatePassword,
      signOut,
      completeOnboarding,
    }),
    [
      clearLinkError,
      completeOnboarding,
      confirmPasswordReset,
      linkError,
      profile,
      profileError,
      ready,
      recovery,
      refreshProfile,
      requestPasswordReset,
      resendSignupCode,
      session,
      signIn,
      signOut,
      signUp,
      updatePassword,
      vendor,
      verifyEmailCode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
