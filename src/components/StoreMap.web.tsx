import React from 'react';
import { STORE } from '../lib/theme';
import type { StoreMapProps } from './StoreMap';

// react-native-maps no funciona en web: usamos OpenStreetMap embebido.
export default function StoreMap({ user, lat = STORE.lat, lng = STORE.lng }: StoreMapProps) {
  const d = 0.01;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  return React.createElement('iframe', {
    src,
    title: 'Mapa de la tienda',
    style: { width: '100%', height: 280, border: 0, borderRadius: 18 },
    loading: 'lazy',
  });
}
