import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
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
  paymentNeedsProof,
  paymentStatusOf,
} from '../../src/lib/theme';
import { radius, space, tracking, type as typeScale, weight } from '../../src/lib/design';
import { useResponsive } from '../../src/lib/responsive';
import { formatDateTime, orderCode } from '../../src/lib/format';
import {
  restockProducts,
  stockBadgeLabel,
  stockColor,
  stockSoftColor,
  stockState,
} from '../../src/lib/stock';
import { useProducts } from '../../src/context/ProductsContext';
import { useNotifications } from '../../src/context/NotificationsContext';
import { useStoreConfig } from '../../src/context/StoreConfigContext';
import { useAuth } from '../../src/context/AuthContext';
import { Badge, Card, Empty, Screen } from '../../src/components/UI';
import { NotificationBell } from '../../src/components/NotificationBell';
import { Skeleton } from '../../src/components/Skeleton';
import type { Order, Product } from '../../src/lib/types';

const useCollection = (name: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, name),
      (snap) => {
        setData(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [name]);
  return { data, loading };
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const dateLabel = () =>
  new Date().toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export default function Dashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { profile } = useAuth();
  const { config } = useStoreConfig();
  const { products, loading: productsLoading } = useProducts();
  const { data: orders, loading: ordersLoading } = useCollection('orders');
  const { data: users, loading: usersLoading } = useCollection('users');
  const { unread } = useNotifications();

  const stats = useMemo(() => {
    const valid = orders.filter((order) => order.status !== 'cancelado');
    const revenue = valid.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startSeconds = start.getTime() / 1000;
    const today = orders.filter((order) => (order.createdAt?.seconds || 0) >= startSeconds);
    const todayValid = today.filter((order) => order.status !== 'cancelado');
    const todayRevenue = todayValid.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const pending = orders.filter((order) => order.status === 'pendiente').length;
    const inProgress = orders.filter((order) => order.status === 'preparando').length;
    const toDeliver = orders.filter((order) =>
      ['pendiente', 'preparando', 'enviado'].includes(order.status)
    ).length;
    const pendingPayments = orders.filter(
      (order) =>
        paymentNeedsProof(order.paymentMethod) && paymentStatusOf(order) === 'en_revision'
    ).length;
    const restock = restockProducts(products as Product[]);
    const clients = users.filter((user) => user.role === 'client').length;

    return {
      revenue,
      todayOrders: today.length,
      todayRevenue,
      pending,
      inProgress,
      toDeliver,
      pendingPayments,
      restock,
      clients,
      totalOrders: orders.length,
    };
  }, [orders, products, users]);

  const recent = useMemo(
    () =>
      [...orders]
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5) as Order[],
    [orders]
  );

  const loading = productsLoading || ordersLoading || usersLoading;
  const firstName = (profile?.name || '').trim().split(' ')[0];

  return (
    <Screen>
      <View
        style={{
          backgroundColor: C.pinkWash,
          borderRadius: radius['2xl'],
          borderWidth: 1,
          borderColor: '#F3D2E1',
          padding: isDesktop ? space['3xl'] : space.xl,
          marginTop: space.sm,
          marginBottom: space.lg,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', right: -26, top: -34, opacity: 0.1 }}>
          <Ionicons name="musical-notes" size={190} color={C.pink} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <Image
            source={require('../../assets/images/kesuubit-icon.png')}
            style={{ width: 46, height: 46, borderRadius: 14 }}
            contentFit="cover"
            accessibilityLabel="KESUUBIT"
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                color: C.pink,
                fontSize: typeScale.caption,
                fontWeight: weight.black,
                letterSpacing: 1.3,
              }}
            >
              KESUUBIT · PANEL
            </Text>
            <Text
              style={{
                color: C.ink,
                fontSize: isDesktop ? typeScale.h1 : typeScale.h2,
                fontWeight: weight.black,
                letterSpacing: tracking.tight,
                lineHeight: (isDesktop ? typeScale.h1 : typeScale.h2) * 1.14,
              }}
            >
              {firstName ? `${greeting()}, ${firstName}` : 'Tu tienda, en vivo'}
            </Text>
            <Text style={{ color: C.inkSoft, fontSize: typeScale.small }}>
              {dateLabel()} · {config.name} · datos en tiempo real
            </Text>
          </View>
          <NotificationBell />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg }}>
          <HeroPill icon="bag-check-outline" label="Hoy" value={`${stats.todayOrders} pedido${stats.todayOrders === 1 ? '' : 's'}`} />
          <HeroPill icon="trending-up-outline" label="Ingresos hoy" value={money(stats.todayRevenue)} />
          <HeroPill
            icon="qr-code-outline"
            label="Pagos por verificar"
            value={String(stats.pendingPayments)}
            alert={stats.pendingPayments > 0}
          />
        </View>
      </View>

      <Text style={sectionEyebrow}>Cola de pendientes</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
        <QueueCard
          icon="qr-code-outline"
          label="Pagos por verificar"
          count={stats.pendingPayments}
          tone={C.blue}
          toneSoft={C.blueSoft}
          hint="Comprobantes esperando tu revisión"
          onPress={() => router.push('/admin/orders?filter=pagos' as any)}
        />
        <QueueCard
          icon="time-outline"
          label="Pedidos pendientes"
          count={stats.pending}
          tone={C.yellowDeep}
          toneSoft={C.yellowSoft}
          hint="Pedidos nuevos sin confirmar"
          onPress={() => router.push('/admin/orders')}
        />
        <QueueCard
          icon="alert-circle-outline"
          label="Productos por reponer"
          count={stats.restock.length}
          tone={C.red}
          toneSoft={C.redSoft}
          hint="Agotados o con últimas unidades"
          onPress={() => router.push('/admin/products')}
        />
        {!config.qrImage ? (
          <QueueCard
            icon="qr-code-outline"
            label="Configurar QR"
            count={0}
            tone={C.pink}
            toneSoft={C.pinkSoft}
            hint="Falta la imagen para cobrar por QR"
            actionLabel="Subir QR"
            onPress={() => router.push('/admin/settings')}
          />
        ) : null}
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} style={{ flex: 1, minWidth: 150, gap: space.sm }}>
              <Skeleton width="52%" height={11} />
              <Skeleton width="70%" height={24} />
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          <Stat label="Ingresos totales" value={money(stats.revenue)} icon="trending-up" color={C.green} bg={C.greenSoft} />
          <Stat label="Por entregar" value={String(stats.toDeliver)} icon="cube-outline" color={C.blue} bg={C.blueSoft} />
          <Stat label="En preparación" value={String(stats.inProgress)} icon="construct" color={C.yellowDeep} bg={C.yellowSoft} />
          <Stat label="Clientes" value={String(stats.clients)} icon="people-outline" color={C.pink} bg={C.pinkSoft} />
        </View>
      )}

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.lg, marginTop: space.lg, alignItems: 'flex-start' }}>
        <Card style={{ flex: 1.3, width: '100%', gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <View>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
                Últimos pedidos
              </Text>
              <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                {stats.totalOrders} en total · {stats.pendingPayments} pago(s) por verificar
              </Text>
            </View>
            <Pressable onPress={() => router.push('/admin/orders')} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.small }}>Ver todos</Text>
            </Pressable>
          </View>

          {recent.length ? (
            recent.map((order) => (
              <Pressable
                key={order.id}
                onPress={() => router.push(`/order/${order.id}` as any)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    paddingVertical: space.sm,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                    backgroundColor: pressed ? C.bgAlt : 'transparent',
                  },
                  { cursor: 'pointer' } as any,
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    {orderCode(order)} · {order.userName || order.userEmail}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                    {formatDateTime(order.createdAt)} · {order.items?.length || 0} producto(s)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                    <Badge label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} soft />
                    {paymentNeedsProof(order.paymentMethod) ? (
                      <Badge
                        label={PAYMENT_STATUS_LABEL[paymentStatusOf(order)]}
                        color={PAYMENT_STATUS_COLOR[paymentStatusOf(order)]}
                        soft
                      />
                    ) : null}
                  </View>
                </View>
                <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.small, minWidth: 70, textAlign: 'right' }}>
                  {money(order.total)}
                </Text>
              </Pressable>
            ))
          ) : (
            <Empty icon="receipt-outline" title="Sin pedidos aún" text="Cuando llegue el primero, aparecerá aquí." />
          )}
        </Card>

        <View style={{ width: isDesktop ? 330 : '100%', gap: space.md }}>
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
              <View>
                <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Stock bajo</Text>
                <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                  {stats.restock.length ? `${stats.restock.length} para reponer` : 'Inventario al día'}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/admin/products')} hitSlop={8} accessibilityRole="button">
                <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.small }}>Gestionar</Text>
              </Pressable>
            </View>

            {stats.restock.length ? (
              stats.restock.slice(0, 5).map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => router.push('/admin/products')}
                  accessibilityRole="button"
                  accessibilityLabel={`${product.name}, ${stockBadgeLabel(product.stock, product.lowStockThreshold)}`}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      paddingVertical: 7,
                      paddingHorizontal: space.sm,
                      borderRadius: radius.sm,
                      backgroundColor: pressed
                        ? stockSoftColor(product.stock, product.lowStockThreshold)
                        : C.surfaceAlt,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: stockColor(product.stock, product.lowStockThreshold),
                    }}
                  />
                  <Text numberOfLines={1} style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small }}>
                    {product.name}
                  </Text>
                  <Text
                    style={{
                      color: stockColor(product.stock, product.lowStockThreshold),
                      fontWeight: weight.bold,
                      fontSize: typeScale.small,
                    }}
                  >
                    {stockState(product.stock, product.lowStockThreshold) === 'agotado' ? 'Agotado' : product.stock}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: C.muted, fontSize: typeScale.small }}>Todo el inventario está en orden.</Text>
            )}
          </Card>

          {!config.qrImage ? (
            <Pressable
              onPress={() => router.push('/admin/settings')}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  gap: space.sm,
                  alignItems: 'flex-start',
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: pressed ? C.yellowSoft : C.surfaceAlt,
                  borderWidth: 1,
                  borderColor: '#F0D98A',
                },
                { cursor: 'pointer' } as any,
              ]}
            >
              <Ionicons name="qr-code-outline" size={19} color={C.yellowDeep} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                  Falta configurar el QR
                </Text>
                <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
                  Sin imagen, el checkout oculta el pago por QR. Súbela en Ajustes → Pagos y QR.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={C.yellowDeep} />
            </Pressable>
          ) : null}

          <Card style={{ gap: space.sm }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Accesos</Text>
            <Shortcut icon="pricetags-outline" label="Productos" hint={`${products.length} en catálogo`} onPress={() => router.push('/admin/products')} />
            <Shortcut icon="receipt-outline" label="Pedidos" hint={`${stats.totalOrders} en total`} onPress={() => router.push('/admin/orders')} />
            <Shortcut icon="people-outline" label="Usuarios" hint={`${users.length} registrados`} onPress={() => router.push('/admin/users')} />
            <Shortcut icon="settings-outline" label="Ajustes de la tienda" hint="Envío, contacto, QR y avisos" onPress={() => router.push('/admin/settings')} />
          </Card>

          {unread > 0 ? (
            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: pressed ? C.bgAlt : C.pinkWash,
                  borderWidth: 1,
                  borderColor: '#F3D2E1',
                },
                { cursor: 'pointer' } as any,
              ]}
            >
              <Ionicons name="notifications" size={18} color={C.pink} />
              <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.semibold }}>
                Tienes {unread} aviso{unread === 1 ? '' : 's'} sin leer
              </Text>
              <Ionicons name="chevron-forward" size={15} color={C.pink} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={{ color: C.muted, fontSize: typeScale.caption, marginTop: space.lg, textAlign: 'center' }}>
        KESUUBIT · Hecho para sonar
      </Text>
    </Screen>
  );
}

