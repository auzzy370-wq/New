/**
 * Money utilities - all amounts stored as integers (smallest currency unit)
 * e.g. $10.00 = 1000 cents
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(fromCents(cents));
}

export function calculatePlatformFee(amount: number, rate: number): number {
  return Math.round(amount * rate);
}

export function calculateTax(amount: number, rate: number): number {
  return Math.round(amount * rate);
}
