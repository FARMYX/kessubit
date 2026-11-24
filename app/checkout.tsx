import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import {
  C,
  DELIVERY_LABEL,
  PAYMENT_DESCRIPTION,
  PAYMENT_ICON,
  PAYMENT_LABEL,
  PAYMENT_METHOD_ORDER,
  money,
  paymentNeedsProof,
} from '../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../src/lib/design';
import { useResponsive } from '../src/lib/responsive';
import { useCart } from '../src/context/CartContext';
import { useAuth } from '../src/context/AuthContext';
import { useStoreConfig } from '../src/context/StoreConfigContext';
import { useToast } from '../src/context/ToastContext';
import { createOrder, newIdempotencyKey } from '../src/lib/orders';
import { bankDetailsLines, bankDetailsText } from '../src/lib/paymentDetails';
import { playSound } from '../src/lib/sound';
import { haptic } from '../src/lib/haptics';
import { Btn, Card, Chip, Divider, Empty, Field, Screen } from '../src/components/UI';
import { ScreenHeader } from '../src/components/ScreenHeader';
import type { DeliveryType, PaymentMethod } from '../src/lib/types';

type Success = { orderId: string; orderNumber: string; total: number; paymentMethod: PaymentMethod };

/** Firestore errors arrive with a code; translate the actionable ones. */
function friendlyCheckoutError(e: any) {
  const code = String(e?.code || '');
  if (code.includes('unauthenticated')) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo otra vez.';
  }
  if (
    code.includes('invalid-argument') ||
    code.includes('failed-precondition') ||
    code.includes('not-found') ||
    code.includes('already-exists')
  ) {
    return e?.message || 'No pudimos confirmar el pedido. Revisa los datos e inténtalo otra vez.';
  }
  if (code.includes('permission-denied')) {
    return 'No pudimos confirmar el pedido. Revisa tu sesión e inténtalo otra vez.';
  }
  if (code.includes('unavailable') || code.includes('network') || code.includes('deadline-exceeded')) {
    return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
  }
  if (code.includes('aborted') || code.includes('resource-exhausted') || code.includes('internal')) {
    return 'El pedido se está actualizando. Inténtalo otra vez.';
  }
  return e?.message || 'No se pudo crear el pedido. Inténtalo otra vez.';
}

