import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

const FUZZY_THRESHOLD = 0.82;

function normalize(text: string): string {
  let value = text.normalize('NFKC').trim().toLowerCase();
  for (const ch of ['"', "'", '`', '\u201c', '\u201d', '\u2018', '\u2019']) {
    value = value.split(ch).join('');
  }
  value = value.replace(/[^\w\s]/g, ' ');
  return value.replace(/\s+/g, ' ').trim();
}

function platformHints(text: string): Set<string> {
  const n = normalize(text);
  const hints = new Set<string>();
  if (n.includes('mansa')) hints.add('mansa');
  if (n.includes('tradar')) hints.add('tradar');
  if (n.includes('atg connect')) hints.add('atg_connect');
  if (/atg[\s-]*tab/.test(n) || (n.includes('atg') && n.includes('tab') && !n.includes('connect'))) {
    hints.add('atg_tab');
  }
  return hints;
}

function hintsCompatible(query: Set<string>, candidate: Set<string>): boolean {
  if (!query.size || !candidate.size) return true;
  for (const hint of query) {
    if (candidate.has(hint)) return true;
  }
  return false;
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const cur = new Array<number>(cols);
  for (let j = 0; j < cols; j++) prev[j] = j;
  for (let i = 1; i < rows; i++) {
    cur[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j++) prev[j] = cur[j];
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

function similarityScore(queryNorm: string, candidateNorm: string): number {
  let score = levenshteinRatio(queryNorm, candidateNorm);
  if (queryNorm.includes(candidateNorm) || candidateNorm.includes(queryNorm)) {
    const shorter = Math.min(queryNorm.length, candidateNorm.length);
    const longer = Math.max(queryNorm.length, candidateNorm.length);
    if (longer) score = Math.max(score, 0.75 + 0.2 * (shorter / longer));
  }
  return score;
}

function parseQaPairs(qaRaw: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const parts = qaRaw.split(/^\s*Q:\s*(.+?)\s*$/gim);
  for (let i = 1; i < parts.length; i += 2) {
    const blockQ = (parts[i] || '').trim();
    const tail = parts[i + 1] || '';
    const marker = tail.search(/EXPECTED\s+ANSWER:/i);
    if (marker < 0) continue;
    let answer = tail.slice(marker).replace(/^EXPECTED\s+ANSWER:\s*/i, '');
    const nextQ = answer.search(/^\s*Q:\s/m);
    if (nextQ >= 0) answer = answer.slice(0, nextQ);
    pairs.push([blockQ, answer.trim()]);
  }
  return pairs;
}

export function lookupExpectedAnswer(qaRaw: string, question: string): string {
  if (!qaRaw || !question) return '';
  const qStripped = question.trim();
  const qNorm = normalize(qStripped);
  const qHints = platformHints(qStripped);
  const pairs = parseQaPairs(qaRaw);
  for (const [blockQ, answer] of pairs) {
    if (blockQ === qStripped) return answer;
  }
  for (const [blockQ, answer] of pairs) {
    if (normalize(blockQ) === qNorm) return answer;
  }
  let bestScore = 0;
  let bestAnswer = '';
  for (const [blockQ, answer] of pairs) {
    if (!hintsCompatible(qHints, platformHints(blockQ))) continue;
    const score = similarityScore(qNorm, normalize(blockQ));
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = answer;
    }
  }
  return bestScore >= FUZZY_THRESHOLD ? bestAnswer : '';
}

export async function extractKoraResponse(page: Page): Promise<string> {
  return page.evaluate(() => {
    function trim(s) {
      return (s || '').replace(/^\s+|\s+$/g, '').replace(/\s+$/gm, '');
    }
    function isNoise(t) {
      if (!t || t.length < 20) return true;
      const low = t.toLowerCase();
      if (low.includes('welcome to kora')) return true;
      if (low.includes('ask a question, search')) return true;
      if (low.includes('enter a prompt')) return true;
      if (low.includes('suggested prompt')) return true;
      if (t.indexOf('Thinking') === 0) return true;
      if (low.includes('gathering insights') && t.length < 200) return true;
      if (low.includes('show me morocco') && t.length < 80) return true;
      if (low.includes('find tea suppliers') && t.length < 80) return true;
      return false;
    }
    const root =
      document.querySelector('[aria-label="Kora AI Assistant"]') ||
      document.querySelector('aside[aria-label*="Kora"]') ||
      document.body;
    const nodes = root.querySelectorAll('div, p, article, section, li');
    let best = '';
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.querySelector && el.querySelector('input, textarea, button[aria-label="Send"]')) continue;
      const txt = trim(el.innerText || el.textContent || '');
      if (isNoise(txt)) continue;
      if (txt.length >= best.length) best = txt;
    }
    return best || 'No response detected';
  });
}

export async function waitForKoraResponseText(page: Page, timeoutMs = 180_000): Promise<string> {
  const pollMs = 2_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const thinking = await page.getByText(/Thinking|Gathering insights/i).first().isVisible().catch(() => false);
    if (!thinking) break;
    await page.waitForTimeout(pollMs);
  }
  let best = '';
  let previousLength = 0;
  let stableCount = 0;
  while (Date.now() < deadline) {
    const candidate = ((await extractKoraResponse(page)) || '').replace(/\r\n/g, '\n').trim();
    const isPlaceholder = /no response detected|welcome to kora|gathering insights|^thinking/i.test(candidate);
    if (candidate.length > 40 && !isPlaceholder) {
      if (candidate.length > best.length) best = candidate;
      if (candidate.length === previousLength) stableCount += 1;
      else stableCount = 0;
      previousLength = candidate.length;
      if (stableCount >= 3) return candidate;
    }
    await page.waitForTimeout(pollMs);
  }
  return best || 'No responses found';
}

const SEP = '='.repeat(80);
const DASH = '-'.repeat(80);

export function startKoraEvaluationReport(
  reportPath: string,
  runId: string,
  questionsPath: string,
  expectedPath: string,
): void {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    [
      SEP,
      'KORA AI ASSISTANT EVALUATION REPORT — Workspace v2 (TXT)',
      SEP,
      `Run id: ${runId}`,
      `Questions file: ${questionsPath}`,
      `Reference Q&A (expected answers): ${expectedPath || '(not configured)'}`,
      SEP,
      '',
      '',
    ].join('\n'),
    'utf8',
  );
}

export function appendKoraEvaluationInteraction(
  reportPath: string,
  index: number,
  question: string,
  expected: string,
  aiResponse: string,
): void {
  const expectedDisplay = expected || '(Not found in reference QA file for this question.)';
  fs.appendFileSync(
    reportPath,
    [
      DASH,
      `INTERACTION ${index}`,
      DASH,
      'Question:',
      question,
      '',
      'Expected (reference) answer:',
      expectedDisplay,
      '',
      'AI assistant response:',
      aiResponse,
      '',
      '',
    ].join('\n'),
    'utf8',
  );
}

export function finalizeKoraEvaluationReport(reportPath: string): void {
  fs.appendFileSync(reportPath, [SEP, 'END OF REPORT', SEP, '', ''].join('\n'), 'utf8');
}
