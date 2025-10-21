import db from './database.js'
import { getBins } from '@advancedUtils'
import likelyWords from './likely-word-list.json'
import { createHash } from 'node:crypto'

const DEFAULT_SAMPLE_SIZE = 250

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    sampleSize: DEFAULT_SAMPLE_SIZE,
  }

  for (const arg of args) {
    if (arg.startsWith('--sample=')) {
      const value = Number.parseInt(arg.split('=')[1], 10)
      if (!Number.isNaN(value) && value > 0) {
        options.sampleSize = value
      }
    }
  }

  return options
}

const selectRandomSample = (words, sampleSize) => {
  if (sampleSize >= words.length) {
    return [...words]
  }

  const copy = [...words]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, sampleSize)
}

const calculateStatsForWord = (word, wordList) => {
  const bins = getBins(word, wordList, { returnObject: true })
  const binSizes = Object.values(bins)

  if (binSizes.length === 0) {
    return {
      binCount: 0,
      stddev: 0,
      largestBin: 0,
    }
  }

  const binCount = binSizes.length
  const total = binSizes.reduce((acc, value) => acc + value, 0)
  const mean = total / binCount
  const variance = binSizes.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / binCount
  const stddev = Math.sqrt(variance)
  const largestBin = Math.max(...binSizes)

  return {
    binCount,
    stddev,
    largestBin,
  }
}

const chunkArray = (array, chunkSize) => {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

const main = async () => {
  const { sampleSize } = parseArgs()

  const wordListHash = createHash('md5').update(JSON.stringify(likelyWords)).digest('hex')

  const processedWords = await db('first_guesses')
    .distinct('guess')
    .where('wordlist_name', wordListHash)
    .pluck('guess')
  console.log(`Found ${processedWords.length} already processed words in database.`)

  const unprocessedWords = likelyWords.filter((word) => !processedWords.includes(word))
  console.log(`There are ${unprocessedWords.length} unprocessed words remaining.`)

  if (unprocessedWords.length === 0) {
    console.log('All words have already been processed. Exiting.')
    await db.destroy()
    return
  }

  const wordList = [...unprocessedWords]

  console.log(`Word list contains ${wordList.length} entries`)
  console.log(`Word list hash: ${wordListHash}`)

  const sample = selectRandomSample(wordList, sampleSize)
  console.log(`Sampling ${sample.length} words for analysis...`)

  const records = []
  const timestamp = new Date().toISOString()

  for (let index = 0; index < sample.length; index++) {
    const guess = sample[index]
    const stats = calculateStatsForWord(guess, likelyWords)

    records.push({
      guess,
      bin_count: stats.binCount,
      stddev: stats.stddev,
      largest_bin: stats.largestBin,
      wordlist_name: wordListHash,
      created_at: timestamp,
      updated_at: timestamp,
    })

    if ((index + 1) % 25 === 0 || index === sample.length - 1) {
      console.log(`  Processed ${index + 1}/${sample.length} words`)
    }
  }

  if (records.length === 0) {
    console.log('No records to insert. Exiting.')
    await db.destroy()
    return
  }

  console.log(`Inserting ${records.length} records into first_guesses table in batches of 100...`)

  await db.transaction(async (trx) => {
    const chunks = chunkArray(records, 100)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`  Inserting batch ${i + 1}/${chunks.length} (${chunk.length} records)`)
      await trx('first_guesses')
        .insert(chunk)
        .onConflict(['guess', 'wordlist_name'])
        .merge(['bin_count', 'stddev', 'largest_bin', 'updated_at'])
    }
  })

  console.log('Done!')
  await db.destroy()
}

main().catch(async (error) => {
  console.error('An error occurred while populating first guesses:', error)
  await db.destroy()
  process.exit(1)
})
