import type { Persistence } from 'firebase/auth';

// Firebase ships getReactNativePersistence at runtime (Metro resolves the "react-native"
// export), but its package.json lists the generic "types" entry first, so TypeScript never
// sees it. This declares it for the compiler only. Remove it once Firebase fixes the typings.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
