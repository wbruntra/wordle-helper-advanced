# Making "Suggest any word" fast

How the guess ranking behind the Remaining dialog's **"Suggest any word, not just
possible answers"** switch went from about 4.2 seconds to about 45 milliseconds,
with exactly the same results.

| Situation (first guess vs answer) | Words left | Before   | After  |
| --------------------------------- | ---------- | -------- | ------ |
| ROUND vs SALTY                    | 1,422      | 4,205 ms | ~45 ms |
| CRANE vs PILOT                    | 774        | 2,194 ms | ~23 ms |
| AUDIO vs WRECK                    | 513        | 1,404 ms | ~17 ms |
| CRANE vs BLOWN                    | 224        | 564 ms   | ~12 ms |

## 1. What the ranking computes

After some guesses, a set of `remaining` words could still be the answer. For
every word you might guess next, we ask: **if I play this, how many different
colour patterns could come back?** Each pattern is a group of answers you can't
yet tell apart. More patterns means smaller groups. If a guess gives `P`
patterns over `N` remaining words, `P / N` is your chance of finishing within
two more guesses.

With the switch on, the candidates are all 6,972 words in the list, not just the
remaining ones. Each candidate is checked against each remaining word, so with
1,422 words left that is **6,972 × 1,422 ≈ 9.9 million guess-vs-answer
comparisons**. There is also a first pass over the remaining words themselves
(1,422² ≈ 2 million more).

Nothing clever will make this fewer than "a lot" of comparisons. So the work
splits into two questions:

1. **How cheap can one comparison be?** (This turned out to be nearly all of
   the gain.)
2. **Can we skip comparisons we don't need?** (These are the pruning ideas you
   suggested. They help, but less.)

## 2. How the original worked

`client-v2/src/lib/ranking.ts` scored each candidate with `binSizes` from
`shared/src/wordle.ts`:

```ts
export function binSizes(guess: string, words: string[]): number[] {
  const counts = new Map<string, number>()
  for (const answer of words) {
    const key = evaluate(guess, answer) // e.g. "-GY-G"
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.values()].sort((a, b) => b - a)
}
```

and `evaluate` worked out the colours the way a person would:

```ts
const marks: Mark[] = new Array(length).fill('-') // new array
const remaining = new Map<string, number>() // new Map
// ...mark greens, count leftover answer letters, then mark yellows...
return marks.join('') // new string
```

This is correct, readable code, and the overall structure was good. The rules
lived in `shared`, the heavy work already ran in a Web Worker so the page stayed
responsive, and the ranking was a single function with clear inputs and
outputs. That structure is what let the fast version drop in without touching
the rest of the app.

The ranking then scored every candidate, sorted all 6,972 results and sent them
to the dialog, which showed the first 60.

## 3. Why it was slow

About 12 million comparisons in 4.2 s works out to **~350 ns per comparison**.
A comparison is, at heart, checking 5 letters against 5 letters, so it should
take a few nanoseconds. The extra time went to:

- **Memory allocation in the innermost loop.** Every comparison created a new
  array, a new `Map` and a new string. That is about 36 million short-lived
  objects. Creating them costs time, and cleaning them up (garbage collection)
  costs more.
- **Strings and Maps as keys.** The pattern was the string `"-GY-G"`, which then
  went through a `Map` to be counted. Hashing a string is far slower than using
  a small integer as an array index.
- **Work nobody looked at.** All 6,972 scores were fully computed and sorted,
  but only the top 60 were shown.

A general lesson: **in code that runs millions of times, every `new`,
`.join()`, `Map` or spread (`[...x]`) is a real cost.** Outside such loops the
same code is perfectly fine.

## 4. The improved system

### Step 1: compare letter codes and turn patterns into numbers

`shared/src/patterns.ts` stores words as numbers instead of strings.
`packWords` turns `"CRANE"` into the bytes `[2, 17, 0, 13, 4]` (A = 0 … Z = 25),
packed for all words into one `Uint8Array`.

