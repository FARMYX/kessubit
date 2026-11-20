import React, { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, money } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { useResponsive } from '../../src/lib/responsive';
import { useCart } from '../../src/context/CartContext';
import { useProducts } from '../../src/context/ProductsContext';
import { useStoreConfig } from '../../src/context/StoreConfigContext';
import { useToast } from '../../src/context/ToastContext';
import { haptic } from '../../src/lib/haptics';
import { playSound } from '../../src/lib/sound';
import { confirmAction } from '../../src/lib/confirm';
import { Btn, Card, Divider, Empty, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { ProductImage } from '../../src/components/ProductImage';
import { QuantityStepper } from '../../src/components/QuantityStepper';
import { Skeleton } from '../../src/components/Skeleton';

export default function Cart() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { lines, count, subtotal, ready, setQty, remove, clear, sync } = useCart();
  const { products, loading } = useProducts();
  const { config } = useStoreConfig();
  const toast = useToast();

  useEffect(() => {
    if (!loading) sync(products);
  }, [products, loading, sync]);

  const shipping = useMemo(() => {
    if (!config.deliveryEnabled) return 0;
    if (subtotal >= Number(config.freeShippingThreshold || 0)) return 0;
    return Number(config.shippingCost || 0);
  }, [subtotal, config]);

  const missingForFree = Math.max(0, Number(config.freeShippingThreshold || 0) - subtotal);
  const progress = config.freeShippingThreshold
    ? Math.min(1, subtotal / Number(config.freeShippingThreshold))
    : 1;

  const updateQty = (id: string, qty: number) => {
    setQty(id, qty);
    haptic.tap();
  };

  const removeLine = (id: string, name: string) => {
    remove(id);
    haptic.light();
    toast.show({
      kind: 'info',
      title: 'Producto quitado',
      message: name,
      action: { label: 'Deshacer', onPress: () => router.push('/') },
    });
  };

  const clearCart = () => {
    confirmAction('Vaciar carrito', 'Se quitarán todos los productos. ¿Continuar?', () => {
      clear();
      haptic.warning();
      toast.info('Carrito vacío');
    }, 'Sí, vaciar');
  };

  if (!ready) {
    return (
      <Screen>
        <ScreenHeader title="Carrito" />
        <Card style={{ gap: space.md }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton width="52%" height={18} />
        </Card>
      </Screen>
    );
  }

  if (!lines.length) {
    return (
      <Screen>
        <ScreenHeader title="Carrito" subtitle="Los instrumentos que elijas aparecen aquí." />
        <Empty
          icon="bag-handle-outline"
          title="Tu carrito está vacío"
          text="Explora el catálogo y añade la guitarra, el bajo o el accesorio que tu banda necesita."
          action={{ label: 'Ver catálogo', onPress: () => router.push('/') }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Carrito"
        eyebrow={`${count} producto${count === 1 ? '' : 's'}`}
        subtitle="Revisa cantidades y disponibilidad antes de pagar."
        right={
          <Pressable onPress={clearCart} hitSlop={8} accessibilityRole="button" accessibilityLabel="Vaciar carrito">
            <Text style={{ color: C.muted, fontWeight: weight.semibold, fontSize: typeScale.small }}>Vaciar</Text>
          </Pressable>
        }
      />

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, width: '100%', gap: space.md }}>
          {lines.map((line) => {
            const atMax = line.qty >= Number(line.product.stock);
            return (
              <Card key={line.product.id} style={{ padding: space.md }}>
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <Pressable
                    onPress={() => router.push(`/product/${line.product.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={line.product.name}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { cursor: 'pointer' } as any]}
                  >
                    <ProductImage product={line.product} width={88} height={88} radius={radius.md} />
                  </Pressable>

                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: C.muted, fontSize: typeScale.caption, fontWeight: weight.semibold }}>
                          {line.product.brand}
                        </Text>
                        <Text numberOfLines={2} style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg, lineHeight: 20 }}>
                          {line.product.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => removeLine(line.product.id, line.product.name)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${line.product.name}`}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }, { cursor: 'pointer' } as any]}
                      >
                        <Ionicons name="trash-outline" size={18} color={C.muted} />
                      </Pressable>
                    </View>

                    <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.bodyLg }}>
                      {money(line.product.price)}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, flexWrap: 'wrap', gap: space.sm }}>
                      <QuantityStepper
                        value={line.qty}
                        onChange={(next) => updateQty(line.product.id, next)}
                        max={Math.max(1, line.product.stock)}
                        compact
                      />
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.bodyLg }}>
                          {money(line.product.price * line.qty)}
                        </Text>
                        {atMax ? (
                          <Text style={{ color: C.yellowDeep, fontSize: typeScale.caption, fontWeight: weight.semibold }}>
                            Máximo disponible
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}

          <Pressable
            onPress={() => router.push('/')}
            accessibilityRole="button"
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                paddingVertical: 6,
                opacity: pressed ? 0.7 : 1,
              },
              { cursor: 'pointer' } as any,
            ]}
          >
            <Ionicons name="arrow-back" size={15} color={C.pink} />
            <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.body }}>Seguir comprando</Text>
          </Pressable>
        </View>

        <View style={{ width: isDesktop ? 340 : '100%', gap: space.md }}>
          <Card style={{ gap: space.md }}>
            <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>Resumen</Text>

            <View style={{ gap: 8 }}>
              <Row label="Subtotal" value={money(subtotal)} />
              <Row
                label="Envío estimado"
                value={shipping === 0 ? 'Gratis' : money(shipping)}
                accent={shipping === 0 ? C.green : undefined}
              />
              {config.deliveryEnabled && missingForFree > 0 ? (
                <View style={{ gap: 6, marginTop: 2 }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.bgAlt, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.max(4, progress * 100)}%`, height: '100%', backgroundColor: C.pink }} />
                  </View>
                  <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                    Te faltan {money(missingForFree)} para envío gratis.
                  </Text>
                </View>
              ) : config.deliveryEnabled ? (
                <Text style={{ color: C.green, fontSize: typeScale.caption, fontWeight: weight.semibold }}>
                  Tu pedido tiene envío gratis.
                </Text>
              ) : null}
            </View>

            <Divider />

            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>Total</Text>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3 }}>
                {money(subtotal + shipping)}
              </Text>
            </View>

            <Btn
              title="Continuar al pago"
              icon="arrow-forward"
              onPress={() => {
                playSound('pop');
                router.push('/checkout');
              }}
            />
            <Text style={{ color: C.muted, fontSize: typeScale.caption, textAlign: 'center' }}>
              El envío final se confirma según el tipo de entrega.
            </Text>
          </Card>

          <View
            style={{
              flexDirection: 'row',
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: C.surfaceAlt,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={C.green} />
            <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
              El stock se descuenta al confirmar el pedido. Si algo cambia, te avisamos.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: C.muted, fontSize: typeScale.body }}>{label}</Text>
      <Text style={{ color: accent || C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>{value}</Text>
    </View>
  );
}
