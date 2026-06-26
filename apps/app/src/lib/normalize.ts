/**
 * Normalizes a typed answer for comparison: trims outer whitespace, collapses
 * internal whitespace, lowercases (defensive — harmless for unicameral
 * Georgian), and applies Unicode NFC so visually identical Georgian strings
 * compare equal.
 */
export function normalize(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFC')
}
