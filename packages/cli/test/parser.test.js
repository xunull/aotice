import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTranscripts } from '../src/parser.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, 'fixtures', 'projects');

async function parseSample() {
  const res = await parseTranscripts({ root: ROOT, sinceMs: 0 });
  const proj = res.projects.find((p) => p.name === 'sample-proj');
  return { res, proj };
}

test('discovers project and parses turns', async () => {
  const { proj } = await parseSample();
  assert.ok(proj, 'sample-proj found');
});

test('bad JSON line is skipped and counted', async () => {
  const { res } = await parseSample();
  assert.ok(res.skipped.badLines >= 1, `badLines=${res.skipped.badLines}`);
});

test('dedup by (msgId,requestId) keeps last occurrence', async () => {
  const { proj } = await parseSample();
  const m1 = proj.turns.filter((t) => t.msgId === 'm1');
  assert.equal(m1.length, 1, 'm1 appears once after dedup');
  assert.equal(m1[0].promptTotal, 9000, 'keep-last: promptTotal from the 2nd (8000 creation) line');
});

test('sidechain turns are excluded from the main timeline', async () => {
  const { proj } = await parseSample();
  assert.equal(proj.turns.find((t) => t.msgId === 'm3'), undefined, 'sidechain m3 excluded');
});

test('TTL split is read directly (1h vs 5m)', async () => {
  const { proj } = await parseSample();
  const m2 = proj.turns.find((t) => t.msgId === 'm2');
  assert.equal(m2.w1h, 2000, '1h tokens read from ephemeral_1h split');
  assert.equal(m2.w5, 0);
});

test('compaction event captured with preTokens', async () => {
  const { proj } = await parseSample();
  assert.equal(proj.compactions.length, 1);
  assert.equal(proj.compactions[0].preTokens, 900000);
  assert.equal(proj.compactions[0].trigger, 'auto', 'compactMetadata.trigger 必须被读入');
});

test('0-token turn kept for cost but excluded from context segmentation', async () => {
  const { proj } = await parseSample();
  // m4 (promptTotal 0) present in turns (cost) ...
  assert.ok(proj.turns.find((t) => t.msgId === 'm4'), 'm4 kept in turns');
  // ... but a post-compaction segment forms with m5 as its floor (not the 0-turn)
  const afterComp = proj.segments.find((s) => s.afterCompaction);
  assert.ok(afterComp, 'a post-compaction segment exists');
  assert.equal(afterComp.turns[0].promptTotal, 120100, 'floor is the 120K rebuild, not the 0-turn');
});

test('dry-run lists files without parsing content', async () => {
  const res = await parseTranscripts({ root: ROOT, sinceMs: 0, dryRun: true });
  assert.equal(res.dryRun, true);
  assert.equal(res.files.length, 1);
  assert.ok(res.files[0].endsWith('session1.jsonl'));
});

test('mtime pre-filter skips files older than the window', async () => {
  // sinceMs far in the future → every file's mtime is older → all skipped
  const res = await parseTranscripts({ root: ROOT, sinceMs: Date.now() + 86400000 });
  assert.equal(res.projects.length, 0);
  assert.ok(res.skipped.filesSkippedMtime >= 1);
});

test('missing root yields empty result, not a crash', async () => {
  const res = await parseTranscripts({ root: join(ROOT, 'does-not-exist'), sinceMs: 0 });
  assert.equal(res.projects.length, 0);
});