A pattern becomes a number too. Each position is a digit in base 3 (grey = 0,
yellow = 1, green = 2), so a pattern is a number from 0 to 242 (3⁵ = 243
possibilities). For example `-GY-G`:

```
position:  0    1    2    3    4
colour:    -    G    Y    -    G
digit:     0    2    1    0    2
value:     0  + 2×3 + 1×9 + 0×27 + 2×81  =  177
```

Small whole numbers make good array indexes. "Have I seen this pattern before?"
becomes a single array lookup instead of string hashing:

```ts
if (seen[pattern] !== stamp) {
  seen[pattern] = stamp
  distinct++
}
```

The `stamp` trick avoids clearing the `seen` array between candidates. Each
candidate gets a new stamp number, and anything marked with an older stamp
counts as "not seen".

`patternIndex` is the direct translation of `evaluate` into this style. It uses
one shared 26-slot counting array that it resets afterwards, so it allocates
nothing. This step alone took the worst case **from 4,205 ms to 167 ms** (about
15 ns per comparison).

### Step 2: abandon a candidate early (your idea)

The dialog shows 60 words, so the ranking now keeps only a top-60 list
(`TopList` in `ranking.ts`). That gives a bound. While scoring a candidate,
**each answer we haven't checked yet can add at most one new pattern**. So if

```
patterns found so far + answers not yet checked  <  what it takes to make the top 60
```

then the candidate can't make the list, and we stop checking it.

Ties need care. For the bound to be exact, the ordering must be a fixed rule,
not "whoever was checked first". The rule is: more patterns first; on a tie,
words that could still be the answer first (they might win outright), then
word-list order. `minimumToEnter(order)` builds that tie-break into the
threshold.

### Step 3: group words that behave identically (your idea)

If a letter appears in **none** of the remaining words, it is always grey and
never affects any other letter's colour. So `FUZZY` and `JUMPY` give exactly the
same patterns if F, Z, J, M and P are all such "dead" letters. `groupEquivalentGuesses`
replaces dead letters with `.` (both become `.U..Y`), scores one word per group,
and gives the result to every member.

**How much did steps 2 and 3 help?** Measured with the step 1 comparison in
place, worst case:

| Version            | Time   |
| ------------------ | ------ |
| Neither            | 167 ms |
| Early abandon only | 162 ms |
| Grouping only      | 151 ms |
| Both               | 138 ms |

That is about 20% together. Early abandonment is weak with many words left: a
good guess yields ~160 patterns from 1,422 answers, so the "answers not yet
checked" term only falls below the threshold near the end of the list. Both
ideas pay off more late in a game, when few words remain and many letters are
dead.

### Step 4: replace the comparison logic with table lookups

This is the step that makes the biggest difference. Look at what determines the
colours of one letter, say **E**, in a guess. It is not the guess's other
letters. It is only:

- where E sits in the guess,
- where E sits in the answer, and
- how many E's the answer has.

So a guess's pattern is a **sum of separate parts, one per distinct letter**,
and each part can be looked up instead of computed.

Each letter's placement in a word is packed into one byte, with a bit for each
position it occupies plus its count:

```ts
placement = positionBits | (count << 5)
```

Two tables are built:

- **`CONTRIBUTION`** (built once, 32 × 256 bytes) answers: "a letter at these
  guess positions, with this placement in the answer, adds how much to the
  pattern?" Building it uses the normal Wordle rules: greens where both words
  have the letter, then yellows from left to right while the answer has spare
  copies.
- **`placements`** (built once per set of remaining words, in `AnswerSet`)
  stores each letter's placement byte in each remaining word.

Worked example: guess **GEESE** against answer **EERIE**.

| Letter | In guess at | In answer       | Contribution                                                                                                             |
| ------ | ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| G      | 0           | absent          | 0 (grey)                                                                                                                 |
| E      | 1, 2, 4     | at 0, 1, 4 (×3) | positions 1 and 4 are green (2×3 + 2×81). The answer has 3 − 2 = 1 E left over, so position 2 is yellow (1×9). Total 177 |
| S      | 3           | absent          | 0 (grey)                                                                                                                 |

