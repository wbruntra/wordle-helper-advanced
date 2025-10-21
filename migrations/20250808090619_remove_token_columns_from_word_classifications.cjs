/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('word_classifications', function(table) {
    table.dropColumn('input_tokens')
    table.dropColumn('output_tokens')
    table.dropColumn('total_tokens')
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('word_classifications', function(table) {
    table.integer('input_tokens').nullable()
    table.integer('output_tokens').nullable()
    table.integer('total_tokens').nullable()
  })
};
