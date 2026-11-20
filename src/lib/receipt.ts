import {
  C,
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
  STATUS_LABEL,
  money,
  paymentStatusOf,
} from './theme';
import { formatDateTime, orderCode } from './format';
import type { Order } from './types';

const esc = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Recibo de pedido. No es una factura fiscal boliviana. */
export function receiptHtml(order: Order): string {
  const status = paymentStatusOf(order);
  const rows = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td>${esc(item.name)}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${money(item.price)}</td>
          <td class="num">${money(item.price * item.qty)}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${esc(orderCode(order))} · KESUUBIT</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #211A2B; font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; }
  .sheet { max-width: 720px; margin: 0 auto; padding: 8px 4px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid ${C.pink}; padding-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .mark { width: 44px; height: 44px; border-radius: 14px; background: ${C.pink}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
  .brand strong { display: block; font-size: 20px; letter-spacing: -0.4px; }
  .brand span { color: ${C.muted}; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
  .doc { text-align: right; }
  .doc strong { display: block; font-size: 22px; letter-spacing: -0.4px; }
  .doc span { color: ${C.muted}; font-size: 11px; }
  h1 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; color: ${C.pink}; margin: 26px 0 4px; }
  h2 { font-size: 13px; margin: 26px 0 8px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; color: ${C.inkSoft}; }
  .meta b { color: ${C.muted}; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: ${C.muted}; border-bottom: 1px solid ${C.border}; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid ${C.border}; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin: 16px 0 0 auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 6px; color: ${C.inkSoft}; }
  .totals .grand { border-top: 2px solid ${C.ink}; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 700; color: ${C.ink}; }
  .note { margin-top: 26px; padding: 12px 14px; background: ${C.pinkWash}; border-left: 3px solid ${C.pink}; color: ${C.inkSoft}; font-size: 11px; }
  .foot { margin-top: 30px; padding-top: 12px; border-top: 1px solid ${C.border}; display: flex; justify-content: space-between; color: ${C.muted}; font-size: 10px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .actions { display: none; } }
  .actions { max-width: 720px; margin: 20px auto; display: flex; justify-content: flex-end; }
  .actions button { background: ${C.pink}; color: #fff; border: 0; border-radius: 10px; padding: 11px 20px; font: inherit; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <div class="mark">♪</div>
        <div><strong>KESUUBIT</strong><span>Instrumentos de banda</span></div>
      </div>
      <div class="doc"><strong>${esc(orderCode(order))}</strong><span>Recibo de pedido</span></div>
    </div>

    <h1>Datos del pedido</h1>
    <div class="meta">
      <div><b>Fecha</b><br />${esc(formatDateTime(order.createdAt))}</div>
      <div><b>Estado</b><br />${esc(STATUS_LABEL[order.status] || order.status)}</div>
      <div><b>Cliente</b><br />${esc(order.userName || 'Cliente')}</div>
      <div><b>Contacto</b><br />${esc(order.userEmail)}${order.phone ? ` · ${esc(order.phone)}` : ''}</div>
      <div><b>Entrega</b><br />${esc(order.deliveryType ? DELIVERY_LABEL[order.deliveryType] : 'Por coordinar')}</div>
      <div><b>Dirección</b><br />${esc(order.address)}</div>
      <div><b>Pago</b><br />${esc(order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : 'Por coordinar')}</div>
      <div><b>Verificación</b><br />${esc(PAYMENT_STATUS_LABEL[status])}${order.verifiedByName ? ` · ${esc(order.verifiedByName)}` : ''}</div>
    </div>

    <h2>Productos</h2>
    <table>
      <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${money(order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.qty, 0))}</span></div>
      <div><span>Envío</span><span>${money(order.shipping ?? 0)}</span></div>
      <div class="grand"><span>Total</span><span>${money(order.total)}</span></div>
    </div>

    ${order.notes ? `<h2>Notas</h2><div>${esc(order.notes)}</div>` : ''}

    <div class="note">
      Este documento es un recibo de pedido de KESUUBIT y no constituye una factura fiscal.
      Guarda este PDF o imprímelo para respaldar tu compra.
    </div>
    <div class="foot"><span>KESUUBIT · Hecho para sonar</span><span>Oruro, Bolivia</span></div>
  </div>
  <div class="actions"><button onclick="window.print()">Imprimir / guardar PDF</button></div>
</body>
</html>`;
}

export function printReceipt(order: Order): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const target = window.open('', '_blank');
  if (!target) return false;
  target.document.open();
  target.document.write(receiptHtml(order));
  target.document.close();
  return true;
}
