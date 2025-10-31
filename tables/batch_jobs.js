/**
 * batch_jobs Table DDL:
 * BEGIN_DDL
CREATE TABLE batch_jobs (
    id INTEGER NOT NULL,
    batch_id varchar(255) NOT NULL,
    input_file_id varchar(255) NOT NULL,
    output_file_id varchar(255),
    error_file_id varchar(255),
    status TEXT NOT NULL,
    endpoint varchar(255) NOT NULL,
    model varchar(255) NOT NULL,
    metadata json,
    request_count_total INTEGER DEFAULT '0',
    request_count_completed INTEGER DEFAULT '0',
    request_count_failed INTEGER DEFAULT '0',
    word_list json NOT NULL,
    submitted_at datetime,
    completed_at datetime,
    processed_at datetime,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT batch_jobs_batch_id_unique UNIQUE (batch_id)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('../db_connection')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class BatchJobs extends Model {
  static get tableName() {
    return 'batch_jobs'
  }

  // TODO: Add jsonSchema based on DDL above
  // TODO: Add relationMappings if needed
}

module.exports = BatchJobs
