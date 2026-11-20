import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, money, paymentStatusOf } from '../lib/theme';
import { radius, space, type as typeScale, weight } from '../lib/design';
import type { Order } from '../lib/types';

/**
 * Aviso visible y accionable. No bloquea: el cliente puede seguir comprando.
 */
export function PaymentReminder({ order, compact = false }: { order: Order | null; compact?: boolean }) {
  const router = useRouter();
  if (!order) return null;

  const rejected = paymentStatusOf(order) === 'rechazado';
  const accent = rejected ? C.red : C.yellowDeep;
  const soft = rejected ? C.redSoft : C.yellowSoft;

  return (
    <Pressable
      onPress={() => router.push(`/order/${order.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={rejected ? 'Revisar comprobante rechazado' : 'Subir comprobante de pago'}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: compact ? 10 : 12,
          paddingHorizontal: space.md,
          marginBottom: space.sm,
          borderRadius: radius.md,
          backgroundColor: pressed ? soft : C.card,
          borderWidth: 1.5,
          borderColor: accent,
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
          backgroundColor: soft,
          flexShrink: 0,
        }}
      >
        <Ionicons name={rejected ? 'close-circle' : 'camera-outline'} size={18} color={accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
          {rejected ? 'Revisa tu comprobante' : 'Tu pago necesita comprobante'}
        </Text>
        <Text style={{ color: C.inkSoft, fontSize: typeScale.small }} numberOfLines={2}>
          {order.orderNumber ? `${order.orderNumber} · ` : ''}
          {money(order.total)} ·{' '}
          {rejected && order.paymentRejectedReason
            ? order.paymentRejectedReason
            : 'Sube la captura para que la tienda verifique tu pago.'}
        </Text>
      </View>
      {/* Botón solo visual: todo el recordatorio ya es un Pressable. En web,
          anidar dos Pressable genera dos <button> y React lo reporta. */}
      <View
        style={{
          flexShrink: 0,
          minHeight: 38,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          borderRadius: radius.md,
          backgroundColor: C.pinkSoft,
          borderWidth: 1,
          borderColor: C.pinkSoft,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
        }}
      >
        <Ionicons name="cloud-upload-outline" size={17} color={C.pink} />
        <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>
          {rejected ? 'Reenviar' : 'Subir ahora'}
        </Text>
      </View>
    </Pressable>
  );
}
