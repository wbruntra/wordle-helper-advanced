# Wordle Answers Update - Database Version

This document explains the updated system that stores Wordle answers in a SQLite database instead of JSON.

## Overview

The system now consists of:

1. **Knex Migration** - Creates the `answer_history` table with date and word columns
2. **TypeScript Parser** - Parses HTML and efficiently updates the database
3. **Bash Orchestration Script** - Automates the cron job workflow

## Architecture

```
Cron Job (Daily)
    ↓
update-wordle-answers.sh (bash script)
    ├─ Download HTML with curl
    ├─ Call parseAnswers.ts
    │  ├─ Parse HTML table
    │  ├─ Check existing dates in DB
    │  ├─ Insert only new answers
    │  └─ Batch operations for efficiency
    └─ Log results

Results stored in: wordle.sqlite3 → answer_history table
```

## Database Schema

### `answer_history` Table

```sql
CREATE TABLE answer_history (
  id INTEGER PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  word VARCHAR(5) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Columns:**
- `id` - Auto-incrementing primary key
- `date` - Date of the Wordle (YYYY-MM-DD format), unique constraint ensures one answer per day
- `word` - The 5-letter answer (uppercase)
- `created_at` - Timestamp when record was inserted
- `updated_at` - Timestamp when record was last updated

**Indexes:**
- Primary key on `id`
- Unique constraint on `date` (prevents duplicate dates, enables efficient skipping)

## TypeScript Script - `parseAnswers.ts`

### Command-Line Usage

```bash
# Parse HTML and update database
bun parseAnswers.ts /path/to/answers.html

# Or use default path (debug/answers.html)
bun parseAnswers.ts
```

### Key Features

1. **Efficient Duplicate Skipping**
   - Queries existing dates once at startup
   - Uses Set for O(1) lookup
   - Filters new answers before inserting

2. **Batch Processing**
   - Inserts in batches of 100 records
   - Avoids SQLite compound SELECT limits
   - ~1-3 seconds for 1,595 records on first run
   - ~0.5 seconds on subsequent runs (only new entries)

3. **Database Initialization**
   - Automatically connects to `wordle.sqlite3`
   - Uses Knex configuration from `knexfile.js`
   - Assumes `answer_history` table exists (created by migration)

### Output Example

```
Parsing debug/answers.html...

Found 1595 total answers in HTML
Database already has 1595 entries
✓ No new answers to insert
✓ Database is already up to date

✓ Total entries in database: 1595
✓ Most recent entry in DB: 2025-10-31 = ABHOR
```

### First Run (Empty Database)

```
Parsing debug/answers.html...

Found 1595 total answers in HTML
Database already has 0 entries
✓ Inserted 1595 new answer(s)
✓ Most recent new entry: 2025-10-31 = ABHOR

✓ Total entries in database: 1595
✓ Most recent entry in DB: 2025-10-31 = ABHOR
```

### Second Run (Just Today's New Answer)

```
Parsing debug/answers.html...

Found 1595 total answers in HTML
Database already has 1595 entries
✓ Inserted 1 new answer(s)
✓ Most recent new entry: 2025-11-01 = BRINY

✓ Total entries in database: 1596
✓ Most recent entry in DB: 2025-11-01 = BRINY
```

## Bash Script - `update-wordle-answers.sh`

### Features

- ✅ Downloads HTML using curl
- ✅ Executes TypeScript parser with temp file
- ✅ Comprehensive error handling
- ✅ Colored console output
- ✅ Detailed logging with timestamps
- ✅ Automatic cleanup of temporary files
- ✅ Exit codes for cron monitoring

### Usage

```bash
# Run manually
./update-wordle-answers.sh

# Run from cron (automatic)
0 2 * * * cd /path/to/wordle-helper && ./update-wordle-answers.sh
```

### Cron Job Setup

Add to crontab:

```bash
crontab -e
```

Example entries:

```cron
# Run at 2:00 AM daily (recommended)
0 2 * * * cd /home/william/workspace/personal/wordle-helper && ./update-wordle-answers.sh

# Run at 12:05 AM (just after midnight)
5 0 * * * cd /home/william/workspace/personal/wordle-helper && ./update-wordle-answers.sh

