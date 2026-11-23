import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, money } from '../lib/theme';
import { fandomMeta, useFandoms } from '../lib/fandoms';
import { layout, radius, shadow, space, spring, tracking, type as typeScale, weight } from '../lib/design';
import { useBottomPadding, useResponsive } from '../lib/responsive';
import { initials } from '../lib/format';
import { stockColor, stockShortLabel, stockSoftColor, stockState } from '../lib/stock';
import { offerOf } from '../lib/offers';
import type { Product } from '../lib/types';
import { ProductImage } from './ProductImage';

export const MAXW = 1100;

export function useGrid() {
  const { cols, cardWidth } = useResponsive();
  return { cols, itemW: cardWidth };
}

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  padded?: boolean;
  contentContainerStyle?: ViewStyle;
};

export function Screen({ children, scroll = true, style, padded = true, contentContainerStyle }: ScreenProps) {
  const bottom = useBottomPadding();
  const { gutter } = useResponsive();
  const horizontal = padded ? gutter : 0;

  const inner = (
    <View
      style={[
        { width: '100%', maxWidth: MAXW, paddingHorizontal: horizontal },
        !scroll && { flex: 1 },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { alignItems: 'center', paddingTop: space.sm, paddingBottom: bottom },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

type PressyProps = {
  children: React.ReactNode;
  style?: any;
  hoverStyle?: any;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hitSlop?: number;
  scaleTo?: number;
};

export function Pressy({
  children,
  style,
  hoverStyle,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  hitSlop,
  scaleTo = 0.975,
}: PressyProps) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        // Reanimated shared values are mutable by design; the lint rule cannot see that.
        // eslint-disable-next-line react-hooks/immutability
        if (!reduced) scale.value = withSpring(scaleTo, spring.snappy);
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        if (!reduced) scale.value = withSpring(1, spring.snappy);
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        { opacity: disabled ? 0.55 : 1 },
        Platform.OS === 'web' && !disabled ? ({ cursor: 'pointer' } as any) : null,
        pressed ? { opacity: disabled ? 0.55 : 0.9 } : null,
      ]}
    >
      <Animated.View style={[style, animated, hovered ? hoverStyle : null]}>{children}</Animated.View>
    </Pressable>
  );
}

type BtnKind = 'primary' | 'soft' | 'ghost' | 'danger' | 'dangerSoft';

export function Btn({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
  icon,
  loading,
  compact,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const tones: Record<BtnKind, { bg: string; border: string; text: string }> = {
    primary: { bg: C.pink, border: C.pink, text: C.onPink },
    soft: { bg: C.pinkSoft, border: C.pinkSoft, text: C.pink },
    ghost: { bg: C.card, border: C.borderStrong, text: C.ink },
    danger: { bg: C.red, border: C.red, text: C.onPink },
    dangerSoft: { bg: C.redSoft, border: C.redSoft, text: C.red },
  };
  const tone = tones[kind];
  const inactive = disabled || loading;

  return (
    <Pressy
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={accessibilityLabel || title}
      style={[
        {
          minHeight: compact ? layout.touchTarget : 46,
          paddingHorizontal: compact ? space.md : space.lg,
          paddingVertical: compact ? space.sm : space.md,
          borderRadius: radius.md,
          backgroundColor: tone.bg,
          borderWidth: 1,
          borderColor: tone.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
        },
        style,
      ]}
      hoverStyle={Platform.OS === 'web' ? { filter: 'brightness(0.97)' } : undefined}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.text} />
      ) : icon ? (
        <Ionicons name={icon} size={17} color={tone.text} />
      ) : null}
      <Text style={{ color: tone.text, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>{title}</Text>
    </Pressy>
  );
}

