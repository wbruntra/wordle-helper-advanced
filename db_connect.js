const knex = require('knex')({
  client: require('knex-bun-sqlite'),
  connection: { filename: './wordle.sqlite3' },
  useNullAsDefault: true,
})

module.exports = knex
