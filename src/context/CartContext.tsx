import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeOfferBundles as subscribeBundles } from '../lib/offerBundles';
import type { OfferBundle, Product } from '../lib/types';

export type CartLine = { product: Product; qty: number };

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  activeBundle: OfferBundle | null;
  ready: boolean;
  add: (product: Product, qty?: number) => boolean;
  applyBundle: (bundle: OfferBundle, products: Product[]) => boolean;
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

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type StoredCart = { lines: CartLine[]; bundleId: string | null };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [bundles, setBundles] = useState<OfferBundle[]>([]);
  const [ready, setReady] = useState(false);
  const linesRef = useRef<CartLine[]>([]);
  const bundleIdRef = useRef<string | null>(null);

  useEffect(() => {
    linesRef.current = lines;
    bundleIdRef.current = bundleId;
  }, [lines, bundleId]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: StoredCart | CartLine[] = JSON.parse(raw);
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
          return;
        }
        if (Array.isArray(parsed?.lines)) {
          setLines(
            parsed.lines.filter(
              (line: any) =>
                line?.product?.id &&
                typeof line.qty === 'number' &&
                line.qty > 0 &&
                Number(line.product.stock) > 0
            )
          );
          setBundleId(typeof parsed.bundleId === 'string' ? parsed.bundleId : null);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ lines, bundleId } satisfies StoredCart)).catch(() => {});
  }, [lines, bundleId, ready]);

  useEffect(() => {
    let alive = true;
    const unsub = subscribeBundles(
      (items) => {
        if (alive) setBundles(items);
      },
      () => {}
    );
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const add = useCallback((product: Product, qty = 1) => {
    if (!product || Number(product.stock) <= 0) return false;
    const requested = Math.max(1, Math.floor(qty) || 1);
    const current = linesRef.current.find((line) => line.product.id === product.id)?.qty || 0;
    if (current + requested > Number(product.stock)) return false;

    setBundleId(null);
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

  const applyBundle = useCallback((bundle: OfferBundle, products: Product[]) => {
    const ids = Array.from(new Set(bundle.productIds));
    if (ids.length < 2) return false;
    const map = new Map(products.map((p) => [p.id, p]));
    const items = ids.map((id) => map.get(id));
    if (items.some((item) => !item || Number(item.stock) < 1)) return false;
    setLines(items.map((item) => ({ product: item!, qty: 1 })));
    setBundleId(bundle.id);
    return true;
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setBundleId(null);
    setLines((prev) =>
      prev.flatMap((line) => {
        if (line.product.id !== id) return [line];
        if (qty <= 0) return [];
        return [{ ...line, qty: clampQty(qty, line.product.stock) }];
      })
    );
  }, []);

  const remove = useCallback((id: string) => {
    setBundleId(null);
    setLines((prev) => prev.filter((line) => line.product.id !== id));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setBundleId(null);
  }, []);

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

  const activeBundle = useMemo(() => {
    if (!bundleId || lines.length === 0) return null;
    const bundle = bundles.find((item) => item.id === bundleId);
    if (!bundle || bundle.active === false) return null;
    const ids = Array.from(new Set(bundle.productIds));
    if (ids.length !== lines.length) return null;
    if (lines.some((line) => line.qty !== 1 || !ids.includes(line.product.id))) return null;
    return bundle;
  }, [bundleId, bundles, lines]);

  const subtotal = useMemo(
    () => round2(lines.reduce((sum, line) => sum + line.qty * Number(line.product.price || 0), 0)),
    [lines]
  );

  const discount = useMemo(() => {
    if (!activeBundle) return 0;
    const savings = subtotal - Number(activeBundle.offerPrice || 0);
    return savings > 0 ? round2(savings) : 0;
  }, [activeBundle, subtotal]);

  const total = useMemo(() => round2(subtotal - discount), [subtotal, discount]);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      ready,
      subtotal,
      discount,
      total,
      activeBundle,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      add,
      applyBundle,
      setQty,
      remove,
      clear,
      sync,
    }),
    [lines, ready, subtotal, discount, total, activeBundle, add, applyBundle, setQty, remove, clear, sync]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
