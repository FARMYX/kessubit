import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { STORE } from '../lib/theme';

export type StoreMapProps = {
  user?: { lat: number; lng: number } | null;
  lat?: number;
  lng?: number;
  name?: string;
  address?: string;
};

export default function StoreMap({ user, lat = STORE.lat, lng = STORE.lng, name = STORE.name, address = STORE.address }: StoreMapProps) {
  return (
    <MapView
      style={{ width: '100%', height: 280, borderRadius: 18 }}
      initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={name} description={address} pinColor="#C93A72" />
      {user ? <Marker coordinate={{ latitude: user.lat, longitude: user.lng }} title="Tú" pinColor="#3F6FE0" /> : null}
    </MapView>
  );
}
