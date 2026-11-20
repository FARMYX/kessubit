import { C } from './theme';
import type { Product } from './types';

/**
 * Una sola definición de "stock bajo" para catálogo, ficha, administración y
 * dashboard. Cada producto puede overridearlo con `lowStockThreshold`.
 */
export const LOW_STOCK_THRESHOLD = 3;

export type StockState = 'agotado' | 'bajo' | 'ok';

const thresholdOf = (value?: number | string | null): number => {
  if (value === null || value === undefined || value === '') return LOW_STOCK_THRESHOLD;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : LOW_STOCK_THRESHOLD;
};

export function stockState(
  stock: number | string | null | undefined,
  thresholdOverride?: number | string | null
): StockState {
  const value = Number(stock);
  if (!Number.isFinite(value) || value <= 0) return 'agotado';
  if (value <= thresholdOf(thresholdOverride)) return 'bajo';
  return 'ok';
}

export function needsRestock(
  product: Pick<Product, 'stock' | 'lowStockThreshold'>
): boolean {
  return stockState(product.stock, product.lowStockThreshold) !== 'ok';
}

export function stockBadgeLabel(
  stock: number | string | null | undefined,
  thresholdOverride?: number | string | null
): string {
  const state = stockState(stock, thresholdOverride);
  if (state === 'agotado') return 'Agotado';
  const units = Math.max(0, Math.floor(Number(stock)));
  if (state === 'bajo') return `Quedan ${units}`;
  return `Stock ${units}`;
}

/** Texto corto para la tarjeta del catálogo. */
export function stockShortLabel(
  stock: number | string | null | undefined,
  thresholdOverride?: number | string | null
): string {
  const state = stockState(stock, thresholdOverride);
  if (state === 'agotado') return 'Agotado';
  const units = Math.max(0, Math.floor(Number(stock)));
  if (state === 'bajo') return `Últimas ${units} unidad${units === 1 ? '' : 'es'}`;
  return 'Disponible';
}

export function stockColor(
  stock: number | string | null | undefined,
  thresholdOverride?: number | string | null
): string {
  const state = stockState(stock, thresholdOverride);
  if (state === 'agotado') return C.red;
  if (state === 'bajo') return C.yellowDeep;
  return C.green;
}

export function stockSoftColor(
  stock: number | string | null | undefined,
  thresholdOverride?: number | string | null
): string {
  const state = stockState(stock, thresholdOverride);
  if (state === 'agotado') return C.redSoft;
  if (state === 'bajo') return C.yellowSoft;
  return C.greenSoft;
}

const rank = (product: Pick<Product, 'stock' | 'lowStockThreshold'>) => {
  const state = stockState(product.stock, product.lowStockThreshold);
  if (state === 'agotado') return 0;
  if (state === 'bajo') return 1;
  return 2;
};

/** Agotados primero, luego los que quedan con menos unidades. */
export function sortByRestockPriority<
  T extends Pick<Product, 'stock' | 'name' | 'lowStockThreshold'>
>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return Number(a.stock) - Number(b.stock) || a.name.localeCompare(b.name, 'es');
  });
}

export function restockProducts<
  T extends Pick<Product, 'stock' | 'name' | 'lowStockThreshold'>
>(products: T[]): T[] {
  return sortByRestockPriority(products.filter(needsRestock));
}
