/**
 * first_guesses Table DDL:
 * BEGIN_DDL
CREATE TABLE first_guesses (
    id INTEGER NOT NULL,
    guess varchar(5) NOT NULL,
    bin_count INTEGER,
    stddev float NOT NULL,
    largest_bin INTEGER NOT NULL,
    wordlist_name varchar(255),
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT first_guesses_guess_wordlist_name_unique UNIQUE (guess, wordlist_name)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('../db_connection')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class FirstGuesses extends Model {
  static get tableName() {
    return 'first_guesses'
  }

  // TODO: Add jsonSchema based on DDL above
  // TODO: Add relationMappings if needed
}

module.exports = FirstGuesses
