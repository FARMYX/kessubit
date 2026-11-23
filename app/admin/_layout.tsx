import React from 'react';
import { type ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useGlassTabs } from '../../src/components/Glass';
import { useNotifications } from '../../src/context/NotificationsContext';
import { C } from '../../src/lib/theme';

const makeIcon = (active: keyof typeof Ionicons.glyphMap, idle: keyof typeof Ionicons.glyphMap) => {
  function TabIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue | null;
    size: number;
    focused: boolean;
  }) {
    return (
      <Ionicons
        name={focused ? active : idle}
        size={size}
        color={typeof color === 'string' ? color : undefined}
      />
    );
  }
  TabIcon.displayName = `TabIcon(${active})`;
  return TabIcon;
};

export default function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const { unread } = useNotifications();
  const glass = useGlassTabs();

  if (loading) return null;
  if (!isAdmin) return <Redirect href="/" />;

  return (
    <Tabs screenOptions={glass}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Resumen', tabBarIcon: makeIcon('stats-chart', 'stats-chart-outline') }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Productos', tabBarIcon: makeIcon('pricetags', 'pricetags-outline') }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarIcon: makeIcon('receipt', 'receipt-outline'),
          tabBarBadge: unread || undefined,
          tabBarBadgeStyle: { backgroundColor: C.pink, color: C.onPink, fontSize: 10, fontWeight: '800' },
        }}
      />
      <Tabs.Screen
        name="users"
        options={{ title: 'Usuarios', tabBarIcon: makeIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ajustes', tabBarIcon: makeIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}
