import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductsContext';
import { useCart } from './CartContext';
import {
  buildTasteSignal,
  dailySeed,
  productStats,
  rankProducts,
  recommendProducts,
  relatedProducts,
  type ProductStats,
  type Recommendation,
  type TasteSignal,
} from '../lib/recommend';
import type { Order, Review } from '../lib/types';

type Ctx = {
  forYou: Recommendation[];
  personalized: boolean;
  loading: boolean;
  scoreOf: (id: string) => number;
  relatedTo: (id: string, count?: number) => Recommendation[];
  taste: TasteSignal;
};

const RecommendationsCtx = createContext<Ctx>(null as any);
export const useRecommendations = () => useContext(RecommendationsCtx);

const EMPTY_TASTE: TasteSignal = {
  categories: {},
  fandoms: {},
  brands: {},
  favoriteIds: [],
  purchasedIds: [],
  cartIds: [],
  reviewedIds: [],
  topCategory: null,
  topFandom: null,
  topBrand: null,
  hasSignals: false,
};

export function RecommendationsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const { lines } = useCart();

  const [orderFeed, setOrderFeed] = useState<{ uid: string | null; orders: Order[] }>({
    uid: null,
    orders: [],
  });
  const [reviews, setReviews] = useState<Review[]>([]);

  // Una semilla por día: el orden rota sin cambiar en cada render.
  const seed = useMemo(() => dailySeed(), []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'orders'), where('userId', '==', uid), limit(50)),
      (snap) => {
        setOrderFeed({
          uid,
          orders: snap.docs.map((document) => ({ id: document.id, ...document.data() } as Order)),
        });
      },
      () => setOrderFeed({ uid, orders: [] })
    );
    return unsub;
  }, [user?.uid]);

  // Solo se usan los pedidos que pertenecen al usuario actual; así no hace falta
  // limpiar el estado dentro del efecto cuando la sesión cambia.
  const orders = useMemo(
    () => (user?.uid && orderFeed.uid === user.uid ? orderFeed.orders : []),
    [orderFeed, user]
  );
  const ordersFor = user?.uid && orderFeed.uid === user.uid ? orderFeed.uid : null;

  // Opiniones públicas: sirven para la popularidad y, filtradas, para el gusto del cliente.
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'reviews'), limit(500)),
      (snap) => setReviews(snap.docs.map((document) => ({ id: document.id, ...document.data() } as Review))),
      () => setReviews([])
    );
    return unsub;
  }, []);

  const myReviews = useMemo(
    () => reviews.filter((review) => review.userId === user?.uid),
    [reviews, user?.uid]
  );

  const cartIds = useMemo(() => lines.map((line) => line.product.id), [lines]);

  const stats = useMemo<Record<string, ProductStats>>(() => productStats(reviews), [reviews]);

  const taste = useMemo<TasteSignal>(() => {
    if (!profile && !orders.length && !myReviews.length && !cartIds.length) return EMPTY_TASTE;
    return buildTasteSignal({
      products,
      profile,
      orders,
      reviews: myReviews,
      cartIds,
    });
  }, [products, profile, orders, myReviews, cartIds]);

  const ranked = useMemo(
    () => rankProducts(products, taste, stats, seed),
    [products, taste, stats, seed]
  );

  const forYou = useMemo(
    () => recommendProducts(products, taste, stats, { limit: 8, seed }),
    [products, taste, stats, seed]
  );

  const scoreMap = useMemo(
    () => new Map(ranked.map((item) => [item.product.id, item.score])),
    [ranked]
  );

  const scoreOf = useCallback((id: string) => scoreMap.get(id) ?? 0, [scoreMap]);

  const relatedTo = useCallback(
    (id: string, count = 4) => {
      const target = products.find((product) => product.id === id);
      if (!target) return [];
      return relatedProducts(target, products, stats, count, seed);
    },
    [products, stats, seed]
  );

  const value = useMemo<Ctx>(
    () => ({
      forYou,
      personalized: taste.hasSignals,
      loading: productsLoading || (!!user && ordersFor !== user.uid),
      scoreOf,
      relatedTo,
      taste,
    }),
    [forYou, taste, productsLoading, user, ordersFor, scoreOf, relatedTo]
  );

  return <RecommendationsCtx.Provider value={value}>{children}</RecommendationsCtx.Provider>;
}
