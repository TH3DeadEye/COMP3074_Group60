import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { auth } from '@/firebase';

// A plain snapshot of the signed-in user. Firebase mutates its User object in place (e.g. when
// the display name changes), which React can't see, so the UI works with this copy instead.
export type AuthUser = { uid: string; email: string | null; displayName: string | null };

const toAuthUser = (u: User): AuthUser => ({ uid: u.uid, email: u.email, displayName: u.displayName });

type AuthState = {
  user: AuthUser | null;
  // True until Firebase has told us whether a saved session exists.
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Fires once on launch with the restored session (or null), then on every sign in/out.
    return onAuthStateChanged(auth, (next) => {
      setUser(next ? toAuthUser(next) : null);
      setInitializing(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signOut: () => firebaseSignOut(auth),
    }),
    [user, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

// Firebase rejects every email/password request until the provider is switched on in the console.
const NOT_ENABLED =
  'Email sign-in is turned off for this Firebase project. In the Firebase console, enable Authentication > Sign-in method > Email/Password.';

// Turns a Firebase sign-in error into something a driver can act on.
export function signInErrorMessage(error: unknown): string {
  const code = errorCode(error);
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return "Wrong email or password, or this isn't a driver account.";
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact dispatch.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your signal and try again.';
    case 'auth/operation-not-allowed':
      return NOT_ENABLED;
    default:
      // Unexpected codes (e.g. an API key restricted to Android apps) are worth seeing in dev.
      if (__DEV__) console.warn('Sign-in failed:', code || error);
      return "Couldn't sign in. Try again.";
  }
}

// Name and initials for the profile screen.
export function identityOf(user: AuthUser | null) {
  const name = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Driver';
  const words = name.split(/[\s._-]+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
  return { name, initials };
}
