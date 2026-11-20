import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Profile } from '../lib/types';

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (n: string, e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  reset: (e: string) => Promise<void>;
  toggleFav: (id: string) => Promise<void>;
  updatePhoto: (dataUrl: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);

const mapProfile = (uid: string, user: User, data?: Record<string, any> | null): Profile => ({
  uid,
  email: data?.email || user.email || '',
  name: data?.name || user.displayName || 'Cliente KESUUBIT',
  role: data?.role === 'admin' ? 'admin' : 'client',
  favorites: Array.isArray(data?.favorites) ? data.favorites : [],
  photo: data?.photo,
  pushToken: data?.pushToken,
  createdAt: data?.createdAt,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = () => {};
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      unsubProfile();
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      unsubProfile = onSnapshot(
        doc(db, 'users', nextUser.uid),
        (snap) => {
          setProfile(mapProfile(nextUser.uid, nextUser, snap.exists() ? snap.data() : null));
          setLoading(false);
        },
        () => {
          setProfile(mapProfile(nextUser.uid, nextUser, null));
          setLoading(false);
        }
      );
    });
    return () => {
      unsub();
      unsubProfile();
    };
  }, []);

  const value: Ctx = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    register: async (name, email, password) => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name });
      await setDoc(doc(db, 'users', credential.user.uid), {
        email: email.trim(),
        name,
        role: 'client',
        favorites: [],
        createdAt: serverTimestamp(),
      });
    },
    logout: () => signOut(auth),
    reset: (email) => sendPasswordResetEmail(auth, email.trim()),
    updatePhoto: async (photo) => {
      if (user) await updateDoc(doc(db, 'users', user.uid), { photo });
    },
    updateName: async (name) => {
      const clean = name.trim();
      if (!user || !clean) return;
      await updateDoc(doc(db, 'users', user.uid), { name: clean });
      await updateProfile(user, { displayName: clean });
    },
    toggleFav: async (id) => {
      if (!user || !profile) return;
      const has = profile.favorites?.includes(id);
      await updateDoc(doc(db, 'users', user.uid), {
        favorites: has ? arrayRemove(id) : arrayUnion(id),
      });
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
