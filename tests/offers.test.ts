import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { offerOf, productsOnOffer } from '../src/lib/offers';
import { receiptHtml } from '../src/lib/receipt';
import { LOW_STOCK_THRESHOLD, restockProducts, stockState } from '../src/lib/stock';
import type { Product } from '../src/lib/types';

/**
 * Pruebas puras de ofertas y stock. No necesitan emulador: validan que una
 * bajada de precio nunca se inventa y que el umbral por producto se respeta.
 */

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Producto',
  brand: 'Marca',
  category: 'Accesorios',
  fandom: 'bocchi',
  price: 100,
  stock: 10,
  description: '',
  specs: [],
  ...overrides,
});

describe('offerOf', () => {
  it('detecta una bajada de precio y calcula descuento y ahorro', () => {
    const offer = offerOf(product({ previousPrice: 150 }));
    assert.equal(offer.active, true);
    assert.equal(offer.previous, 150);
    assert.equal(offer.saved, 50);
    assert.equal(offer.percent, 33);
    assert.equal(offer.label, '-33%');
    assert.match(offer.note, /Antes Bs 150,00/);
  });

  it('no crea ofertas con precio anterior ausente, menor o igual', () => {
    assert.equal(offerOf(product()).active, false);
    assert.equal(offerOf(product({ previousPrice: 80 })).active, false);
    assert.equal(offerOf(product({ previousPrice: 100 })).active, false);
    assert.equal(offerOf(product({ price: 0, previousPrice: 100 })).active, false);
  });

  it('filtra solo los productos con oferta activa', () => {
    const list = [
      product({ id: 'oferta', previousPrice: 200 }),
      product({ id: 'normal' }),
      product({ id: 'invalida', previousPrice: 50 }),
    ];
    assert.deepEqual(
      productsOnOffer(list).map((item) => item.id),
      ['oferta']
    );
  });
});

describe('stock con umbral por producto', () => {
  it('usa el umbral global cuando el producto no define uno', () => {
    assert.equal(stockState(LOW_STOCK_THRESHOLD), 'bajo');
    assert.equal(stockState(LOW_STOCK_THRESHOLD + 1), 'ok');
    assert.equal(stockState(3, null), 'bajo');
  });

  it('respeta el umbral propio del producto', () => {
    assert.equal(stockState(8, 10), 'bajo');
    assert.equal(stockState(11, 10), 'ok');
    assert.equal(stockState(1, 0), 'ok');
    assert.equal(stockState(0, 10), 'agotado');
  });

  it('ordena reposición con el umbral de cada producto', () => {
    const list = [
      product({ id: 'ok-global', stock: 5 }),
      product({ id: 'bajo-propio', stock: 8, lowStockThreshold: 10 }),
      product({ id: 'agotado', stock: 0 }),
    ];
    assert.deepEqual(
      restockProducts(list).map((item) => item.id),
      ['agotado', 'bajo-propio']
    );
  });
});

describe('receiptHtml', () => {
  const receiptOrder = {
    id: 'abc123',
    orderNumber: 'KG-0042',
    userId: 'u1',
    userEmail: 'ana@ejemplo.com',
    userName: '<Ana> & Co',
    items: [{ id: 'p1', name: 'Guitarra "Strat"', price: 100, qty: 2 }],
    subtotal: 200,
    shipping: 25,
    total: 225,
    address: 'Oruro',
    deliveryType: 'delivery' as const,
    paymentMethod: 'qr' as const,
    paymentStatus: 'verificado' as const,
    status: 'preparando' as const,
  };

  it('muestra identificador, totales, estado legible y aviso de no factura', () => {
    const html = receiptHtml(receiptOrder);
    assert.match(html, /KG-0042/);
    assert.match(html, /Preparando/);
    assert.match(html, /Bs 225,00/);
    assert.match(html, /no constituye una factura fiscal/);
    assert.match(html, /window\.print\(\)/);
  });

  it('escapa datos del cliente para no inyectar HTML', () => {
    const html = receiptHtml(receiptOrder);
    assert.doesNotMatch(html, /<Ana>/);
    assert.match(html, /&lt;Ana&gt; &amp; Co/);
    assert.match(html, /Guitarra &quot;Strat&quot;/);
  });
});
