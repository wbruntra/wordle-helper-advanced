/**
 * Migration for OpenAI Batch API job tracking
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('batch_jobs', function(table) {
    table.increments('id').primary()
    table.string('batch_id').unique().notNullable() // OpenAI batch ID
    table.string('input_file_id').notNullable() // OpenAI input file ID
    table.string('output_file_id').nullable() // OpenAI output file ID (when complete)
    table.string('error_file_id').nullable() // OpenAI error file ID (if errors)
    table.enum('status', [
      'validating', 
      'failed', 
      'in_progress', 
      'finalizing', 
      'completed', 
      'expired', 
      'cancelling', 
      'cancelled'
    ]).notNullable()
    table.string('endpoint').notNullable() // e.g., '/v1/chat/completions'
    table.string('model').notNullable() // e.g., 'gpt-4o-mini'
    table.json('metadata').nullable() // Custom metadata
    table.integer('request_count_total').defaultTo(0)
    table.integer('request_count_completed').defaultTo(0)
    table.integer('request_count_failed').defaultTo(0)
    table.json('word_list').notNullable() // Words included in this batch
    table.timestamp('submitted_at').nullable() // When batch was submitted to OpenAI
    table.timestamp('completed_at').nullable() // When batch completed
    table.timestamp('processed_at').nullable() // When we processed the results
    table.timestamps(true, true)
    
    // Indexes for efficient queries
    table.index(['status'])
    table.index(['created_at'])
    table.index(['completed_at'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('batch_jobs')
}
