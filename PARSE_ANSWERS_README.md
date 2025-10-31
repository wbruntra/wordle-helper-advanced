# Wordle Answers Parser

A TypeScript script that parses the HTML from https://wordfinder.yourdictionary.com/wordle/answers/ and extracts all Wordle answers into a clean JSON format.

## Features

- ✅ Parses HTML tables containing Wordle answers
- ✅ Extracts wordle number and answer word for each entry
- ✅ Calculates accurate ISO 8601 dates from wordle numbers
- ✅ Handles both visible and hidden answer text (for "Reveal" buttons)
- ✅ Cleans up whitespace and formatting issues
- ✅ Validates data (5-letter words, proper formatting)
- ✅ Captures today's answer (even when hidden behind a button)
- ✅ Outputs clean JSON array sorted by date (newest first)

## Installation

The script uses `cheerio` for HTML parsing. Dependencies are already installed via `bun add cheerio`.

## Usage

1. Save the HTML content from https://wordfinder.yourdictionary.com/wordle/answers/ to `debug/answers.html`

2. Run the parser:
   ```bash
   bun parseAnswers.ts
   ```

3. The script will output:
   - Console display of the most recent answers
   - File `answer-history.json` with all formatted data (ready for backend consumption)

## Output Format

The output is a JSON array with objects containing ISO 8601 dates and words:

```json
[
  {
    "date": "2025-10-31",
    "word": "ABHOR"
  },
  {
    "date": "2025-10-30",
    "word": "LATHE"
  }
]
```

## Date Calculation Strategy

Rather than parsing the display date (which could be ambiguous), the script uses the **Wordle number** as the anchor:
- Uses Wordle #1595 = October 31, 2025 as the reference point
- Calculates all other dates relative to this reference
- One Wordle puzzle per day, so the math is simple: `targetDate = referenceDate + (wordleNumber - referenceWordleNumber) days`

This approach is:
- **Reliable**: Not affected by date formatting changes
- **Accurate**: Based on the official Wordle numbering system
- **Repeatable**: Works for future updates to the page

## Integration with Cron Job

Perfect for a daily cron script:

```bash
#!/bin/bash
# Download latest answers
curl -s https://wordfinder.yourdictionary.com/wordle/answers/ > debug/answers.html
# Parse and save to file
bun parseAnswers.ts
# File is now at answer-history.json ready for backend to read
```

## Backend Integration

Your backend can simply read `answer-history.json` and deliver the past few days of history to clients:

```typescript
const history = JSON.parse(fs.readFileSync('answer-history.json', 'utf-8'));
const recentAnswers = history.slice(0, 7); // Last 7 days
res.json(recentAnswers);
```
