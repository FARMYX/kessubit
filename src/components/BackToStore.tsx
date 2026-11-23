import React from 'react';
import { useRouter } from 'expo-router';
import { Btn } from './UI';
import { haptic } from '../lib/haptics';
import { useResponsive } from '../lib/responsive';

/**
 * Atajo para salir del panel de administración y volver al catálogo.
 * En pantallas pequeñas se acorta el texto para no competir con el título.
 */
export function BackToStore() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  return (
    <Btn
      title={isDesktop ? 'Volver a la tienda' : 'Tienda'}
      accessibilityLabel="Volver a la tienda"
      kind="ghost"
      icon="storefront-outline"
      compact
      onPress={() => {
        haptic.tap();
        router.replace('/');
      }}
    />
  );
}
