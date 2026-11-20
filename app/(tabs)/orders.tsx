import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import { C, STATUS_COLOR, STATUS_LABEL, money } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { orderCode, formatDateTime } from '../../src/lib/format';
import { useAuth } from '../../src/context/AuthContext';
import { Badge, Chip, Empty, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Skeleton } from '../../src/components/Skeleton';
import type { Order, OrderStatus } from '../../src/lib/types';

const FILTERS: { key: 'todos' | OrderStatus; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'preparando', label: 'Preparando' },
  { key: 'enviado', label: 'Enviados' },
  { key: 'entregado', label: 'Entregados' },
  { key: 'cancelado', label: 'Cancelados' },
];

export default function Orders() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | OrderStatus>('todos');

  const loading = !!user && loadedUid !== user.uid;

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'orders'), where('userId', '==', uid)),
      (snap) => {
        setOrders(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Order))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
        setLoadedUid(uid);
      },
      () => setLoadedUid(uid)
    );
    return unsub;
  }, [user?.uid]);

  const visible = useMemo(
    () => (filter === 'todos' ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: orders.length };
    orders.forEach((order) => {
      map[order.status] = (map[order.status] || 0) + 1;
    });
    return map;
  }, [orders]);

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Pedidos" subtitle="Tu historial de compras en KESUUBIT." />
        <Empty
          icon="receipt-outline"
          title="Inicia sesión para ver tus pedidos"
          text="Con tu cuenta guardamos el estado de cada compra y te avisamos cuando avance."
          action={{ label: 'Iniciar sesión', onPress: () => router.push('/login') }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Pedidos"
        subtitle="Sigue el estado de cada compra, desde la confirmación hasta la entrega."
      />

      {orders.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
          {FILTERS.filter((item) => item.key === 'todos' || counts[item.key]).map((item) => (
            <Chip
              key={item.key}
              label={`${item.label}${counts[item.key] ? ` (${counts[item.key]})` : ''}`}
              on={filter === item.key}
              color={item.key === 'todos' ? C.pink : STATUS_COLOR[item.key]}
              onPress={() => setFilter(item.key)}
            />
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={{ gap: space.md }}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                backgroundColor: C.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: C.border,
                padding: space.lg,
                gap: space.sm,
              }}
            >
              <Skeleton width="38%" height={12} />
              <Skeleton width="62%" height={18} />
              <Skeleton width="48%" height={12} />
            </View>
          ))}
        </View>
      ) : !orders.length ? (
        <Empty
          icon="receipt-outline"
          title="Todavía no hay pedidos"
          text="Cuando confirmes tu primera compra, aparecerá aquí con su estado en tiempo real."
          action={{ label: 'Explorar catálogo', onPress: () => router.push('/') }}
        />
      ) : !visible.length ? (
        <Empty
          icon="funnel-outline"
          title="Nada en este estado"
          text="Prueba con otro filtro para ver el resto de tus pedidos."
          action={{ label: 'Ver todos', onPress: () => setFilter('todos') }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {visible.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push(`/order/${order.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`Pedido ${orderCode(order)}, ${STATUS_LABEL[order.status]}`}
              style={({ pressed }) => [
                {
                  backgroundColor: C.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: pressed ? C.borderStrong : C.border,
                  padding: space.lg,
                  gap: space.sm,
                },
                { cursor: 'pointer' } as any,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text style={{ flex: 1, color: C.ink, fontWeight: weight.black, fontSize: typeScale.bodyLg }}>
                  {orderCode(order)}
                </Text>
                <Badge label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} soft />
              </View>

              <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                {formatDateTime(order.createdAt)} · {order.items.length} producto{order.items.length === 1 ? '' : 's'}
              </Text>

              <Text numberOfLines={2} style={{ color: C.inkSoft, fontSize: typeScale.body, lineHeight: 20 }}>
                {order.items.map((item) => `${item.qty} × ${item.name}`).join(' · ')}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 2,
                  paddingTop: space.sm,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                }}
              >
                <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
                  {money(order.total)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.small }}>
                    Detalle y recibo
                  </Text>
                  <Ionicons name="chevron-forward" size={15} color={C.pink} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
