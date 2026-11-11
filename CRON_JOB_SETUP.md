# Wordle Answers Daily Update - Cron Job

`update-wordle-answers.ts` downloads the Wordle answers page, parses it with `parseAnswers.ts`, and inserts any new answers into the `answer_history` table of `wordle.sqlite3`. The API serves recent answers from that table.

## What the script does

1. Downloads the answers HTML from `wordfinder.yourdictionary.com` (axios, 30s timeout).
2. Parses it with `parseAnswersHtml` and inserts only dates not already in `answer_history`.
3. Checks that the table is non-empty and that today's date has an answer.
4. Logs to `update-wordle-answers.log` in the project directory and to stdout.

## Cron entry

Installed on the server, running daily at 3:00 AM:

```cron
0 3 * * * cd /home/william/wordle-helper-advanced && ./update-wordle-answers.ts >> /home/william/logs/wordle-update.log 2>&1
```

The script has a `#!/usr/bin/env bun` shebang and must stay executable (`chmod +x`). Cron's PATH is minimal, so `env` must be able to find `bun`.

## Running manually

```bash
cd /path/to/wordle-helper
./update-wordle-answers.ts
```

## Monitoring

```bash
tail -20 /home/william/logs/wordle-update.log
tail -20 /home/william/wordle-helper-advanced/update-wordle-answers.log
```

## Troubleshooting

- **Nothing runs from cron:** check `crontab -l` and that `bun` is on cron's PATH.
- **"Today's word ... was not found":** the source page has not published today's answer yet. The next run will pick it up.
