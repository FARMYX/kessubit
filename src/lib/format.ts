const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000));
  }
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatDate = (value: any) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value: any) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const timeAgo = (value: any) => {
  const d = toDate(value);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.round(h / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatDate(d);
};

export const orderCode = (order: { orderNumber?: string; id?: string }) =>
  order.orderNumber || `KG-${(order.id || '').slice(0, 6).toUpperCase()}`;

export const initials = (name?: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
