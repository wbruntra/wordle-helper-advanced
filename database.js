// import knex from 'knex'
// import knexConfig from './knexfile.js'
import db from './db_connect.js'

// Initialize knex with the development configuration
// const db = knex(knexConfig.development)

export default db

// Database utility functions for second guess cache
export class SecondGuessCacheDB {
  constructor(database = db) {
    this.db = database
  }

  async saveCache(initialGuess, cacheData) {
    // Begin transaction
    const trx = await this.db.transaction()

    try {
      // Delete existing cache for this initial guess
      await trx('second_guess_cache').where('initial_guess', initialGuess).del()

      // Prepare batch insert data
      const insertData = []

      Object.entries(cacheData).forEach(([evaluationKey, keyData]) => {
        // Only save entries that have valid data
        if (keyData.filteredAnswersCount > 0 && keyData.bestGuesses.length > 0) {
          const bestGuess = keyData.bestGuesses[0]

          insertData.push({
            initial_guess: initialGuess,
            evaluation_key: evaluationKey,
            filtered_answers_count: keyData.filteredAnswersCount,
            max_bins: keyData.maxBins,
            best_distribution: keyData.bestDistribution,
            best_word: bestGuess.word,
            best_word_bins: bestGuess.bins,
            best_word_distribution: bestGuess.distribution,
          })
        }
      })

      // Batch insert the cache data
      if (insertData.length > 0) {
        await trx('second_guess_cache').insert(insertData)
      }

      await trx.commit()
      console.log(
        `Saved ${insertData.length} cache entries to database for initial guess: ${initialGuess}`,
      )
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async loadCache(initialGuess) {
    const rows = await this.db('second_guess_cache')
      .where('initial_guess', initialGuess)
      .select('*')

    const cache = {}

    rows.forEach((row) => {
      cache[row.evaluation_key] = {
        filteredAnswersCount: row.filtered_answers_count,
        bestGuesses: [
          {
            word: row.best_word,
            bins: row.best_word_bins,
            distribution: parseFloat(row.best_word_distribution),
          },
        ],
        maxBins: row.max_bins,
        bestDistribution: parseFloat(row.best_distribution),
      }
    })

    return cache
  }

  async cacheExists(initialGuess) {
    const count = await this.db('second_guess_cache')
      .where('initial_guess', initialGuess)
      .count('* as count')
      .first()

    const exists = count && count.count > 0
    console.log(`  [DB] Checking cache for ${initialGuess}: count=${count?.count || 0}, exists=${exists}`)
    return exists
  }

  async deleteCache(initialGuess) {
    const deleted = await this.db('second_guess_cache')
      .where('initial_guess', initialGuess)
      .del()

    console.log(`  [DB] Deleted ${deleted} entries for ${initialGuess}`)
    return deleted
  }

  async getCacheStats() {
    const stats = await this.db('second_guess_cache')
      .select(
        this.db.raw('COUNT(DISTINCT initial_guess) as initial_guesses'),
        this.db.raw('COUNT(*) as total_entries'),
        this.db.raw('MIN(filtered_answers_count) as min_filtered'),
        this.db.raw('MAX(filtered_answers_count) as max_filtered'),
        this.db.raw('AVG(filtered_answers_count) as avg_filtered'),
      )
      .first()

    return stats
  }
}
