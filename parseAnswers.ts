import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";
import type { Cheerio } from "cheerio";
import type { Element as DomElement } from "domhandler";
import db from "./db_connect.js";

interface WordleAnswer {
  wordleNumber: number;
  date: string; // ISO 8601 format: YYYY-MM-DD
  word: string;
}

interface TodayData {
  wordleNumber: number;
  word: string;
}

// Reference: Wordle #1595 is October 31, 2025
// Working backwards: Wordle #1 = Oct 31, 2025 minus 1594 days
// Calculate date from wordle number
function calculateDateFromWordleNumber(wordleNumber: number): string {
  // Use Oct 31, 2025 as the reference point for Wordle #1595
  const referenceDate = new Date(2025, 9, 31); // 9 = October (0-indexed)
  const referenceWordleNumber = 1595;
  
  // Calculate the difference in days
  const daysDifference = wordleNumber - referenceWordleNumber;
  
  // Calculate target date
  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() + daysDifference);
  
  // Format as ISO 8601: YYYY-MM-DD
  const year = targetDate.getFullYear();
  const month = (targetDate.getMonth() + 1).toString().padStart(2, "0");
  const day = targetDate.getDate().toString().padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

// Strategy 1: Extract from hidden span in the cell
function extractFromHiddenSpan(cellElement: Cheerio<DomElement>): string | null {
  let hiddenSpan = cellElement.find("span[style*='display:none']");
  if (hiddenSpan.length === 0) {
    hiddenSpan = cellElement.find("span[style*='display: none']");
  }
  if (hiddenSpan.length > 0) {
    return hiddenSpan.text().trim();
  }
  return null;
}

// Strategy 2: Extract 5-letter all-caps word from cell text
function extractAllCapWord(cellText: string): string | null {
  // Remove "Reveal" button text and other UI elements
  const cleanText = cellText
    .replace(/Reveal/gi, "")
    .trim();
  
  // Find all 5-letter words in all caps
  const words = cleanText.match(/[A-Z]{5}/g);
  if (words && words.length === 1) {
    return words[0];
  }

  if (words && words.length > 1) {
    // Prefer the last occurrence to skip terms like TODAY in the date column
    return words[words.length - 1];
  }
  return null;
}

// Strategy 3: Check if this is today's puzzle based on Wordle number
function isTodaysAnswer(wordleNumber: number): boolean {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  
  const todayDate = `${year}-${month}-${day}`;
  const calculatedDate = calculateDateFromWordleNumber(wordleNumber);
  
  return todayDate === calculatedDate;
}

function extractDataAnswerAttr(cellElement: Cheerio<DomElement>): string | null {
  const attrValue = cellElement.find("[data-answer]").attr("data-answer");
  if (typeof attrValue === "string") {
    return attrValue.trim();
  }
  return null;
}

