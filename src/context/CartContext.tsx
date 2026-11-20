import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../lib/types';

export type CartLine = { product: Product; qty: number };

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  total: number;
  ready: boolean;
  add: (product: Product, qty?: number) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  sync: (products: Product[]) => void;
};

const CartCtx = createContext<Ctx>(null as any);
export const useCart = () => useContext(CartCtx);
const KEY = 'kessoku_cart_v1';

const clampQty = (qty: number, stock: number) =>
  Math.max(1, Math.min(Math.floor(qty) || 1, Math.max(0, stock)));

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const linesRef = useRef<CartLine[]>([]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLines(
            parsed.filter(
              (line: any) =>
                line?.product?.id &&
                typeof line.qty === 'number' &&
                line.qty > 0 &&
                Number(line.product.stock) > 0
            )
          );
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, ready]);

  const add = useCallback((product: Product, qty = 1) => {
    if (!product || Number(product.stock) <= 0) return false;
    const requested = Math.max(1, Math.floor(qty) || 1);
    const current = linesRef.current.find((line) => line.product.id === product.id)?.qty || 0;
    if (current + requested > Number(product.stock)) return false;

    setLines((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, product, qty: clampQty(line.qty + requested, product.stock) }
            : line
        );
      }
      return [...prev, { product, qty: clampQty(requested, product.stock) }];
    });
    return true;
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      prev.flatMap((line) => {
        if (line.product.id !== id) return [line];
        if (qty <= 0) return [];
        return [{ ...line, qty: clampQty(qty, line.product.stock) }];
      })
    );
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((line) => line.product.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const sync = useCallback((products: Product[]) => {
    const map = new Map(products.map((product) => [product.id, product]));
    setLines((prev) => {
      let changed = false;
      const next = prev.flatMap((line) => {
        const live = map.get(line.product.id);
        if (!live || Number(live.stock) <= 0) {
          changed = true;
          return [];
        }
        const qty = clampQty(line.qty, live.stock);
        if (qty !== line.qty || live.price !== line.product.price) {
          changed = true;
          return [{ product: live, qty }];
        }
        return [line];
      });
      return changed ? next : prev;
    });
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.qty * Number(line.product.price || 0), 0),
    [lines]
  );

  const value = useMemo<Ctx>(
    () => ({
      lines,
      ready,
      subtotal,
      total: subtotal,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      add,
      setQty,
      remove,
      clear,
      sync,
    }),
    [lines, ready, subtotal, add, setQty, remove, clear, sync]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
