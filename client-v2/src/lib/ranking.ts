import { AnswerSet, packWords } from '@wordle/shared'

export interface RankedWord {
  word: string
  /** Distinct colour patterns the word can produce against the remaining words. */
  patterns: number
}

export interface Ranking {
  /** The best `limit` guesses, best first. */
  top: RankedWord[]
  /** How many guesses were in the running. */
  candidates: number
}

/**
 * Rank candidate guesses by how many distinct patterns they split `remaining`
 * into. With N remaining words, `patterns / N` is the chance of finishing within
 * two guesses when playing the word and then picking within the resulting group.
 *
 * Candidates are the remaining words themselves unless `includeAllWords` is set
 * *and* no remaining word separates all the others, in which case any word from
 * `allWords` may be suggested as a "helper". Ties go to remaining words (they
 * might win outright), then to the order the words were given in.
 *
 * Only the top `limit` are returned, which lets most candidates be abandoned
 * part-way: each answer not yet checked can add at most one new pattern, so a
 * candidate stops as soon as it can no longer reach the current top `limit`.
 */
export function rankGuesses(
  remaining: string[],
  allWords: string[],
  includeAllWords: boolean,
  limit: number,
): Ranking {
  const answers = new AnswerSet(remaining)
  const top = new TopList(limit)

  const packedRemaining = packWords(remaining)
  for (let g = 0; g < remaining.length; g++) {
    const patterns = answers.distinctPatterns(packedRemaining, g, top.minimumToEnter(g))
    if (patterns !== null) top.offer({ word: remaining[g], patterns }, g)
  }

  const separatesEverything = top.best === remaining.length
  if (!includeAllWords || separatesEverything)
    return { top: top.entries(), candidates: remaining.length }

  const isRemaining = new Set(remaining)
  const helpers = allWords.filter((word) => !isRemaining.has(word))
  const groups = groupEquivalentGuesses(helpers, remaining)
  const representatives = packWords(groups.map((group) => helpers[group[0]]))
  const order = (index: number) => remaining.length + index

  for (let g = 0; g < groups.length; g++) {
    const members = groups[g]
    const patterns = answers.distinctPatterns(
      representatives,
      g,
      top.minimumToEnter(order(members[0])),
    )
    if (patterns === null) continue
    for (const index of members) top.offer({ word: helpers[index], patterns }, order(index))
  }

  return { top: top.entries(), candidates: remaining.length + helpers.length }
}

/**
 * Group guesses that split `remaining` identically, as lists of indexes into
 * `guesses`. A letter that appears in no remaining word is always grey and
 * never uses up a letter of the answer, so guesses differing only in such
 * "dead" letters are interchangeable.
 */
function groupEquivalentGuesses(guesses: string[], remaining: string[]): number[][] {
  const live = new Set(remaining.join(''))
  const groups = new Map<string, number[]>()
  guesses.forEach((word, index) => {
    let signature = ''
    for (const letter of word) signature += live.has(letter) ? letter : '.'
    const group = groups.get(signature)
    if (group) group.push(index)
    else groups.set(signature, [index])
  })
  return [...groups.values()]
}

/**
 * The best `limit` words seen so far, ordered by patterns (most first) and then
 * by `order` (lowest first).
 */
class TopList {
  private readonly items: { entry: RankedWord; order: number }[] = []

  private readonly limit: number

  constructor(limit: number) {
    this.limit = limit
  }

  get best(): number {
    return this.items[0]?.entry.patterns ?? 0
  }

  /** Fewest patterns a word with this `order` needs to make the list. */
  minimumToEnter(order: number): number {
    const last = this.items[this.limit - 1]
    if (!last) return 0
    return order < last.order ? last.entry.patterns : last.entry.patterns + 1
  }

  offer(entry: RankedWord, order: number) {
    const ranksBelow = (item: { entry: RankedWord; order: number }) =>
      item.entry.patterns < entry.patterns ||
      (item.entry.patterns === entry.patterns && item.order > order)
    let at = this.items.findIndex(ranksBelow)
    if (at === -1) at = this.items.length
    if (at >= this.limit) return
    this.items.splice(at, 0, { entry, order })
    if (this.items.length > this.limit) this.items.pop()
  }

  entries(): RankedWord[] {
    return this.items.map((item) => item.entry)
  }
}
