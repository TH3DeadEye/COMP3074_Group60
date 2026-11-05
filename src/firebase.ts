import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { Platform } from 'react-native';

import googleServices from '../google-services.json';

// The Firebase project's config comes from google-services.json, so there's nothing to copy
// into an .env file. The JS SDK only needs the API key, project and app IDs from it. These
// values identify the project; they aren't secrets (access is controlled by Firebase rules).
const client = googleServices.client[0];
const firebaseConfig = {
  apiKey: client.api_key[0].current_key,
  authDomain: `${googleServices.project_info.project_id}.firebaseapp.com`,
  projectId: googleServices.project_info.project_id,
  storageBucket: googleServices.project_info.storage_bucket,
  messagingSenderId: googleServices.project_info.project_number,
  appId: client.client_info.mobilesdk_app_id,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  // The React Native persistence (AsyncStorage) keeps drivers signed in across restarts.
  // It's native-only, so web falls back to the default browser persistence.
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh re-runs this module, and initializeAuth throws if Auth already exists.
    return getAuth(app);
  }
}

export const auth = createAuth();
