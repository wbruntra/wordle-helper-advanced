/**
 * second_guess_cache Table DDL:
 * BEGIN_DDL
CREATE TABLE second_guess_cache (
    id INTEGER NOT NULL,
    initial_guess varchar(5) NOT NULL,
    evaluation_key varchar(5) NOT NULL,
    filtered_answers_count INTEGER NOT NULL,
    max_bins INTEGER NOT NULL,
    best_distribution float NOT NULL,
    best_word varchar(5) NOT NULL,
    best_word_bins INTEGER NOT NULL,
    best_word_distribution float NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT second_guess_cache_initial_guess_evaluation_key_unique UNIQUE (initial_guess, evaluation_key)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('../db_connection')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class SecondGuessCache extends Model {
  static get tableName() {
    return 'second_guess_cache'
  }

  // TODO: Add jsonSchema based on DDL above
  // TODO: Add relationMappings if needed
}

module.exports = SecondGuessCache
