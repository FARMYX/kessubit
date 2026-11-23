import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';
import { space, tracking, type as typeScale, weight } from '../lib/design';
import { useResponsive } from '../lib/responsive';

type Props = {
  title: string;
  subtitle?: string;
  /** Se conserva por compatibilidad; los encabezados ya no usan kickers. */
  eyebrow?: string;
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
};

export function ScreenHeader({ title, subtitle, back, right, onBack }: Props) {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: space.md,
        paddingTop: space.sm,
        paddingBottom: space.lg,
      }}
    >
      {back ? (
        <Pressable
          onPress={onBack || (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: pressed ? C.bgAlt : C.card,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            },
            { cursor: 'pointer' } as any,
          ]}
        >
          <Ionicons name={isDesktop ? 'arrow-back' : 'chevron-back'} size={20} color={C.ink} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: C.ink,
            fontSize: isDesktop ? typeScale.h1 : typeScale.h2,
            fontWeight: weight.black,
            letterSpacing: tracking.tight,
            lineHeight: (isDesktop ? typeScale.h1 : typeScale.h2) * 1.16,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: C.muted, fontSize: typeScale.body, lineHeight: 20, maxWidth: 620 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>{right}</View> : null}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color = C.ink,
  badge,
  size = 42,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
  badge?: number;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <Ionicons name={icon} size={20} color={color} />
      {badge && badge > 0 ? (
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
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
