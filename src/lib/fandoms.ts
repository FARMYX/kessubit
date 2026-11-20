import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { C, FANDOM } from './theme';
import type { FandomTag } from './types';

export const FANDOMS_REF = () => collection(db, 'fandoms');

/** Las tres etiquetas de siempre siguen funcionando si Firestore está vacío o falla. */
export const DEFAULT_FANDOMS: FandomTag[] = Object.entries(FANDOM).map(([id, meta]) => ({
  id,
  name: meta.label,
  short: meta.short,
  color: meta.color,
  active: true,
}));

export type FandomMeta = { label: string; short: string; color: string };

const readableSlug = (slug: string) =>
  slug.replace(/[-_]+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Etiqueta legible para cualquier slug, incluidos productos creados antes de esta pantalla. */
export function fandomMeta(tags: FandomTag[], id?: string | null): FandomMeta {
  if (!id) return { label: 'Sin fandom', short: '—', color: C.muted };
  const legacy = FANDOM[id];
  const tag = tags.find((item) => item.id === id);
  const label = tag?.name || legacy?.label || readableSlug(id) || 'Sin fandom';
  return {
    label,
    short: tag?.short || legacy?.short || label,
    color: tag?.color || legacy?.color || C.pink,
  };
}

export function subscribeFandoms(
  onData: (fandoms: FandomTag[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    FANDOMS_REF(),
    (snap) => {
      const items = snap.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<FandomTag, 'id'>),
      }));
      items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
      onData(items);
    },
    (error) => onError?.(error)
  );
}

type State = {
  fandoms: FandomTag[];
  loading: boolean;
  error: string;
  source: 'firestore' | 'fallback';
};

let state: State = { fandoms: DEFAULT_FANDOMS, loading: true, error: '', source: 'fallback' };
const listeners = new Set<(next: State) => void>();
let stopSubscription: (() => void) | null = null;

function publish(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

/** Una sola suscripción para todo el catálogo: cada tarjeta no abre un listener. */
function ensureSubscription() {
  if (stopSubscription) return;
  stopSubscription = subscribeFandoms(
    (items) => {
      const live = items.filter((item) => !item.deleted);
      publish({
        fandoms: live.length ? live : DEFAULT_FANDOMS,
        loading: false,
        error: '',
        source: live.length ? 'firestore' : 'fallback',
      });
    },
    () => {
      publish({
        fandoms: DEFAULT_FANDOMS,
        loading: false,
        error: 'No se pudieron cargar las etiquetas de fandom.',
        source: 'fallback',
      });
    }
  );
}

export function useFandoms() {
  const [snapshot, setSnapshot] = useState<State>(state);

  useEffect(() => {
    listeners.add(setSnapshot);
    ensureSubscription();
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  const visibleFandoms = useMemo(
    () => snapshot.fandoms.filter((item) => item.active !== false),
    [snapshot.fandoms]
  );

  return { ...snapshot, visibleFandoms };
}

export async function createFandom(input: { name: string; short?: string; color?: string }) {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio.');
  await addDoc(FANDOMS_REF(), {
    name,
    short: (input.short || '').trim(),
    color: input.color || C.pink,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFandom(id: string, patch: Partial<FandomTag>) {
  await setDoc(doc(db, 'fandoms', id), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

/** Borrado lógico para que una etiqueta eliminada no reaparezca desde el fallback. */
export async function removeFandom(id: string) {
  await setDoc(
    doc(db, 'fandoms', id),
    { deleted: true, active: false, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
