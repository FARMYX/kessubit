import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTasteSignal,
  dailySeed,
  productStats,
  rankProducts,
  recommendProducts,
  relatedProducts,
  type TasteSignal,
} from '../src/lib/recommend';
import type { Order, Product, Profile, Review } from '../src/lib/types';

/**
 * Pruebas del motor de recomendaciones de KESUUBIT.
 *
 * El motor es TypeScript puro, así que se ejecuta con `node:test` a través de
 * `tsx`, sin emuladores ni credenciales:
 *
 *   npm test
 */

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  name: `Producto ${id}`,
  brand: 'Marca',
  category: 'Accesorios',
  fandom: 'bocchi',
  price: 10,
  stock: 10,
  description: '',
  specs: [],
  ...overrides,
});

const guitar = product('guitar', {
  name: 'Guitarra Bocchi',
  category: 'Guitarras',
  fandom: 'bocchi',
  brand: 'Bocchi',
});
const bass = product('bass', {
  name: 'Bajo K-On',
  category: 'Bajos',
  fandom: 'kon',
  brand: 'K-On!',
});
const pick = product('pick', {
  name: 'Púa Bocchi',
  category: 'Accesorios',
  fandom: 'bocchi',
  brand: 'Bocchi',
});
const amp = product('amp', {
  name: 'Amplificador',
  category: 'Amplificadores',
  fandom: 'both',
  brand: 'KESUUBIT',
});
const drums = product('drums', {
  name: 'Batería',
  category: 'Baterías',
  fandom: 'kon',
  brand: 'Yamaha',
  stock: 0,
});
const keys = product('keys', {
  name: 'Teclado',
  category: 'Teclados',
  fandom: 'bocchi',
  brand: 'Casio',
  stock: 2,
  featured: true,
});

const catalog = [guitar, bass, pick, amp, drums, keys];

const profileWith = (favorites: string[]): Profile => ({
  uid: 'user-1',
  email: 'cliente@test.kesuubit',
  name: 'Cliente Prueba',
  role: 'client',
  favorites,
});

const orderWith = (
  id: string,
  items: { id: string; qty?: number }[],
  status: Order['status'] = 'entregado'
): Order => ({
  id,
  userId: 'user-1',
  userEmail: 'cliente@test.kesuubit',
  userName: 'Cliente Prueba',
  items: items.map((item) => ({
    id: item.id,
    name: `Producto ${item.id}`,
    price: 10,
    qty: item.qty ?? 1,
  })),
  total: 10,
  address: 'Oruro',
  status,
});

const reviewWith = (id: string, productId: string, rating: number): Review => ({
  id,
  productId,
  userId: 'user-1',
  userName: 'Cliente Prueba',
  rating,
  text: '',
});

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

const tasteWith = (overrides: Partial<TasteSignal> = {}): TasteSignal => ({
  ...EMPTY_TASTE,
  ...overrides,
});

const ids = (items: { product: Product }[]) => items.map((item) => item.product.id);

