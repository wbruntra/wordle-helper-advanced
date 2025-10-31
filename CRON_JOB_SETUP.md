# Wordle Answers Daily Update - Cron Job Setup

This document explains how to set up the automated daily Wordle answers update using the bash script.

## Overview

The `update-wordle-answers.sh` bash script automates the entire workflow:
1. Downloads the latest Wordle answers HTML from wordfinder.yourdictionary.com
2. Parses the HTML using the TypeScript `parseAnswers.ts` script
3. Generates/updates `answer-history.json` with all available answers
4. Logs all operations to `update-wordle-answers.log`

## Files

- **`update-wordle-answers.sh`** - Main bash script (executable)
- **`parseAnswers.ts`** - TypeScript parser (accepts HTML file path argument)
- **`answer-history.json`** - Generated output file with all answers
- **`update-wordle-answers.log`** - Daily execution logs

## Prerequisites

- **Bun runtime** - Must be installed and in PATH
- **curl** - For downloading HTML (usually pre-installed on Linux/macOS)
- **bash** - Shell interpreter (standard)

Verify prerequisites:
```bash
which bun      # Should show bun executable path
which curl     # Should show curl executable path
```

## Running Manually

To run the update script manually:

```bash
cd /path/to/wordle-helper
./update-wordle-answers.sh
```

Example output:
```
[2025-10-31 14:30:45] Starting Wordle answers update...
[2025-10-31 14:30:45] Downloading Wordle answers page from https://wordfinder.yourdictionary.com/wordle/answers/...
[SUCCESS] HTML downloaded successfully (42156 bytes)
[2025-10-31 14:30:46] Parsing HTML and generating answer history...
Parsing temp_answers.html...
Found 1595 Wordle answers:
...
[SUCCESS] Successfully updated answer history with 1595 entries
[2025-10-31 14:30:47] Most recent answer date: 2025-10-31
[SUCCESS] Wordle answers update completed successfully
```

## Cron Job Setup

To schedule this script to run daily, add a cron job:

### 1. Open crontab editor:
```bash
crontab -e
```

### 2. Add one of these lines (choose your preferred time):

**Run at 2:00 AM daily** (recommended - after midnight, before most activity):
```cron
0 2 * * * cd /path/to/wordle-helper && ./update-wordle-answers.sh
```

**Run at 12:05 AM daily** (just after midnight):
```cron
5 0 * * * cd /path/to/wordle-helper && ./update-wordle-answers.sh
```

**Run every 6 hours** (backup approach):
```cron
0 */6 * * * cd /path/to/wordle-helper && ./update-wordle-answers.sh
```

### 3. Replace `/path/to/wordle-helper` with the actual absolute path

Example with real path:
```cron
0 2 * * * cd /home/william/workspace/personal/wordle-helper && ./update-wordle-answers.sh
```

### 4. Save and exit

For most editors (nano, vim):
- **nano**: Press `Ctrl+X`, then `Y`, then `Enter`
- **vim**: Press `Esc`, type `:wq`, press `Enter`

### 5. Verify cron job was added:
```bash
crontab -l
```

## Monitoring

### Check logs:
```bash
tail -f /path/to/wordle-helper/update-wordle-answers.log
```

### Check if the script ran:
```bash
grep "2025-10-31" /path/to/wordle-helper/update-wordle-answers.log
```

### View recent 20 lines:
```bash
tail -20 /path/to/wordle-helper/update-wordle-answers.log
```

## How It Works

1. **Download Phase**
   - Uses `curl` to download the HTML page
   - Saves to temporary file: `temp_answers.html`
   - Verifies file is not empty

2. **Parse Phase**
   - Calls `bun parseAnswers.ts temp_answers.html`
   - Parser reads the temporary HTML file
   - Extracts Wordle number and answer from each table row
   - Calculates date using wordle number anchor (Oct 31, 2025 = #1595)
   - Generates JSON array with date and word

3. **Output Phase**
   - Writes `answer-history.json` with all answers
   - Logs number of entries found
   - Displays most recent answer date
   - Cleans up temporary HTML file

4. **Logging Phase**
   - All operations logged with timestamps
   - Both console output and log file capture
   - Colored status messages (✓ for success, [ERROR] for failures)
   - Useful for debugging cron job issues

## Backend Integration

Once the cron job is running, your backend can:

1. **Read the answers file**:
```javascript
const answers = JSON.parse(fs.readFileSync('answer-history.json', 'utf-8'));
```

2. **Get recent answers** (last 7 days):
```javascript
const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const recent = answers.filter(a => new Date(a.date) >= sevenDaysAgo);
```

3. **Serve via API**:
```javascript
app.get('/api/wordle/history', (req, res) => {
  const answers = JSON.parse(fs.readFileSync('answer-history.json', 'utf-8'));
  res.json(answers.slice(0, 7)); // Last 7 answers
});
```

## Troubleshooting

### Script not running from cron

1. **Check if bun is in PATH for cron**:
   - Cron jobs have limited PATH
   - Add full path to bun: `which bun`
   - Update crontab to use full path:
   ```cron
   0 2 * * * cd /path/to/wordle-helper && /usr/local/bin/bun parseAnswers.ts temp_answers.html
   ```

2. **Check cron logs**:
   - Linux: `sudo tail -f /var/log/syslog | grep CRON`
   - macOS: `log stream --predicate 'process == "cron"'`

3. **Test script directly**:
   ```bash
   bash -x ./update-wordle-answers.sh
   ```

### Download fails

1. **Check internet connectivity**:
   ```bash
   curl -I https://wordfinder.yourdictionary.com/wordle/answers/
   ```

2. **Check firewall**:
   - May need to whitelist wordfinder.yourdictionary.com

### Parse errors

1. **Check HTML structure**:
   ```bash
   grep -c "<table>" temp_answers.html
   ```

2. **Check if webpage changed**:
   - Visit the URL in browser
   - Compare with `debug/answers.html` structure

## Environment Variables (Optional)

You can modify the script to accept environment variables:

```bash
# Edit update-wordle-answers.sh to use:
WORDLE_URL="${WORDLE_URL:-https://wordfinder.yourdictionary.com/wordle/answers/}"
SCRIPT_DIR="${SCRIPT_DIR:-.}"
```

Then run with custom variables:
```bash
WORDLE_URL="https://custom-url.com/answers" ./update-wordle-answers.sh
```

## Performance

- **Download time**: 0.5-2 seconds (network dependent)
- **Parse time**: 0.1-0.3 seconds
- **Total execution**: ~1-3 seconds
- **File size**: ~200 KB for 1,595 answers

## Security Notes

- Script runs with user's permissions (add to user crontab, not root)
- Downloads from official wordfinder.yourdictionary.com
- No sensitive data stored
- Temporary HTML file deleted after parsing
- Log file may contain timestamps and entry counts

## Next Steps

1. Make script executable: `chmod +x update-wordle-answers.sh`
2. Test manually: `./update-wordle-answers.sh`
3. Add cron job: `crontab -e`
4. Monitor logs: `tail -f update-wordle-answers.log`
5. Integrate with backend to serve answers via API
