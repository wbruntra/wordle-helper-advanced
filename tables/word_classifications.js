/**
 * word_classifications Table DDL:
 * BEGIN_DDL
CREATE TABLE word_classifications (
    id INTEGER NOT NULL,
    word varchar(5) NOT NULL,
    classification TEXT NOT NULL,
    reasoning TEXT,
    classified_at datetime DEFAULT CURRENT_TIMESTAMP,
    frequency_score INTEGER,
    definition varchar(255),
    category varchar(255),
    likely_wordle boolean,
    PRIMARY KEY (id),
    CONSTRAINT word_classifications_word_unique UNIQUE (word)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('../db_connection')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class WordClassifications extends Model {
  static get tableName() {
    return 'word_classifications'
  }

  // TODO: Add jsonSchema based on DDL above
  // TODO: Add relationMappings if needed
}

module.exports = WordClassifications
