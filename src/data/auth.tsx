import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { auth } from '@/firebase';

// A plain snapshot of the signed-in user. Firebase mutates its User object in place (e.g. when
// the display name changes), which React can't see, so the UI works with this copy instead.
export type AuthUser = { uid: string; email: string | null; displayName: string | null };

const toAuthUser = (u: User): AuthUser => ({ uid: u.uid, email: u.email, displayName: u.displayName });

// Shown once, right after the driver signs in or creates an account (not on every app launch).
export type Welcome = { firstName: string; isNew: boolean };

type AuthState = {
  user: AuthUser | null;
  // True until Firebase has told us whether a saved session exists.
  initializing: boolean;
  welcome: Welcome | null;
  dismissWelcome: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  // Set just before a sign-in/sign-up so the auth listener knows the next user is a fresh login
  // rather than a session restored at launch.
  const pendingWelcome = useRef<{ isNew: boolean; name?: string } | null>(null);

  useEffect(() => {
    // Fires once on launch with the restored session (or null), then on every sign in/out.
    return onAuthStateChanged(auth, (next) => {
      setUser(next ? toAuthUser(next) : null);
      setInitializing(false);
      const pending = pendingWelcome.current;
      if (next && pending) {
        pendingWelcome.current = null;
        // Same update as setUser, so the welcome is on screen the moment the app unlocks.
        setWelcome({ firstName: firstNameOf(pending.name ?? identityOf(toAuthUser(next)).name), isNew: pending.isNew });
      }
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      welcome,
      dismissWelcome: () => setWelcome(null),
      signIn: async (email, password) => {
        pendingWelcome.current = { isNew: false };
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (e) {
          pendingWelcome.current = null;
          throw e;
        }
      },
      signUp: async (name, email, password) => {
        pendingWelcome.current = { isNew: true, name: name.trim() };
        let created: User;
        try {
          ({ user: created } = await createUserWithEmailAndPassword(auth, email.trim(), password));
        } catch (e) {
          pendingWelcome.current = null;
          throw e;
        }
        // The account exists and the user is signed in at this point. Saving the name is a
        // nicety: if it fails, the profile just falls back to the email.
        try {
          await updateProfile(created, { displayName: name.trim() });
          setUser(toAuthUser(created));
        } catch {}
      },
      signOut: async () => {
        setWelcome(null);
        await firebaseSignOut(auth);
      },
    }),
    [user, initializing, welcome],
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

export function signUpErrorMessage(error: unknown): string {
  const code = errorCode(error);
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'That password is too weak. Use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your signal and try again.';
    case 'auth/operation-not-allowed':
      return NOT_ENABLED;
    default:
      if (__DEV__) console.warn('Sign-up failed:', code || error);
      return "Couldn't create the account. Try again.";
  }
}

// "Jordan Rivera" -> "Jordan", "test.driver" -> "Test".
function firstNameOf(name: string) {
  const first = name.split(/[\s._-]+/).find(Boolean) ?? name;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// Name and initials for the profile screen.
export function identityOf(user: AuthUser | null) {
  const name = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Driver';
  const words = name.split(/[\s._-]+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
  return { name, initials };
}
