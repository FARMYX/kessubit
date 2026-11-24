import React, { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { STORE } from '../lib/theme';

export type StoreMapProps = {
  user?: { lat: number; lng: number } | null;
  lat?: number;
  lng?: number;
  name?: string;
  address?: string;
};

// Uses OpenStreetMap embed to avoid native Google Maps API key crashes on Android.
export default function StoreMap({ lat = STORE.lat, lng = STORE.lng }: StoreMapProps) {
  const d = 0.01;
  const src = useMemo(
    () =>
      `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`,
    [lat, lng]
  );

  return (
    <View style={{ width: '100%', height: 280, borderRadius: 18, overflow: 'hidden' }}>
      <WebView
        source={{ uri: src }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
