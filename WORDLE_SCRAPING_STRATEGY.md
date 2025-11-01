# Wordle Scraping Strategy & Solution

## Problem

The website (`https://wordfinder.yourdictionary.com/wordle/answers/`) hides today's answer behind a "Reveal" button. The answer is displayed in a hidden HTML span element with `style="display:none;"`.

## Solution Overview

The scraping strategy uses **multiple robust extraction methods** to get the answer from each row:

### 1. **Hidden Span Extraction (Primary Method)**
   - The answer is stored in a `<span style="display:none;">` element
   - The parser extracts this using Cheerio's text content parsing
   - This works even though the span is hidden in the DOM

### 2. **Five-Letter Uppercase Word Detection (Fallback)**
   - Each row contains exactly one 5-letter word in all capital letters
   - The parser filters text for this pattern: `/^[A-Z]{5}$/`
   - This serves as a fallback if the hidden span extraction fails

### 3. **Wordle Number to Date Mapping (Validation)**
   - Each row has a Wordle number (e.g., 1596)
   - We use the reference point: **Wordle #1595 = October 31, 2025**
   - Calculate the date by: `targetDate = referenceDate + (wordleNumber - 1595) days`
   - This allows us to identify today's puzzle and validate dates

## HTML Structure

Each table row in the downloaded HTML has this structure:

```html
<tr>
  <td>Today Nov. 01</td>           <!-- Column 0: Date -->
  <td>1596</td>                     <!-- Column 1: Wordle Number -->
  <td>
    <button>Reveal</button>         <!-- Visible button -->
    <span style="display:none;">MOTEL</span>  <!-- Hidden answer -->
  </td>                             <!-- Column 2: Answer (hidden) -->
</tr>
```

## Implementation Details

### Date Calculation
```typescript
function calculateDateFromWordleNumber(wordleNumber: number): string {
  const referenceDate = new Date(2025, 9, 31); // Oct 31, 2025
  const referenceWordleNumber = 1595;
  
  const daysDifference = wordleNumber - referenceWordleNumber;
  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() + daysDifference);
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
}
```

### Word Extraction
The parser:
1. Looks for all table cells with 3 columns
2. Extracts the text content (which includes hidden text from spans)
3. Filters for valid 5-letter uppercase words
4. Skips "Reveal" button text
5. Validates against the regex `/^[A-Z]{5}$/`

### Verification
The `update-wordle-answers.sh` script now includes explicit verification that:
1. ✓ HTML was downloaded successfully
2. ✓ Database has the correct row count
3. ✓ **Today's answer is in the database and accessible**

## Running the Script

```bash
bash update-wordle-answers.sh
```

Expected output:
```
[2025-11-01 06:05:24] Starting Wordle answers update...
[2025-11-01 06:05:24] Downloading Wordle answers page...
[SUCCESS] HTML downloaded successfully (992424 bytes)
[2025-11-01 06:05:25] Parsing HTML and updating answer database...
[2025-11-01 06:05:25] Verifying database update...
[SUCCESS] Database verified: 1596 rows, most recent: 2025-11-01=MOTEL
[SUCCESS] ✓ TODAY'S WORD (2025-11-01): 2025-11-01=MOTEL
```

## Key Improvements

1. **Handles Hidden Content**: The solution correctly extracts text from hidden DOM elements
2. **Multiple Fallbacks**: If one extraction method fails, others provide redundancy
3. **Date Validation**: Uses Wordle numbers to verify and calculate correct dates
4. **Clear Reporting**: Script explicitly shows today's word in output for easy verification
5. **Reference Point**: Oct 31, 2025 as reference allows precise date calculations for any future date

## Files Modified

- `parseAnswers.ts` - Parser logic for HTML extraction
- `update-wordle-answers.sh` - Enhanced with explicit today's word reporting
- `WORDLE_SCRAPING_STRATEGY.md` - This documentation

## Testing

The solution has been tested with actual HTML downloads and correctly extracts:
- Today's answer (MOTEL for Nov 1, 2025) ✓
- Previous answers (ABHOR for Oct 31, 2025) ✓
- All 1596 historical answers ✓
