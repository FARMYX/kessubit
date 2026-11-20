import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { C } from '../lib/theme';
import { radius } from '../lib/design';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Neutral shimmer block used while Firestore data loads. */
export function Skeleton({ width = '100%', height = 14, borderRadius = radius.sm, style }: Props) {
  const reduced = useReducedMotion() ?? false;
  const progress = useSharedValue(0.55);

  React.useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [reduced, progress]);

  const animated = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: C.bgAlt },
        animated,
        style,
      ]}
    />
  );
}

export function SkeletonText({ lines = 3, lineHeight = 12 }: { lines?: number; lineHeight?: number }) {
  return (
    <View style={{ gap: 7 }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? '62%' : '100%'}
          borderRadius={6}
        />
      ))}
    </View>
  );
}
