import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutUp, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import { radius, shadow, space, type as typeScale } from '../lib/design';
import { useResponsive } from '../lib/responsive';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastInput = {
  kind?: ToastKind;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onPress: () => void };
};

type ToastItem = ToastInput & { id: number };

type Ctx = {
  show: (toast: ToastInput | string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: () => void;
};

const ToastCtx = createContext<Ctx>(null as any);
export const useToast = () => useContext(ToastCtx);

const palette: Record<ToastKind, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
  success: { icon: 'checkmark-circle', color: C.green, bg: C.greenSoft, border: '#BFE6D2' },
  error: { icon: 'alert-circle', color: C.red, bg: C.redSoft, border: '#F3C9CC' },
  info: { icon: 'information-circle', color: C.blue, bg: C.blueSoft, border: '#C9D8FB' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const reduced = useReducedMotion() ?? false;

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (input: ToastInput | string) => {
      const next = typeof input === 'string' ? { title: input } : input;
      const kind = next.kind || 'info';
      counter.current += 1;
      setToast({ ...next, kind, id: counter.current });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), next.duration ?? (kind === 'error' ? 5000 : 3600));
    },
    []
  );

  const value = useMemo<Ctx>(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({ kind: 'success', title, message }),
      error: (title, message) => show({ kind: 'error', title, message }),
      info: (title, message) => show({ kind: 'info', title, message }),
    }),
    [show, dismiss]
  );

  const tone = palette[(toast?.kind as ToastKind) || 'info'];
  const position = isDesktop
    ? { top: insets.top + space.lg, right: space.xl }
    : { bottom: 96 + insets.bottom, left: space.lg, right: space.lg };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', ...position, alignItems: isDesktop ? 'flex-end' : 'stretch', zIndex: 9999 }}>
          <Animated.View
            key={toast.id}
            entering={reduced ? undefined : isDesktop ? FadeInUp.duration(180) : FadeInDown.duration(200)}
            exiting={reduced ? undefined : isDesktop ? FadeOutUp.duration(140) : FadeOutDown.duration(140)}
            style={[
              {
                width: isDesktop ? 360 : undefined,
                maxWidth: '100%',
                backgroundColor: C.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: tone.border,
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                flexDirection: 'row',
                gap: space.md,
                alignItems: 'flex-start',
              },
              shadow.float,
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            ]}
            accessibilityLiveRegion="polite"
            role="status"
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={tone.icon} size={18} color={tone.color} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: typeScale.bodyLg }}>{toast.title}</Text>
              {toast.message ? (
                <Text style={{ color: C.inkSoft, fontSize: typeScale.body, lineHeight: 20 }}>{toast.message}</Text>
              ) : null}
              {toast.action ? (
                <Pressable
                  onPress={() => {
                    toast.action?.onPress();
                    dismiss();
                  }}
                  hitSlop={8}
                  style={{ alignSelf: 'flex-start', paddingTop: 6 }}
                >
                  <Text style={{ color: C.pink, fontWeight: '800', fontSize: typeScale.body }}>{toast.action.label}</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Cerrar aviso">
              <Ionicons name="close" size={18} color={C.muted} />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}
