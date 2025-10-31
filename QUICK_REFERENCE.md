# Quick Reference - Wordle Answers Update System

## Files Overview

| File | Type | Purpose |
|------|------|---------|
| `parseAnswers.ts` | TypeScript | Parses HTML and updates database |
| `update-wordle-answers.sh` | Bash | Cron orchestration script |
| `migrations/20251031...js` | Knex | Database schema migration |
| `DATABASE_README.md` | Docs | Complete database guide |
| `UPDATES_SUMMARY.md` | Docs | Summary of all changes |
| `wordle.sqlite3` | Database | SQLite database with 1,595 answers |

## Quick Commands

### Initial Setup
```bash
# Run migration to create table
npx knex migrate:latest

# Populate database with all answers
bun parseAnswers.ts debug/answers.html

# Verify database
sqlite3 wordle.sqlite3 "SELECT COUNT(*) FROM answer_history;"
```

### Daily Operations
```bash
# Run update script (as cron)
./update-wordle-answers.sh

# View logs
tail -20 update-wordle-answers.log

# Test script
bun parseAnswers.ts debug/answers.html
```

### Database Queries
```bash
# Connect to database
sqlite3 wordle.sqlite3

# View schema
.schema answer_history

# Get today's answer
SELECT * FROM answer_history WHERE date = '2025-10-31';

# Get last 7 days
SELECT * FROM answer_history ORDER BY date DESC LIMIT 7;

# Count total answers
SELECT COUNT(*) FROM answer_history;

# Exit
.quit
```

### Cron Setup
```bash
# Open crontab editor
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * cd /home/william/workspace/personal/wordle-helper && ./update-wordle-answers.sh

# Verify cron job
crontab -l
```

## Performance

- **First Run**: ~3 seconds (1,595 answers)
- **Daily Run**: ~0.5 seconds (1 new answer)
- **Batch Size**: 100 records (SQLite optimized)
- **Database Size**: ~200 KB

## Key Features

✅ Efficient - Only new dates inserted  
✅ Reliable - Unique constraint prevents duplicates  
✅ Logged - All operations tracked to file  
✅ Automated - Works via cron job  
✅ Flexible - SQL queries for any filtering  
✅ Scalable - Database grows efficiently  

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | `npx knex migrate:rollback && npx knex migrate:latest` |
| Script fails | `bun parseAnswers.ts debug/answers.html` (test manually) |
| Cron not running | `crontab -l` (check if scheduled), `tail -f /var/log/syslog` (check logs) |
| Database errors | `sqlite3 wordle.sqlite3 ".schema answer_history"` (verify table exists) |
| No new data | Check HTML file size: `curl -I https://wordfinder.yourdictionary.com/wordle/answers/` |

## Backend Integration

### Express.js
```javascript
const knex = require('knex');
const config = require('./knexfile');
const db = knex(config.development);

// Get today's answer
app.get('/api/wordle/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const answer = await db('answer_history').where('date', today).first();
  res.json(answer);
});

// Get last 7 days
app.get('/api/wordle/history', async (req, res) => {
  const answers = await db('answer_history')
    .orderBy('date', 'desc')
    .limit(7);
  res.json(answers.reverse());
});
```

## API Response Format

```json
{
  "id": 1595,
  "date": "2025-10-31",
  "word": "ABHOR",
  "created_at": "2025-10-31T07:13:13.000Z",
  "updated_at": "2025-10-31T07:13:13.000Z"
}
```

## Example Workflow

```
Day 1 (Oct 31):
  - Run: npx knex migrate:latest
  - Run: bun parseAnswers.ts debug/answers.html
  - Result: 1595 answers in database

Day 2 (Nov 1):
  - Cron runs: update-wordle-answers.sh
  - Downloads HTML (includes new Oct 31 answer that was hidden)
  - Inserts only 1 new record
  - Database now has 1596 answers
  - Time: ~0.5 seconds

Day 3+ (Nov 2+):
  - Same process: download, parse, insert only new
  - Extremely efficient
```

## Files to Keep

- `parseAnswers.ts` - Always needed
- `update-wordle-answers.sh` - Always needed
- `wordle.sqlite3` - Database (do not delete)
- `migrations/` - For version control

## Files You Can Delete

- `answer-history.json` - Replaced by database
- Old documentation

---

**Status**: ✅ Production Ready  
**Database Size**: 1,595 answers  
**Last Updated**: October 31, 2025
