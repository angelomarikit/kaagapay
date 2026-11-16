/** Decimal-safe money helpers (display + parse; authoritative math lives in Postgres). */

const MONEY_PATTERN = /^-?\d+(\.\d{0,2})?$/

export function parseMoneyInput(value: string | number): string {
  const raw = typeof value === 'number' ? value.toFixed(2) : String(value ?? '')
  const cleaned = raw.replace(/[₱,\s]/g, '').trim()
  if (cleaned === '' || cleaned === '-') return cleaned
  if (!MONEY_PATTERN.test(cleaned)) {
    throw new Error(`Invalid money amount: ${value}`)
  }
  const [whole, frac = ''] = cleaned.split('.')
  const normalizedFrac = frac.padEnd(2, '0').slice(0, 2)
  return `${whole}.${normalizedFrac}`
}

export function addMoney(a: string, b: string): string {
  const toCents = (s: string) => {
    const n = parseMoneyInput(s)
    const negative = n.startsWith('-')
    const [w, f = '00'] = n.replace('-', '').split('.')
    const cents = BigInt(w) * 100n + BigInt(f.padEnd(2, '0').slice(0, 2))
    return negative ? -cents : cents
  }
  const sum = toCents(a) + toCents(b)
  const negative = sum < 0n
  const abs = negative ? -sum : sum
  const whole = abs / 100n
  const frac = (abs % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${whole}.${frac}`
}

export function multiplyMoney(unitPrice: string, quantity: string | number): string {
  const q =
    typeof quantity === 'number'
      ? quantity
      : Number.parseFloat(String(quantity).replace(/,/g, ''))
  if (!Number.isFinite(q)) throw new Error('Invalid quantity')
  const [whole, frac = '00'] = parseMoneyInput(unitPrice).split('.')
  const unitCents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2))
  const totalCents = (unitCents * BigInt(Math.round(q * 100))) / 100n
  const negative = totalCents < 0n
  const abs = negative ? -totalCents : totalCents
  const w = abs / 100n
  const f = (abs % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${w}.${f}`
}

export function formatPeso(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '₱0.00'
  const n = typeof amount === 'number' ? amount : Number.parseFloat(parseMoneyInput(String(amount)))
  if (!Number.isFinite(n)) return '₱0.00'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(n)
}

export function journalLinesBalanced(
  lines: { debit: string; credit: string }[],
): boolean {
  let debit = '0.00'
  let credit = '0.00'
  for (const line of lines) {
    debit = addMoney(debit, line.debit || '0.00')
    credit = addMoney(credit, line.credit || '0.00')
  }
  return debit === credit && debit !== '0.00'
}