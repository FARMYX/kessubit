import {
  C,
  DELIVERY_LABEL,
  paymentLabel,
  PAYMENT_STATUS_COLOR,
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

/**
 * Recibo de pedido, no factura fiscal. Se imprime tal cual desde el panel y
 * desde la app del cliente; la composición es la de una partitura: una sola
 * línea de acento, ritmo vertical y números alineados como en una tablatura.
 */
export function receiptHtml(order: Order): string {
  const status = paymentStatusOf(order);
  const statusColor = PAYMENT_STATUS_COLOR[status] || C.muted;
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
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Recibo ${esc(orderCode(order))} · KESUUBIT</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #fff;
    color: ${C.ink};
    font: 13px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
  }
  .sheet { max-width: 720px; margin: 0 auto; padding: 8px 2px 28px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .mark {
    width: 42px; height: 42px; border-radius: 12px; flex: none;
    background: ${C.pink}; display: flex; align-items: center; justify-content: center;
  }
  .mark svg { display: block; }
  .brand-name { font-size: 19px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; }
  .brand-sub { color: ${C.muted}; font-size: 11px; margin-top: 3px; }
  .doc { text-align: right; }
  .doc-code { font-size: 20px; font-weight: 800; letter-spacing: -0.4px; }
  .doc-type { color: ${C.muted}; font-size: 12px; margin-top: 3px; }
  .rhythm { display: flex; align-items: flex-end; gap: 3px; height: 18px; margin: 14px 0 26px; }
  .rhythm i { display: block; width: 3px; border-radius: 2px; background: ${C.pink}; opacity: 0.9; }
  h2 { font-size: 14px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.2px; }
  section { margin-top: 22px; }
  .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 28px; }
  .meta dt { color: ${C.muted}; font-size: 11px; margin: 0 0 2px; }
  .meta dd { margin: 0; font-weight: 600; color: ${C.inkSoft}; overflow-wrap: anywhere; }
  .status { display: inline-flex; align-items: center; gap: 6px; }
  .status::before {
    content: ""; width: 7px; height: 7px; border-radius: 50%;
    background: ${statusColor}; flex: none;
  }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; font-size: 11px; font-weight: 700; color: ${C.muted};
    padding: 0 6px 8px; border-bottom: 1px solid ${C.ink};
  }
  tbody td { padding: 10px 6px; border-bottom: 1px solid ${C.border}; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 280px; margin: 16px 0 0 auto; }
  .total-line { display: flex; justify-content: space-between; gap: 20px; padding: 3px 6px; color: ${C.inkSoft}; }
  .grand {
    display: flex; justify-content: space-between; gap: 20px;
    margin-top: 8px; padding: 11px 6px 0;
    border-top: 2px solid ${C.ink}; font-size: 16px; font-weight: 800;
  }
  .grand span:last-child { color: ${C.pink}; }
  .note { margin-top: 26px; padding-top: 12px; border-top: 1px solid ${C.border}; color: ${C.muted}; font-size: 11px; }
  footer {
    margin-top: 18px; display: flex; justify-content: space-between; gap: 16px;
    color: ${C.muted}; font-size: 10px;
  }
  .actions { max-width: 720px; margin: 18px auto 0; display: flex; justify-content: flex-end; }
  .actions button {
    background: ${C.pink}; color: #fff; border: 0; border-radius: 10px;
    padding: 11px 20px; font: inherit; font-weight: 700; cursor: pointer;
  }
  .actions button:hover { background: ${C.pinkBright}; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .actions { display: none; }
  }
  @media (max-width: 520px) {
    .sheet { padding: 8px 16px 24px; }
    header { gap: 12px; }
    .brand-sub { display: none; }
    .meta { grid-template-columns: 1fr; gap: 10px; }
    .totals { width: 100%; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">
        <div class="mark" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="9" width="3" height="9" rx="1.5" fill="#fff" />
            <rect x="9.5" y="4" width="3" height="14" rx="1.5" fill="#fff" />
            <rect x="15" y="7" width="3" height="11" rx="1.5" fill="#fff" />
            <rect x="20.5" y="11" width="2.5" height="7" rx="1.25" fill="#fff" opacity="0.75" />
          </svg>
        </div>
        <div>
          <div class="brand-name">KESUUBIT</div>
          <div class="brand-sub">Instrumentos de banda · Oruro</div>
        </div>
      </div>
      <div class="doc">
        <div class="doc-code">${esc(orderCode(order))}</div>
        <div class="doc-type">Recibo de pedido</div>
      </div>
    </header>

    <div class="rhythm" aria-hidden="true">
      <i style="height: 7px"></i><i style="height: 13px"></i><i style="height: 18px"></i>
      <i style="height: 10px"></i><i style="height: 15px"></i><i style="height: 8px"></i>
      <i style="height: 17px"></i><i style="height: 11px"></i><i style="height: 6px"></i>
    </div>

    <section>
      <h2>Detalles del pedido</h2>
      <dl class="meta">
        <div><dt>Fecha</dt><dd>${esc(formatDateTime(order.createdAt))}</dd></div>
        <div><dt>Estado</dt><dd>${esc(STATUS_LABEL[order.status] || order.status)}</dd></div>
        <div><dt>Cliente</dt><dd>${esc(order.userName || 'Cliente')}</dd></div>
        <div><dt>Contacto</dt><dd>${esc(order.userEmail)}${order.phone ? ` · ${esc(order.phone)}` : ''}</dd></div>
        <div><dt>Entrega</dt><dd>${esc(order.deliveryType ? DELIVERY_LABEL[order.deliveryType] : 'Por coordinar')}</dd></div>
        <div><dt>Dirección</dt><dd>${esc(order.address) || 'Por coordinar'}</dd></div>
        <div><dt>Pago</dt><dd>${esc(paymentLabel(order.paymentMethod))}</dd></div>
        <div>
          <dt>Verificación</dt>
          <dd><span class="status">${esc(PAYMENT_STATUS_LABEL[status])}${order.verifiedByName ? ` · ${esc(order.verifiedByName)}` : ''}</span></dd>
        </div>
      </dl>
    </section>

    <section>
      <h2>Productos</h2>
      <table>
        <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="total-line"><span>Subtotal</span><span>${money(order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.qty, 0))}</span></div>
        <div class="total-line"><span>Envío</span><span>${money(order.shipping ?? 0)}</span></div>
        <div class="grand"><span>Total</span><span>${money(order.total)}</span></div>
      </div>
    </section>

    ${order.notes ? `<section><h2>Notas</h2><div>${esc(order.notes)}</div></section>` : ''}

    <div class="note">
      Este documento es un recibo de pedido de KESUUBIT y no constituye una factura fiscal.
      Guárdalo o imprímelo para respaldar tu compra.
    </div>
    <footer><span>KESUUBIT · Hecho para sonar</span><span>Oruro, Bolivia</span></footer>
  </div>
  <div class="actions"><button type="button" onclick="window.print()">Imprimir / guardar PDF</button></div>
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

/** Abre el recibo donde sea posible: pestaña nueva en web, navegador en nativo. */
export async function openReceipt(order: Order): Promise<boolean> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return printReceipt(order);
  }
  try {
    const WebBrowser = await import('expo-web-browser');
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml(order))}`;
    await WebBrowser.openBrowserAsync(url, { showTitle: true, toolbarColor: C.pink });
    return true;
  } catch {
    return false;
  }
}
