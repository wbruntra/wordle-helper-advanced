const db = require('./db_connect')

async function exploreData() {
  let firstGuesses = await db('first_guesses').select(['guess', 'bin_count', 'stddev']).orderBy('stddev', 'asc').limit(10)
  console.log('Top 10 First Guesses with Lowest Standard Deviation:')
  // firstGuesses.forEach((guess) => {
  //   console.log(
  //     `Guess: ${guess.guess}, StdDev: ${guess.stddev.toFixed(2)}, Largest Bin: ${
  //       guess.largest_bin
  //     }, Bin Count: ${guess.bin_count}`,
  //   )
  // })

  // display the above as a table in console format
  console.table(firstGuesses)

  // get data ordered by bin_count descending
  firstGuesses = await db('first_guesses').select(['guess', 'bin_count', 'stddev']).orderBy('bin_count', 'desc').limit(10)
  console.log('Top 10 First Guesses with Highest Bin Count:')
  console.table(firstGuesses)
}

await exploreData()

db.destroy()