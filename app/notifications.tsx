import React, { useState } from 'react';
import { Platform, Pressable, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../src/lib/design';
import { timeAgo } from '../src/lib/format';
import { useAuth } from '../src/context/AuthContext';
import { useNotifications } from '../src/context/NotificationsContext';
import { useToast } from '../src/context/ToastContext';
import { useSoundEnabled, playSound } from '../src/lib/sound';
import { notify } from '../src/lib/notify';
import { haptic } from '../src/lib/haptics';
import { Badge, Btn, Card, Empty, Screen } from '../src/components/UI';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Skeleton } from '../src/components/Skeleton';
import type { AppNotification } from '../src/lib/types';

const ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  order_created: { icon: 'bag-check', get color() { return C.green; }, get bg() { return C.greenSoft; } },
  order_status: { icon: 'cube', get color() { return C.blue; }, get bg() { return C.blueSoft; } },
  order_cancelled: { icon: 'close-circle', get color() { return C.red; }, get bg() { return C.redSoft; } },
  payment_proof: { icon: 'qr-code', get color() { return C.blue; }, get bg() { return C.blueSoft; } },
  payment_verified: { icon: 'shield-checkmark', get color() { return C.green; }, get bg() { return C.greenSoft; } },
  payment_rejected: { icon: 'alert-circle', get color() { return C.red; }, get bg() { return C.redSoft; } },
  welcome: { icon: 'sparkles', get color() { return C.pink; }, get bg() { return C.pinkSoft; } },
  test: { icon: 'notifications', get color() { return C.pink; }, get bg() { return C.pinkSoft; } },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, unread, loading, permission, enablePush, markRead, markAllRead } = useNotifications();
  const { on: soundOn, toggle: toggleSound } = useSoundEnabled();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    setBusy(true);
    const result = await enablePush();
    setBusy(false);
    if (result.granted) {
      haptic.success();
      toast.success('Avisos activados', 'Te avisaremos de cada cambio en tus pedidos.');
    } else {
      haptic.warning();
      toast.error(
        'No se activaron',
        Platform.OS === 'web'
          ? 'Permite las notificaciones desde el candado de la barra del navegador.'
          : 'Puedes habilitarlos desde los ajustes del sistema.'
      );
    }
  };

  const open = (item: AppNotification) => {
    markRead(item.id);
    haptic.tap();
    if (item.orderId) {
      router.push(`/order/${item.orderId}` as any);
    }
  };

  const test = async () => {
    playSound('chime');
    haptic.light();
    await notify('KESUUBIT', 'Así suena un aviso de tu banda.', { data: { url: '/notifications' } });
    toast.info('Aviso de prueba', soundOn ? 'Con el chime de KESUUBIT.' : 'El sonido está desactivado.');
  };

  return (
    <Screen>
      <ScreenHeader
        title="Avisos"
        eyebrow={unread ? `${unread} sin leer` : 'Todo al día'}
        subtitle="Pedidos, cambios de estado y novedades de la tienda."
        back
        right={
          unread > 0 ? (
            <Pressable onPress={markAllRead} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.small }}>Marcar leídas</Text>
            </Pressable>
          ) : undefined
        }
      />

      <Card style={{ gap: space.md, marginBottom: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: permission ? C.greenSoft : C.pinkSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={permission ? 'notifications' : 'notifications-off-outline'}
              size={21}
              color={permission ? C.green : C.pink}
            />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>
              {permission ? 'Avisos del sistema activos' : 'Activa los avisos del sistema'}
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
              {permission
                ? 'Recibirás el chime de KESUUBIT incluso con la app en segundo plano.'
                : 'Te avisamos cuando tu pedido cambie de estado. Puedes desactivarlo cuando quieras.'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          {!permission ? (
            <Btn title="Activar avisos" onPress={activate} loading={busy} icon="notifications-outline" />
          ) : (
            <Btn title="Probar aviso" kind="soft" onPress={test} icon="play" />
          )}
          <Btn title="Sonido" kind="ghost" compact icon={soundOn ? 'volume-high' : 'volume-mute'} onPress={toggleSound} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.md,
            paddingTop: space.sm,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.body }}>
              Sonidos de la app
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
              Chime, pop y confirmación creados para KESUUBIT.
            </Text>
          </View>
          <Switch
            value={soundOn}
            onValueChange={toggleSound}
            trackColor={{ false: C.borderStrong, true: C.pinkSoft }}
            thumbColor={soundOn ? C.onPink : C.card}
            accessibilityLabel="Sonidos de la app"
          />
        </View>
      </Card>

      {loading ? (
        <View style={{ gap: space.sm }}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={{ gap: space.sm }}>
              <Skeleton width="42%" height={12} />
              <Skeleton height={12} />
              <Skeleton width="64%" height={12} />
            </Card>
          ))}
        </View>
      ) : !notifications.length ? (
        <Empty
          icon="notifications-outline"
          title="Sin avisos todavía"
          text="Cuando hagas un pedido o la tienda actualice su estado, lo verás aquí."
          action={{ label: 'Ver catálogo', onPress: () => router.push('/') }}
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {notifications.map((item) => {
            const tone = ICONS[item.type] || ICONS.order_status;
            const isUnread =
              item.audience === 'admin'
                ? !(item.readBy || []).includes(user?.uid || '')
                : !item.read;
            return (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.body}`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    gap: space.md,
                    padding: space.md,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: isUnread ? C.pinkSoft : C.border,
                    backgroundColor: isUnread ? C.pinkWash : pressed ? C.bgAlt : C.card,
                  },
                  { cursor: 'pointer' } as any,
                ]}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: tone.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={tone.icon} size={19} color={tone.color} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      {item.title}
                    </Text>
                    {item.audience === 'admin' ? <Badge label="Admin" color={C.purple} soft /> : null}
                    {isUnread ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.pink }} /> : null}
                  </View>
                  <Text style={{ color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>{item.body}</Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.caption, marginTop: 1 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>

                {item.orderId ? <Ionicons name="chevron-forward" size={16} color={C.muted} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {!user ? (
        <Card style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="person-circle-outline" size={22} color={C.pink} />
          <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.body }}>
            Inicia sesión para guardar tus avisos en la cuenta.
          </Text>
          <Btn title="Entrar" compact onPress={() => router.push('/login')} />
        </Card>
      ) : null}
    </Screen>
  );
}