describe('buildTasteSignal', () => {
  it('devuelve una señal vacía sin historial', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: null,
      orders: [],
      reviews: [],
      cartIds: [],
    });

    assert.deepEqual(taste, EMPTY_TASTE);
  });

  it('convierte los favoritos en las afinidades dominantes', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: profileWith([guitar.id]),
      orders: [],
      reviews: [],
      cartIds: [],
    });

    assert.equal(taste.hasSignals, true);
    assert.deepEqual(taste.favoriteIds, ['guitar']);
    assert.equal(taste.topCategory, 'Guitarras');
    assert.equal(taste.topFandom, 'bocchi');
    assert.equal(taste.topBrand, 'Bocchi');
    assert.equal(taste.categories.Guitarras, 3);
    assert.equal(taste.fandoms.bocchi, 2.5);
    assert.equal(taste.brands.Bocchi, 1.5);
  });

  it('ignora los pedidos cancelados', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: null,
      orders: [orderWith('order-cancelled', [{ id: bass.id }], 'cancelado')],
      reviews: [],
      cartIds: [],
    });

    assert.deepEqual(taste.purchasedIds, []);
    assert.deepEqual(taste.categories, {});
    assert.equal(taste.hasSignals, false);
  });

  it('suma las compras entregadas al gusto del cliente', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: null,
      orders: [orderWith('order-delivered', [{ id: pick.id, qty: 2 }])],
      reviews: [],
      cartIds: [],
    });

    assert.deepEqual(taste.purchasedIds, ['pick']);
    assert.equal(taste.categories.Accesorios, 2.5);
    assert.equal(taste.fandoms.bocchi, 2);
    assert.equal(taste.brands.Bocchi, 1);
    assert.equal(taste.topCategory, 'Accesorios');
  });

  it('refuerza el gusto con opiniones positivas y lo resta con negativas', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: null,
      orders: [],
      reviews: [reviewWith('r1', pick.id, 5), reviewWith('r2', amp.id, 1)],
      cartIds: [],
    });

    assert.deepEqual(taste.reviewedIds, ['pick', 'amp']);
    assert.equal(taste.categories.Accesorios, 2);
    assert.equal(taste.categories.Amplificadores, -1);
    assert.equal(taste.topCategory, 'Accesorios');
    assert.equal(taste.hasSignals, true);
  });

  it('una opinión negativa aislada no crea una preferencia', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: null,
      orders: [],
      reviews: [reviewWith('r1', amp.id, 1)],
      cartIds: [],
    });

    assert.equal(taste.categories.Amplificadores, -1);
    assert.equal(taste.topCategory, null);
    assert.equal(taste.topFandom, null);
    assert.equal(taste.topBrand, null);
  });

  it('incluye el carrito como señal de intención', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: null,
      orders: [],
      reviews: [],
      cartIds: [bass.id],
    });

    assert.deepEqual(taste.cartIds, ['bass']);
    assert.equal(taste.categories.Bajos, 1.5);
    assert.equal(taste.fandoms.kon, 1);
    assert.equal(taste.brands['K-On!'], 0.5);
    assert.equal(taste.topCategory, 'Bajos');
  });

  it('acumula favorito, compra, opinión y carrito sobre el mismo producto', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: profileWith([guitar.id]),
      orders: [orderWith('order-1', [{ id: guitar.id }])],
      reviews: [reviewWith('r1', guitar.id, 4)],
      cartIds: [guitar.id],
    });

    assert.equal(taste.categories.Guitarras, 9);
    assert.equal(taste.fandoms.bocchi, 7);
    assert.equal(taste.brands.Bocchi, 4);
    assert.equal(taste.topCategory, 'Guitarras');
    assert.equal(taste.topFandom, 'bocchi');
    assert.equal(taste.topBrand, 'Bocchi');
  });

  it('ignora identificadores que no existen en el catálogo', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: profileWith(['no-existe']),
      orders: [orderWith('order-1', [{ id: 'tampoco-existe' }])],
      reviews: [],
      cartIds: ['nada'],
    });

    assert.deepEqual(taste.categories, {});
    assert.deepEqual(taste.fandoms, {});
    assert.deepEqual(taste.brands, {});
    assert.equal(taste.topCategory, null);
    assert.equal(taste.hasSignals, true);
  });
});

describe('productStats', () => {
  it('devuelve un objeto vacío sin opiniones', () => {
    assert.deepEqual(productStats([]), {});
  });

  it('calcula la media y el conteo por producto', () => {
    const stats = productStats([
      reviewWith('r1', guitar.id, 5),
      reviewWith('r2', guitar.id, 3),
      reviewWith('r3', bass.id, 4),
    ]);

    assert.deepEqual(stats.guitar, { rating: 4, reviews: 2 });
    assert.deepEqual(stats.bass, { rating: 4, reviews: 1 });
  });

  it('cuenta una valoración de cero sin romper la media', () => {
    const stats = productStats([reviewWith('r1', keys.id, 0), reviewWith('r2', keys.id, 4)]);

    assert.deepEqual(stats.keys, { rating: 2, reviews: 2 });
  });
});

describe('dailySeed', () => {
  it('es estable durante el mismo día UTC', () => {
    const morning = dailySeed(new Date('2026-11-17T06:00:00.000Z'));
    const night = dailySeed(new Date('2026-11-17T23:59:59.000Z'));

    assert.equal(morning, night);
  });

  it('cambia al día siguiente', () => {
    const today = dailySeed(new Date('2026-11-17T12:00:00.000Z'));
    const tomorrow = dailySeed(new Date('2026-11-18T12:00:00.000Z'));

    assert.equal(tomorrow - today, 1);
  });
});

