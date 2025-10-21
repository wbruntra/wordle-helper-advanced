/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('word_classifications', function (table) {
    table.string('definition').nullable()
    table.string('category').nullable()
    table.boolean('likely_wordle').nullable()
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('word_classifications', function (table) {
    table.dropColumn('definition')
    table.dropColumn('category')
    table.dropColumn('likely_wordle')
  })
}
