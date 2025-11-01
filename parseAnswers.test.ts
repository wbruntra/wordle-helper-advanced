// @ts-nocheck

import { test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { parseAnswersHtml } from "./parseAnswers";

const fixturesDir = path.resolve(__dirname, "debug");
const sampleHtmlPath = path.join(fixturesDir, "answers.html");

function collectAnswer(words: ReturnType<typeof parseAnswersHtml>, word: string) {
  return words.find((entry) => entry.word === word);
}

test("parseAnswersHtml extracts today's answer from saved HTML", () => {
  const answers = parseAnswersHtml(sampleHtmlPath);
  const today = collectAnswer(answers, "ABHOR");
  expect(today).toBeDefined();
  expect(today?.date).toBe("2025-10-31");
});

test("parseAnswersHtml falls back to todayData when button hides answer", () => {
  const htmlWithoutSpan = fs
    .readFileSync(sampleHtmlPath, "utf-8")
    .replace(/<span style="display: none"[\s\S]*?<\/span>/, "");

  const tmpPath = path.join(fixturesDir, "answers-no-span.html");
  fs.writeFileSync(tmpPath, htmlWithoutSpan);

  try {
    const answers = parseAnswersHtml(tmpPath);
    const today = collectAnswer(answers, "ABHOR");
    expect(today).toBeDefined();
    expect(today?.date).toBe("2025-10-31");
  } finally {
    fs.unlinkSync(tmpPath);
  }
});