export default function Checkout() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { lines, subtotal, discount, total: cartTotal, activeBundle, clear } = useCart();
  const { user, profile } = useAuth();
  const { config } = useStoreConfig();
  const toast = useToast();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    config.deliveryEnabled ? 'delivery' : 'pickup'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<Success | null>(null);
  // One key per checkout screen: a retry after a lost response returns the
  // same order instead of reserving stock twice.
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  // Si el admin quita el QR, el checkout vuelve a efectivo sin un efecto aparte.
  const selectedPayment: PaymentMethod =
    paymentMethod === 'qr' && !config.qrImage ? 'efectivo' : paymentMethod;

  const availablePayments = useMemo(
    () => PAYMENT_METHOD_ORDER.filter((method) => method !== 'qr' || !!config.qrImage),
    [config.qrImage]
  );

  const bankLines = useMemo(() => bankDetailsLines(config), [config]);

  const copyBankDetails = async () => {
    try {
      const saved = await Clipboard.setStringAsync(bankDetailsText(config), {
        android: { isSensitive: true },
      });
      if (!saved) throw new Error('clipboard');
      haptic.tap();
      toast.success('Datos copiados', 'Pégalos en tu banca móvil.');
    } catch {
      haptic.error();
      toast.error('No se pudieron copiar', 'Selecciona los datos y cópialos manualmente.');
    }
  };

  const shipping = useMemo(() => {
    if (deliveryType === 'pickup' || !config.deliveryEnabled) return 0;
    if (cartTotal >= Number(config.freeShippingThreshold || 0)) return 0;
    return Number(config.shippingCost || 0);
  }, [deliveryType, cartTotal, config]);

  const total = cartTotal + shipping;

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Pago" back />
        <Empty
          icon="lock-closed-outline"
          title="Inicia sesión para pagar"
          text="Necesitamos tu cuenta para guardar el pedido, avisarte del estado y mantener tu historial."
          action={{ label: 'Iniciar sesión', onPress: () => router.push('/login') }}
        />
      </Screen>
    );
  }

  if (success) {
    return (
      <Screen>
        <ScreenHeader title="Pedido confirmado" back={false} />
        <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space['3xl'], paddingHorizontal: space.xl }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: C.greenSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark-circle" size={40} color={C.green} />
          </View>
          <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h2, textAlign: 'center' }}>
            ¡Gracias, {name.split(' ')[0] || 'músico'}!
          </Text>
          <Text style={{ color: C.inkSoft, fontSize: typeScale.body, textAlign: 'center', lineHeight: 21, maxWidth: 420 }}>
            Tu pedido <Text style={{ fontWeight: weight.bold, color: C.ink }}>{success.orderNumber}</Text> quedó
            registrado por {money(success.total)}. Te avisaremos cuando cambie de estado.
          </Text>

          {paymentNeedsProof(success.paymentMethod) ? (
            <View style={proofCallout}>
              <Ionicons name="cloud-upload-outline" size={19} color={C.yellowDeep} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                  Tu pago todavía no está confirmado
                </Text>
                <Text style={{ color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                  Sube la captura de tu banca móvil para que la tienda verifique el pago. Puedes
                  seguir viendo el catálogo mientras tanto; te lo recordaremos hasta enviarlo.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center', marginTop: space.sm }}>
            <Btn
              title={paymentNeedsProof(success.paymentMethod) ? 'Subir comprobante' : 'Ver pedido'}
              icon={paymentNeedsProof(success.paymentMethod) ? 'cloud-upload-outline' : 'receipt-outline'}
              onPress={() => router.replace(`/order/${success.orderId}` as any)}
            />
            <Btn title="Seguir comprando" kind="ghost" onPress={() => router.replace('/')} />
          </View>
        </Card>
      </Screen>
    );
  }

  if (!lines.length) {
    return (
      <Screen>
        <ScreenHeader title="Pago" back />
        <Empty
          icon="bag-handle-outline"
          title="No hay nada que pagar"
          text="Tu carrito está vacío. Añade un producto y vuelve al checkout."
          action={{ label: 'Ver catálogo', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Escribe el nombre de quien recibe.');
      return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      setError('Escribe una dirección de entrega.');
      return;
    }
    if (deliveryType === 'pickup' && !config.pickupEnabled) {
      setError('El retiro en tienda no está disponible ahora mismo.');
      return;
    }
    if (selectedPayment === 'qr' && !config.qrImage) {
      setError('El pago por QR no está disponible ahora mismo. Elige otro método.');
      return;
    }

    setBusy(true);
    try {
      const result = await createOrder(
        {
          userId: user.uid,
          userEmail: user.email || '',
          customerName: name,
          address: deliveryType === 'pickup' ? config.address : address,
          phone,
          notes,
          deliveryType,
          paymentMethod: selectedPayment,
          items: lines.map((line) => ({ productId: line.product.id, qty: line.qty })),
          ...(activeBundle
            ? {
                bundleId: activeBundle.id,
                bundleName: activeBundle.name,
                bundleOfferPrice: activeBundle.offerPrice,
                originalPrice: subtotal,
              }
            : {}),
        },
        idempotencyKey
      );
      clear();
      playSound('success');
      haptic.success();
      setSuccess({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        total: result.total,
        paymentMethod: selectedPayment,
      });
    } catch (e: any) {
      haptic.error();
      const message = friendlyCheckoutError(e);
      setError(message);
      toast.error('No se pudo confirmar', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Finalizar pedido"
        eyebrow="Pago"
        subtitle="Confirma los datos de entrega. El total se calcula con los precios actuales."
        back
      />

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, width: '100%', gap: space.md }}>
          <Card style={{ gap: space.sm }}>
            <SectionTitle icon="person-outline" title="Datos de contacto" />
            <Field label="Nombre de quien recibe" value={name} onChangeText={setName} autoComplete="name" />
            <Field
              label="Teléfono (opcional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Para coordinar la entrega"
            />
          </Card>

          <Card style={{ gap: space.sm }}>
            <SectionTitle icon="bicycle-outline" title="Entrega" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {config.deliveryEnabled ? (
                <Chip
                  label={DELIVERY_LABEL.delivery}
                  icon="bicycle-outline"
                  on={deliveryType === 'delivery'}
                  onPress={() => setDeliveryType('delivery')}
                />
              ) : null}
              {config.pickupEnabled ? (
                <Chip
                  label={DELIVERY_LABEL.pickup}
                  icon="storefront-outline"
                  color={C.blue}
                  on={deliveryType === 'pickup'}
                  onPress={() => setDeliveryType('pickup')}
                />
              ) : null}
            </View>

            {deliveryType === 'delivery' ? (
              <Field
                label="Dirección"
                value={address}
                onChangeText={setAddress}
                placeholder="Calle, número, zona, referencia"
                multiline
                autoComplete="street-address"
              />
            ) : (
              <View style={pickupBox}>
                <Ionicons name="location" size={18} color={C.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    {config.name}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.small }}>{config.address}</Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.small }}>{config.hours}</Text>
                </View>
              </View>
            )}

            <Field
              label="Notas para la tienda (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Horario preferido, referencia, regalo…"
              multiline
              containerStyle={{ marginBottom: 0 }}
            />
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
              <SectionTitle icon="card-outline" title="Método de pago" />
              <View style={amountPill}>
                <Text style={{ color: C.pink, fontWeight: weight.black, fontSize: typeScale.body }}>
                  {money(total)}
                </Text>
              </View>
            </View>

            <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
              Elige cómo pagar. Para QR y transferencia te pediremos el comprobante después de confirmar.
            </Text>

            <View style={{ gap: space.sm }}>
              {availablePayments.map((method) => (
                <PaymentCard
                  key={method}
                  method={method}
                  selected={selectedPayment === method}
                  onPress={() => setPaymentMethod(method)}
                />
              ))}
            </View>

            {selectedPayment === 'qr' ? (
              <View style={qrPanel}>
                <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center', flexWrap: 'wrap' }}>
                  <View style={qrFrame}>
                    {config.qrImage ? (
                      <Image
                        source={{ uri: config.qrImage }}
                        style={{ width: 176, height: 176 }}
                        contentFit="contain"
                        accessibilityLabel="Código QR de pago de KESUUBIT"
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 180, gap: 5 }}>
                    <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
                      Escanea y paga {money(total)}
                    </Text>
                    {config.paymentHolder ? (
                      <Text style={{ color: C.inkSoft, fontSize: typeScale.small }}>
                        Titular: <Text style={{ fontWeight: weight.bold }}>{config.paymentHolder}</Text>
                      </Text>
                    ) : null}
                    <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
                      {config.paymentInstructions ||
                        'Abre tu banca móvil, escanea el QR y guarda la captura del pago.'}
                    </Text>
                  </View>
                </View>
                <View style={proofNote}>
                  <Ionicons name="information-circle-outline" size={16} color={C.blue} />
                  <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                    Después de confirmar, sube el comprobante desde el detalle del pedido. El stock queda
                    reservado mientras la tienda verifica el pago.
                  </Text>
                </View>
              </View>
            ) : selectedPayment === 'transferencia' ? (
              <View style={transferPanel}>
                <Ionicons name="swap-horizontal-outline" size={19} color={C.blue} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    Transfiere {money(total)}
                  </Text>
                  {config.paymentHolder ? (
                    <Text style={{ color: C.inkSoft, fontSize: typeScale.small }}>
                      Titular: <Text style={{ fontWeight: weight.bold }}>{config.paymentHolder}</Text>
                    </Text>
                  ) : null}
                  <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
                    {config.paymentInstructions ||
                      'La tienda te coordina los datos bancarios. Guarda la captura de la transferencia.'}
                  </Text>
                  {bankLines.length ? (
                    <View style={bankDetailsBox}>
                      {bankLines.map((line) => (
                        <Text key={line} style={{ color: C.inkSoft, fontSize: typeScale.small }}>
                          {line}
                        </Text>
                      ))}
                      <Btn
                        title="Copiar datos"
                        kind="soft"
                        compact
                        icon="copy-outline"
                        onPress={copyBankDetails}
                        style={{ alignSelf: 'flex-start', marginTop: space.xs }}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={cashNote}>
                <Ionicons name="checkmark-circle-outline" size={16} color={C.green} />
                <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                  Este método no necesita comprobante. Coordinamos el pago al confirmar el pedido.
                </Text>
              </View>
            )}
          </Card>
        </View>

        <View style={{ width: isDesktop ? 340 : '100%', gap: space.md }}>
          <Card style={{ gap: space.md }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Tu pedido</Text>

            <View style={{ gap: space.sm }}>
              {lines.map((line) => (
                <View key={line.product.id} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      backgroundColor: C.pinkWash,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: C.pink, fontWeight: weight.black, fontSize: 11 }}>{line.qty}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small }}>
                    {line.product.name}
                  </Text>
                  <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.small }}>
                    {money(line.product.price * line.qty)}
                  </Text>
                </View>
              ))}
            </View>

            <Divider />

            <View style={{ gap: 8 }}>
              <SummaryRow label="Subtotal" value={money(subtotal)} />
              {activeBundle && discount > 0 ? (
                <SummaryRow
                  label={`Oferta · ${activeBundle.name}`}
                  value={`- ${money(discount)}`}
                  accent={C.pink}
                />
              ) : null}
              <SummaryRow
                label={deliveryType === 'pickup' ? 'Retiro en tienda' : 'Envío'}
                value={shipping === 0 ? 'Gratis' : money(shipping)}
                accent={shipping === 0 ? C.green : undefined}
              />
            </View>

            <Divider />

            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>Total</Text>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3 }}>{money(total)}</Text>
            </View>

            {error ? (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={{ flex: 1, color: C.red, fontSize: typeScale.small, lineHeight: 18 }}>{error}</Text>
              </View>
            ) : null}

            <Btn
              title={busy ? 'Confirmando…' : 'Confirmar pedido'}
              icon="checkmark-circle-outline"
              onPress={submit}
              loading={busy}
            />
            <Text style={{ color: C.muted, fontSize: typeScale.caption, textAlign: 'center' }}>
              Al confirmar, el stock se reserva para tu pedido.
            </Text>
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
      <Ionicons name={icon} size={17} color={C.pink} />
      <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>{title}</Text>
    </View>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: C.muted, fontSize: typeScale.body }}>{label}</Text>
      <Text style={{ color: accent || C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>{value}</Text>
    </View>
  );
}

