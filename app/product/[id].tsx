import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import { C, FANDOM, money } from '../../src/lib/theme';
import { layout, radius, space, tracking, type as typeScale, weight } from '../../src/lib/design';
import { useResponsive } from '../../src/lib/responsive';
import { formatDate } from '../../src/lib/format';
import { useProducts } from '../../src/context/ProductsContext';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { useRecommendations } from '../../src/context/RecommendationsContext';
import { useToast } from '../../src/context/ToastContext';
import { playSound } from '../../src/lib/sound';
import { haptic } from '../../src/lib/haptics';
import { stockBadgeLabel, stockColor, stockSoftColor, stockState } from '../../src/lib/stock';
import { offerOf } from '../../src/lib/offers';
import { Avatar, Badge, Btn, Card, Empty, Field, Pressy, ProductCard, Screen, Stars, useGrid } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { ProductImage } from '../../src/components/ProductImage';
import { QuantityStepper } from '../../src/components/QuantityStepper';
import { Skeleton, SkeletonText } from '../../src/components/Skeleton';
import { NotificationBell } from '../../src/components/NotificationBell';
import type { Review } from '../../src/lib/types';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { itemW } = useGrid();
  const { getProduct, loading } = useProducts();
  const { add } = useCart();
  const { user, profile, isAdmin, toggleFav } = useAuth();
  const { relatedTo } = useRecommendations();
  const toast = useToast();

  const product = id ? getProduct(id) : undefined;
  const [qtyDraft, setQtyDraft] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsFor, setReviewsFor] = useState<string | null>(null);
  const [ratingDraft, setRatingDraft] = useState<number | null>(null);
  const [textDraft, setTextDraft] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      query(collection(db, 'reviews'), where('productId', '==', id)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Review))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReviews(list);
        setReviewsFor(id);
      },
      () => setReviewsFor(id)
    );
    return unsub;
  }, [id]);

  const myReview = useMemo(
    () => reviews.find((review) => review.userId === user?.uid),
    [reviews, user?.uid]
  );

  // Drafts fall back to the saved review until the user touches a field.
  const rating = ratingDraft ?? myReview?.rating ?? 5;
  const reviewText = textDraft ?? myReview?.text ?? '';
  const reviewsLoading = !!id && reviewsFor !== id;
  const maxQty = Math.max(1, Number(product?.stock ?? 1));
  const qty = Math.min(Math.max(qtyDraft, 1), maxQty);

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const related = useMemo(
    () => (product ? relatedTo(product.id, 4) : []),
    [product, relatedTo]
  );

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Producto" back right={<NotificationBell />} />
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.xl }}>
          <Skeleton height={isDesktop ? 420 : 280} borderRadius={radius.lg} style={{ flex: 1 }} />
          <View style={{ flex: 1, gap: space.md }}>
            <Skeleton width="34%" height={10} />
            <Skeleton height={26} />
            <Skeleton width="72%" height={26} />
            <Skeleton width="42%" height={20} />
            <SkeletonText lines={4} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen>
        <ScreenHeader title="Producto" back right={<NotificationBell />} />
        <Empty
          icon="help-circle-outline"
          title="No encontramos este producto"
          text="Puede que ya no esté disponible. Mira el resto del catálogo."
          action={{ label: 'Volver a la tienda', onPress: () => router.push('/') }}
        />
      </Screen>
    );
  }

  const fandom = FANDOM[product.fandom] || FANDOM.bocchi;
  const soldOut = Number(product.stock) <= 0;
  const favorite = !!profile?.favorites?.includes(product.id);
  const offer = offerOf(product);

  const addToCart = () => {
    const ok = add(product, qty);
    if (ok) {
      playSound('pop');
      haptic.success();
      toast.show({
        kind: 'success',
        title: 'Añadido al carrito',
        message: `${qty} × ${product.name}`,
        action: { label: 'Ver carrito', onPress: () => router.push('/cart') },
      });
    } else {
      haptic.error();
      toast.error('Sin stock suficiente', `Solo quedan ${product.stock} unidades.`);
    }
  };

  const onFavorite = async () => {
    if (!user) {
      toast.info('Inicia sesión', 'Guarda tus favoritos en tu cuenta.');
      router.push('/login');
      return;
    }
    try {
      await toggleFav(product.id);
      haptic.tap();
    } catch {
      toast.error('No se pudo guardar', 'Revisa tu conexión.');
    }
  };

  const saveReview = async () => {
    if (!user || !profile) return;
    if (!reviewText.trim()) {
      toast.error('Escribe tu opinión', 'Cuéntanos qué te pareció el producto.');
      return;
    }
    setSavingReview(true);
    try {
      await setDoc(
        doc(db, 'reviews', `${product.id}_${user.uid}`),
        {
          productId: product.id,
          userId: user.uid,
          userName: profile.name,
          userPhoto: profile.photo || '',
          rating,
          text: reviewText.trim(),
          createdAt: myReview?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      playSound('chime');
      haptic.success();
      toast.success(myReview ? 'Opinión actualizada' : '¡Gracias por tu opinión!');
    } catch {
      toast.error('No se pudo publicar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={product.category}
        eyebrow={fandom.label}
        back
        right={<NotificationBell />}
      />

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? space['2xl'] : space.lg }}>
        <View style={{ flex: isDesktop ? 1 : undefined }}>
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: C.border,
              padding: space.md,
              overflow: 'hidden',
            }}
          >
            <ProductImage product={product} height={isDesktop ? 400 : 270} radius={radius.lg} priority="high" />
            <View style={{ position: 'absolute', top: space.lg, left: space.lg }}>
              <Badge label={fandom.label} color={fandom.color} />
            </View>
          </View>

          {isDesktop ? (
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              <View style={miniFeature}>
                <Ionicons name="shield-checkmark-outline" size={17} color={C.green} />
                <Text style={miniFeatureText}>Garantía de tienda</Text>
              </View>
              <View style={miniFeature}>
                <Ionicons name="cube-outline" size={17} color={C.blue} />
                <Text style={miniFeatureText}>Stock en Oruro</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ flex: isDesktop ? 1 : undefined, gap: space.md }}>
          <View style={{ gap: 5 }}>
            <Text style={{ color: C.muted, fontSize: typeScale.small, fontWeight: weight.bold }}>
              {product.brand}
            </Text>
            <Text
              style={{
                color: C.ink,
                fontSize: isDesktop ? 30 : 24,
                lineHeight: (isDesktop ? 30 : 24) * 1.16,
                fontWeight: weight.black,
                letterSpacing: tracking.tight,
              }}
            >
              {product.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 }}>
              <Stars value={average || 0} size={16} />
              <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                {reviews.length ? `${average.toFixed(1)} · ${reviews.length} opinión${reviews.length === 1 ? '' : 'es'}` : 'Sin opiniones todavía'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
            {offer.active ? (
              <Text
                style={{
                  color: C.muted,
                  fontSize: isDesktop ? 20 : 17,
                  textDecorationLine: 'line-through',
                }}
              >
                {money(offer.previous)}
              </Text>
            ) : null}
            <Text
              style={{
                color: offer.active ? C.pink : C.ink,
                fontSize: isDesktop ? 34 : 28,
                fontWeight: weight.black,
                letterSpacing: tracking.tight,
              }}
            >
              {money(product.price)}
            </Text>
            {offer.active ? (
              <Badge label={`Bajó ${offer.label}`} color={C.pinkBright} />
            ) : null}
            <Badge
              label={stockBadgeLabel(product.stock, product.lowStockThreshold)}
              color={stockColor(product.stock, product.lowStockThreshold)}
            />
          </View>

          {offer.active ? (
            <View
              style={{
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'center',
                paddingVertical: 9,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                backgroundColor: C.pinkWash,
                borderWidth: 1,
                borderColor: C.pinkSoft,
              }}
            >
              <Ionicons name="pricetag" size={16} color={C.pink} />
              <Text style={{ color: C.inkSoft, fontSize: typeScale.small, flex: 1 }}>
                {offer.note}. Precio anterior tachado arriba.
              </Text>
            </View>
          ) : null}

          {stockState(product.stock, product.lowStockThreshold) !== 'ok' ? (
            <View
              style={{
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'flex-start',
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: stockSoftColor(product.stock, product.lowStockThreshold),
                borderWidth: 1,
                borderColor: soldOut ? C.pinkSoft : C.yellowDeep,
              }}
            >
              <Ionicons
                name={soldOut ? 'close-circle' : 'alert-circle'}
                size={17}
                color={stockColor(product.stock, product.lowStockThreshold)}
              />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: stockColor(product.stock, product.lowStockThreshold), fontWeight: weight.bold, fontSize: typeScale.body }}>
                  {soldOut ? 'Producto agotado' : `Últimas ${product.stock} unidades`}
                </Text>
                <Text style={{ color: C.inkSoft, fontSize: typeScale.small, lineHeight: 18 }}>
                  {soldOut
                    ? 'Vuelve pronto o mira otros instrumentos del catálogo.'
                    : 'Cuando se agoten, no sabemos cuándo volverán. Asegura el tuyo.'}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={{ color: C.inkSoft, fontSize: typeScale.body, lineHeight: 22 }}>
            {product.description}
          </Text>

          {product.specs?.length ? (
            <Card style={{ padding: space.md, gap: 0 }}>
              {product.specs.map((spec, index) => (
                <View
                  key={`${spec.k}-${index}`}
                  style={{
                    flexDirection: 'row',
                    gap: space.md,
                    paddingVertical: 9,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: C.border,
                  }}
                >
                  <Text style={{ width: 128, color: C.muted, fontSize: typeScale.small, fontWeight: weight.semibold }}>
                    {spec.k}
                  </Text>
                  <Text style={{ flex: 1, color: C.ink, fontSize: typeScale.small }}>{spec.v}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2, flexWrap: 'wrap' }}>
            <QuantityStepper value={qty} onChange={setQtyDraft} max={maxQty} disabled={soldOut} />
            <Btn
              title={soldOut ? 'Agotado' : 'Añadir al carrito'}
              icon={soldOut ? 'close-circle-outline' : 'bag-add-outline'}
              onPress={addToCart}
              disabled={soldOut}
              style={{ flex: 1, minWidth: 180 }}
            />
            <Pressy
              onPress={onFavorite}
              accessibilityLabel={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              style={{
                width: 46,
                height: 46,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: favorite ? C.pink : C.borderStrong,
                backgroundColor: favorite ? C.pinkWash : C.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? C.pink : C.inkSoft} />
            </Pressy>
          </View>

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <View style={miniFeature}>
              <Ionicons name="bicycle-outline" size={16} color={C.green} />
              <Text style={miniFeatureText}>Envío desde Bs 25</Text>
            </View>
            <View style={miniFeature}>
              <Ionicons name="storefront-outline" size={16} color={C.blue} />
              <Text style={miniFeatureText}>Retiro en tienda</Text>
            </View>
            {isAdmin ? (
              <Pressable
                onPress={() => router.push('/admin/products' as any)}
                style={({ pressed }) => [
                  miniFeature,
                  { backgroundColor: pressed ? C.bgAlt : C.pinkWash, borderColor: C.pinkSoft },
                  { cursor: 'pointer' } as any,
                ]}
              >
                <Ionicons name="create-outline" size={16} color={C.pink} />
                <Text style={[miniFeatureText, { color: C.pink }]}>Editar en admin</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ marginTop: space['2xl'], gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
          <View>
            <Text style={{ color: C.ink, fontSize: typeScale.h3, fontWeight: weight.black, letterSpacing: -0.4 }}>
              Opiniones de la banda
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.small }}>
              {reviews.length ? `${reviews.length} persona${reviews.length === 1 ? '' : 's'} ya lo probó` : 'Sé la primera persona en opinar'}
            </Text>
          </View>
          {reviews.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Stars value={average} size={16} />
              <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>{average.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        {reviewsLoading ? (
          <Card style={{ gap: space.md }}>
            <Skeleton width="38%" height={12} />
            <SkeletonText lines={2} />
          </Card>
        ) : reviews.length ? (
          <View style={{ gap: space.sm }}>
            {reviews.map((review) => (
              <Card key={review.id} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Avatar uri={review.userPhoto} name={review.userName} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      {review.userName}
                      {review.userId === user?.uid ? ' · tú' : ''}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                  <Stars value={review.rating} size={14} />
                </View>
                <Text style={{ color: C.inkSoft, fontSize: typeScale.body, lineHeight: 21 }}>{review.text}</Text>
              </Card>
            ))}
          </View>
        ) : (
          <Card>
            <Empty icon="chatbubbles-outline" title="Todavía no hay opiniones" text="Si ya lo tienes en casa, cuéntanos cómo suena." />
          </Card>
        )}

        {user ? (
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>
                {myReview ? 'Edita tu opinión' : 'Escribe tu opinión'}
              </Text>
              <Stars value={rating} size={22} onChange={setRatingDraft} />
            </View>
            <Field
              placeholder="¿Cómo se siente al tocar? ¿Llegó bien empaquetado?"
              value={reviewText}
              onChangeText={setTextDraft}
              multiline
              containerStyle={{ marginBottom: 0 }}
            />
            <Btn
              title={myReview ? 'Actualizar opinión' : 'Publicar opinión'}
              onPress={saveReview}
              loading={savingReview}
              kind="soft"
            />
          </Card>
        ) : (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={C.pink} />
            <Text style={{ flex: 1, color: C.inkSoft, fontSize: typeScale.body }}>
              Inicia sesión para dejar tu opinión.
            </Text>
            <Btn title="Entrar" onPress={() => router.push('/login')} compact />
          </Card>
        )}
      </View>

      {related.length ? (
        <View style={{ marginTop: space['2xl'] }}>
          <Text style={{ color: C.ink, fontSize: typeScale.h3, fontWeight: weight.black, letterSpacing: -0.4, marginBottom: space.md }}>
            También te puede sonar
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: layout.gridGap }}>
            {related.map(({ product: item }, index) => (
              <ProductCard
                key={item.id}
                p={item}
                i={index}
                w={isDesktop ? (itemW - 6) / 2 : (itemW - 6) / 2}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const miniFeature = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingVertical: 7,
  paddingHorizontal: 10,
  borderRadius: radius.sm,
  borderWidth: 1,
  get borderColor() { return C.border; },
  get backgroundColor() { return C.card; },
};

const miniFeatureText = {
  get color() { return C.inkSoft; },
  fontSize: typeScale.caption,
  fontWeight: weight.semibold,
};
