export const CURRENCY = 'Bs';

/** Same format used by the app: `Bs 1.234,56`. */
export function money(n: number): string {
  const [int, dec] = Number(n || 0).toFixed(2).split('.');
  return `${CURRENCY} ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type CleanItem = { productId: string; qty: number };

export type StoreConfigLike = {
  address?: unknown;
  shippingCost?: unknown;
  freeShippingThreshold?: unknown;
  deliveryEnabled?: unknown;
  pickupEnabled?: unknown;
};

/**
 * Merges repeated product lines. The caller validates every entry first; this
 * helper only normalizes the shape so the same product is read once.
 */
export function cleanItems(raw: unknown): CleanItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, number>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const qty = Number(item.qty);
    if (!productId || !Number.isInteger(qty) || qty <= 0) continue;
    merged.set(productId, (merged.get(productId) || 0) + qty);
  }
  return Array.from(merged, ([productId, qty]) => ({ productId, qty }));
}

/**
 * Server-side shipping rule. Mirrors the checkout preview but always reads the
 * store configuration from Firestore, never from the client payload.
 */
export function shippingFor(
  subtotal: number,
  config: StoreConfigLike,
  deliveryType: 'delivery' | 'pickup'
): number {
  if (deliveryType !== 'delivery') return 0;
  const threshold = Number(config.freeShippingThreshold || 0);
  if (subtotal >= threshold) return 0;
  return Math.max(0, Number(config.shippingCost || 0));
}
