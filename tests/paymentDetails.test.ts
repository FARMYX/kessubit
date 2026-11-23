import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bankDetailsLines, bankDetailsText, hasBankDetails } from '../src/lib/paymentDetails';

/** Los datos de transferencia deben ser claros, estables y fáciles de copiar. */

const config = {
  bankName: '  Banco Fiesta  ',
  paymentHolder: 'KESUUBIT',
  bankAccountNumber: '123456789',
  bankDocument: '  ',
};

describe('detalles bancarios del checkout', () => {
  it('ordena las líneas y recorta espacios', () => {
    assert.deepEqual(bankDetailsLines(config), [
      'Banco: Banco Fiesta',
      'Titular: KESUUBIT',
      'Cuenta: 123456789',
    ]);
    assert.equal(
      bankDetailsText(config),
      'Banco: Banco Fiesta\nTitular: KESUUBIT\nCuenta: 123456789'
    );
  });

  it('incluye el documento cuando la tienda lo publica', () => {
    assert.equal(
      bankDetailsLines({ ...config, bankDocument: '1234567' }).at(-1),
      'CI/NIT: 1234567'
    );
  });

  it('no ofrece copiar un bloque vacío', () => {
    assert.equal(hasBankDetails({}), false);
    assert.equal(bankDetailsText({}), '');
    assert.equal(hasBankDetails({ paymentHolder: 'KESUUBIT' }), true);
  });
});