function PaymentCard({
  method,
  selected,
  onPress,
}: {
  method: PaymentMethod;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={PAYMENT_LABEL[method]}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.md,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: selected ? C.pink : C.border,
          backgroundColor: selected ? C.pinkWash : pressed ? C.bgAlt : C.card,
        },
        { cursor: 'pointer' } as any,
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? C.pinkSoft : C.surfaceAlt,
          borderWidth: 1,
          borderColor: selected ? C.pinkSoft : C.border,
        }}
      >
        <Ionicons
          name={PAYMENT_ICON[method] as keyof typeof Ionicons.glyphMap}
          size={19}
          color={selected ? C.pink : C.inkSoft}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
          {PAYMENT_LABEL[method]}
        </Text>
        <Text style={{ color: C.muted, fontSize: typeScale.caption, lineHeight: 16 }}>
          {PAYMENT_DESCRIPTION[method]}
        </Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? C.pink : C.borderStrong}
      />
    </Pressable>
  );
}

// Getters: React Native lee estas propiedades al aplicar el estilo, así que
// siguen la paleta activa cuando el usuario cambia entre tema claro y oscuro.
const proofCallout = {
  flexDirection: 'row' as const,
  gap: space.sm,
  alignItems: 'flex-start' as const,
  padding: space.md,
  borderRadius: radius.md,
  get backgroundColor() { return C.yellowSoft; },
  borderWidth: 1,
  get borderColor() { return C.yellow; },
  maxWidth: 440,
};

