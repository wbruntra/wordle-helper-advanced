/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('word_classifications', function(table) {
    table.increments('id').primary()
    table.string('word', 5).notNullable().unique()
    table.enum('classification', ['valid', 'variant']).notNullable()
    table.text('reasoning').nullable() // Optional field for AI reasoning
    table.integer('input_tokens').nullable()
    table.integer('output_tokens').nullable()
    table.integer('total_tokens').nullable()
    table.timestamp('classified_at').defaultTo(knex.fn.now())
    
    // Indexes for performance
    table.index('word')
    table.index('classification')
    table.index('classified_at')
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('word_classifications')
};
