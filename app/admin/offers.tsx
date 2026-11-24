import React, { useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, money } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { useProducts } from '../../src/context/ProductsContext';
import { useToast } from '../../src/context/ToastContext';
import { confirmAction } from '../../src/lib/confirm';
import { haptic } from '../../src/lib/haptics';
import { playSound } from '../../src/lib/sound';
import {
  createOfferBundle,
  removeOfferBundle,
  updateOfferBundle,
  useOfferBundles,
} from '../../src/lib/offerBundles';
import { Btn, Card, Chip, Empty, Field, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { BackToStore } from '../../src/components/BackToStore';
import { ProductImage } from '../../src/components/ProductImage';
import type { OfferBundle } from '../../src/lib/types';

export default function AdminOffers() {
  const { products } = useProducts();
  const { bundles } = useOfferBundles();
  const toast = useToast();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const chosen = selected
    .map((id) => productMap.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const original = chosen.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const offer = Number(price);
  const savings = original > 0 && offer > 0 ? Math.max(0, original - offer) : 0;

  const reset = () => {
    setName('');
    setPrice('');
    setSelected([]);
    setEditing(null);
    setError('');
  };

  const startEdit = (bundle: OfferBundle) => {
    setName(bundle.name);
    setPrice(String(bundle.offerPrice));
    setSelected(bundle.productIds.filter((id) => productMap.has(id)).slice(0, 8));
    setEditing(bundle.id);
    setError('');
  };

  const toggleProduct = (id: string) => {
    setError('');
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 8) {
        toast.info('Máximo 8 productos', 'Quita uno para añadir otro.');
        return current;
      }
      return [...current, id];
    });
  };

  const save = async () => {
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError('Ponle un nombre a la oferta.');
      return;
    }
    if (selected.length < 2) {
      setError('Elige al menos 2 productos.');
      return;
    }
    if (!(offer > 0) || !Number.isFinite(offer)) {
      setError('Escribe un precio de oferta válido.');
      return;
    }
    if (!(original > offer)) {
      setError('La oferta debe costar menos que la suma de los productos.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const input = {
        name: cleanName,
        productIds: selected,
        offerPrice: Math.round(offer * 100) / 100,
        originalPrice: Math.round(original * 100) / 100,
      };
      if (editing) await updateOfferBundle(editing, input);
      else await createOfferBundle(input);
      playSound('offer');
      haptic.success();
      toast.success(editing ? 'Oferta actualizada' : 'Oferta creada', cleanName);
      reset();
    } catch {
      haptic.error();
      setError('No se pudo guardar. Revisa tus permisos de administrador.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = (bundle: OfferBundle) => {
    updateOfferBundle(bundle.id, { active: bundle.active === false })
      .then(() => {
        haptic.tap();
        toast.info(
          bundle.active === false ? 'Oferta visible' : 'Oferta oculta',
          bundle.name
        );
      })
      .catch(() => toast.error('No se pudo cambiar', 'Revisa tus permisos.'));
  };

  const remove = (bundle: OfferBundle) => {
    confirmAction(`Borrar "${bundle.name}"`, 'La oferta desaparecerá del catálogo.', async () => {
      try {
        await removeOfferBundle(bundle.id);
        if (editing === bundle.id) reset();
        haptic.warning();
        toast.info('Oferta borrada', bundle.name);
      } catch {
        toast.error('No se pudo borrar', 'Revisa tus permisos de administrador.');
      }
    }, 'Borrar');
  };

  return (
    <Screen>
      <ScreenHeader
        title="Ofertas"
        eyebrow="Administración"
        subtitle="Elige productos y ponles un precio de conjunto. La oferta aparece en la tienda."
        right={<BackToStore />}
      />

      <Card style={{ gap: space.sm }}>
        <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
          {editing ? 'Editar oferta' : 'Nueva oferta'}
        </Text>
        <Field
          label="Nombre de la oferta"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Combo para empezar"
        />
        <Field
          label="Precio de la oferta (Bs)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          hint={
            original
              ? `Suma normal ${money(original)} · Ahorro ${money(savings)}`
              : 'Elige al menos 2 productos para ver el precio normal.'
          }
          containerStyle={{ marginBottom: 0 }}
        />

        <Text style={{ color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.semibold }}>
          Productos incluidos ({selected.length}/8)
        </Text>
        {products.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {products.map((product) => {
              const on = selected.includes(product.id);
              return (
                <Pressable
                  key={product.id}
                  onPress={() => toggleProduct(product.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Incluir ${product.name}`}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: on ? C.pink : C.border,
                      backgroundColor: on ? C.pinkSoft : C.surfaceAlt,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={15}
                    color={on ? C.pink : C.muted}
                  />
                  <Text
                    style={{
                      color: on ? C.pink : C.inkSoft,
                      fontWeight: weight.semibold,
                      fontSize: typeScale.small,
                      maxWidth: 220,
                    }}
                    numberOfLines={1}
                  >
                    {product.name} · {money(product.price)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: C.muted, fontSize: typeScale.small }}>
            Añade productos al catálogo antes de crear ofertas.
          </Text>
        )}

        {chosen.length ? (
          <View style={{ gap: space.xs }}>
            {chosen.map((product) => (
              <View key={product.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <ProductImage product={product} style={{ width: 34, height: 34, borderRadius: 8 }} />
                <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.small }} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: typeScale.small }}>{money(product.price)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {error ? <Text style={{ color: C.red, fontSize: typeScale.small }}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Btn
            title={editing ? 'Guardar oferta' : 'Crear oferta'}
            icon="checkmark"
            onPress={save}
            loading={busy}
          />
          {editing ? <Btn title="Cancelar" kind="ghost" onPress={reset} /> : null}
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pricetags-outline" size={18} color={C.pink} />
          <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>
            Ofertas activas
          </Text>
        </View>
        {bundles.length ? (
          bundles.map((bundle) => {
            const items = bundle.productIds
              .map((id) => productMap.get(id))
              .filter(Boolean) as NonNullable<ReturnType<typeof productMap.get>>[];
            const sum = items.reduce((total, item) => total + Number(item.price || 0), 0);
            return (
              <View
                key={bundle.id}
                style={{
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: C.surfaceAlt,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      {bundle.name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                      {items.length || bundle.productIds.length} productos ·{' '}
                      {bundle.active === false ? 'Oculta' : 'Visible'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => startEdit(bundle)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar oferta ${bundle.name}`}
                    hitSlop={8}
                  >
                    <Ionicons name="create-outline" size={18} color={C.inkSoft} />
                  </Pressable>
                  <Pressable
                    onPress={() => toggleActive(bundle)}
                    accessibilityRole="button"
                    accessibilityLabel={bundle.active === false ? `Mostrar ${bundle.name}` : `Ocultar ${bundle.name}`}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={bundle.active === false ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={C.inkSoft}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => remove(bundle)}
                    accessibilityRole="button"
                    accessibilityLabel={`Borrar oferta ${bundle.name}`}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={C.red} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  {sum > bundle.offerPrice ? (
                    <Chip label={`Antes ${money(sum)}`} onPress={() => {}} color={C.muted} />
                  ) : null}
                  <Chip label={`Oferta ${money(bundle.offerPrice)}`} onPress={() => {}} color={C.pink} />
                  {sum > bundle.offerPrice ? (
                    <Chip label={`Ahorras ${money(sum - bundle.offerPrice)}`} onPress={() => {}} color={C.green} />
                  ) : null}
                </View>
                <Switch
                  value={bundle.active !== false}
                  onValueChange={() => toggleActive(bundle)}
                  accessibilityLabel={bundle.active === false ? 'Mostrar oferta' : 'Ocultar oferta'}
                  trackColor={{ false: C.border, true: C.pink }}
                  thumbColor={C.card}
                />
              </View>
            );
          })
        ) : (
          <Empty
            icon="pricetags-outline"
            title="Sin ofertas todavía"
            text="Crea la primera eligiendo 2 o más productos y un precio especial."
          />
        )}
      </Card>
    </Screen>
  );
}
