import { describe, expect, test } from 'bun:test'
import {
  applyGuesses,
  binSizes,
  evaluate,
  filterByGuess,
  groupByKey,
  letterStates,
  normalizeKey,
  normalizeWord,
} from './wordle'

describe('evaluate', () => {
  test('GGGGG for an exact match', () => {
    expect(evaluate('STORK', 'STORK')).toBe('GGGGG')
  })

  test('all grey when nothing matches', () => {
    expect(evaluate('AABBB', 'CCCDD')).toBe('-----')
  })

  test('yellow for right letter, wrong place', () => {
    expect(evaluate('CRANE', 'STORK')).toBe('-Y---')
    expect(evaluate('CRATE', 'STORK')).toBe('-Y-Y-')
  })

  test('repeated letters are only credited as often as the answer holds them', () => {
    expect(evaluate('ABBEY', 'HELLO')).toBe('---Y-')
    expect(evaluate('SPEED', 'ABIDE')).toBe('--Y-Y')
    expect(evaluate('LLAMA', 'HELLO')).toBe('YY---')
  })

  test('greens take priority over yellows for the same letter', () => {
    expect(evaluate('GEESE', 'EERIE')).toBe('-GY-G')
    expect(evaluate('STORM', 'STORK')).toBe('GGGG-')
  })
})

describe('filtering', () => {
  const words = ['STORK', 'STORM', 'STORE', 'SLATE', 'SPARE', 'STARK']

  test('filterByGuess keeps words that give the same colours', () => {
    expect(filterByGuess({ word: 'STORK', key: 'GGGGG' }, words)).toEqual(['STORK'])
    expect(filterByGuess({ word: 'STORK', key: 'GGGG-' }, words).sort()).toEqual([
      'STORE',
      'STORM',
    ])
    expect(filterByGuess({ word: 'STORK', key: '-----' }, words)).toEqual([])
  })

  test('applyGuesses narrows by each guess in turn', () => {
    const guesses = [
      { word: 'STORK', key: 'GGGG-' },
      { word: 'STORM', key: 'GGGGG' },
    ]
    expect(applyGuesses(words, guesses)).toEqual(['STORM'])
  })

  test('applyGuesses with no guesses returns everything', () => {
    expect(applyGuesses(words, [])).toEqual(words)
  })
})

describe('bins', () => {
  const words = ['STORK', 'STORM', 'STORE', 'SLATE', 'SPARE']

  test('groupByKey groups answers by the colours a guess would get', () => {
    const bins = groupByKey('STORK', words)
    expect(bins.get('GGGGG')).toEqual(['STORK'])
    expect(bins.get('GGGG-')?.sort()).toEqual(['STORE', 'STORM'])
  })

  test('binSizes lists group sizes, largest first', () => {
    const sizes = binSizes('STORK', words)
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(words.length)
  })

  test('a single word is one bin of one', () => {
    expect(binSizes('STORK', ['STORK'])).toEqual([1])
  })
})

describe('letterStates', () => {
  test('green beats yellow beats grey across guesses', () => {
    const states = letterStates([
      { word: 'CRANE', key: '-Y---' },
      { word: 'ROBOT', key: 'G----' },
    ])
    expect(states.get('R')).toBe('G')
    expect(states.get('C')).toBe('-')
    expect(states.get('O')).toBe('-')
  })
})

describe('normalizing', () => {
  test('words are trimmed and uppercased', () => {
    expect(normalizeWord('  crane ')).toBe('CRANE')
  })

  test('keys keep only G and Y, everything else becomes a dash', () => {
    expect(normalizeKey('gy.xG')).toBe('GY--G')
  })
})
