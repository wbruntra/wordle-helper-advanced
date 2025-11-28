const db = require('./db_connect')
const fs = require('fs')

const run = async () => {
  const answers = await db('answer_history').select('*').orderBy('date', 'desc').limit(20)

  console.log(answers)

  fs.writeFileSync('recent_answers.json', JSON.stringify(answers, null, 2))
}

run().then(() => {
  process.exit(0)
})
