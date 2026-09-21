/**
 * International invoice currency format: IDR 12,500,000
 */
export function formatIdr(amount: number): string {
  return `IDR ${amount.toLocaleString('en-US')}`;
}
