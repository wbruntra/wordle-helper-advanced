#!/usr/bin/env bun

import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { parseAnswersHtml } from "./parseAnswers.js";
import db from "./db_connect.js";

// Configuration
const WORDLE_URL = "https://wordfinder.yourdictionary.com/wordle/answers/";
const LOG_FILE = "update-wordle-answers.log";

// Colors for output
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const NC = "\x1b[0m"; // No Color

// Logging functions
function log(message: string): void {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

function logError(message: string): void {
  const errorMessage = `${RED}[ERROR]${NC} ${message}`;
  console.error(errorMessage);
  fs.appendFileSync(LOG_FILE, errorMessage + "\n");
}

function logSuccess(message: string): void {
  const successMessage = `${GREEN}[SUCCESS]${NC} ${message}`;
  console.log(successMessage);
  fs.appendFileSync(LOG_FILE, successMessage + "\n");
}

async function downloadHtml(): Promise<string> {
  log(`Downloading Wordle answers page from ${WORDLE_URL}...`);

  try {
    const response = await axios.get(WORDLE_URL, {
      timeout: 30000, // 30 second timeout
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (typeof response.data !== "string" || response.data.length === 0) {
      throw new Error("Downloaded HTML content is empty");
    }

    logSuccess(`HTML downloaded successfully (${response.data.length} bytes)`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logError(`Failed to download HTML: ${error.message}`);
      if (error.response) {
        logError(`HTTP Status: ${error.response.status} ${error.response.statusText}`);
      }
    } else {
      logError(`Unexpected error during download: ${error}`);
    }
    throw error;
  }
}

async function parseAndStoreAnswers(htmlContent: string): Promise<void> {
  log("Parsing HTML and updating answer database...");

  try {
    // Create a temporary file to pass to the existing parser
    const tempHtmlPath = path.join(process.cwd(), "temp_answers.html");
    fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

    try {
      const answers = parseAnswersHtml(tempHtmlPath);

      // Sort by wordle number (descending to get most recent first)
      answers.sort((a, b) => b.wordleNumber - a.wordleNumber);

      // Get existing dates from database to avoid duplicates
      const existingRecords = await db("answer_history").select("date");
      const existingDates = new Set(existingRecords.map((r: any) => r.date));

      log(`Found ${answers.length} total answers in HTML`);
      log(`Database already has ${existingDates.size} entries`);

      // Filter to only new answers (not in database)
      const newAnswers = answers.filter((a) => !existingDates.has(a.date));

      if (newAnswers.length === 0) {
        log("✓ No new answers to insert");
        log("✓ Database is already up to date");
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

        logSuccess(`✓ Inserted ${insertedCount} new answer(s)`);
        log(`✓ Most recent new entry: ${newAnswers[0].date} = ${newAnswers[0].word}`);
      }

      // Get total count and most recent entry
      const totalCount = await db("answer_history").count("* as count").first();
      const mostRecent = await db("answer_history")
        .select("date", "word")
        .orderBy("date", "desc")
        .first();

      log(`\n✓ Total entries in database: ${(totalCount as any).count}`);
      log(`✓ Most recent entry in DB: ${mostRecent.date} = ${mostRecent.word}`);

    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    }
  } catch (error) {
    logError(`Failed to parse HTML or update database: ${error}`);
    throw error;
  }
}

async function verifyDatabaseUpdate(): Promise<void> {
  log("Verifying database update...");

  try {
    // Get today's date in YYYY-MM-DD format
    const todayDate = new Date().toISOString().substring(0, 10);

    const count = await db("answer_history").count("* as total").first();
    const recent = await db("answer_history")
      .select("date", "word")
      .orderBy("date", "desc")
      .first();
    const today = await db("answer_history")
      .select("date", "word")
      .where("date", "=", todayDate)
      .first();

    if (!count || Number(count.total) === 0) {
      throw new Error("No rows found in answer_history table");
    }

    logSuccess(`Database verified: ${count.total} rows, most recent: ${recent.date}=${recent.word}`);

    // Check if today's word was found
    if (!today) {
      logError(`WARNING: Today's word (${todayDate}) was not found in the database!`);
      logError(`Most recent entry is: ${recent.date}=${recent.word}`);
      throw new Error("Today's word not found in database");
    } else {
      logSuccess(`✓ TODAY'S WORD (${todayDate}): ${today.date}=${today.word}`);
    }
  } catch (error) {
    logError(`Database verification failed: ${error}`);
    throw error;
  }
}

async function main(): Promise<void> {
  log("Starting Wordle answers update...");

  try {
    // Step 1: Download the HTML
    const htmlContent = await downloadHtml();

    // Step 2: Parse the HTML and update the database
    await parseAndStoreAnswers(htmlContent);

    // Step 3: Verify the database was actually updated and get today's word
    await verifyDatabaseUpdate();

    logSuccess("Wordle answers update completed successfully!");
    process.exit(0);
  } catch (error) {
    logError(`Wordle answers update failed: ${error}`);
    process.exit(1);
  } finally {
    // Ensure database connection is closed
    try {
      await db.destroy();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logError(`Uncaught Exception: ${error}`);
  process.exit(1);
});

if (import.meta.main) {
  main();
}