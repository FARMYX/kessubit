import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C, CATEGORIES, money } from '../../src/lib/theme';
import { layout, radius, space, tracking, type as typeScale, weight } from '../../src/lib/design';
import { useResponsive } from '../../src/lib/responsive';
import { useProducts } from '../../src/context/ProductsContext';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { useStoreConfig } from '../../src/context/StoreConfigContext';
import { useRecommendations } from '../../src/context/RecommendationsContext';
import { useToast } from '../../src/context/ToastContext';
import { playSound } from '../../src/lib/sound';
import { haptic } from '../../src/lib/haptics';
import { stockState } from '../../src/lib/stock';
import { offerOf, productsOnOffer } from '../../src/lib/offers';
import {
  bundleOriginalPrice,
  bundleProducts,
  bundleSavings,
  useOfferBundles,
} from '../../src/lib/offerBundles';
import { collectionOf, useCollections } from '../../src/lib/collections';
import { usePendingProofOrder } from '../../src/lib/paymentReminder';
import { PaymentReminder } from '../../src/components/PaymentReminder';
import { Btn, Chip, Empty, ProductCard, Screen, useGrid } from '../../src/components/UI';
import { FilterSheet, SORT_LABEL, type CatalogSort } from '../../src/components/FilterSheet';
import { Skeleton } from '../../src/components/Skeleton';
import { NotificationBell } from '../../src/components/NotificationBell';
import type { Product } from '../../src/lib/types';

function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Image
        source={require('../../assets/images/kesuubit-icon.png')}
        style={{ width: 34, height: 34, borderRadius: 11 }}
        contentFit="cover"
        accessibilityLabel="KESUUBIT"
      />
      <View>
        <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: 16, letterSpacing: -0.3 }}>
          KESUUBIT
        </Text>
        <Text style={{ color: C.muted, fontSize: 10.5, fontWeight: weight.semibold }}>
          Instrumentos de banda
        </Text>
      </View>
    </View>
  );
}

