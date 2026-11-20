import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { C } from './theme';
import type { Collection } from './types';

export const COLLECTIONS_REF = () => collection(db, 'collections');

export function subscribeCollections(
  onData: (collections: Collection[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    COLLECTIONS_REF(),
    (snap) => {
      const items = snap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<Collection, 'id'>),
      }));
      items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
      onData(items);
    },
    (error) => onError?.(error)
  );
}

/** Hook liviano para catálogo y ajustes; no necesita provider global. */
export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeCollections(
      (items) => {
        setCollections(items);
        setError('');
        setLoading(false);
      },
      () => {
        setError('No se pudieron cargar las colecciones.');
        setLoading(false);
      }
    );
  }, []);

  return { collections, loading, error };
}

export async function createCollection(input: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio.');
  await addDoc(COLLECTIONS_REF(), {
    name,
    description: (input.description || '').trim(),
    color: input.color || C.pink,
    icon: input.icon || 'musical-notes-outline',
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCollection(id: string, patch: Partial<Collection>) {
  await setDoc(
    doc(db, 'collections', id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function removeCollection(id: string) {
  await deleteDoc(doc(db, 'collections', id));
}

export const collectionOf = (collections: Collection[], id?: string | null) =>
  collections.find((item) => item.id === id);
