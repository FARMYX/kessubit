import React, { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { C, money } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { useResponsive } from '../../src/lib/responsive';
import { useStoreConfig } from '../../src/context/StoreConfigContext';
import { useToast } from '../../src/context/ToastContext';
import { notify } from '../../src/lib/notify';
import { haptic } from '../../src/lib/haptics';
import { Btn, Card, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import StoreMap from '../../src/components/StoreMap';

const km = (a: number, b: number, c: number, d: number) => {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(c - a) / 2) ** 2 +
    Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export default function Store() {
  const { isDesktop } = useResponsive();
  const { config } = useStoreConfig();
  const toast = useToast();

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${config.lat},${config.lng}`;

  const locate = async () => {
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        toast.error('Ubicación no permitida', 'Actívala para calcular la distancia a la tienda.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const next = { lat: location.coords.latitude, lng: location.coords.longitude };
      const d = km(next.lat, next.lng, config.lat, config.lng);
      setPos(next);
      setDistance(d);
      haptic.light();
      if (d < 0.5) {
        notify('¡Estás cerca!', 'La tienda está a menos de 500 m. ¡Pasa a probar los instrumentos!');
      }
    } catch {
      toast.error('No se pudo obtener tu ubicación', 'Revisa los permisos del sistema.');
    } finally {
      setBusy(false);
    }
  };

  const contact = useMemo(
    () =>
      [
        config.phone
          ? { icon: 'call-outline' as const, label: 'Llamar', value: config.phone, url: `tel:${config.phone}` }
          : null,
        config.whatsapp
          ? {
              icon: 'logo-whatsapp' as const,
              label: 'WhatsApp',
              value: config.whatsapp,
              url: `https://wa.me/${config.whatsapp.replace(/\D/g, '')}`,
            }
          : null,
        config.email
          ? { icon: 'mail-outline' as const, label: 'Correo', value: config.email, url: `mailto:${config.email}` }
          : null,
      ].filter(Boolean) as { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; url: string }[],
    [config.phone, config.whatsapp, config.email]
  );

  return (
    <Screen>
      <ScreenHeader
        title="Nuestro local"
        eyebrow="Oruro, Bolivia"
        subtitle="Ven a probar los instrumentos antes de llevártelos. También coordinamos entregas."
      />

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 1.25, width: '100%', gap: space.md }}>
          <View
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: C.border,
              overflow: 'hidden',
              backgroundColor: C.card,
            }}
          >
            <StoreMap user={pos} lat={config.lat} lng={config.lng} name={config.name} address={config.address} />
          </View>

          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: C.pinkSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="storefront" size={21} color={C.pink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
                  {config.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: typeScale.small }}>{config.address}</Text>
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <InfoLine icon="time-outline" text={config.hours} />
              <InfoLine icon="bicycle-outline" text={`Envío ${money(config.shippingCost)} · gratis desde ${money(config.freeShippingThreshold)}`} />
              <InfoLine icon="cube-outline" text="Stock real actualizado en la app." />
            </View>

            {distance !== null ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: C.greenSoft,
                  borderWidth: 1,
                  borderColor: '#BFE6D2',
                }}
              >
                <Ionicons name="navigate" size={18} color={C.green} />
                <Text style={{ flex: 1, color: C.green, fontWeight: weight.bold, fontSize: typeScale.body }}>
                  Estás a {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} de la tienda
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Btn
                title={busy ? 'Buscando…' : '¿Qué tan lejos estoy?'}
                icon="navigate-outline"
                onPress={locate}
                loading={busy}
              />
              <Btn
                title="Cómo llegar"
                kind="ghost"
                icon="map-outline"
                onPress={() => Linking.openURL(directions)}
              />
            </View>
          </Card>
        </View>

        <View style={{ width: isDesktop ? 320 : '100%', gap: space.md }}>
          <Card style={{ gap: space.sm }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Contacto</Text>
            {contact.length ? (
              contact.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => Linking.openURL(item.url)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}: ${item.value}`}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingVertical: 10,
                      paddingHorizontal: space.md,
                      borderRadius: radius.md,
                      backgroundColor: pressed ? C.bgAlt : C.surfaceAlt,
                      borderWidth: 1,
                      borderColor: C.border,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Ionicons name={item.icon} size={18} color={C.pink} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.small }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: typeScale.caption }}>{item.value}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={C.muted} />
                </Pressable>
              ))
            ) : (
              <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 19 }}>
                Los datos de contacto se configuran desde el panel de administración → Ajustes.
              </Text>
            )}
          </Card>

          <Card style={{ gap: space.sm }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Entrega</Text>
            <Feature
              enabled={config.deliveryEnabled}
              icon="bicycle-outline"
              title="Envío a domicilio"
              text={`${money(config.shippingCost)} · gratis desde ${money(config.freeShippingThreshold)}`}
            />
            <Feature
              enabled={config.pickupEnabled}
              icon="storefront-outline"
              title="Retiro en tienda"
              text={config.address}
            />
          </Card>

          {config.announcement ? (
            <View
              style={{
                flexDirection: 'row',
                gap: space.sm,
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: C.pinkWash,
                borderWidth: 1,
                borderColor: '#F3D2E1',
              }}
            >
              <Ionicons name="megaphone" size={17} color={C.pink} />
              <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                {config.announcement}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function InfoLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Ionicons name={icon} size={16} color={C.inkSoft} />
      <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function Feature({
  enabled,
  icon,
  title,
  text,
}: {
  enabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', opacity: enabled ? 1 : 0.5 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          backgroundColor: C.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Ionicons name={icon} size={17} color={C.pink} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.body }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 17 }}>{text}</Text>
      </View>
      <Ionicons
        name={enabled ? 'checkmark-circle' : 'close-circle'}
        size={17}
        color={enabled ? C.green : C.muted}
      />
    </View>
  );
}
