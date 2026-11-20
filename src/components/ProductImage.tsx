import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { imgSource } from '../lib/assets';
import { C } from '../lib/theme';
import { radius } from '../lib/design';
import type { Product } from '../lib/types';

type Props = {
  product?: Partial<Product>;
  uri?: string;
  height?: number;
  width?: number | `${number}%`;
  contentFit?: ImageContentFit;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  priority?: 'low' | 'normal' | 'high';
};

/**
 * Product photography on a calm surface. expo-image handles caching and the
 * fade-in, while the neutral block avoids layout jumps.
 */
export function ProductImage({
  product,
  uri,
  height = 180,
  width = '100%',
  contentFit = 'contain',
  radius: r = radius.md,
  style,
  priority = 'normal',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const source = uri ? { uri } : product ? imgSource(product) : null;

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: r,
          backgroundColor: C.surfaceAlt,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {!loaded ? <View style={{ position: 'absolute', inset: 0, backgroundColor: C.surfaceAlt }} /> : null}
      {source ? (
        <Image
          source={source as any}
          style={{ width: '100%', height: '100%' }}
          contentFit={contentFit}
          transition={reduced ? 0 : 180}
          cachePolicy="memory-disk"
          priority={priority}
          onLoad={() => setLoaded(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}
