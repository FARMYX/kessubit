import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { OfferBundle, Product } from './types';

export const OFFER_BUNDLES_REF = () => collection(db, 'offerBundles');

export function subscribeOfferBundles(
  onData: (bundles: OfferBundle[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    OFFER_BUNDLES_REF(),
    (snap) => {
      const items = snap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<OfferBundle, 'id'>),
      }));
      items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
      onData(items);
    },
    (error) => onError?.(error)
  );
}

export function useOfferBundles() {
  const [bundles, setBundles] = useState<OfferBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeOfferBundles(
      (items) => {
        setBundles(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  return { bundles, loading };
}

export function bundleProducts(bundle: OfferBundle, products: Product[]) {
  const map = new Map(products.map((p) => [p.id, p]));
  return bundle.productIds.map((id) => map.get(id)).filter(Boolean) as Product[];
}

export function bundleOriginalPrice(bundle: OfferBundle, products: Product[]) {
  return bundleProducts(bundle, products).reduce((sum, p) => sum + Number(p.price || 0), 0);
}

export function bundleSavings(bundle: OfferBundle, products: Product[]) {
  const original = bundleOriginalPrice(bundle, products);
  const offer = Number(bundle.offerPrice || 0);
  return original > offer ? original - offer : 0;
}

export async function createOfferBundle(input: {
  name: string;
  productIds: string[];
  offerPrice: number;
  originalPrice?: number;
  active?: boolean;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio.');
  if (input.productIds.length < 2) throw new Error('Elige al menos 2 productos.');
  if (!(input.offerPrice > 0)) throw new Error('El precio de oferta debe ser mayor a 0.');
  await addDoc(OFFER_BUNDLES_REF(), {
    name,
    productIds: input.productIds,
    offerPrice: Number(input.offerPrice),
    originalPrice: Number(input.originalPrice) || 0,
    active: input.active ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateOfferBundle(id: string, patch: Partial<OfferBundle>) {
  await setDoc(
    doc(db, 'offerBundles', id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function removeOfferBundle(id: string) {
  await deleteDoc(doc(db, 'offerBundles', id));
}
