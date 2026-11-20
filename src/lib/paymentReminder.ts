import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '../context/AuthContext';
import { paymentNeedsProof, paymentStatusOf } from './theme';
import type { Order } from './types';

const stamp = (value: any) =>
  value?.seconds ? value.seconds * 1000 : value instanceof Date ? value.getTime() : Number(value) || 0;

/**
 * Pedido del usuario que todavía necesita comprobante. Es un recordatorio:
 * nunca bloquea la navegación ni el catálogo.
 */
export function usePendingProofOrder() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'orders'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const pending = snap.docs
          .map((document) => ({ id: document.id, ...(document.data() as Omit<Order, 'id'>) }))
          .filter((item) => {
            if (item.status === 'cancelado') return false;
            if (!paymentNeedsProof(item.paymentMethod)) return false;
            return ['sin_comprobante', 'rechazado'].includes(paymentStatusOf(item));
          })
          .sort((a, b) => stamp(b.createdAt) - stamp(a.createdAt));
        setOrder(pending[0] || null);
      },
      () => setOrder(null)
    );
  }, [uid]);

  return uid ? order : null;
}
