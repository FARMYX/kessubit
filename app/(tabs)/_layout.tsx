import React from 'react';
import { type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from '../../src/lib/theme';
import { useCart } from '../../src/context/CartContext';
import { useGlassTabs } from '../../src/components/Glass';

const makeIcon = (
  active: keyof typeof MaterialCommunityIcons.glyphMap,
  idle: keyof typeof MaterialCommunityIcons.glyphMap,
) => {
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
      <MaterialCommunityIcons
        name={focused ? active : idle}
        size={size}
        color={typeof color === 'string' ? color : undefined}
      />
    );
  }
  TabIcon.displayName = `TabIcon(${active})`;
  return TabIcon;
};

export default function TabsLayout() {
  const { count } = useCart();
  const glass = useGlassTabs();

  return (
    <Tabs screenOptions={glass}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Tienda', tabBarIcon: makeIcon('music-box', 'music-box-outline') }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Carrito',
          tabBarIcon: makeIcon('cart', 'cart-outline'),
          tabBarBadge: count || undefined,
          tabBarBadgeStyle: { backgroundColor: C.pink, color: C.onPink, fontSize: 10, fontWeight: '800' },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Pedidos', tabBarIcon: makeIcon('receipt-text', 'receipt-text-outline') }}
      />
      <Tabs.Screen
        name="store"
        options={{ title: 'Local', tabBarIcon: makeIcon('store-marker', 'store-marker-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: makeIcon('account-music', 'account-music-outline') }}
      />
    </Tabs>
  );
}