function HeroPill({
  icon,
  label,
  value,
  alert,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: 8,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: alert ? C.card : 'rgba(255,255,255,0.65)',
        borderWidth: 1,
        borderColor: alert ? '#C9D8FB' : '#F3D2E1',
      }}
    >
      <Ionicons name={icon} size={15} color={alert ? C.blue : C.pink} />
      <Text style={{ color: C.muted, fontSize: typeScale.caption, fontWeight: weight.semibold }}>
        {label}
      </Text>
      <Text style={{ color: C.ink, fontSize: typeScale.small, fontWeight: weight.black }}>{value}</Text>
    </View>
  );
}

function QueueCard({
  icon,
  label,
  count,
  hint,
  tone,
  toneSoft,
  actionLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  hint: string;
  tone: string;
  toneSoft: string;
  actionLabel?: string;
  onPress: () => void;
}) {
  const done = count === 0 && !actionLabel;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${count ? `, ${count}` : ''}`}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: 158,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.md,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: done ? C.border : toneSoft,
          backgroundColor: pressed ? toneSoft : C.card,
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
          backgroundColor: toneSoft,
        }}
      >
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: C.muted, fontSize: typeScale.caption, fontWeight: weight.semibold }}>
          {label}
        </Text>
        <Text style={{ color: done ? C.muted : tone, fontSize: typeScale.h3, fontWeight: weight.black, letterSpacing: -0.3 }}>
          {done ? 'Al día' : actionLabel || count}
        </Text>
        <Text numberOfLines={2} style={{ color: C.muted, fontSize: typeScale.caption, lineHeight: 15 }}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 150, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.muted, fontSize: typeScale.small, fontWeight: weight.semibold }}>{label}</Text>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={color} />
        </View>
      </View>
      <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3, letterSpacing: -0.4 }}>
        {value}
      </Text>
    </Card>
  );
}

function Shortcut({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: 9,
          paddingHorizontal: space.sm,
          borderRadius: radius.md,
          backgroundColor: pressed ? C.bgAlt : 'transparent',
        },
        { cursor: 'pointer' } as any,
      ]}
    >
      <Ionicons name={icon} size={18} color={C.inkSoft} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.small }}>{label}</Text>
        <Text style={{ color: C.muted, fontSize: typeScale.caption }}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={C.muted} />
    </Pressable>
  );
}

const sectionEyebrow = {
  color: C.pink,
  fontSize: typeScale.caption,
  fontWeight: weight.black as any,
  letterSpacing: 1.1,
  textTransform: 'uppercase' as const,
  marginBottom: space.sm,
};
