import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product } from '../lib/types';

type Ctx = {
  products: Product[];
  loading: boolean;
  error: string | null;
  getProduct: (id: string) => Product | undefined;
};

const ProductsCtx = createContext<Ctx>(null as any);
export const useProducts = () => useContext(ProductsCtx);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        setLoading(false);
        setError(null);
      },
      () => {
        setError('No pudimos cargar el catálogo. Revisa tu conexión.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const value = useMemo<Ctx>(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return {
      products,
      loading,
      error,
      getProduct: (id) => map.get(id),
    };
  }, [products, loading, error]);

  return <ProductsCtx.Provider value={value}>{children}</ProductsCtx.Provider>;
}
