import type { StoreConfig } from './types';

type BankSource = Pick<
  StoreConfig,
  'bankName' | 'paymentHolder' | 'bankAccountNumber' | 'bankDocument'
>;

const clean = (value?: string | null) => (value || '').trim();

/**
 * Datos bancarios listos para mostrar y copiar en el checkout.
 * `paymentHolder` se reutiliza porque ya es el titular publicado para QR.
 */
export function bankDetailsLines(config: BankSource): string[] {
  const lines: string[] = [];
  const bank = clean(config.bankName);
  const holder = clean(config.paymentHolder);
  const account = clean(config.bankAccountNumber);
  const document = clean(config.bankDocument);

  if (bank) lines.push(`Banco: ${bank}`);
  if (holder) lines.push(`Titular: ${holder}`);
  if (account) lines.push(`Cuenta: ${account}`);
  if (document) lines.push(`CI/NIT: ${document}`);
  return lines;
}

export function bankDetailsText(config: BankSource): string {
  return bankDetailsLines(config).join('\n');
}

export function hasBankDetails(config: BankSource): boolean {
  return bankDetailsLines(config).length > 0;
}
