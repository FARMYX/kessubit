import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
// @ts-ignore getReactNativePersistence existe en el bundle de React Native
import { getReactNativePersistence } from 'firebase/auth';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { reportStartupIssue } from './startupErrors';

const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missing = (Object.keys(cfg) as (keyof typeof cfg)[]).filter((key) => !cfg[key]);
if (missing.length) {
  reportStartupIssue('configuración Firebase', `Faltan variables: ${missing.join(', ')}`);
}

// Placeholders keep module evaluation alive so the diagnostic screen can be
// rendered instead of losing the process to an uncaught Firebase exception.
const safeCfg = {
  apiKey: cfg.apiKey || 'kesuubit-sin-api-key',
  authDomain: cfg.authDomain || 'kesuubit-sin-dominio.firebaseapp.com',
  projectId: cfg.projectId || 'kesuubit-sin-proyecto',
  storageBucket: cfg.storageBucket || 'kesuubit-sin-bucket.appspot.com',
  messagingSenderId: cfg.messagingSenderId || '000000000000',
  appId: cfg.appId || '1:000000000000:android:0000000000000000000000',
};

export let auth: Auth = null as any;
export let db: Firestore = null as any;

try {
  const app = getApps().length ? getApp() : initializeApp(safeCfg);

  const makeAuth = () => {
    if (Platform.OS === 'web') return getAuth(app);
    try {
      return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      return getAuth(app); // ya inicializado (fast refresh)
    }
  };

  auth = makeAuth();
  db = getFirestore(app);
} catch (error) {
  reportStartupIssue('inicialización Firebase', error);
}
