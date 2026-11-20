import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, STATUS_ORDER } from '../lib/theme';
import { radius, space, weight } from '../lib/design';
import { formatDateTime } from '../lib/format';
import type { Order } from '../lib/types';

export function OrderTimeline({ order }: { order: Order }) {
  const history = order.statusHistory || [];
  const cancelled = order.status === 'cancelado';
  const currentIndex = STATUS_ORDER.findIndex((step) => step.key === order.status);

  return (
    <View style={{ gap: 0 }}>
      {STATUS_ORDER.map((step, index) => {
        const entry = history.find((item) => item.status === step.key);
        const done = currentIndex >= 0 ? index <= currentIndex : false;
        const current = index === currentIndex;
        const last = index === STATUS_ORDER.length - 1;
        const color = done ? C.pink : C.borderStrong;

        return (
          <View key={step.key} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ alignItems: 'center', width: 30 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: done ? C.pinkSoft : C.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={step.icon as any}
                  size={15}
                  color={done ? C.pink : C.muted}
                />
              </View>
              {!last ? (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 26,
                    backgroundColor: index < currentIndex ? C.pink : C.border,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : space.lg, paddingTop: 5 }}>
              <Text
                style={{
                  color: done ? C.ink : C.muted,
                  fontWeight: current ? weight.black : weight.semibold,
                  fontSize: 14,
                }}
              >
                {step.label}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                {entry?.at ? formatDateTime(entry.at) : done ? 'Completado' : 'Pendiente'}
              </Text>
            </View>
          </View>
        );
      })}

      {cancelled ? (
        <View
          style={{
            flexDirection: 'row',
            gap: space.md,
            alignItems: 'center',
            marginTop: space.md,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: C.redSoft,
            borderWidth: 1,
            borderColor: '#F3C9CC',
          }}
        >
          <Ionicons name="close-circle" size={22} color={C.red} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.red, fontWeight: weight.bold, fontSize: 14 }}>Pedido cancelado</Text>
            <Text style={{ color: C.inkSoft, fontSize: 12 }}>
              {history.find((item) => item.status === 'cancelado')?.at
                ? formatDateTime(history.find((item) => item.status === 'cancelado')?.at)
                : 'El stock volvió a la tienda.'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
