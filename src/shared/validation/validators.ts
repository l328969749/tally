export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function isValidAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isValidTagName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 30
}

export function isValidCategoryName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 50
}

export function isValidAccountName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 50
}

export function isValidCardNumber(cardNumber: string): boolean {
  if (!cardNumber.trim()) {
    return true
  }
  return /^[0-9\s-]+$/.test(cardNumber.trim())
}

export function isValidMonthDay(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 31
}

export function isValidCreditLimit(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100
}