# Run every 6 hours
0 */6 * * * cd /home/william/workspace/personal/wordle-helper && ./update-wordle-answers.sh
```

### Log File

All executions logged to `update-wordle-answers.log`:

```
[2025-10-31 02:00:00] Starting Wordle answers update...
[2025-10-31 02:00:00] Downloading Wordle answers page from https://wordfinder.yourdictionary.com/wordle/answers/...
[SUCCESS] HTML downloaded successfully (991257 bytes)
[2025-10-31 02:00:01] Parsing HTML and updating answer database...
[SUCCESS] Wordle answers database updated successfully
```

## Migration - `20251031110821_create_answer_history.js`

Creates the `answer_history` table:

```javascript
exports.up = function (knex) {
  return knex.schema.createTable('answer_history', function (table) {
    table.increments('id').primary()
    table.date('date').notNullable().unique()
    table.string('word', 5).notNullable()
    table.timestamps(true, true)
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('answer_history')
}
```

### Running the Migration

```bash
# Create the table
npx knex migrate:latest

# Rollback if needed
npx knex migrate:rollback
```

## Performance Characteristics

| Scenario | Time | Operations |
|----------|------|-----------|
| First run (1,595 new) | ~3s | Check DB + Parse HTML + Insert 1595 |
| Daily run (1 new) | ~0.5s | Check DB + Parse HTML + Insert 1 |
| Daily run (no new) | ~0.5s | Check DB + Parse HTML + Skip |

## Database Queries

### Get Today's Answer

```javascript
const answer = await knex('answer_history')
  .where('date', '2025-10-31')
  .first()
// { id: 1595, date: '2025-10-31', word: 'ABHOR', ... }
```

### Get Last 7 Days

```javascript
const week = await knex('answer_history')
  .orderBy('date', 'desc')
  .limit(7)
// [ { date: '2025-10-31', word: 'ABHOR' }, { date: '2025-10-30', word: 'LATHE' }, ... ]
```

### Get Answer by Date Range

```javascript
const answers = await knex('answer_history')
  .whereBetween('date', ['2025-10-01', '2025-10-31'])
  .orderBy('date', 'asc')
```

### Get Total Count

```javascript
const count = await knex('answer_history')
  .count('* as total')
  .first()
// { total: 1595 }
```

## Backend Integration

### Express.js Example

```javascript
const knex = require('knex');
const knexConfig = require('./knexfile');
const db = knex(knexConfig.development);

// Get today's answer
app.get('/api/wordle/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const answer = await db('answer_history')
    .where('date', today)
    .first();
  res.json(answer);
});

// Get last N days
app.get('/api/wordle/history/:days', async (req, res) => {
  const days = Math.min(parseInt(req.params.days), 365);
  const answers = await db('answer_history')
    .orderBy('date', 'desc')
    .limit(days);
  res.json(answers.reverse());
});

// Get specific date
app.get('/api/wordle/date/:date', async (req, res) => {
  const answer = await db('answer_history')
    .where('date', req.params.date)
    .first();
  if (!answer) return res.status(404).json({ error: 'Not found' });
  res.json(answer);
});
```

## Troubleshooting

### Database Not Updating

1. Check migration ran: `npx knex migrate:list`
2. Check table exists: `sqlite3 wordle.sqlite3 ".tables"`
3. Check logs: `tail -20 update-wordle-answers.log`
4. Run script manually: `bun parseAnswers.ts debug/answers.html`

### Cron Job Not Running

1. Check cron is active: `crontab -l`
2. Check system cron logs:
   - Linux: `sudo grep CRON /var/log/syslog`
   - macOS: `log stream --predicate 'process == "cron"'`
3. Verify Bun path in cron: `which bun`
4. Run manually to debug: `bash -x ./update-wordle-answers.sh`

### Performance Issues

1. Batch size too large? Edit `parseAnswers.ts` line with `batchSize = 100`
2. Network slow? Check `curl` speed: `curl -w '%{time_total}' https://wordfinder.yourdictionary.com/wordle/answers/`
3. Database slow? Check indices: `sqlite3 wordle.sqlite3 ".indices answer_history"`

## Files

| File | Purpose |
|------|---------|
| `parseAnswers.ts` | TypeScript HTML parser (updated for DB) |
| `update-wordle-answers.sh` | Bash cron orchestration script |
| `knexfile.js` | Knex database configuration |
| `migrations/20251031110821_create_answer_history.js` | Database schema migration |
| `wordle.sqlite3` | SQLite database file |
| `update-wordle-answers.log` | Execution log file |

## Key Improvements Over JSON

1. **Efficient Updates** - Only new answers inserted, no full file rewrites
2. **Query Flexibility** - SQL queries for filtering, date ranges, aggregation
3. **Data Integrity** - Unique constraint on dates prevents duplicates
4. **Scalability** - Database handles growing data better than JSON files
5. **Batch Operations** - More efficient for 1,595+ records
6. **Integration** - Backend code already uses Knex connections

## Migration Path

If you had the old `answer-history.json`, you can migrate to the database:

```javascript
// One-time migration script
const fs = require('fs');
const knex = require('knex');
const knexConfig = require('./knexfile');

async function migrateFromJson() {
  const db = knex(knexConfig.development);
  const json = JSON.parse(fs.readFileSync('answer-history.json', 'utf-8'));
  
  const batchSize = 100;
  for (let i = 0; i < json.length; i += batchSize) {
    await db('answer_history').insert(json.slice(i, i + batchSize));
  }
  
  await db.destroy();
  console.log(`Migrated ${json.length} answers to database`);
}

migrateFromJson();
```

---

**Created**: October 31, 2025  
**Status**: Production Ready  
**Database**: SQLite3 with Knex ORM
