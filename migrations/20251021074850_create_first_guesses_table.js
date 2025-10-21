/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('first_guesses', function (table) {
    table.increments('id').primary()
    table.string('guess', 5).notNullable()
    table.integer('bin_count')
    // standard deviation of bin sizes
    table.float('stddev').notNullable()
    // size of the largest bin
    table.integer('largest_bin').notNullable()
    table.string('wordlist_name')
    table.timestamps(true, true)

    // Create unique index on guess + wordlist_name combination
    table.unique(['guess', 'wordlist_name'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('first_guesses')
}
