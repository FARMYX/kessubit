import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { router } from 'expo-router';
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { haptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import {
  ensurePermission,
  hasNotificationPermission,
  notify,
  registerPushToken,
  subscribeToNotificationTaps,
} from '../lib/notify';
import type { AppNotification } from '../lib/types';

type Ctx = {
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  permission: boolean;
  enablePush: () => Promise<{ granted: boolean; token: string | null }>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsCtx = createContext<Ctx>(null as any);
export const useNotifications = () => useContext(NotificationsCtx);

const byNewest = (a: AppNotification, b: AppNotification) =>
  (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);

const toNotification = (id: string, data: Record<string, any>) =>
  ({ id, ...data } as AppNotification);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const [userNotifications, setUserNotifications] = useState<AppNotification[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AppNotification[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [permission, setPermission] = useState(false);
  const permissionRef = useRef(false);
  const registeredFor = useRef<string | null>(null);

  const announce = useCallback((item: AppNotification, audience: 'user' | 'admin') => {
    const isCreated = item.type === 'order_created';
    const isCancelled = item.type === 'order_cancelled';

    if (audience === 'admin') {
      playSound('chime');
      haptic.medium();
    } else if (isCreated) {
      playSound('success');
      haptic.success();
    } else {
      playSound('chime');
      if (isCancelled) haptic.warning();
      else haptic.light();
    }

    toastRef.current.show({
      kind: isCancelled ? 'error' : audience === 'admin' ? 'info' : isCreated ? 'success' : 'info',
      title: item.title,
      message: item.body,
      action: item.orderId
        ? { label: 'Ver pedido', onPress: () => router.push(`/order/${item.orderId}` as any) }
        : { label: 'Ver avisos', onPress: () => router.push('/notifications' as any) },
    });

    if (permissionRef.current) {
      notify(item.title, item.body, {
        data: {
          orderId: item.orderId,
          url: item.orderId ? `/order/${item.orderId}` : '/notifications',
        },
      });
    }
  }, []);

  // Permission is read, never requested automatically.
  useEffect(() => {
    let alive = true;
    hasNotificationPermission().then((granted) => {
      if (!alive) return;
      setPermission(granted);
      permissionRef.current = granted;
    });
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  // Personal notifications.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let first = true;
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        setUserNotifications(snap.docs.map((d) => toNotification(d.id, d.data())).sort(byNewest));
        setLoadedUid(uid);
        if (!first) {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const item = toNotification(change.doc.id, change.doc.data());
            if (item.type === 'test' || item.type === 'welcome') return;
            announce(item, 'user');
          });
        }
        first = false;
      },
      () => setLoadedUid(uid)
    );
    return unsub;
  }, [user?.uid, announce]);

  // Admin inbox (audience documents, read state stored per admin).
  useEffect(() => {
    if (!isAdmin) return;
    let first = true;
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('audience', '==', 'admin')),
      (snap) => {
        setAdminNotifications(snap.docs.map((d) => toNotification(d.id, d.data())).sort(byNewest));
        if (!first) {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            announce(toNotification(change.doc.id, change.doc.data()), 'admin');
          });
        }
        first = false;
      },
      () => {}
    );
    return unsub;
  }, [isAdmin, announce]);

  // Open the linked order when a system notification is tapped.
  useEffect(() => subscribeToNotificationTaps((url) => router.push(url as any)), []);

  // Keep the Expo push token in the profile once permission exists.
  useEffect(() => {
    if (!user || !permission || !profile) return;
    if (registeredFor.current === user.uid) return;
    registeredFor.current = user.uid;
    (async () => {
      const token = await registerPushToken();
      if (!token || token === profile.pushToken) return;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          pushToken: token,
          pushTokenUpdatedAt: serverTimestamp(),
        });
      } catch {
        // Rules may not allow it yet; harmless for local notifications.
      }
    })();
  }, [user, permission, profile]);

  const loading = !!user && loadedUid !== user.uid;
  const signedIn = !!user;

  const notifications = useMemo(() => {
    const personal = signedIn ? userNotifications : [];
    const admin = isAdmin ? adminNotifications : [];
    const merged = isAdmin ? [...personal, ...admin] : personal;
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).sort(byNewest);
  }, [userNotifications, adminNotifications, isAdmin, signedIn]);

  const unread = useMemo(
    () =>
      notifications.filter((item) =>
        item.audience === 'admin'
          ? !(item.readBy || []).includes(user?.uid || '')
          : !item.read
      ).length,
    [notifications, user?.uid]
  );

  const markRead = useCallback(
    async (id: string) => {
      const item = notifications.find((n) => n.id === id);
      if (!item || !user) return;
      try {
        if (item.audience === 'admin') {
          await updateDoc(doc(db, 'notifications', id), { readBy: arrayUnion(user.uid) });
        } else {
          await updateDoc(doc(db, 'notifications', id), {
            read: true,
            readAt: serverTimestamp(),
          });
        }
      } catch {}
    },
    [notifications, user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const pending = notifications.filter((item) =>
      item.audience === 'admin' ? !(item.readBy || []).includes(user.uid) : !item.read
    );
    if (!pending.length) return;
    try {
      const batch = writeBatch(db);
      pending.forEach((item) => {
        batch.update(
          doc(db, 'notifications', item.id),
          item.audience === 'admin'
            ? { readBy: arrayUnion(user.uid) }
            : { read: true, readAt: serverTimestamp() }
        );
      });
      await batch.commit();
    } catch {}
  }, [notifications, user]);

  const enablePush = useCallback(async () => {
    const granted = await ensurePermission();
    setPermission(granted);
    permissionRef.current = granted;
    if (!granted) return { granted: false, token: null };

    const token = await registerPushToken();
    if (token && user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          pushToken: token,
          pushTokenUpdatedAt: serverTimestamp(),
        });
        registeredFor.current = user.uid;
      } catch {}
    }
    return { granted: true, token };
  }, [user]);

  const value = useMemo<Ctx>(
    () => ({ notifications, unread, loading, permission, enablePush, markRead, markAllRead }),
    [notifications, unread, loading, permission, enablePush, markRead, markAllRead]
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}
