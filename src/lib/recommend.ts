import type { Order, Product, Profile, Review } from './types';
import { FANDOM } from './theme';

/**
 * Motor de recomendaciones de KESUUBIT.
 *
 * Es un híbrido content-based + popularidad:
 * - contenido: categoría, fandom y marca que el cliente ya demostró que le gustan
 *   (favoritos, compras, opiniones y carrito);
 * - popularidad: destacados y valoración media de las opiniones;
 * - disponibilidad y una rotación diaria estable para no mostrar siempre lo mismo.
 *
 * No usa datos sensibles ni cajas negras: cada recomendación puede explicarse
 * con una razón legible, que es justo lo que se muestra en la interfaz.
 */

export type ProductStats = {
  rating: number;
  reviews: number;
};

export type TasteSignal = {
  categories: Record<string, number>;
  fandoms: Record<string, number>;
  brands: Record<string, number>;
  favoriteIds: string[];
  purchasedIds: string[];
  cartIds: string[];
  reviewedIds: string[];
  topCategory: string | null;
  topFandom: string | null;
  topBrand: string | null;
  hasSignals: boolean;
};

export type Recommendation = {
  product: Product;
  score: number;
  reason: string;
};

export type TasteInput = {
  products: Product[];
  profile: Profile | null;
  orders: Order[];
  reviews: Review[];
  cartIds: string[];
};

const FAVORITE_WEIGHT = { category: 3, fandom: 2.5, brand: 1.5 };
const PURCHASE_WEIGHT = { category: 2.5, fandom: 2, brand: 1 };
const REVIEW_WEIGHT = { category: 2, fandom: 1.5, brand: 1 };
const CART_WEIGHT = { category: 1.5, fandom: 1, brand: 0.5 };

const add = (bucket: Record<string, number>, key: string | undefined, amount: number) => {
  if (!key) return;
  bucket[key] = (bucket[key] || 0) + amount;
};

const topKey = (bucket: Record<string, number>): string | null => {
  let best: string | null = null;
  let bestValue = 0;
  Object.entries(bucket).forEach(([key, value]) => {
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  });
  return best;
};

/** Convierte el historial del cliente en afinidades por categoría, fandom y marca. */
export function buildTasteSignal({
  products,
  profile,
  orders,
  reviews,
  cartIds,
}: TasteInput): TasteSignal {
  const byId = new Map(products.map((product) => [product.id, product]));
  const categories: Record<string, number> = {};
  const fandoms: Record<string, number> = {};
  const brands: Record<string, number> = {};

  const favoriteIds = Array.isArray(profile?.favorites) ? profile.favorites : [];
  favoriteIds.forEach((id) => {
    const product = byId.get(id);
    if (!product) return;
    add(categories, product.category, FAVORITE_WEIGHT.category);
    add(fandoms, product.fandom, FAVORITE_WEIGHT.fandom);
    add(brands, product.brand, FAVORITE_WEIGHT.brand);
  });

  const purchasedIds = new Set<string>();
  orders.forEach((order) => {
    if (order.status === 'cancelado') return;
    (order.items || []).forEach((item) => {
      purchasedIds.add(item.id);
      const product = byId.get(item.id);
      if (!product) return;
      add(categories, product.category, PURCHASE_WEIGHT.category);
      add(fandoms, product.fandom, PURCHASE_WEIGHT.fandom);
      add(brands, product.brand, PURCHASE_WEIGHT.brand);
    });
  });

  const reviewedIds = new Set<string>();
  reviews.forEach((review) => {
    reviewedIds.add(review.productId);
    const product = byId.get(review.productId);
    if (!product) return;
    const rating = Number(review.rating) || 0;
    // Una opinión positiva refuerza el gusto; una negativa lo resta.
    const factor = rating >= 4 ? 1 : rating <= 2 ? -0.5 : 0;
    add(categories, product.category, REVIEW_WEIGHT.category * factor);
    add(fandoms, product.fandom, REVIEW_WEIGHT.fandom * factor);
    add(brands, product.brand, REVIEW_WEIGHT.brand * factor);
  });

  cartIds.forEach((id) => {
    const product = byId.get(id);
    if (!product) return;
    add(categories, product.category, CART_WEIGHT.category);
    add(fandoms, product.fandom, CART_WEIGHT.fandom);
    add(brands, product.brand, CART_WEIGHT.brand);
  });

  return {
    categories,
    fandoms,
    brands,
    favoriteIds,
    purchasedIds: Array.from(purchasedIds),
    cartIds,
    reviewedIds: Array.from(reviewedIds),
    topCategory: topKey(categories),
    topFandom: topKey(fandoms),
    topBrand: topKey(brands),
    hasSignals: favoriteIds.length + purchasedIds.size + reviewedIds.size + cartIds.length > 0,
  };
}

