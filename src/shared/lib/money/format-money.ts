export function currencyFractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('ru-RU', {
        currency,
        style: 'currency',
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

export function formatMoney(priceMinor: number, currency: string): string {
  const digits = currencyFractionDigits(currency)
  const amount = priceMinor / 10 ** digits
  try {
    return new Intl.NumberFormat('ru-RU', {
      currency,
      style: 'currency',
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(amount)} ${currency}`
  }
}
