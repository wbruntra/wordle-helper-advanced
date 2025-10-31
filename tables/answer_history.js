/**
 * answer_history Table DDL:
 * BEGIN_DDL
CREATE TABLE answer_history (
    id INTEGER NOT NULL,
    date date NOT NULL,
    word varchar(5) NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT answer_history_date_unique UNIQUE (date)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('../db_connection')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class AnswerHistory extends Model {
  static get tableName() {
    return 'answer_history'
  }

  // TODO: Add jsonSchema based on DDL above
  // TODO: Add relationMappings if needed
}

module.exports = AnswerHistory