/** Agrega las opiniones públicas en una media y un conteo por producto. */
export function productStats(reviews: Review[]): Record<string, ProductStats> {
  const acc: Record<string, { sum: number; count: number }> = {};
  reviews.forEach((review) => {
    const current = acc[review.productId] || { sum: 0, count: 0 };
    current.sum += Number(review.rating) || 0;
    current.count += 1;
    acc[review.productId] = current;
  });

  const stats: Record<string, ProductStats> = {};
  Object.entries(acc).forEach(([id, value]) => {
    stats[id] = { rating: value.count ? value.sum / value.count : 0, reviews: value.count };
  });
  return stats;
}

/** Semilla estable por día: cambia el orden sin recargar en cada render. */
export function dailySeed(date = new Date()): number {
  return Math.floor(date.getTime() / 86_400_000);
}

const hash01 = (value: string, seed: number): number => {
  let hash = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const affinity = (product: Product, taste: TasteSignal): number =>
  (taste.categories[product.category] || 0) * 3 +
  (taste.fandoms[product.fandom] || 0) * 2.2 +
  (taste.brands[product.brand] || 0) * 1.4;

const popularity = (product: Product, stats?: ProductStats): number => {
  const rating = stats?.rating || 0;
  const count = stats?.reviews || 0;
  return (
    (product.featured ? 1.6 : 0) +
    (count ? (rating - 3.5) * 1.1 + Math.log1p(count) * 0.55 : 0)
  );
};

const availability = (product: Product): number => {
  const stock = Number(product.stock) || 0;
  if (stock <= 0) return -2.5;
  return stock <= 3 ? 0.15 : 0.5;
};

const reasonFor = (product: Product, taste: TasteSignal, stats?: ProductStats): string => {
  if (taste.favoriteIds.includes(product.id)) return 'Ya está en tus favoritos';
  if (taste.cartIds.includes(product.id)) return 'Lo tienes en el carrito';
  if (taste.purchasedIds.includes(product.id)) return 'Ya es parte de tu equipo';

  const fandom = FANDOM[product.fandom];
  const fandomLabel = fandom?.short || fandom?.label || product.fandom;

  if (taste.topCategory === product.category && taste.topFandom === product.fandom) {
    return `Porque te gusta ${product.category} de ${fandomLabel}`;
  }
  if (taste.topCategory === product.category) return `Más de ${product.category}`;
  if (taste.topFandom === product.fandom) return `Porque te gusta ${fandomLabel}`;
  if (taste.topBrand === product.brand) return `De ${product.brand}, una marca que te gusta`;
  if (product.featured) return 'Destacado de la banda';
  if ((stats?.reviews || 0) >= 3) return 'Bien valorado por la banda';
  return 'Para empezar tu setup';
};

/**
 * Puntúa todo el catálogo. Se separa de `recommendProducts` para poder reutilizar
 * el puntaje al ordenar el catálogo por "Para ti".
 */
export function rankProducts(
  products: Product[],
  taste: TasteSignal,
  stats: Record<string, ProductStats>,
  seed = dailySeed()
): Recommendation[] {
  return products
    .map((product) => {
      const productStat = stats[product.id];
      const score =
        affinity(product, taste) +
        popularity(product, productStat) +
        availability(product) +
        (taste.favoriteIds.includes(product.id) ? -0.6 : 0) +
        (taste.purchasedIds.includes(product.id) ? -0.35 : 0) +
        (taste.cartIds.includes(product.id) ? 0.4 : 0) +
        (hash01(product.id, seed) - 0.5) * 0.5;

      return { product, score, reason: reasonFor(product, taste, productStat) };
    })
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'));
}

/** Recomendaciones listas para mostrar: solo disponibles y sin repetir exclusiones. */
export function recommendProducts(
  products: Product[],
  taste: TasteSignal,
  stats: Record<string, ProductStats>,
  options: { limit?: number; excludeIds?: string[]; seed?: number } = {}
): Recommendation[] {
  const { limit = 8, excludeIds = [], seed = dailySeed() } = options;
  const excluded = new Set(excludeIds);
  return rankProducts(products, taste, stats, seed)
    .filter((item) => !excluded.has(item.product.id) && Number(item.product.stock) > 0)
    .slice(0, limit);
}

/** Productos parecidos a uno concreto, para la ficha de producto. */
export function relatedProducts(
  target: Product,
  products: Product[],
  stats: Record<string, ProductStats>,
  limit = 4,
  seed = dailySeed()
): Recommendation[] {
  return products
    .filter((product) => product.id !== target.id && Number(product.stock) > 0)
    .map((product) => {
      const score =
        (product.category === target.category ? 3.2 : 0) +
        (product.fandom === target.fandom ? 2.4 : 0) +
        (product.brand === target.brand ? 1.2 : 0) +
        popularity(product, stats[product.id]) +
        (hash01(product.id, seed) - 0.5) * 0.3;
      return {
        product,
        score,
        reason:
          product.category === target.category
            ? `Otra opción en ${product.category}`
            : `También de ${FANDOM[product.fandom]?.short || 'la banda'}`,
      };
    })
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'))
    .slice(0, limit);
}
