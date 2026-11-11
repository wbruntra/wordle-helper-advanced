import { describe, expect, test } from 'bun:test'
import { AnswerSet, PATTERN_COUNT, packWords, patternIndex, patternKey } from './patterns'
import { evaluate } from './wordle'
import { LIKELY_WORDS } from './words'

const keyFor = (guess: string, answer: string) =>
  patternKey(patternIndex(packWords([guess]), 0, packWords([answer]), 0))

describe('patternIndex', () => {
  test('matches evaluate on repeated-letter edge cases', () => {
    const pairs = [
      ['AABBB', 'CCCDD'],
      ['ABBEY', 'HELLO'],
      ['SPEED', 'ABIDE'],
      ['LLAMA', 'HELLO'],
      ['GEESE', 'EERIE'],
      ['STORM', 'STORK'],
      ['EERIE', 'GEESE'],
      ['ALLAY', 'LLAMA'],
    ]
    for (const [guess, answer] of pairs)
      expect(keyFor(guess, answer)).toBe(evaluate(guess, answer))
  })

  test('matches evaluate across a sample of the word list', () => {
    const sample = LIKELY_WORDS.filter((_, i) => i % 37 === 0)
    const packed = packWords(sample)
    for (let g = 0; g < sample.length; g++) {
      for (let a = 0; a < sample.length; a++) {
        const pattern = patternIndex(packed, g, packed, a)
        expect(pattern).toBeLessThan(PATTERN_COUNT)
        expect(patternKey(pattern)).toBe(evaluate(sample[g], sample[a]))
      }
    }
  })
})

describe('AnswerSet', () => {
  const answers = LIKELY_WORDS.filter((_, i) => i % 11 === 0)
  const guesses = [
    ...LIKELY_WORDS.filter((_, i) => i % 53 === 0),
    'GEESE',
    'EERIE',
    'LLAMA',
    'ALLAY',
    'MAMMA',
    'AAAAA',
  ]
  const packed = packWords(guesses)
  const set = new AnswerSet(answers)
  const expected = (guess: string) =>
    new Set(answers.map((answer) => evaluate(guess, answer))).size

  test('counts the distinct patterns each guess produces', () => {
    guesses.forEach((guess, g) => expect(set.distinctPatterns(packed, g)).toBe(expected(guess)))
  })

  test('gives up only on guesses that fall short of the minimum', () => {
    guesses.forEach((guess, g) => {
      const actual = expected(guess)
      expect(set.distinctPatterns(packed, g, actual)).toBe(actual)
      expect(set.distinctPatterns(packed, g, actual + 1)).toBeNull()
    })
  })
})
