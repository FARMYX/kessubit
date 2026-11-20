import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { notify } from './notify';
import { useAuth } from '../context/AuthContext';

// Avisa al admin de pedidos nuevos y al cliente de cambios de estado de sus pedidos.
export function useOrderNotifications() {
  const { user, profile } = useAuth();
  useEffect(() => {
    if (!user || !profile) return;
    const q = profile.role === 'admin'
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('userId', '==', user.uid));
    let first = true;
    return onSnapshot(q, (snap) => {
      if (first) { first = false; return; }
      snap.docChanges().forEach((ch) => {
        const o: any = ch.doc.data();
        if (profile.role === 'admin' && ch.type === 'added')
          notify('Nuevo pedido', `${o.userName || o.userEmail} pidió ${o.items?.length || 0} producto(s).`);
        if (profile.role !== 'admin' && ch.type === 'modified')
          notify('Tu pedido cambió', `Ahora está: ${o.status}.`);
      });
    });
  }, [user, profile]);
}