0 + 177 + 0 = 177, which is `-GY-G`, exactly what `evaluate` returns.

The comparison loop is now just:

```ts
const pattern =
  contribution[c0 + placements[r0 + a]] +
  contribution[c1 + placements[r1 + a]] +
  contribution[c2 + placements[r2 + a]] +
  contribution[c3 + placements[r3 + a]] +
  contribution[c4 + placements[r4 + a]]
```

`r0…r4` and `c0…c4` are worked out once per guess. A guess with fewer than five
distinct letters is padded with an "occupies no positions" entry, which always
contributes 0. There are no branches, no letter-matching logic and no
allocation: ten byte reads and four additions. That is about **4.5 ns per
comparison, for every word including repeated-letter ones**, compared with
~350 ns originally.

The `placements` table is stored letter by letter (all remaining words' E-bytes
next to each other, and so on). As the loop moves through the answers it reads
five neat rows in order, which suits the CPU cache.

## 5. Things that went wrong along the way

These are worth knowing because they will come up again.

**The JavaScript engine is picky about hot loops.** The first table-based
version was **4× slower** than step 1 (601 ms vs 138 ms), even though it did
less work. The loop read `this.table` and an ordinary array `rows[0]` on every
pass, and the engine (JavaScriptCore, used by Bun and Safari) wouldn't optimise
it well. Copying everything into local variables fixed it. In the final version
the loop is moved into its own function, `countDistinct`, that takes only plain
numbers and typed arrays as parameters. Before that, reading the module-level
`CONTRIBUTION` table inside the loop kept it at ~37 ns per comparison. After it,
4.5 ns. The 16-parameter function looks odd, but that is why it exists, and its
comment says so.

The lesson: **measure, don't assume.** A change that "obviously" does less work
can be slower, and the cause can be invisible in the source code.

**One code path beat two.** A middle version used a fast table only for guesses
with five different letters (2.8 ns) and fell back to `patternIndex` for the
36% with a repeated letter (15.6 ns). That averages to ~7.4 ns. The general
per-letter table handles every word at 4.5 ns, so it was both simpler and
faster.

## 6. How correctness was checked

- `shared/src/patterns.test.ts` checks `patternIndex` against the original
  `evaluate` on tricky repeated-letter pairs and on ~35,000 word pairs. It also
  checks that `AnswerSet.distinctPatterns` counts correctly and only gives up on
  guesses that really can't reach the minimum.
- The new ranking's top 60 was compared with the old "score everything, then
  sort" method (using the same tie-break rule) on all the benchmark situations
  above. Every one matched.
- `evaluate` is still there. It remains the readable reference version of the
  rules, and it is what the tests compare against.

## 7. Where things live

| File                                      | Role                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `shared/src/patterns.ts`                  | Fast comparison code: `packWords`, `patternIndex`, `AnswerSet`                  |
| `shared/src/wordle.ts`                    | Game rules; `evaluate` is the reference, and `binSizes` now uses `patternIndex` |
| `client-v2/src/lib/ranking.ts`            | Ranking rules: top-K list, tie-breaks, dead-letter grouping                     |
| `client-v2/src/workers/compute.worker.ts` | Runs the ranking off the main thread                                            |

## 8. Possible next steps

- **Raise or remove `RANK_LIMIT` further.** It was raised from 1,500 to 3,000
  after this work. With 2,678 words left, "any word" ranking takes ~85 ms
  (~33 ms for possible answers only). At ~4.5 ns per comparison, even the full
  list (6,972 × 6,972 ≈ 49 million comparisons) would take a few hundred
  milliseconds in the worker.
- **The turn analysis** (`client-v2/src/lib/analysis.ts`) already got faster
  through `binSizes`. It could use `AnswerSet` directly in the same way if it
  ever needs to.
