import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationsContext';
import { C } from '../lib/theme';
import { radius, weight } from '../lib/design';

export function NotificationBell({ size = 42, showLabel = false }: { size?: number; showLabel?: boolean }) {
  const { unread } = useNotifications();
  const router = useRouter();

  const open = () => router.push('/notifications' as any);
  const icon = unread > 0 ? 'notifications' : 'notifications-outline';

  if (showLabel) {
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `${unread} avisos sin leer` : 'Avisos'}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: radius.md,
            backgroundColor: pressed ? C.bgAlt : 'transparent',
          },
          { cursor: 'pointer' } as any,
        ]}
      >
        <Ionicons name={icon} size={20} color={C.inkSoft} />
        <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: 14, flex: 1 }}>Avisos</Text>
        {unread > 0 ? (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 5,
              backgroundColor: C.pink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.onPink, fontSize: 10, fontWeight: weight.black }}>
              {unread > 9 ? '9+' : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${unread} avisos sin leer` : 'Avisos'}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed ? C.bgAlt : C.card,
          borderWidth: 1,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        { cursor: 'pointer' } as any,
      ]}
    >
      <Ionicons name={icon} size={20} color={C.ink} />
      {unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: C.pink,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: C.bg,
          }}
        >
          <Text style={{ color: C.onPink, fontSize: 10, fontWeight: weight.black }}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