describe('rankProducts', () => {
  it('coloca primero un producto que el cliente ya marcó como favorito', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: profileWith([guitar.id]),
      orders: [],
      reviews: [],
      cartIds: [],
    });
    const ranked = rankProducts(catalog, taste, {}, 42);

    assert.equal(ranked[0].product.id, guitar.id);
    assert.equal(ranked[0].reason, 'Ya está en tus favoritos');
  });

  it('es determinista con la misma semilla', () => {
    const first = rankProducts(catalog, EMPTY_TASTE, {}, 7);
    const second = rankProducts(catalog, EMPTY_TASTE, {}, 7);

    assert.deepEqual(ids(first), ids(second));
    assert.deepEqual(
      first.map((item) => item.score),
      second.map((item) => item.score)
    );
  });

  it('solo usa la semilla para rotar el orden, no para alterar el puntaje', () => {
    const first = rankProducts(catalog, EMPTY_TASTE, {}, 10);
    const second = rankProducts(catalog, EMPTY_TASTE, {}, 11);
    const scores = new Map(second.map((item) => [item.product.id, item.score]));

    first.forEach((item) => {
      const other = scores.get(item.product.id);
      assert.ok(other !== undefined);
      assert.ok(Math.abs(item.score - (other as number)) <= 0.5 + 1e-9);
    });
  });

  it('penaliza los productos sin stock frente a uno idéntico disponible', () => {
    const available = product('available', { name: 'Disponible', stock: 10 });
    const soldOut = product('sold-out', { name: 'Agotado', stock: 0 });
    const ranked = rankProducts([available, soldOut], EMPTY_TASTE, {}, 5);

    assert.ok(ranked[0].score > ranked[1].score);
    assert.equal(ranked[0].product.id, 'available');
  });

  it('favorece los productos destacados', () => {
    const plain = product('plain', { name: 'Normal' });
    const featured = product('featured', { name: 'Destacado', featured: true });
    const ranked = rankProducts([plain, featured], EMPTY_TASTE, {}, 5);

    assert.equal(ranked[0].product.id, 'featured');
    assert.equal(ranked[0].reason, 'Destacado de la banda');
  });

  it('favorece los productos bien valorados', () => {
    const plain = product('plain', { name: 'Normal' });
    const loved = product('loved', { name: 'Querido' });
    const stats = {
      loved: { rating: 5, reviews: 6 },
    };
    const ranked = rankProducts([plain, loved], EMPTY_TASTE, stats, 5);

    assert.equal(ranked[0].product.id, 'loved');
    assert.equal(ranked[0].reason, 'Bien valorado por la banda');
  });

  it('explica la recomendación por categoría y fandom', () => {
    const taste = tasteWith({
      categories: { Guitarras: 3 },
      fandoms: { bocchi: 2 },
      topCategory: 'Guitarras',
      topFandom: 'bocchi',
    });
    const ranked = rankProducts([guitar], taste, {}, 1);

    assert.equal(ranked[0].reason, 'Porque te gusta Guitarras de Bocchi');
  });

  it('explica la recomendación por categoría, fandom o marca', () => {
    const byCategory = rankProducts(
      [guitar],
      tasteWith({ categories: { Guitarras: 3 }, topCategory: 'Guitarras' }),
      {},
      1
    );
    assert.equal(byCategory[0].reason, 'Más de Guitarras');

    const byFandom = rankProducts(
      [guitar],
      tasteWith({ fandoms: { bocchi: 2 }, topFandom: 'bocchi' }),
      {},
      1
    );
    assert.equal(byFandom[0].reason, 'Porque te gusta Bocchi');

    const byBrand = rankProducts(
      [guitar],
      tasteWith({ brands: { Bocchi: 1 }, topBrand: 'Bocchi' }),
      {},
      1
    );
    assert.equal(byBrand[0].reason, 'De Bocchi, una marca que te gusta');
  });

  it('prioriza el motivo de favorito, carrito y compra en ese orden', () => {
    const favorite = rankProducts(
      [pick],
      tasteWith({ favoriteIds: [pick.id], cartIds: [pick.id], purchasedIds: [pick.id] }),
      {},
      1
    );
    assert.equal(favorite[0].reason, 'Ya está en tus favoritos');

    const inCart = rankProducts(
      [pick],
      tasteWith({ cartIds: [pick.id], purchasedIds: [pick.id] }),
      {},
      1
    );
    assert.equal(inCart[0].reason, 'Lo tienes en el carrito');

    const purchased = rankProducts([pick], tasteWith({ purchasedIds: [pick.id] }), {}, 1);
    assert.equal(purchased[0].reason, 'Ya es parte de tu equipo');
  });

  it('usa un motivo neutro cuando no hay señales', () => {
    const ranked = rankProducts([amp], EMPTY_TASTE, {}, 1);

    assert.equal(ranked[0].reason, 'Para empezar tu setup');
  });
});

