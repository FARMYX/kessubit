import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import {
  C,
  DELIVERY_LABEL,
  PAYMENT_ICON,
  PAYMENT_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_ORDER,
  money,
  paymentNeedsProof,
  paymentStatusOf,
} from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { useResponsive } from '../../src/lib/responsive';
import { formatDateTime, orderCode } from '../../src/lib/format';
import { useAuth } from '../../src/context/AuthContext';
import { useProducts } from '../../src/context/ProductsContext';
import { useCart } from '../../src/context/CartContext';
import { useToast } from '../../src/context/ToastContext';
import {
  cancelOrder,
  submitPaymentProof,
  updateOrderStatus,
  verifyPayment,
} from '../../src/lib/orders';
import { pickImage } from '../../src/lib/image';
import { confirmAction } from '../../src/lib/confirm';
import { haptic } from '../../src/lib/haptics';
import { playSound } from '../../src/lib/sound';
import { Badge, Btn, Card, Divider, Empty, Field, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { ProductImage } from '../../src/components/ProductImage';
import { OrderTimeline } from '../../src/components/OrderTimeline';
import { Skeleton } from '../../src/components/Skeleton';
import type { Order, OrderStatus, PaymentProof } from '../../src/lib/types';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { user, isAdmin } = useAuth();
  const { getProduct } = useProducts();
  const { add } = useCart();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<OrderStatus | 'cancel' | 'reorder' | null>(null);
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [proofFullscreen, setProofFullscreen] = useState(false);

  const loading = !!id && loadedId !== id;

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, 'orders', id),
      (snap) => {
        if (!snap.exists()) {
          setMissing(true);
          setOrder(null);
        } else {
          setOrder({ id: snap.id, ...snap.data() } as Order);
          setMissing(false);
        }
        setLoadedId(id);
      },
      () => {
        setMissing(true);
        setLoadedId(id);
      }
    );
    return unsub;
  }, [id]);

  // El comprobante vive en `paymentProofs/{orderId}`. Si todavía no existe,
  // el snapshot simplemente llega vacío.
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, 'paymentProofs', id),
      (snap) => {
        setProof(snap.exists() ? ({ orderId: snap.id, ...snap.data() } as PaymentProof) : null);
      },
      () => setProof(null)
    );
    return unsub;
  }, [id]);

  const paymentStatus = order ? paymentStatusOf(order) : 'no_requiere';
  const requiresProof = !!order && paymentNeedsProof(order.paymentMethod);
  const isOwner = !!order && !!user && order.userId === user.uid;
  const declaredAmount = Number(proof?.amount || order?.paymentAmount || 0);
  const amountMismatch = !!order && !!proof && Math.abs(declaredAmount - Number(order.total)) > 0.01;

  const canCancel = useMemo(
    () =>
      !!order &&
      !!user &&
      order.userId === user.uid &&
      (order.status === 'pendiente' || order.status === 'preparando'),
    [order, user]
  );

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Pedido" back />
        <Card style={{ gap: space.md }}>
          <Skeleton width="42%" height={20} />
          <Skeleton width="64%" height={12} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Card>
      </Screen>
    );
  }

  if (missing || !order) {
    return (
      <Screen>
        <ScreenHeader title="Pedido" back />
        <Empty
          icon="help-circle-outline"
          title="No encontramos este pedido"
          text="Puede que se haya eliminado o que no tengas acceso con esta cuenta."
          action={{ label: 'Ver mis pedidos', onPress: () => router.replace('/orders') }}
        />
      </Screen>
    );
  }

  const changeStatus = async (status: OrderStatus) => {
    if (!user || status === order.status) return;
    setBusy(status);
    try {
      await updateOrderStatus(order.id, status);
      haptic.success();
      playSound('chime');
      toast.success('Estado actualizado', `Ahora está ${STATUS_LABEL[status].toLowerCase()}.`);
    } catch (e: any) {
      haptic.error();
      toast.error('No se pudo actualizar', e?.message || 'Revisa tu conexión.');
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => {
    if (!user) return;
    confirmAction(
      'Cancelar pedido',
      'El stock volverá a la tienda y el pedido quedará cancelado. ¿Continuar?',
      async () => {
        setBusy('cancel');
        try {
          await cancelOrder(order.id);
          haptic.warning();
          toast.info('Pedido cancelado', 'El stock volvió a la tienda.');
        } catch (e: any) {
          haptic.error();
          toast.error('No se pudo cancelar', e?.message || 'Revisa tu conexión.');
        } finally {
          setBusy(null);
        }
      },
      'Sí, cancelar'
    );
  };

  const reorder = () => {
    setBusy('reorder');
    let added = 0;
    order.items.forEach((item) => {
      const product = getProduct(item.id);
      if (!product) return;
      if (add(product, item.qty)) added += 1;
    });
    setBusy(null);
    if (!added) {
      toast.error('No pudimos añadirlo', 'Puede que esos productos ya no estén disponibles.');
      return;
    }
    playSound('pop');
    haptic.success();
    toast.show({
      kind: 'success',
      title: 'Añadido al carrito',
      message: `${added} producto${added === 1 ? '' : 's'} de ${orderCode(order)}.`,
      action: { label: 'Ver carrito', onPress: () => router.push('/cart') },
    });
  };

  const amountValue = () => {
    const parsed = Number(String(amountInput).replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return Number(order.paymentAmount || order.total);
  };

  const uploadProof = async () => {
    setProofBusy(true);
    try {
      const image = await pickImage(1000, false);
      if (!image) return;
      const amount = amountValue();
      await submitPaymentProof(order.id, image, amount);
      haptic.success();
      toast.success('Comprobante enviado', 'La tienda revisará tu pago y te avisará.');
    } catch (e: any) {
      haptic.error();
      const message =
        e?.message === 'permiso'
          ? 'Permite el acceso a tus fotos para subir la captura.'
          : e?.message || 'Revisa tu conexión e inténtalo de nuevo.';
      toast.error('No se pudo subir el comprobante', message);
    } finally {
      setProofBusy(false);
    }
  };

  const approvePayment = () => {
    confirmAction(
      'Verificar pago',
      `¿Confirmas que recibiste ${money(Number(order.paymentAmount || order.total))}? El cliente verá el pago como verificado.`,
      async () => {
        setProofBusy(true);
        try {
          await verifyPayment(order.id, 'verificado');
          haptic.success();
          playSound('verify');
          toast.success('Pago verificado', 'El cliente recibió el aviso.');
        } catch (e: any) {
          haptic.error();
          toast.error('No se pudo verificar', e?.message || 'Revisa tu conexión.');
        } finally {
          setProofBusy(false);
        }
      },
      'Sí, verificar'
    );
  };

  const rejectPayment = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Falta el motivo', 'Escribe por qué no se pudo confirmar el pago.');
      return;
    }
    setProofBusy(true);
    try {
      await verifyPayment(order.id, 'rechazado', reason);
      haptic.warning();
      toast.info('Comprobante rechazado', 'El cliente puede volver a subirlo.');
      setRejectOpen(false);
      setRejectReason('');
    } catch (e: any) {
      haptic.error();
      toast.error('No se pudo rechazar', e?.message || 'Revisa tu conexión.');
    } finally {
      setProofBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={orderCode(order)}
        eyebrow="Detalle del pedido"
        subtitle={`${formatDateTime(order.createdAt)} · ${order.items.length} producto${order.items.length === 1 ? '' : 's'}`}
        back
        right={
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Badge label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} soft />
            {requiresProof ? (
              <Badge
                label={PAYMENT_STATUS_LABEL[paymentStatus]}
                color={PAYMENT_STATUS_COLOR[paymentStatus]}
                soft
              />
            ) : null}
          </View>
        }
      />

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, width: '100%', gap: space.md }}>
          <Card style={{ gap: space.md }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Productos</Text>
            {order.items.map((item) => {
              const live = getProduct(item.id);
              return (
                <View key={item.id} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  <Pressable
                    onPress={() => live && router.push(`/product/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { cursor: live ? 'pointer' : 'default' } as any]}
                  >
                    <ProductImage product={live || { image: item.image, imageUrl: item.imageUrl }} width={64} height={64} />
                  </Pressable>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={2} style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                      {item.qty} × {money(item.price)}
                    </Text>
                  </View>
                  <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.body }}>
                    {money(item.price * item.qty)}
                  </Text>
                </View>
              );
            })}

            <Divider />

            <View style={{ gap: 8 }}>
              <SummaryRow label="Subtotal" value={money(order.subtotal ?? order.total)} />
              <SummaryRow
                label={order.deliveryType === 'pickup' ? 'Retiro en tienda' : 'Envío'}
                value={order.shipping ? money(order.shipping) : 'Gratis'}
                accent={!order.shipping ? C.green : undefined}
              />
            </View>

            <Divider />

            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>Total</Text>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3 }}>{money(order.total)}</Text>
            </View>
          </Card>

          <Card style={{ gap: space.md }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Entrega y pago</Text>
            <InfoRow
              icon={order.deliveryType === 'pickup' ? 'storefront-outline' : 'bicycle-outline'}
              label={order.deliveryType ? DELIVERY_LABEL[order.deliveryType] : 'Entrega'}
              value={order.address}
            />
            {order.phone ? <InfoRow icon="call-outline" label="Teléfono" value={order.phone} /> : null}
            {order.paymentMethod ? (
              <InfoRow icon="card-outline" label="Pago" value={PAYMENT_LABEL[order.paymentMethod]} />
            ) : null}
            {order.notes ? <InfoRow icon="document-text-outline" label="Notas" value={order.notes} /> : null}
          </Card>

          <Card style={{ gap: space.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.sm,
                flexWrap: 'wrap',
              }}
            >
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
                Pago
              </Text>
              <Badge
                label={PAYMENT_STATUS_LABEL[paymentStatus]}
                color={PAYMENT_STATUS_COLOR[paymentStatus]}
                soft
              />
            </View>

            <InfoRow
              icon={(order.paymentMethod && (PAYMENT_ICON[order.paymentMethod] as keyof typeof Ionicons.glyphMap)) || 'card-outline'}
              label="Método"
              value={order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : 'Por coordinar'}
            />

            {!requiresProof ? (
              <View style={paymentNote(C.greenSoft)}>
                <Ionicons name="checkmark-circle-outline" size={16} color={C.green} />
                <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                  Este método se coordina al confirmar el pedido y no necesita comprobante.
                </Text>
              </View>
            ) : null}

            {paymentStatus === 'verificado' ? (
              <View style={paymentNote(C.greenSoft)}>
                <Ionicons name="shield-checkmark" size={17} color={C.green} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    Pago verificado por la tienda
                  </Text>
                  <Text style={{ color: C.inkSoft, fontSize: typeScale.small }}>
                    {money(Number(order.paymentAmount || order.total))}
                    {order.verifiedByName ? ` · ${order.verifiedByName}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {paymentStatus === 'rechazado' ? (
              <View style={paymentNote(C.redSoft)}>
                <Ionicons name="alert-circle" size={17} color={C.red} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.red, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    Comprobante rechazado
                  </Text>
                  <Text style={{ color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                    {order.paymentRejectedReason || 'La tienda no pudo confirmar el pago.'}
                  </Text>
                </View>
              </View>
            ) : null}

            {requiresProof && proof ? (
              <View style={{ gap: space.sm }}>
                <Pressable
                  onPress={() => setProofFullscreen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ampliar comprobante de pago"
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      gap: space.md,
                      alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Image
                    source={{ uri: proof.image }}
                    style={{ width: 76, height: 76, borderRadius: radius.md, backgroundColor: C.surfaceAlt }}
                    contentFit="cover"
                    accessibilityLabel="Comprobante de pago enviado"
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      Comprobante enviado
                    </Text>
                    <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                      {money(declaredAmount)}
                      {proof.updatedAt ? ` · ${formatDateTime(proof.updatedAt)}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="expand-outline" size={12} color={C.pink} />
                      <Text style={{ color: C.pink, fontSize: typeScale.caption, fontWeight: weight.bold }}>
                        Ver ampliado
                      </Text>
                    </View>
                  </View>
                </Pressable>
                {amountMismatch ? <AmountMismatch declared={declaredAmount} total={Number(order.total)} /> : null}
              </View>
            ) : null}

            {requiresProof && isOwner && paymentStatus !== 'verificado' && order.status !== 'cancelado' ? (
              <View style={{ gap: space.sm }}>
                <Divider />
                <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                  {proof ? 'Reenviar comprobante' : 'Sube tu comprobante'}
                </Text>
                <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
                  Abre tu banca móvil, haz el pago y sube una captura donde se vea el monto y la fecha.
                </Text>
                <Field
                  label="Monto pagado (Bs)"
                  value={amountInput || String(order.paymentAmount || order.total || '')}
                  onChangeText={setAmountInput}
                  keyboardType="numeric"
                  placeholder={String(order.total)}
                  containerStyle={{ marginBottom: 0 }}
                />
                <Btn
                  title={proof ? 'Subir nuevo comprobante' : 'Subir comprobante'}
                  icon="cloud-upload-outline"
                  onPress={uploadProof}
                  loading={proofBusy}
                />
              </View>
            ) : null}

            {requiresProof && isOwner && paymentStatus === 'sin_comprobante' ? (
              <Text style={{ color: C.yellowDeep, fontSize: typeScale.small, fontWeight: weight.semibold }}>
                Falta tu comprobante para que la tienda confirme el pago.
              </Text>
            ) : null}
          </Card>

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Btn title="Volver a pedir" kind="soft" icon="refresh" onPress={reorder} loading={busy === 'reorder'} />
            {canCancel ? (
              <Btn
                title="Cancelar pedido"
                kind="dangerSoft"
                icon="close-circle-outline"
                onPress={cancel}
                loading={busy === 'cancel'}
              />
            ) : null}
          </View>
        </View>

        <View style={{ width: isDesktop ? 340 : '100%', gap: space.md }}>
          <Card style={{ gap: space.md }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Estado</Text>
            <OrderTimeline order={order} />
          </Card>

          {isAdmin ? (
            <Card style={{ gap: space.sm }}>
              <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>
                Acciones de administrador
              </Text>
              <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
                Cambiar el estado envía un aviso al cliente y guarda el historial.
              </Text>
              <View style={{ gap: 6, marginTop: 2 }}>
                {STATUS_ORDER.map((step) => {
                  const active = order.status === step.key;
                  const disabled = order.status === 'cancelado' || active || busy !== null;
                  return (
                    <Pressable
                      key={step.key}
                      disabled={disabled}
                      onPress={() => changeStatus(step.key as OrderStatus)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled, selected: active }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingVertical: 10,
                          paddingHorizontal: space.md,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: active ? C.pink : C.border,
                          backgroundColor: active ? C.pinkWash : pressed ? C.bgAlt : C.card,
                          opacity: disabled && !active ? 0.5 : 1,
                        },
                        { cursor: disabled ? 'default' : 'pointer' } as any,
                      ]}
                    >
                      <Ionicons name={step.icon as any} size={16} color={active ? C.pink : C.inkSoft} />
                      <Text
                        style={{
                          flex: 1,
                          color: active ? C.pink : C.ink,
                          fontWeight: active ? weight.bold : weight.medium,
                          fontSize: typeScale.body,
                        }}
                      >
                        {step.label}
                      </Text>
                      {busy === step.key ? (
                        <Ionicons name="hourglass-outline" size={15} color={C.muted} />
                      ) : active ? (
                        <Ionicons name="checkmark-circle" size={17} color={C.pink} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              {order.status !== 'cancelado' && order.status !== 'entregado' ? (
                <Btn
                  title="Cancelar y devolver stock"
                  kind="dangerSoft"
                  onPress={cancel}
                  loading={busy === 'cancel'}
                />
              ) : null}
            </Card>
          ) : null}

          {isAdmin && requiresProof ? (
            <Card style={{ gap: space.sm }}>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
                Verificar pago
              </Text>

              {proof ? (
                <Pressable
                  onPress={() => setProofFullscreen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Ampliar comprobante del cliente"
                  style={({ pressed }) => [
                    {
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: C.border,
                      overflow: 'hidden',
                      opacity: pressed ? 0.85 : 1,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Image
                    source={{ uri: proof.image }}
                    style={{
                      width: '100%',
                      height: 220,
                      backgroundColor: C.surfaceAlt,
                    }}
                    contentFit="contain"
                    accessibilityLabel="Comprobante de pago del cliente"
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      paddingVertical: 7,
                      backgroundColor: C.pinkWash,
                    }}
                  >
                    <Ionicons name="expand-outline" size={13} color={C.pink} />
                    <Text style={{ color: C.pink, fontSize: typeScale.caption, fontWeight: weight.bold }}>
                      Tocar para ampliar
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
                  El cliente todavía no subió el comprobante.
                </Text>
              )}

              {proof ? (
                <View style={{ gap: 4 }}>
                  <SummaryRow label="Monto declarado" value={money(declaredAmount)} />
                  <SummaryRow label="Total del pedido" value={money(order.total)} />
                  {amountMismatch ? (
                    <AmountMismatch declared={declaredAmount} total={Number(order.total)} />
                  ) : null}
                </View>
              ) : null}

              {paymentStatus === 'verificado' ? (
                <View style={paymentNote(C.greenSoft)}>
                  <Ionicons name="shield-checkmark" size={16} color={C.green} />
                  <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                    Pago verificado{order.verifiedByName ? ` por ${order.verifiedByName}` : ''}. No se
                    puede rechazar después.
                  </Text>
                </View>
              ) : proof ? (
                <View style={{ gap: space.sm }}>
                  <Btn
                    title="Verificar pago"
                    icon="shield-checkmark-outline"
                    onPress={approvePayment}
                    loading={proofBusy}
                  />
                  {rejectOpen ? (
                    <View style={{ gap: space.sm }}>
                      <Field
                        label="Motivo del rechazo"
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder="Ej. El monto no coincide con el pedido."
                        multiline
                        containerStyle={{ marginBottom: 0 }}
                      />
                      <View style={{ flexDirection: 'row', gap: space.sm }}>
                        <Btn
                          title="Confirmar rechazo"
                          kind="dangerSoft"
                          compact
                          onPress={rejectPayment}
                          loading={proofBusy}
                        />
                        <Btn
                          title="Cancelar"
                          kind="ghost"
                          compact
                          onPress={() => {
                            setRejectOpen(false);
                            setRejectReason('');
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <Btn
                      title="Rechazar comprobante"
                      kind="dangerSoft"
                      icon="close-circle-outline"
                      onPress={() => setRejectOpen(true)}
                    />
                  )}
                </View>
              ) : null}
            </Card>
          ) : null}
        </View>
      </View>

      <Modal
        visible={proofFullscreen && !!proof}
        transparent
        animationType="fade"
        onRequestClose={() => setProofFullscreen(false)}
      >
        {/* El fondo es un Pressable hermano de la tarjeta, no su padre:
            en web un <button> no puede contener otros botones. */}
        <View
          style={{
            flex: 1,
            backgroundColor: C.overlay,
            padding: space.lg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => setProofFullscreen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar visor de comprobante"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: 720,
              maxHeight: '88%',
              backgroundColor: C.card,
              borderRadius: radius.lg,
              padding: space.md,
              gap: space.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.bodyLg }}>
                Comprobante de pago
              </Text>
              <Pressable
                onPress={() => setProofFullscreen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close-circle" size={24} color={C.inkSoft} />
              </Pressable>
            </View>
            <Image
              source={{ uri: proof?.image || '' }}
              style={{ width: '100%', height: '72%', minHeight: 260, backgroundColor: C.surfaceAlt }}
              contentFit="contain"
              accessibilityLabel="Comprobante ampliado"
            />
            <Text style={{ color: C.muted, fontSize: typeScale.small }}>
              {money(declaredAmount)} · {orderCode(order)}
            </Text>
            <Btn title="Cerrar" kind="soft" compact onPress={() => setProofFullscreen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function AmountMismatch({ declared, total }: { declared: number; total: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.sm,
        alignItems: 'flex-start',
        padding: space.sm,
        borderRadius: radius.sm,
        backgroundColor: C.redSoft,
        borderWidth: 1,
        borderColor: '#F3C6CB',
      }}
    >
      <Ionicons name="warning" size={16} color={C.red} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.red, fontWeight: weight.bold, fontSize: typeScale.small }}>
          El monto no coincide
        </Text>
        <Text style={{ color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
          Declarado {money(declared)} · Total del pedido {money(total)}. Revisa el comprobante antes
          de verificar el pago.
        </Text>
      </View>
    </View>
  );
}

const paymentNote = (backgroundColor: string) => ({
  flexDirection: 'row' as const,
  gap: space.sm,
  alignItems: 'flex-start' as const,
  padding: space.sm,
  borderRadius: radius.sm,
  backgroundColor,
});

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: C.muted, fontSize: typeScale.body }}>{label}</Text>
      <Text style={{ color: accent || C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>{value}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: C.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Ionicons name={icon} size={16} color={C.inkSoft} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: C.muted, fontSize: typeScale.caption, fontWeight: weight.semibold }}>{label}</Text>
        <Text style={{ color: C.ink, fontSize: typeScale.body, lineHeight: 20 }}>{value}</Text>
      </View>
    </View>
  );
}
