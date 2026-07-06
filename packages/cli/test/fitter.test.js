import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitParams } from '../src/fitter.js';

// 合成 project(分段已如 segmentize 产出:无 <100 轮)
function makeProject() {
  return {
    segments: [
      { afterCompaction: false, turns: [{ promptTotal: 1000 }, { promptTotal: 2000 }, { promptTotal: 3000 }] },
      { afterCompaction: true, turns: [{ promptTotal: 120000 }, { promptTotal: 121000 }, { promptTotal: 122000 }] },
    ],
    turns: [
      { cacheRead: 8000, cacheCreation: 2000, w1h: 0, w5: 2000 },
      { cacheRead: 2000, cacheCreation: 0, w1h: 0, w5: 0 },
    ],
  };
}

test('g = median of intra-segment positive deltas', () => {
  const p = fitParams(makeProject());
  // deltas: seg1 [1000,1000], seg2 [1000,1000] → median 1000
  assert.equal(p.g.value, 1000);
  assert.equal(p.g.source, 'measured');
  assert.equal(p.g.n, 4);
});

test('S = median floor from post-compaction segments (skips sub-2000 turns)', () => {
  const p = fitParams(makeProject());
  assert.equal(p.S.value, 120000);
  assert.equal(p.S.source, 'measured');
});

test('cacheHit = read / (read + creation)', () => {
  const p = fitParams(makeProject());
  // sumRead 10000, sumCreate 2000 → 10000/12000
  assert.ok(Math.abs(p.cacheHit.value - 10000 / 12000) < 1e-9);
});

test('ttl picks the dominant write TTL (5m here)', () => {
  const p = fitParams(makeProject());
  assert.equal(p.ttl.value, '5m');
});

test('no compaction events → S falls back to assumed default', () => {
  const p = fitParams({
    segments: [{ afterCompaction: false, turns: [{ promptTotal: 1000 }, { promptTotal: 2000 }] }],
    turns: [{ cacheRead: 1000, cacheCreation: 0, w5: 0, w1h: 0 }],
  });
  assert.equal(p.S.source, 'assumed');
  assert.equal(p.S.value, 20000);
});

test('confidence tiers by sample size', () => {
  const many = { segments: [{ afterCompaction: false, turns: [] }], turns: [] };
  // 60 turns of steady +1000 growth
  many.segments[0].turns = Array.from({ length: 60 }, (_, i) => ({ promptTotal: (i + 1) * 1000 }));
  const p = fitParams(many);
  assert.equal(p.g.confidence, 'high'); // n=59 > 50
});