export default function Catalog() {
  const router = useRouter();
  const { cols, itemW } = useGrid();
  const { isDesktop } = useResponsive();
  const { products, loading, error } = useProducts();
  const { add, applyBundle, sync } = useCart();
  const { user, profile, toggleFav } = useAuth();
  const { config } = useStoreConfig();
  const { forYou, personalized, scoreOf } = useRecommendations();
  const { collections } = useCollections();
  const { bundles } = useOfferBundles();
  const pendingProof = usePendingProofOrder();
  const toast = useToast();
  const hasHeroImage = !!config.heroImage;
  const heroInk = hasHeroImage ? '#FFF8F3' : C.ink;
  const heroInkSoft = hasHeroImage ? 'rgba(255,248,243,0.86)' : C.inkSoft;

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todas');
  const [fan, setFan] = useState('all');
  const [collection, setCollection] = useState('all');
  const [sort, setSort] = useState<CatalogSort>('recent');
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyLow, setOnlyLow] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);

  // Keep the persisted cart in sync with live prices and stock.
  useEffect(() => {
    if (!loading) sync(products);
  }, [products, loading, sync]);

  const lowStock = useMemo(
    () => products.filter((product) => stockState(product.stock, product.lowStockThreshold) === 'bajo'),
    [products]
  );

  const offers = useMemo(() => productsOnOffer(products), [products]);
  const activeBundles = useMemo(
    () => bundles.filter((bundle) => bundle.active !== false && bundle.productIds.length >= 2),
    [bundles]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (onlyLow && stockState(p.stock, p.lowStockThreshold) !== 'bajo') return false;
      if (onlyOffers && !offerOf(p).active) return false;
      if (collection !== 'all' && p.collectionId !== collection) return false;
      if (cat !== 'Todas' && p.category !== cat) return false;
      if (fan !== 'all' && p.fandom !== fan) return false;
      if (term && !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(term)) return false;
      return true;
    });
    const sorted = [...list];
    switch (sort) {
      case 'for-you':
        sorted.sort((a, b) => scoreOf(b.id) - scoreOf(a.id) || a.name.localeCompare(b.name, 'es'));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        break;
      default:
        sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name, 'es'));
    }
    return sorted;
  }, [products, q, cat, fan, collection, sort, scoreOf, onlyLow, onlyOffers]);

  const activeFilters =
    (cat !== 'Todas' ? 1 : 0) +
    (fan !== 'all' ? 1 : 0) +
    (collection !== 'all' ? 1 : 0) +
    (sort !== 'recent' ? 1 : 0) +
    (onlyLow ? 1 : 0) +
    (onlyOffers ? 1 : 0);

  const quickAdd = (product: Product) => {
    const ok = add(product);
    if (ok) {
      playSound(offerOf(product).active ? 'offer' : 'pop');
      haptic.tap();
      toast.success('Añadido al carrito', product.name);
    } else {
      haptic.error();
      toast.error('Sin stock suficiente', `Solo quedan ${product.stock} de ${product.name}.`);
    }
  };

  const addCombo = (bundle: (typeof activeBundles)[number]) => {
    const ok = applyBundle(bundle, products);
    if (!ok) {
      haptic.error();
      toast.error('No se pudo agregar', 'Uno de los productos de la oferta no tiene stock.');
      return;
    }
    playSound('offer');
    haptic.success();
    toast.success('Oferta agregada', bundle.name);
  };

  const toggleFavorite = async (product: Product) => {
    if (!user) {
      toast.info('Inicia sesión', 'Guarda tus favoritos en tu cuenta.');
      router.push('/login');
      return;
    }
    try {
      await toggleFav(product.id);
      haptic.tap();
    } catch {
      toast.error('No se pudo guardar', 'Revisa tu conexión e inténtalo otra vez.');
    }
  };

  const clearFilters = () => {
    setQ('');
    setCat('Todas');
    setFan('all');
    setCollection('all');
    setSort('recent');
    setOnlyLow(false);
    setOnlyOffers(false);
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: space.sm,
          paddingBottom: space.md,
        }}
      >
        {isDesktop ? (
          <Text style={{ color: C.muted, fontWeight: weight.bold, fontSize: typeScale.small, letterSpacing: 0.8 }}>
            CATÁLOGO
          </Text>
        ) : (
          <Brand />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <NotificationBell />
        </View>
      </View>

      {config.announcement ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: C.pinkWash,
            borderWidth: 1,
            borderColor: C.pinkSoft,
            borderRadius: radius.md,
            paddingVertical: 9,
            paddingHorizontal: space.md,
            marginBottom: space.lg,
          }}
        >
          <Ionicons name="megaphone" size={15} color={C.pink} />
          <Text style={{ color: C.inkSoft, fontSize: typeScale.small, flex: 1 }} numberOfLines={2}>
            {config.announcement}
          </Text>
        </View>
      ) : null}

      <PaymentReminder order={pendingProof} compact />

      <View
        style={{
          get backgroundColor() { return C.pinkWash; },
          borderRadius: radius['2xl'],
          borderWidth: 1,
          get borderColor() { return C.pinkSoft; },
          padding: isDesktop ? space['3xl'] : space.xl,
          marginBottom: space.lg,
          overflow: 'hidden',
        }}
      >
        {config.heroImage ? (
          <>
            <Image
              source={{ uri: config.heroImage }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: C.overlay,
              }}
            />
          </>
        ) : null}
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: isDesktop ? space['2xl'] : space.lg,
            alignItems: 'stretch',
          }}
        >
          <View style={{ flex: isDesktop ? 1.35 : undefined, gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: space.md }}>
              <View
                style={{
                  width: 3,
                  alignSelf: 'stretch',
                  borderRadius: 2,
                  backgroundColor: hasHeroImage ? 'rgba(255,248,243,0.9)' : C.pink,
                }}
              />
              <View style={{ flex: 1, gap: space.md }}>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <View style={fandomTag(C.pink)}>
                    <Text style={fandomText(C.pink)}>HECHO PARA SONAR</Text>
                  </View>
                  <View style={fandomTag(C.blue)}>
                    <Text style={fandomText(C.blue)}>ORURO, BOLIVIA</Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: heroInk,
                    fontSize: isDesktop ? 38 : 28,
                    lineHeight: (isDesktop ? 38 : 28) * 1.1,
                    fontWeight: weight.black,
                    letterSpacing: tracking.tight,
                    maxWidth: 520,
                  }}
                >
                  {config.heroTitle || "Equipa tu banda.\nSuena como tú."}
                </Text>
                <Text
                  style={{
                    color: heroInkSoft,
                    fontSize: isDesktop ? 15 : 13.5,
                    lineHeight: 21,
                    maxWidth: 460,
                  }}
                >
                  {config.heroSubtitle ||
                    'Guitarras, bajos, baterías y accesorios elegidos para quienes viven entre riffs y escenarios.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: 2 }}>
                  <Pressable
                    onPress={() => setCat('Guitarras')}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      {
                        backgroundColor: C.pink,
                        borderRadius: radius.md,
                        minHeight: layout.touchTarget,
                        paddingHorizontal: space.lg,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        opacity: pressed ? 0.9 : 1,
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Ionicons name="git-branch" size={16} color={C.onPink} />
                    <Text style={{ color: C.onPink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      Ver guitarras
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setCat('Accesorios')}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      {
                        backgroundColor: C.card,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: hasHeroImage ? 'rgba(255,248,243,0.55)' : C.borderStrong,
                        minHeight: layout.touchTarget,
                        paddingHorizontal: space.lg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.9 : 1,
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      Accesorios
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {isDesktop ? (
            <View
              style={{
                width: 232,
                minHeight: 224,
                alignSelf: 'flex-end',
                marginTop: space['2xl'],
              }}
            >
              <View style={[sticker, { top: 0, left: 0, transform: [{ rotate: '-8deg' }], backgroundColor: C.card }]}>
                <Ionicons name="musical-note" size={16} color={C.pink} />
                <Text style={stickerTitle}>Riff diario</Text>
                <Text style={stickerSub}>Toca algo hoy</Text>
              </View>
              <View style={[sticker, { top: 62, right: 6, transform: [{ rotate: '6deg' }], backgroundColor: C.yellowSoft }]}>
                <Ionicons name="sparkles" size={16} color={C.yellowDeep} />
                <Text style={stickerTitle}>Edición banda</Text>
                <Text style={stickerSub}>Tu banda, tu sonido</Text>
              </View>
              <View style={[sticker, { bottom: 0, left: 40, transform: [{ rotate: '-3deg' }], backgroundColor: C.card }]}>
                <Ionicons name="bicycle" size={16} color={C.green} />
                <Text style={stickerTitle}>Envío gratis</Text>
                <Text style={stickerSub}>Desde Bs {config.freeShippingThreshold}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {offers.length ? (
        <View style={{ marginBottom: space.xl }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.md,
              marginBottom: space.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: C.pinkWash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pricetag" size={17} color={C.pink} />
              </View>
              <View>
                <Text style={{ color: C.ink, fontSize: typeScale.h3, fontWeight: weight.black, letterSpacing: -0.4 }}>
                  Bajaron de precio
                </Text>
                <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                  Antes y ahora, para que decidas con el oído
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setOnlyOffers(!onlyOffers)} hitSlop={6} accessibilityRole="button">
              <Text style={{ color: C.pink, fontSize: typeScale.small, fontWeight: weight.bold }}>
                {onlyOffers ? 'Ver todo' : `Ver ${offers.length}`}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: layout.gridGap, paddingBottom: 2 }}
          >
            {offers.map((product, index) => {
              const offer = offerOf(product);
              const collectionItem = collectionOf(collections, product.collectionId);
              const cardWidth = isDesktop ? 210 : 164;
              return (
                <View key={product.id} style={{ width: cardWidth }}>
                  <ProductCard
                    p={product}
                    i={index}
                    w={cardWidth}
                    collectionLabel={collectionItem?.name}
                    collectionColor={collectionItem?.color}
                    onPress={() => router.push(`/product/${product.id}`)}
                    onAdd={() => quickAdd(product)}
                    favorite={!!profile?.favorites?.includes(product.id)}
                    onToggleFavorite={() => toggleFavorite(product)}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ color: C.pink, fontSize: typeScale.caption, fontWeight: weight.bold, marginTop: space.xs }}
                  >
                    {offer.note}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {activeBundles.length ? (
        <View style={{ marginBottom: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: C.pinkWash,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="gift-outline" size={17} color={C.pink} />
            </View>
            <View>
              <Text style={{ color: C.ink, fontSize: typeScale.h3, fontWeight: weight.black, letterSpacing: -0.4 }}>
                Ofertas de la tienda
              </Text>
              <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                Conjuntos elegidos por el local, a precio especial
              </Text>
            </View>
          </View>

          <View style={{ gap: space.md }}>
            {activeBundles.map((bundle) => {
              const items = bundleProducts(bundle, products);
              const regular = bundleOriginalPrice(bundle, products);
              const saved = bundleSavings(bundle, products);
              const unavailable = items.length !== bundle.productIds.length || items.some((p) => p.stock < 1);
              if (!items.length) return null;
              return (
                <View
                  key={bundle.id}
                  style={{
                    padding: space.md,
                    borderRadius: radius.lg,
                    backgroundColor: C.card,
                    borderWidth: 1,
                    borderColor: C.border,
                    gap: space.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.bodyLg }}>
                        {bundle.name}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: typeScale.small }} numberOfLines={2}>
                        {items.map((p) => p.name).join(' · ')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {regular > bundle.offerPrice ? (
                        <Text style={{ color: C.muted, fontSize: typeScale.caption, textDecorationLine: 'line-through' }}>
                          {money(regular)}
                        </Text>
                      ) : null}
                      <Text style={{ color: C.pink, fontWeight: weight.black, fontSize: typeScale.h3 }}>
                        {money(bundle.offerPrice)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                    {saved > 0 ? (
                      <View style={{ backgroundColor: C.pinkWash, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.caption }}>
                          Ahorras {money(saved)}
                        </Text>
                      </View>
                    ) : null}
                    <Btn
                      title={unavailable ? 'Sin stock' : 'Agregar oferta'}
                      icon={unavailable ? 'alert-circle-outline' : 'bag-add-outline'}
                      kind={unavailable ? 'ghost' : 'soft'}
                      compact
                      disabled={unavailable}
                      onPress={() => addCombo(bundle)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {forYou.length ? (
        <View style={{ marginBottom: space.xl }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.md,
              marginBottom: space.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: C.pinkWash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="sparkles" size={17} color={C.pink} />
              </View>
              <View>
                <Text style={{ color: C.ink, fontSize: typeScale.h3, fontWeight: weight.black, letterSpacing: -0.4 }}>
                  {personalized ? 'Para ti' : 'Recomendados de la banda'}
                </Text>
                <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                  {personalized
                    ? 'Según tus favoritos, compras y opiniones'
                    : 'Lo más querido de la tienda'}
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: C.pinkWash,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: C.pink, fontSize: typeScale.caption, fontWeight: weight.bold }}>
                {personalized ? 'Personalizado' : 'Popular'}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: layout.gridGap, paddingBottom: 2 }}
          >
            {forYou.map((rec, index) => {
              const cardWidth = isDesktop ? 210 : 164;
              const collectionItem = collectionOf(collections, rec.product.collectionId);
              return (
                <View key={rec.product.id} style={{ width: cardWidth }}>
                  <ProductCard
                    p={rec.product}
                    i={index}
                    w={cardWidth}
                    collectionLabel={collectionItem?.name}
                    collectionColor={collectionItem?.color}
                    onPress={() => router.push(`/product/${rec.product.id}`)}
                    onAdd={() => quickAdd(rec.product)}
                    favorite={!!profile?.favorites?.includes(rec.product.id)}
                    onToggleFavorite={() => toggleFavorite(rec.product)}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space.xs }}>
                    <Ionicons name="sparkles" size={11} color={C.pink} />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: C.muted,
                        fontSize: typeScale.caption,
                        fontWeight: weight.semibold,
                      }}
                    >
                      {rec.reason}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: C.card,
            borderWidth: 1.5,
            borderColor: C.border,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            height: 46,
          }}
        >
          <Ionicons name="search" size={17} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar guitarra, marca, accesorio…"
            placeholderTextColor={C.muted}
            style={{ flex: 1, color: C.ink, fontSize: typeScale.body, height: '100%', outlineStyle: 'none' } as any}
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={17} color={C.muted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir filtros"
          style={({ pressed }) => [
            {
              height: 46,
              paddingHorizontal: space.md,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: activeFilters ? C.pink : C.border,
              backgroundColor: activeFilters ? C.pinkWash : pressed ? C.bgAlt : C.card,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            },
            { cursor: 'pointer' } as any,
          ]}
        >
          <Ionicons name="options-outline" size={18} color={activeFilters ? C.pink : C.inkSoft} />
          <Text style={{ color: activeFilters ? C.pink : C.ink, fontWeight: weight.bold, fontSize: typeScale.small }}>
            Filtros{activeFilters ? ` (${activeFilters})` : ''}
          </Text>
        </Pressable>
      </View>

      {lowStock.length > 0 ? (
        <Pressable
          onPress={() => setOnlyLow(!onlyLow)}
          accessibilityRole="button"
          accessibilityLabel={`${lowStock.length} productos con últimas unidades`}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              paddingVertical: 9,
              paddingHorizontal: space.md,
              marginBottom: space.sm,
              borderRadius: radius.md,
              backgroundColor: pressed ? C.yellowSoft : C.surfaceAlt,
              borderWidth: 1,
              borderColor: C.yellowDeep,
            },
            { cursor: 'pointer' } as any,
          ]}
        >
          <Ionicons name="flame" size={16} color={C.yellowDeep} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.small }}>
              Últimas unidades
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
              {lowStock.length} producto{lowStock.length === 1 ? '' : 's'} por agotarse
            </Text>
          </View>
          <Text style={{ color: C.yellowDeep, fontWeight: weight.bold, fontSize: typeScale.small }}>
            {onlyLow ? 'Ver todo' : 'Ver'}
          </Text>
        </Pressable>
      ) : null}

      {collections.length ? (
        <View style={{ marginBottom: space.sm }}>
          <Text style={{ color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.bold, marginBottom: 6 }}>
            Colecciones
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            <Chip label="Todas" on={collection === 'all'} onPress={() => setCollection('all')} />
            {collections
              .filter((item) => item.active !== false)
              .map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  color={item.color || C.purple}
                  on={collection === item.id}
                  onPress={() => setCollection(collection === item.id ? 'all' : item.id)}
                />
              ))}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
        <Chip label="Todas" on={cat === 'Todas'} onPress={() => setCat('Todas')} />
        {CATEGORIES.map((category) => (
          <Chip key={category} label={category} on={cat === category} onPress={() => setCat(category)} />
        ))}
        {offers.length ? (
          <Chip label={`Ofertas (${offers.length})`} color={C.pink} on={onlyOffers} onPress={() => setOnlyOffers(!onlyOffers)} />
        ) : null}
        {lowStock.length ? (
          <Chip
            label={`Últimas (${lowStock.length})`}
            color={C.yellowDeep}
            on={onlyLow}
            onPress={() => setOnlyLow(!onlyLow)}
          />
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: space.sm,
          marginBottom: space.xs,
        }}
      >
        <Text style={{ color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.semibold }}>
          {loading ? 'Cargando catálogo…' : `${filtered.length} producto${filtered.length === 1 ? '' : 's'}`}
          {sort !== 'recent' ? ` · ${SORT_LABEL[sort]}` : ''}
        </Text>
        {activeFilters > 0 ? (
          <Pressable onPress={clearFilters} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: C.pink, fontSize: typeScale.small, fontWeight: weight.bold }}>Limpiar</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: layout.gridGap }}>
          {Array.from({ length: cols * 2 }).map((_, index) => (
            <View
              key={index}
              style={{
                width: itemW,
                marginBottom: space.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.card,
                overflow: 'hidden',
              }}
            >
              <Skeleton height={itemW * 0.82} borderRadius={0} />
              <View style={{ padding: space.md, gap: 8 }}>
                <Skeleton width="38%" height={9} />
                <Skeleton height={12} />
                <Skeleton width="72%" height={12} />
                <Skeleton width="46%" height={16} />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <Empty icon="cloud-offline-outline" title="No pudimos cargar la tienda" text={error} />
      ) : filtered.length === 0 ? (
        <Empty
          icon="search-outline"
          title="Nada por aquí"
          text="Prueba con otra búsqueda o quita los filtros para ver todo el catálogo."
          action={{ label: 'Ver todo', onPress: clearFilters }}
        />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: layout.gridGap }}>
          {filtered.map((product, index) => {
            const collectionItem = collectionOf(collections, product.collectionId);
            return (
              <ProductCard
                key={product.id}
                p={product}
                i={index}
                w={itemW}
                collectionLabel={collectionItem?.name}
                collectionColor={collectionItem?.color}
                onPress={() => router.push(`/product/${product.id}`)}
                onAdd={() => quickAdd(product)}
                favorite={!!profile?.favorites?.includes(product.id)}
                onToggleFavorite={() => toggleFavorite(product)}
              />
            );
          })}
        </View>
      )}

      <View style={{ alignItems: 'center', paddingTop: space.xl }}>
        <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
          KESUUBIT · Hecho para sonar
        </Text>
      </View>

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={CATEGORIES}
        category={cat}
        onCategory={setCat}
        fandom={fan}
        onFandom={setFan}
        sort={sort}
        onSort={setSort}
        onClear={clearFilters}
        resultCount={filtered.length}
      />
    </Screen>
  );
}

const fandomTag = (color: string) => ({
  borderRadius: 999,
  borderWidth: 1,
  borderColor: color,
  paddingHorizontal: 9,
  paddingVertical: 4,
  backgroundColor: C.card,
});

const fandomText = (color: string) => ({
  color,
  fontSize: 9.5,
  fontWeight: weight.black,
  letterSpacing: 0.7,
});

const sticker = {
  position: 'absolute' as const,
  width: 150,
  borderRadius: radius.md,
  borderWidth: 1,
  get borderColor() { return C.border; },
  padding: 11,
  gap: 2,
  shadowColor: '#2A1626',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const stickerTitle = {
  get color() { return C.ink; },
  fontWeight: weight.bold,
  fontSize: 12,
  marginTop: 2,
};

const stickerSub = {
  get color() { return C.muted; },
  fontSize: 10,
};
