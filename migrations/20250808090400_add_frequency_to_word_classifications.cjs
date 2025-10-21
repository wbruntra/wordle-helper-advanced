/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('word_classifications', function(table) {
    table.integer('frequency_score').nullable()
    
    // Add index for frequency-based queries
    table.index('frequency_score')
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('word_classifications', function(table) {
    table.dropIndex('frequency_score')
    table.dropColumn('frequency_score')
  })
};
