import React from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import { layout, radius, weight } from '../lib/design';

/**
 * Two shells, one identity:
 * - phone: floating translucent bar at the bottom;
 * - desktop (>= 900px): a real left sidebar with brand header.
 */
export function useGlassTabs() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= layout.desktopBreakpoint;

  if (isDesktop) {
    return {
      headerShown: false,
      tabBarPosition: 'left' as const,
      tabBarVariant: 'material' as const,
      tabBarLabelPosition: 'beside-icon' as const,
      tabBarActiveTintColor: C.pink,
      tabBarInactiveTintColor: C.inkSoft,
      tabBarActiveBackgroundColor: C.pinkWash,
      tabBarLabelStyle: { fontSize: 14, fontWeight: weight.semibold as any },
      tabBarIconStyle: { marginRight: 2 },
      tabBarItemStyle: {
        borderRadius: radius.md,
        marginHorizontal: 8,
        marginVertical: 3,
        paddingVertical: 4,
      },
      tabBarHideOnKeyboard: false,
      tabBarStyle: {
        width: layout.sidebarWidth,
        flexShrink: 0,
        backgroundColor: C.card,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: C.border,
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        paddingTop: 96,
        paddingBottom: Math.max(insets.bottom, 16),
        paddingHorizontal: 6,
        overflow: 'hidden' as const,
      },
      tabBarBackground: () => (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card }]} pointerEvents="none">
          <View
            style={{
              paddingTop: Math.max(insets.top, 20) + 12,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Image
              source={require('../../assets/images/kesuubit-icon.png')}
              style={{ width: 38, height: 38, borderRadius: 12 }}
              contentFit="cover"
              accessibilityLabel="KESUUBIT"
            />
            <View>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: 16, letterSpacing: -0.3 }}>
                KESUUBIT
              </Text>
              <Text style={{ color: C.muted, fontSize: 11, fontWeight: weight.semibold }}>
                Instrumentos de banda
              </Text>
            </View>
          </View>

          <View
            style={{
              position: 'absolute',
              left: 22,
              right: 22,
              bottom: Math.max(insets.bottom, 16) + 12,
            }}
          >
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginBottom: 12 }} />
            <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16 }}>
              Hecho para sonar · Oruro, Bolivia.
            </Text>
          </View>
        </View>
      ),
    };
  }

  const barWidth = Math.min(width - 28, 520);
  const side = (width - barWidth) / 2;

  return {
    headerShown: false,
    tabBarActiveTintColor: C.pink,
    tabBarInactiveTintColor: C.muted,
    tabBarLabelPosition: 'below-icon' as const,
    tabBarLabelStyle: { fontSize: 10.5, fontWeight: weight.bold as any },
    tabBarItemStyle: { paddingVertical: 5 },
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      position: 'absolute' as const,
      left: side,
      right: side,
      bottom: 10 + insets.bottom,
      height: 66,
      borderRadius: 33,
      overflow: 'hidden' as const,
      borderTopWidth: 0,
      backgroundColor: 'transparent',
      elevation: 0,
      shadowColor: '#2A1626',
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    tabBarBackground: () => (
      <View style={[StyleSheet.absoluteFill, { borderRadius: 33, overflow: 'hidden' }]}>
        <BlurView
          intensity={Platform.OS === 'web' ? 40 : 70}
          tint="light"
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.55)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.95)',
              borderRadius: 33,
            },
          ]}
        />
      </View>
    ),
  };
}
