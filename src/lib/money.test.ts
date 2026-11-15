import { describe, expect, it } from 'vitest'
import { addMoney, formatPeso, journalLinesBalanced, multiplyMoney, parseMoneyInput } from './money'

describe('money helpers', () => {
  it('parses and formats peso', () => {
    expect(parseMoneyInput('58')).toBe('58.00')
    expect(formatPeso('58.00')).toContain('58.00')
  })

  it('adds without float drift', () => {
    expect(addMoney('0.10', '0.20')).toBe('0.30')
    expect(addMoney('1000.50', '25.25')).toBe('1025.75')
  })

  it('multiplies unit price by quantity', () => {
    expect(multiplyMoney('58.00', 35)).toBe('2030.00')
  })

  it('validates balanced journal lines', () => {
    expect(
      journalLinesBalanced([
        { debit: '100.00', credit: '0.00' },
        { debit: '0.00', credit: '100.00' },
      ]),
    ).toBe(true)
    expect(journalLinesBalanced([{ debit: '100.00', credit: '0.00' }])).toBe(false)
  })
})