export function Field({
  label,
  error,
  hint,
  style,
  containerStyle,
  value,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: space.md }, containerStyle]}>
      {label ? (
        <Text style={{ color: C.inkSoft, marginBottom: 6, fontSize: typeScale.small, fontWeight: weight.semibold }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={C.muted}
        {...props}
        // Un TextInput nunca debe alternar entre controlado y no controlado.
        // Algunos formularios reciben el valor desde Firestore y pueden
        // entregarlo undefined durante un render; '' mantiene el control.
        value={value ?? ''}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          {
            backgroundColor: C.card,
            borderWidth: 1.5,
            borderColor: error ? C.red : focused ? C.pink : C.border,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: Platform.OS === 'ios' ? space.md : 10,
            color: C.ink,
            fontSize: typeScale.bodyLg,
            minHeight: 46,
          },
          props.multiline && { minHeight: 100, textAlignVertical: 'top', paddingTop: space.md },
          style,
        ]}
      />
      {error ? (
        <Text style={{ color: C.red, fontSize: typeScale.small, marginTop: 5 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: C.muted, fontSize: typeScale.small, marginTop: 5 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  on,
  onPress,
  color = C.pink,
  icon,
  disabled,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          minHeight: layout.touchTarget,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.pill,
          marginRight: space.sm,
          marginBottom: 6,
          backgroundColor: on ? color : C.card,
          borderWidth: 1.5,
          borderColor: on ? color : C.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer', outlineStyle: 'none' } as any) : null,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={on ? C.onPink : C.inkSoft} /> : null}
      <Text style={{ color: on ? C.onPink : C.ink, fontWeight: weight.semibold, fontSize: typeScale.small }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({
  label,
  color,
  textColor = C.onPink,
  soft,
}: {
  label: string;
  color: string;
  textColor?: string;
  soft?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: soft ? C.surfaceAlt : color,
        borderRadius: radius.sm,
        borderWidth: soft ? 1 : 0,
        borderColor: color,
        paddingHorizontal: 7,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: soft ? color : textColor, fontSize: typeScale.caption, fontWeight: weight.bold }}>
        {label}
      </Text>
    </View>
  );
}

export function Title({
  children,
  subtitle,
  right,
  eyebrow,
}: {
  children: React.ReactNode;
  subtitle?: string;
  right?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: space.md,
        paddingTop: space.md,
        paddingBottom: space.lg,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        {eyebrow ? (
          <Text
            style={{
              color: C.pink,
              fontSize: typeScale.caption,
              fontWeight: weight.bold,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: typeScale.h1,
            fontWeight: weight.black,
            color: C.ink,
            letterSpacing: tracking.tight,
            lineHeight: typeScale.h1 * 1.15,
          }}
        >
          {children}
        </Text>
        {subtitle ? (
          <Text style={{ color: C.muted, fontSize: typeScale.body, lineHeight: 20, maxWidth: 560 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Empty({
  text,
  title,
  icon = 'sparkles-outline',
  action,
}: {
  text: string;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space['4xl'], paddingHorizontal: space.xl, gap: space.md }}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: C.pinkWash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={28} color={C.pink} />
      </View>
      {title ? (
        <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.title, textAlign: 'center' }}>
          {title}
        </Text>
      ) : null}
      <Text style={{ textAlign: 'center', color: C.muted, fontSize: typeScale.body, lineHeight: 21, maxWidth: 340 }}>
        {text}
      </Text>
      {action ? <Btn title={action.label} onPress={action.onPress} kind="soft" compact /> : null}
    </View>
  );
}

export function ProductCard({
  p,
  i = 0,
  w,
  onPress,
  onAdd,
  favorite,
  onToggleFavorite,
  collectionLabel,
  collectionColor,
}: {
  p: Product;
  i?: number;
  w: number;
  onPress: () => void;
  onAdd?: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  collectionLabel?: string;
  collectionColor?: string;
}) {
  const { fandoms } = useFandoms();
  const fandom = fandomMeta(fandoms, p.fandom);
  const reduced = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState(false);
  const state = stockState(p.stock, p.lowStockThreshold);
  const soldOut = state === 'agotado';
  const low = state === 'bajo';
  const offer = offerOf(p);

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(Math.min(i, 8) * 45).springify().damping(18)}
      style={{ width: w, marginBottom: space.md }}
    >
      <View>
        <Pressable
          onPress={onPress}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${money(p.price)}${offer.active ? `, antes ${money(offer.previous)}` : ''}`}
          style={({ pressed }) => [
            {
              backgroundColor: C.card,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: hovered ? C.borderStrong : C.border,
              overflow: 'hidden',
              opacity: pressed ? 0.92 : 1,
            },
            hovered ? shadow.card : null,
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
          ]}
        >
          <View style={{ position: 'relative' }}>
            <ProductImage product={p} height={w * 0.82} />
            <View style={{ position: 'absolute', top: 8, left: 8, gap: 4 }}>
              <Badge label={fandom.short} color={fandom.color} />
              {offer.active ? (
                <Badge label={`Bajó de precio · ${offer.label}`} color={C.pinkBright} />
              ) : null}
            </View>
            {soldOut ? (
            <View
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                backgroundColor: 'rgba(33,26,43,0.82)',
                borderRadius: radius.sm,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: typeScale.caption, fontWeight: weight.bold }}>Agotado</Text>
            </View>
          ) : low ? (
            <View
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                backgroundColor: C.yellowSoft,
                borderRadius: radius.sm,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: C.yellowDeep,
              }}
            >
              <Text style={{ color: C.yellowDeep, fontSize: typeScale.caption, fontWeight: weight.bold }}>
                ¡Últimas {p.stock}!
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: space.md, gap: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: C.muted, fontSize: typeScale.caption, fontWeight: weight.semibold }}>
              {p.brand}
            </Text>
            {collectionLabel ? (
              <Text style={{ color: collectionColor || C.purple, fontSize: typeScale.caption, fontWeight: weight.bold }}>
                · {collectionLabel}
              </Text>
            ) : null}
          </View>
          <Text
            numberOfLines={2}
            style={{
              color: C.ink,
              fontWeight: weight.bold,
              fontSize: typeScale.body,
              lineHeight: 19,
              minHeight: 38,
            }}
          >
            {p.name}
          </Text>
          <View style={{ marginTop: 2, gap: 2 }}>
            {offer.active ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text
                  style={{
                    color: C.muted,
                    fontSize: typeScale.small,
                    textDecorationLine: 'line-through',
                  }}
                >
                  {money(offer.previous)}
                </Text>
                <View
                  style={{
                    backgroundColor: C.pinkSoft,
                    borderRadius: radius.sm,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: C.pink, fontSize: typeScale.caption, fontWeight: weight.black }}>
                    {offer.label}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text
              style={{
                color: offer.active ? C.pink : C.ink,
                fontWeight: weight.black,
                fontSize: typeScale.title,
              }}
            >
              {money(p.price)}
            </Text>
          </View>

          {state !== 'ok' ? (
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: 2,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: radius.sm,
                backgroundColor: stockSoftColor(p.stock, p.lowStockThreshold),
              }}
            >
              <Ionicons
                name={soldOut ? 'close-circle' : 'alert-circle'}
                size={11}
                color={stockColor(p.stock, p.lowStockThreshold)}
              />
              <Text
                style={{
                  color: stockColor(p.stock, p.lowStockThreshold),
                  fontSize: typeScale.caption,
                  fontWeight: weight.bold,
                }}
              >
                {stockShortLabel(p.stock, p.lowStockThreshold)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

        {onToggleFavorite ? (
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.card,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={17} color={favorite ? C.pink : C.muted} />
          </Pressable>
        ) : null}

        {onAdd ? (
          <Pressable
            onPress={onAdd}
            disabled={soldOut}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Añadir ${p.name} al carrito`}
            accessibilityState={{ disabled: soldOut }}
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: soldOut ? C.bgAlt : C.pink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={19} color={soldOut ? C.muted : C.onPink} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function Avatar({ uri, name, size = 44 }: { uri?: string; name?: string; size?: number }) {
  if (uri) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: C.bgAlt }}>
        <ProductImage uri={uri} height={size} contentFit="cover" />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.pinkSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.pinkSoft,
      }}
    >
      <Text style={{ color: C.pink, fontWeight: weight.black, fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function Stars({
  value,
  size = 18,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(n)}
          hitSlop={onChange ? 6 : 0}
          accessibilityRole={onChange ? 'button' : undefined}
          accessibilityLabel={onChange ? `${n} estrellas` : undefined}
        >
          <Ionicons name={n <= Math.round(value) ? 'star' : 'star-outline'} size={size} color={C.yellow} />
        </Pressable>
      ))}
    </View>
  );
}

/** Small surface used by cards, order rows and settings blocks. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: C.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.border,
          padding: space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }, style]} />;
}
