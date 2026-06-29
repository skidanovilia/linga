import { describe, expect, it } from 'vitest'
import type { TranslateData } from '../../types/domain'
import { checkTranslate, closestOrdering, matchTokens, tokenize } from './check'

// "My house is in Tbilisi" — the canonical example: a contracted ordering and a
// full ordering that are genuinely different sentences, not permutations.
const houseInTbilisi: TranslateData = {
  ru: 'Мой дом в Тбилиси',
  answer: [
    ['ჩემი', 'სახლი', 'თბილისშია'],
    ['ჩემი', 'სახლი', 'თბილისში', 'არის'],
  ],
}

describe('tokenize', () => {
  it('splits a Georgian sentence into word tokens', () => {
    expect(tokenize('მე ვარ თბილისში')).toEqual(['მე', 'ვარ', 'თბილისში'])
  })

  it('trims and collapses internal whitespace', () => {
    expect(tokenize('  ჩემი   სახლი ')).toEqual(['ჩემი', 'სახლი'])
  })

  it('strips sentence separators and the gap underscore', () => {
    expect(tokenize('ჩემი, სახლი თბილისშია!')).toEqual(['ჩემი', 'სახლი', 'თბილისშია'])
    expect(tokenize('ჩემი — სახლი…')).toEqual(['ჩემი', 'სახლი'])
    expect(tokenize('ჩემი_სახლი')).toEqual(['ჩემი', 'სახლი'])
  })

  it('does not lowercase (Georgian is unicameral; case is meaningless)', () => {
    // Latin proves the no-lowercase path; Georgian has no upper/lower forms.
    expect(tokenize('ABC abc')).toEqual(['ABC', 'abc'])
  })

  it('Unicode-normalizes to NFC so equivalent forms compare equal', () => {
    // Combining acute (e + ´) normalizes to the precomposed form.
    expect(tokenize('café')).toEqual(['café'.normalize('NFC')])
  })

  it('drops empty tokens', () => {
    expect(tokenize('   ')).toEqual([])
    expect(tokenize('. , !')).toEqual([])
  })
})

describe('matchTokens', () => {
  it('reports an exact match', () => {
    expect(matchTokens(['ჩემი', 'სახლი'], ['ჩემი', 'სახლი'])).toEqual({ exact: true, oneError: false })
  })

  it('tolerates a single substitution within edit distance 1', () => {
    expect(matchTokens(['ჩემი', 'სახლო'], ['ჩემი', 'სახლი'])).toEqual({
      exact: false,
      oneError: true,
      errorIndex: 1,
      typed: 'სახლო',
      expected: 'სახლი',
    })
  })

  it('tolerates a single inserted character', () => {
    const m = matchTokens(['ჩემიი', 'სახლი'], ['ჩემი', 'სახლი'])
    expect(m.oneError).toBe(true)
    expect(m.errorIndex).toBe(0)
  })

  it('tolerates a single deleted character', () => {
    const m = matchTokens(['ჩემ', 'სახლი'], ['ჩემი', 'სახლი'])
    expect(m.oneError).toBe(true)
    expect(m.errorIndex).toBe(0)
  })

  it('rejects two differing tokens (never tolerates more than one)', () => {
    expect(matchTokens(['ჩემო', 'სახლო'], ['ჩემი', 'სახლი'])).toEqual({ exact: false, oneError: false })
  })

  it('rejects a single token that is more than one edit away', () => {
    expect(matchTokens(['ჩემი', 'ლამაზია'], ['ჩემი', 'სახლი'])).toEqual({ exact: false, oneError: false })
  })

  it('never fuzzy-matches across a differing token count', () => {
    expect(matchTokens(['ჩემი', 'სახლი'], ['ჩემი', 'სახლი', 'თბილისში'])).toEqual({
      exact: false,
      oneError: false,
    })
  })
})

describe('checkTranslate', () => {
  it('accepts an exact match on the first ordering', () => {
    const r = checkTranslate('ჩემი სახლი თბილისშია', houseInTbilisi)
    expect(r.status).toBe('correct')
    expect(r.matched).toEqual(['ჩემი', 'სახლი', 'თბილისშია'])
  })

  it('accepts an exact match on a later, genuinely different ordering', () => {
    const r = checkTranslate('ჩემი სახლი თბილისში არის', houseInTbilisi)
    expect(r.status).toBe('correct')
    expect(r.matched).toEqual(['ჩემი', 'სახლი', 'თბილისში', 'არის'])
  })

  it('ignores trailing punctuation and surrounding whitespace', () => {
    expect(checkTranslate('  ჩემი სახლი თბილისშია. ', houseInTbilisi).status).toBe('correct')
  })

  it('accepts a single spelling slip as corrected and reports the fix', () => {
    const r = checkTranslate('ჩემი სახლი თბილისშიაა', houseInTbilisi) // one extra char in the last word
    expect(r.status).toBe('corrected')
    expect(r.errorIndex).toBe(2)
    expect(r.typed).toBe('თბილისშიაა')
    expect(r.expected).toBe('თბილისშია')
  })

  it('lets an exact match anywhere beat an earlier single-error match', () => {
    const data: TranslateData = {
      ru: '…',
      answer: [
        ['ჩემი', 'სახლო'], // one edit from the input
        ['ჩემი', 'სახლი'], // exact
      ],
    }
    expect(checkTranslate('ჩემი სახლი', data).status).toBe('correct')
  })

  it('uses the first single-error match in authoring order', () => {
    const data: TranslateData = {
      ru: '…',
      answer: [
        ['ჩემი', 'სახლო'], // both are one edit from 'სახლი'
        ['ჩემი', 'სახლუ'],
      ],
    }
    const r = checkTranslate('ჩემი სახლი', data)
    expect(r.status).toBe('corrected')
    expect(r.expected).toBe('სახლო')
  })

  it('marks a genuinely wrong answer and reveals the closest ordering', () => {
    const data: TranslateData = {
      ru: '…',
      answer: [
        ['ჩემი', 'სახლი', 'დიდია'], // off by one whole word from the input
        ['მე', 'ვარ', 'ქართველი'], // unrelated
      ],
    }
    const r = checkTranslate('ჩემი სახლი ლამაზია', data)
    expect(r.status).toBe('wrong')
    expect(r.closest).toEqual(['ჩემი', 'სახლი', 'დიდია'])
  })

  it('does not apply the one-error tolerance across a missing word', () => {
    const data: TranslateData = { ru: '…', answer: [['ჩემი', 'სახლი', 'თბილისშია']] }
    expect(checkTranslate('ჩემი სახლი', data).status).toBe('wrong')
  })
})

describe('closestOrdering', () => {
  it('picks the ordering with the smallest edit distance', () => {
    const data: TranslateData = {
      ru: '…',
      answer: [
        ['მე', 'ვარ', 'ქართველი'],
        ['ჩემი', 'სახლი', 'დიდია'],
      ],
    }
    expect(closestOrdering(tokenize('ჩემი სახლი ლამაზია'), data)).toEqual(['ჩემი', 'სახლი', 'დიდია'])
  })
})
