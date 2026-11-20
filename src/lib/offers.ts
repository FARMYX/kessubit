import { money } from './theme';
import type { Product } from './types';

export type OfferInfo = {
  active: boolean;
  previous: number;
  price: number;
  percent: number;
  saved: number;
  label: string;
  note: string;
};

/**
 * Una oferta existe cuando el precio anterior es válido y mayor al actual.
 * Los productos sin `previousPrice` no se consideran oferta (nunca se inventa
 * un precio tachado).
 */
export function offerOf(product: Pick<Product, 'price' | 'previousPrice'>): OfferInfo {
  const price = Number(product.price) || 0;
  const previous = Number(product.previousPrice) || 0;
  const active = previous > price && price > 0;
  const saved = active ? previous - price : 0;
  const percent = active ? Math.round((saved / previous) * 100) : 0;
  return {
    active,
    previous: active ? previous : 0,
    price,
    percent,
    saved,
    label: active ? `-${percent}%` : '',
    note: active ? `Antes ${money(previous)} · Ahorras ${money(saved)}` : '',
  };
}

export const productsOnOffer = <T extends Pick<Product, 'price' | 'previousPrice'>>(
  products: T[]
): T[] => products.filter((product) => offerOf(product).active);
