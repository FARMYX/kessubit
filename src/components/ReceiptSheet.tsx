import React from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  C,
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  STATUS_LABEL,
  money,
  paymentStatusOf,
} from '../lib/theme';
import { radius, shadow, space, type as typeScale, weight } from '../lib/design';
import { formatDateTime, orderCode } from '../lib/format';
import { openReceipt } from '../lib/receipt';
import { Btn } from './UI';
import type { Order } from '../lib/types';

const Mark = () => (
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.pink,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 3,
    }}
  >
    {[9, 17, 13, 7].map((height, index) => (
      <View key={index} style={{ width: 3, height, borderRadius: 2, backgroundColor: '#fff' }} />
    ))}
  </View>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', gap: space.md, paddingVertical: 6 }}>
    <Text style={{ width: 92, color: C.muted, fontSize: typeScale.small }}>{label}</Text>
    <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.medium }}>
      {value || 'Por coordinar'}
    </Text>
  </View>
);

/** Recibo digital del cliente, con la misma composición que la versión imprimible. */
export function ReceiptSheet({ order, visible, onClose }: { order: Order; visible: boolean; onClose: () => void }) {
  const status = paymentStatusOf(order);
  const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: space.md }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar recibo"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={[
            {
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90%',
              backgroundColor: C.card,
              borderRadius: radius.xl,
              shadowColor: shadow.float.shadowColor,
              shadowOpacity: shadow.float.shadowOpacity,
              shadowRadius: shadow.float.shadowRadius,
              shadowOffset: shadow.float.shadowOffset,
              elevation: 8,
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingHorizontal: space.lg,
              paddingTop: space.lg,
              paddingBottom: space.md,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <Mark />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontSize: typeScale.title, fontWeight: weight.black, letterSpacing: -0.4 }}>
                {orderCode(order)}
              </Text>
              <Text style={{ color: C.muted, fontSize: typeScale.small, marginTop: 1 }}>Recibo de pedido</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cerrar recibo"
            >
              <Ionicons name="close" size={22} color={C.inkSoft} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
            <View style={{ gap: space.xs }}>
              <Text style={{ color: C.ink, fontSize: typeScale.body, fontWeight: weight.bold }}>Detalles del pedido</Text>
              <Row label="Fecha" value={formatDateTime(order.createdAt)} />
              <Row label="Estado" value={STATUS_LABEL[order.status] || order.status} />
              <Row label="Cliente" value={order.userName || 'Cliente'} />
              <Row label="Contacto" value={`${order.userEmail || ''}${order.phone ? ` · ${order.phone}` : ''}`} />
              <Row label="Entrega" value={order.deliveryType ? DELIVERY_LABEL[order.deliveryType] : ''} />
              <Row label="Dirección" value={order.address} />
              <Row label="Pago" value={order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : ''} />
              <View style={{ flexDirection: 'row', gap: space.md, paddingVertical: 6, alignItems: 'center' }}>
                <Text style={{ width: 92, color: C.muted, fontSize: typeScale.small }}>Verificación</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <View
                    style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: PAYMENT_STATUS_COLOR[status] }}
                  />
                  <Text style={{ color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.medium }}>
                    {PAYMENT_STATUS_LABEL[status]}
                    {order.verifiedByName ? ` · ${order.verifiedByName}` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={{ color: C.ink, fontSize: typeScale.body, fontWeight: weight.bold }}>Productos</Text>
              {order.items.map((item) => (
                <View
                  key={item.id}
                  style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingVertical: 6 }}
                >
                  <Text style={{ width: 28, color: C.muted, fontSize: typeScale.small }}>{item.qty}×</Text>
                  <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small }}>{item.name}</Text>
                  <Text style={{ color: C.ink, fontSize: typeScale.small, fontWeight: weight.semibold }}>
                    {money(item.price * item.qty)}
                  </Text>
                </View>
              ))}
              <View style={{ alignSelf: 'flex-end', width: 220, gap: 3, marginTop: space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.muted, fontSize: typeScale.small }}>Subtotal</Text>
                  <Text style={{ color: C.inkSoft, fontSize: typeScale.small }}>{money(subtotal)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: C.muted, fontSize: typeScale.small }}>Envío</Text>
                  <Text style={{ color: C.inkSoft, fontSize: typeScale.small }}>{money(order.shipping ?? 0)}</Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    borderTopWidth: 1,
                    borderTopColor: C.ink,
                    marginTop: 6,
                    paddingTop: 8,
                  }}
                >
                  <Text style={{ color: C.ink, fontSize: typeScale.body, fontWeight: weight.black }}>Total</Text>
                  <Text style={{ color: C.pink, fontSize: typeScale.body, fontWeight: weight.black }}>
                    {money(order.total)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={{ color: C.muted, fontSize: typeScale.caption, lineHeight: 17 }}>
              Recibo de pedido de KESUUBIT. No constituye una factura fiscal. Guárdalo para respaldar tu compra.
            </Text>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: space.sm,
              padding: space.lg,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Btn title="Cerrar" kind="ghost" compact onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn
                title={Platform.OS === 'web' ? 'Imprimir / PDF' : 'Abrir recibo'}
                icon={Platform.OS === 'web' ? 'print-outline' : 'open-outline'}
                compact
                onPress={() => {
                  void openReceipt(order);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
