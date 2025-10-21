/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('second_guess_cache', function (table) {
    table.increments('id').primary()
    table.string('initial_guess', 5).notNullable()
    table.string('evaluation_key', 5).notNullable()
    table.integer('filtered_answers_count').notNullable()
    table.integer('max_bins').notNullable()
    table.decimal('best_distribution', 10, 6).notNullable()
    table.string('best_word', 5).notNullable()
    table.integer('best_word_bins').notNullable()
    table.decimal('best_word_distribution', 10, 6).notNullable()
    table.timestamps(true, true)

    // Create unique index on initial_guess + evaluation_key combination
    table.unique(['initial_guess', 'evaluation_key'])

    // Add indexes for faster lookups
    table.index(['initial_guess'])
    table.index(['evaluation_key'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('second_guess_cache')
}
