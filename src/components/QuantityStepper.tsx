import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';
import { radius, space, weight } from '../lib/design';
import { clamp } from '../lib/format';

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
  disabled?: boolean;
};

export function QuantityStepper({ value, onChange, min = 1, max = 99, compact, disabled }: Props) {
  const size = compact ? 30 : 38;
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  const button = (icon: 'remove' | 'add', enabled: boolean, next: number) => (
    <Pressable
      disabled={!enabled}
      onPress={() => onChange(clamp(next, min, max))}
      accessibilityRole="button"
      accessibilityLabel={icon === 'add' ? 'Aumentar cantidad' : 'Disminuir cantidad'}
      accessibilityState={{ disabled: !enabled }}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? C.bgAlt : C.surfaceAlt,
          borderWidth: 1,
          borderColor: C.border,
          opacity: enabled ? 1 : 0.4,
        },
        { cursor: enabled ? 'pointer' : 'default' } as any,
      ]}
    >
      <Ionicons name={icon} size={compact ? 15 : 17} color={C.ink} />
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {button('remove', canDec, value - 1)}
      <Text
        style={{
          minWidth: compact ? 20 : 26,
          textAlign: 'center',
          color: C.ink,
          fontWeight: weight.bold,
          fontSize: compact ? 13 : 15,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      {button('add', canInc, value + 1)}
    </View>
  );
}
