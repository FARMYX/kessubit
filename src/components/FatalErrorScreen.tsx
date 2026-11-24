import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { DARK_PALETTE } from '../lib/theme';
import type { StartupIssue } from '../lib/startupErrors';

type Props = {
  error?: Error | null;
  componentStack?: string | null;
  issues?: StartupIssue[];
  retry?: () => void;
};

const buildReport = ({ error, componentStack, issues = [] }: Props) => {
  const parts = issues.map(({ scope, detail }) => `[${scope}]\n${detail}`);
  if (error) parts.push(`[react]\n${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  if (componentStack) parts.push(`[componentes]\n${componentStack}`);
  return parts.join('\n\n') || 'Error sin detalles.';
};

/** Standalone diagnostic UI: it must not depend on any app provider. */
export function FatalErrorScreen(props: Props) {
  const { retry, issues = [] } = props;
  const [copied, setCopied] = useState(false);
  const report = buildReport(props);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(report);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
        <Text style={styles.brand}>KESUUBIT</Text>
        <Text style={styles.title}>No pudimos abrir la app</Text>
        <Text style={styles.lead}>
          Esta pantalla es temporal de diagnóstico. Copia el texto y envíamelo para ver la causa exacta.
        </Text>

        {issues.length > 0 ? (
          <View style={styles.checklist}>
            {issues.map(({ scope }, index) => (
              <Text key={`${scope}-${index}`} style={styles.checkItem}>
                {index + 1}. {scope}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.reportBox}>
          <Text style={styles.reportLabel}>Detalle técnico</Text>
          <Text style={styles.report} selectable>
            {report}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copiar el error al portapapeles"
            onPress={copy}
            style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{copied ? 'Error copiado' : 'Copiar error'}</Text>
          </Pressable>

          {retry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a intentar"
              onPress={retry}
              style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Reintentar</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const P = DARK_PALETTE;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: P.bg,
  },
  content: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 18,
  },
  brand: {
    color: P.pinkBright,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: P.ink,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 33,
  },
  lead: {
    color: P.inkSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  checklist: {
    borderLeftWidth: 3,
    borderLeftColor: P.pink,
    paddingLeft: 12,
    gap: 4,
  },
  checkItem: {
    color: P.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  reportBox: {
    backgroundColor: P.card,
    borderColor: P.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  reportLabel: {
    color: P.pinkBright,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  report: {
    color: P.ink,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 150,
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: P.pink,
  },
  secondary: {
    backgroundColor: P.surfaceAlt,
    borderColor: P.borderStrong,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  primaryText: {
    color: P.onPink,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryText: {
    color: P.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