describe('recommendProducts', () => {
  it('excluye productos agotados y los identificadores indicados', () => {
    const recommended = recommendProducts(
      catalog,
      EMPTY_TASTE,
      {},
      { limit: 10, excludeIds: [pick.id], seed: 3 }
    );
    const recommendedIds = ids(recommended);

    assert.ok(!recommendedIds.includes(drums.id));
    assert.ok(!recommendedIds.includes(pick.id));
    assert.ok(recommendedIds.every((id) => id !== drums.id));
  });

  it('respeta el límite solicitado', () => {
    assert.equal(recommendProducts(catalog, EMPTY_TASTE, {}, { limit: 2, seed: 3 }).length, 2);
    assert.equal(recommendProducts(catalog, EMPTY_TASTE, {}, { seed: 3 }).length, 5);
  });

  it('devuelve primero los productos afines al cliente', () => {
    const taste = buildTasteSignal({
      products: catalog,
      profile: profileWith([guitar.id]),
      orders: [],
      reviews: [],
      cartIds: [],
    });
    const recommended = recommendProducts(catalog, taste, {}, { limit: 3, seed: 3 });

    assert.equal(recommended[0].product.id, guitar.id);
  });

  it('es determinista con la misma semilla', () => {
    const first = recommendProducts(catalog, EMPTY_TASTE, {}, { seed: 9 });
    const second = recommendProducts(catalog, EMPTY_TASTE, {}, { seed: 9 });

    assert.deepEqual(ids(first), ids(second));
  });

  it('devuelve una lista vacía si todo el catálogo está agotado', () => {
    const soldOut = [product('a', { stock: 0 }), product('b', { stock: 0 })];

    assert.deepEqual(recommendProducts(soldOut, EMPTY_TASTE, {}, {}), []);
  });
});

describe('relatedProducts', () => {
  const guitar2 = product('guitar-2', {
    name: 'Guitarra K-On',
    category: 'Guitarras',
    fandom: 'kon',
    brand: 'K-On!',
  });
  const relatedCatalog = [...catalog, guitar2];

  it('excluye el producto de referencia y los agotados', () => {
    const related = relatedProducts(guitar, relatedCatalog, {}, 10, 4);
    const relatedIds = ids(related);

    assert.ok(!relatedIds.includes(guitar.id));
    assert.ok(!relatedIds.includes(drums.id));
    assert.ok(relatedIds.length > 0);
  });

  it('prioriza los productos de la misma categoría', () => {
    const related = relatedProducts(guitar, relatedCatalog, {}, 10, 4);
    const position = (id: string) => ids(related).indexOf(id);

    assert.ok(position(guitar2.id) < position(amp.id));
    assert.equal(
      related.find((item) => item.product.id === guitar2.id)?.reason,
      'Otra opción en Guitarras'
    );
  });

  it('respeta el límite solicitado', () => {
    assert.equal(relatedProducts(guitar, relatedCatalog, {}, 2, 4).length, 2);
  });

  it('es determinista con la misma semilla', () => {
    const first = relatedProducts(guitar, relatedCatalog, {}, 4, 12);
    const second = relatedProducts(guitar, relatedCatalog, {}, 4, 12);

    assert.deepEqual(ids(first), ids(second));
  });
});
