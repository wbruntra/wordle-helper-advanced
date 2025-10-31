import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";
import knex from "knex";

interface WordleAnswer {
  wordleNumber: number;
  date: string; // ISO 8601 format: YYYY-MM-DD
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

function parseAnswersHtml(htmlPath: string): WordleAnswer[] {
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  const $ = load(htmlContent);

  const answers: WordleAnswer[] = [];

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
      
      // Extract word from the answer cell - handle both regular text and hidden span (for "Reveal" buttons)
      let word = $(cells[2])
        .text()
        .trim()
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(" ");

      // If we got "Reveal" (which means the answer is hidden), try to get it from a hidden span
      if (word === "Reveal" || word.includes("Reveal")) {
        const hiddenSpan = $(cells[2]).find("span[style*='display: none']");
        if (hiddenSpan.length > 0) {
          word = hiddenSpan.text().trim();
        }
      }

      // Parse the wordle number
      const wordleNumber = parseInt(wordleNumberText);

      // Skip entries with invalid wordle numbers or words
      if (
        !isNaN(wordleNumber) &&
        wordleNumber > 0 &&
        word &&
        word.length === 5 &&
        /^[A-Z]+$/.test(word)
      ) {
        const date = calculateDateFromWordleNumber(wordleNumber);
        answers.push({
          wordleNumber,
          date,
          word,
        });
      }
    }
  });

  return answers;
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

  // Initialize database connection
  const db = knex({
    client: "sqlite3",
    connection: {
      filename: path.join(process.cwd(), "wordle.sqlite3"),
    },
    useNullAsDefault: true,
  });

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

main();
