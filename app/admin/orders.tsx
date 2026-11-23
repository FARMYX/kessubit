import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import {
  C,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  money,
  paymentLabel,
  paymentNeedsProof,
  paymentStatusOf,
} from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { formatDateTime, orderCode } from '../../src/lib/format';
import { Badge, Btn, Chip, Empty, Field, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { NotificationBell } from '../../src/components/NotificationBell';
import { BackToStore } from '../../src/components/BackToStore';
import { Skeleton } from '../../src/components/Skeleton';
import { useToast } from '../../src/context/ToastContext';
import { verifyPayment } from '../../src/lib/orders';
import { playSound } from '../../src/lib/sound';
import { haptic } from '../../src/lib/haptics';
import { printReceipt } from '../../src/lib/receipt';
import type { Order, OrderStatus, PaymentProof } from '../../src/lib/types';

type OrderFilter = 'todos' | 'pagos' | 'sin_comprobante' | OrderStatus;

const FILTERS: { key: OrderFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pagos', label: 'Por verificar' },
  { key: 'sin_comprobante', label: 'Sin comprobante' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'preparando', label: 'Preparando' },
  { key: 'enviado', label: 'Enviados' },
  { key: 'entregado', label: 'Entregados' },
  { key: 'cancelado', label: 'Cancelados' },
];

const needsPaymentReview = (order: Order) =>
  paymentNeedsProof(order.paymentMethod) && paymentStatusOf(order) === 'en_revision';

const missingProof = (order: Order) =>
  paymentNeedsProof(order.paymentMethod) &&
  ['sin_comprobante', 'rechazado'].includes(paymentStatusOf(order));

export default function AdminOrders() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>(() =>
    params.filter === 'pagos' ? 'pagos' : 'todos'
  );
  const [search, setSearch] = useState('');
  const [proofs, setProofs] = useState<Record<string, PaymentProof>>({});
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'paymentProofs'),
      (snap) => {
        const map: Record<string, PaymentProof> = {};
        snap.docs.forEach((document) => {
          map[document.id] = { orderId: document.id, ...(document.data() as Omit<PaymentProof, 'orderId'>) };
        });
        setProofs(map);
      },
      () => setProofs({})
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        setOrders(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Order))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: orders.length, pagos: 0, sin_comprobante: 0 };
    orders.forEach((order) => {
      map[order.status] = (map[order.status] || 0) + 1;
      if (needsPaymentReview(order)) map.pagos += 1;
      if (missingProof(order)) map.sin_comprobante += 1;
    });
    return map;
  }, [orders]);

  const pendingPayments = useMemo(() => orders.filter(needsPaymentReview), [orders]);
  const withoutProof = useMemo(() => orders.filter(missingProof), [orders]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders
      .filter((order) =>
        filter === 'todos'
          ? true
          : filter === 'pagos'
            ? needsPaymentReview(order)
            : filter === 'sin_comprobante'
              ? missingProof(order)
              : order.status === filter
      )
      .filter((order) =>
        term
          ? `${orderCode(order)} ${order.userName || ''} ${order.userEmail || ''} ${order.address || ''}`
              .toLowerCase()
              .includes(term)
          : true
      );
  }, [orders, filter, search]);

  const approveInline = async (order: Order) => {
    setActionBusy(true);
    try {
      await verifyPayment(order.id, 'verificado');
      haptic.success();
      playSound('verify');
      toast.success('Pago verificado', orderCode(order));
    } catch (e: any) {
      haptic.error();
      toast.error('No se pudo verificar', e?.message || 'Revisa tu conexión.');
    } finally {
      setActionBusy(false);
    }
  };

  const confirmRejectInline = async () => {
    if (!rejectOrder) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Falta el motivo', 'Escribe por qué se rechaza el comprobante.');
      return;
    }
    setActionBusy(true);
    try {
      await verifyPayment(rejectOrder.id, 'rechazado', reason);
      haptic.warning();
      toast.info('Comprobante rechazado', orderCode(rejectOrder));
      setRejectOrder(null);
      setRejectReason('');
    } catch (e: any) {
      haptic.error();
      toast.error('No se pudo rechazar', e?.message || 'Revisa tu conexión.');
    } finally {
      setActionBusy(false);
    }
  };

  const openReceipt = (order: Order) => {
    const opened = printReceipt(order);
    if (!opened) {
      toast.info('Recibo en la web', 'Abre el panel desde el navegador para imprimir o guardar el PDF.');
      return;
    }
    playSound('receipt');
    haptic.tap();
  };

  return (
    <Screen>
      <ScreenHeader
        title="Pedidos"
        eyebrow={orders.length ? `${orders.length} en total` : undefined}
        subtitle="Abre un pedido para cambiar su estado y avisar al cliente."
        right={
          <>
            <BackToStore />
            <NotificationBell />
          </>
        }
      />

      <Field
        placeholder="Buscar por código, cliente o dirección"
        value={search}
        onChangeText={setSearch}
        containerStyle={{ marginBottom: space.sm }}
      />

      {pendingPayments.length > 0 && filter !== 'pagos' ? (
        <Pressable
          onPress={() => setFilter('pagos')}
          accessibilityRole="button"
          accessibilityLabel={`${pendingPayments.length} comprobantes por verificar`}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              padding: space.md,
              marginBottom: space.sm,
              borderRadius: radius.md,
              backgroundColor: pressed ? C.blueSoft : C.surfaceAlt,
              borderWidth: 1,
              borderColor: C.blueSoft,
            },
            { cursor: 'pointer' } as any,
          ]}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.blueSoft,
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color={C.blue} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
              {pendingPayments.length} comprobante{pendingPayments.length === 1 ? '' : 's'} por verificar
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.small }}>
              Revisa el monto y confirma el pago del cliente.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.blue} />
        </Pressable>
      ) : null}

      {withoutProof.length > 0 && filter !== 'sin_comprobante' ? (
        <Pressable
          onPress={() => setFilter('sin_comprobante')}
          accessibilityRole="button"
          accessibilityLabel={`${withoutProof.length} pedidos sin comprobante`}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              padding: space.md,
              marginBottom: space.sm,
              borderRadius: radius.md,
              backgroundColor: pressed ? C.yellowSoft : C.surfaceAlt,
              borderWidth: 1,
              borderColor: C.yellowDeep,
            },
            { cursor: 'pointer' } as any,
          ]}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.yellowSoft,
            }}
          >
            <Ionicons name="camera-outline" size={18} color={C.yellowDeep} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
              {withoutProof.length} sin comprobante
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.small }}>
              Clientes que pagaron con QR o transferencia y aún no suben la captura.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.yellowDeep} />
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
        {FILTERS.filter((item) => item.key === 'todos' || item.key === 'pagos' || counts[item.key]).map((item) => (
          <Chip
            key={item.key}
            label={`${item.label}${counts[item.key] ? ` (${counts[item.key]})` : ''}`}
            on={filter === item.key}
            color={
              item.key === 'todos'
                ? C.pink
                : item.key === 'pagos'
                  ? C.blue
                  : item.key === 'sin_comprobante'
                    ? C.yellowDeep
                    : STATUS_COLOR[item.key]
            }
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>

      {loading ? (
        <View style={{ gap: space.sm }}>
          {[0, 1, 2, 3].map((index) => (
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
              <Skeleton width="46%" height={12} />
              <Skeleton width="70%" height={10} />
              <Skeleton width="30%" height={16} />
            </View>
          ))}
        </View>
      ) : !orders.length ? (
        <Empty
          icon="receipt-outline"
          title="No hay pedidos todavía"
          text="Cuando un cliente confirme una compra, aparecerá aquí con su estado."
        />
      ) : !visible.length ? (
        <Empty
          icon={filter === 'pagos' ? 'checkmark-done-outline' : 'funnel-outline'}
          title={filter === 'pagos' ? 'No hay pagos por verificar' : 'Nada coincide'}
          text={
            filter === 'pagos'
              ? 'Cuando un cliente suba su comprobante, aparecerá aquí para confirmar el pago.'
              : 'Prueba con otro estado o limpia la búsqueda.'
          }
          action={{
            label: 'Ver todos',
            onPress: () => {
              setFilter('todos');
              setSearch('');
            },
          }}
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {visible.map((order) => {
            const review = needsPaymentReview(order);
            const proof = proofs[order.id];
            const status = paymentStatusOf(order);
            return (
              <View
                key={order.id}
                style={{
                  backgroundColor: C.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: review ? C.blue : C.border,
                  padding: space.lg,
                  gap: space.sm,
                }}
              >
                <Pressable
                  onPress={() => router.push(`/order/${order.id}?from=admin` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`Pedido ${orderCode(order)}, ${STATUS_LABEL[order.status]}`}
                  style={({ pressed }) => [
                    { gap: space.sm, opacity: pressed ? 0.7 : 1 },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                    <Text style={{ flex: 1, color: C.ink, fontWeight: weight.black, fontSize: typeScale.bodyLg }}>
                      {orderCode(order)}
                    </Text>
                    {paymentNeedsProof(order.paymentMethod) ? (
                      <Badge label={PAYMENT_STATUS_LABEL[status]} color={PAYMENT_STATUS_COLOR[status]} soft />
                    ) : null}
                    <Badge label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} soft />
                  </View>

                  <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.body }}>
                    {order.userName || 'Cliente'} · {order.userEmail}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                    {formatDateTime(order.createdAt)} · {order.items?.length || 0} producto(s) ·{' '}
                    {order.deliveryType === 'pickup' ? 'Retiro en tienda' : 'Envío'} ·{' '}
                    {order.paymentMethod ? paymentLabel(order.paymentMethod) : 'Pago por coordinar'}
                  </Text>
                  <Text numberOfLines={1} style={{ color: C.muted, fontSize: typeScale.caption }}>
                    {order.address}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                        Gestionar
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={C.pink} />
                    </View>
                  </View>
                </Pressable>

                {review && proof ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      flexWrap: 'wrap',
                      padding: space.sm,
                      borderRadius: radius.md,
                      backgroundColor: C.blueSoft,
                    }}
                  >
                    <Ionicons name="receipt-outline" size={16} color={C.blue} />
                    <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, minWidth: 140 }}>
                      Declarado {money(Number(proof.amount || order.paymentAmount || order.total))}
                      {Math.abs(Number(proof.amount || 0) - Number(order.total)) > 0.01
                        ? ' · Monto distinto al pedido'
                        : ''}
                    </Text>
                    <Btn
                      title="Verificar"
                      icon="checkmark"
                      compact
                      onPress={() => approveInline(order)}
                      loading={actionBusy}
                    />
                    <Btn
                      title="Rechazar"
                      kind="dangerSoft"
                      compact
                      onPress={() => {
                        setRejectOrder(order);
                        setRejectReason('');
                      }}
                    />
                  </View>
                ) : null}

                {missingProof(order) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="camera-outline" size={14} color={C.yellowDeep} />
                    <Text style={{ color: C.yellowDeep, fontSize: typeScale.small, fontWeight: weight.semibold }}>
                      Esperando comprobante del cliente
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Pressable
                    onPress={() => openReceipt(order)}
                    accessibilityRole="button"
                    accessibilityLabel={`Imprimir recibo de ${orderCode(order)}`}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingVertical: 5,
                        opacity: pressed ? 0.65 : 1,
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Ionicons name="print-outline" size={15} color={C.pink} />
                    <Text style={{ color: C.pink, fontSize: typeScale.small, fontWeight: weight.bold }}>
                      Recibo
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={!!rejectOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectOrder(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: C.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: space.lg,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: C.card,
              borderRadius: radius.lg,
              padding: space.lg,
              gap: space.sm,
            }}
          >
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3 }}>
              Rechazar comprobante
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.small }}>
              {rejectOrder ? orderCode(rejectOrder) : ''} · El cliente podrá subir uno nuevo.
            </Text>
            <Field
              label="Motivo del rechazo"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ej. El monto no coincide con el pedido."
              multiline
              containerStyle={{ marginBottom: 0 }}
            />
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Btn
                title="Confirmar rechazo"
                kind="dangerSoft"
                onPress={confirmRejectInline}
                loading={actionBusy}
              />
              <Btn title="Cancelar" kind="ghost" onPress={() => setRejectOrder(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