const amountPill = {
  get backgroundColor() { return C.pinkWash; },
  borderRadius: radius.pill,
  borderWidth: 1,
  get borderColor() { return C.pinkSoft; },
  paddingHorizontal: space.md,
  paddingVertical: 6,
};

const qrPanel = {
  gap: space.md,
  padding: space.md,
  borderRadius: radius.lg,
  get backgroundColor() { return C.surfaceAlt; },
  borderWidth: 1,
  get borderColor() { return C.border; },
};

const qrFrame = {
  width: 196,
  height: 196,
  borderRadius: radius.md,
  get backgroundColor() { return C.card; },
  borderWidth: 1,
  get borderColor() { return C.border; },
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  padding: 8,
};

const proofNote = {
  flexDirection: 'row' as const,
  gap: space.sm,
  alignItems: 'flex-start' as const,
  padding: space.sm,
  borderRadius: radius.sm,
  get backgroundColor() { return C.blueSoft; },
};

const transferPanel = {
  flexDirection: 'row' as const,
  gap: space.sm,
  alignItems: 'flex-start' as const,
  padding: space.md,
  borderRadius: radius.md,
  get backgroundColor() { return C.blueSoft; },
  borderWidth: 1,
  get borderColor() { return C.blue; },
};

const bankDetailsBox = {
  gap: 3,
  marginTop: space.sm,
  padding: space.md,
  borderRadius: radius.sm,
  get backgroundColor() { return C.card; },
  borderWidth: 1,
  get borderColor() { return C.border; },
};

const cashNote = {
  flexDirection: 'row' as const,
  gap: space.sm,
  alignItems: 'flex-start' as const,
  padding: space.sm,
  borderRadius: radius.sm,
  get backgroundColor() { return C.greenSoft; },
};

const pickupBox = {
  flexDirection: 'row' as const,
  gap: space.sm,
  alignItems: 'flex-start' as const,
  padding: space.md,
  borderRadius: radius.md,
  get backgroundColor() { return C.blueSoft; },
  borderWidth: 1,
  get borderColor() { return C.blue; },
  marginBottom: space.md,
};
