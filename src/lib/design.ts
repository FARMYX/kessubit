import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * KESUUBIT design tokens.
 * One source of truth for spacing, type, radii, depth and motion.
 * Product UI (Operate mode): restrained colour, tight type scale, motion only for state.
 */

export const FONT = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 30,
  pill: 999,
} as const;

export const type = {
  caption: 11,
  small: 12,
  body: 14,
  bodyLg: 15,
  title: 17,
  h3: 20,
  h2: 24,
  h1: 30,
  display: 40,
} as const;

export const weight = {
  regular: '400',
  medium: '600',
  semibold: '700',
  bold: '800',
  black: '900',
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const tracking = {
  tight: -0.6,
  snug: -0.3,
  normal: 0,
  wide: 0.4,
} as const;

export const duration = {
  instant: 100,
  fast: 140,
  base: 200,
  slow: 260,
  sheet: 340,
} as const;

export const ease = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

export const spring = {
  soft: { damping: 20, stiffness: 220, mass: 0.9 },
  snappy: { damping: 18, stiffness: 280, mass: 0.8 },
  gentle: { damping: 24, stiffness: 180, mass: 1 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#2A1626',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  float: {
    shadowColor: '#2A1626',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#2A1626',
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
} as const;

export const layout = {
  maxWidth: 1100,
  sidebarWidth: 248,
  desktopBreakpoint: 900,
  gridGap: 12,
  touchTarget: 44,
} as const;