function normalizeWord(word: string | null | undefined): string | null {
  if (!word) {
    return null;
  }

  const normalized = word.trim().toUpperCase();
  if (normalized.length === 5 && /^[A-Z]+$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function extractTodayData(htmlContent: string): TodayData | null {
  const match = htmlContent.match(
    /todayData:\s*\{\s*date:\s*'\d{6}',\s*index:\s*(\d+),\s*answer:\s*'([A-Z]+)'\s*\}/i,
  );

  if (!match) {
    return null;
  }

  const [, indexString, answer] = match;
  const wordleNumber = parseInt(indexString, 10);
  const word = normalizeWord(answer);

  if (!wordleNumber || !word) {
    return null;
  }

  return {
    wordleNumber,
    word,
  };
}

export function parseAnswersHtml(htmlPath: string): WordleAnswer[] {
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  const $ = load(htmlContent);

  const todayData = extractTodayData(htmlContent);

  const answersByNumber = new Map<number, WordleAnswer>();

  const recordAnswer = (wordleNumber: number, candidate: string | null) => {
    const normalized = normalizeWord(candidate);
    if (!normalized || !Number.isInteger(wordleNumber) || wordleNumber <= 0) {
      return;
    }

    if (!answersByNumber.has(wordleNumber)) {
      answersByNumber.set(wordleNumber, {
        wordleNumber,
        date: calculateDateFromWordleNumber(wordleNumber),
        word: normalized,
      });
    }
  };

  // Find all table rows in the tables
  $("table tbody tr").each((_, row) => {
    const cells = $(row).find("td");

    if (cells.length === 3) {
      // Extract text content from each cell and clean up whitespace
      let dateText = $(cells[0])
        .text()
        .trim()
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(" ");

    const wordleNumberText = $(cells[1]).text().trim();
    const wordleNumber = parseInt(wordleNumberText, 10);
    const isTodayRow = /today/i.test(dateText);
      
      // Extract word from the answer cell using multiple strategies
      let word: string | null = null;
      
      // Strategy 1: Try to get from hidden span first (for "Reveal" buttons)
      word = extractFromHiddenSpan($(cells[2]));
      
      // Strategy 2: If not found, look for 5-letter all-caps word in visible text
      if (!word) {
        const cellText = $(cells[2])
          .text()
          .trim()
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .join(" ");
        
        word = extractAllCapWord(cellText);
      }
      
      // Strategy 2b: Look for data-answer attributes on the cell or descendants
      if (!word) {
        word = extractDataAnswerAttr($(cells[2]));
      }

      // Strategy 3: If still not found but this is today's puzzle, log a warning
      if (!word && isTodaysAnswer(wordleNumber)) {
        console.warn(
          `Warning: Could not extract answer for today's puzzle (#${wordleNumber}). ` +
          `Cell HTML: ${$(cells[2]).html()?.substring(0, 200)}`
        );
      }

      // Strategy 4: Leverage todayData for the "Today" row fallback
      if (!word && isTodayRow && todayData && todayData.wordleNumber === wordleNumber) {
        word = todayData.word;
      }

      recordAnswer(wordleNumber, word);
    }
  });

  if (todayData && !answersByNumber.has(todayData.wordleNumber)) {
    recordAnswer(todayData.wordleNumber, todayData.word);
  }

  return Array.from(answersByNumber.values());
}

async function main() {
  // Get HTML file path from command line argument or use default
  const htmlPath = process.argv[2] || path.join(process.cwd(), "debug", "answers.html");

  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found at ${htmlPath}`);
    console.error(`Usage: bun parseAnswers.ts <path-to-html-file>`);
    process.exit(1);
  }

  console.log(`Parsing ${htmlPath}...`);
  const answers = parseAnswersHtml(htmlPath);

  // Sort by wordle number (descending to get most recent first)
  answers.sort((a, b) => b.wordleNumber - a.wordleNumber);

  try {
    // Get existing dates from database to avoid duplicates
    const existingRecords = await db("answer_history").select("date");
    const existingDates = new Set(existingRecords.map((r: any) => r.date));

    console.log(`\nFound ${answers.length} total answers in HTML`);
    console.log(`Database already has ${existingDates.size} entries`);

    // Filter to only new answers (not in database)
    const newAnswers = answers.filter((a) => !existingDates.has(a.date));

    if (newAnswers.length === 0) {
      console.log(`✓ No new answers to insert`);
      console.log(`✓ Database is already up to date`);
    } else {
      // Prepare records for insertion
      const answerRecords = newAnswers.map((a) => ({
        date: a.date,
        word: a.word,
      }));

      // Batch insert in chunks to avoid SQLite limits
      const batchSize = 100;
      let insertedCount = 0;
      for (let i = 0; i < answerRecords.length; i += batchSize) {
        const batch = answerRecords.slice(i, i + batchSize);
        await db("answer_history").insert(batch);
        insertedCount += batch.length;
      }

      console.log(`✓ Inserted ${insertedCount} new answer(s)`);
      console.log(`✓ Most recent new entry: ${newAnswers[0].date} = ${newAnswers[0].word}`);
    }

    // Get total count and most recent entry
    const totalCount = await db("answer_history").count("* as count").first();
    const mostRecent = await db("answer_history")
      .select("date", "word")
      .orderBy("date", "desc")
      .first();

    console.log(`\n✓ Total entries in database: ${(totalCount as any).count}`);
    console.log(`✓ Most recent entry in DB: ${mostRecent.date} = ${mostRecent.word}`);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

if (import.meta.main) {
  main();
}
