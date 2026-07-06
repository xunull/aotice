// 回放引擎测试。核心是一个人工可验算的合成段(CRIT):头条"省 $X"数字的唯一背书。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaySegment, replayProject } from '../src/replay.js';

// Opus 档定价:Pread=0.5e-6, Pw5=6.25e-6, Pout=25e-6
const PRICE = { input: 5, outputCost: 25, cacheRead: 0.5, cacheWrite: 6.25, context: 1000000 };

test('CRIT: hand-computed replay matches to the cent', () => {
  // 段:promptTotal [100,200,300,400,500],_ctx [1,2,3,4,5] 美元。floor S=100,threshold=300。
  const turns = [
    { promptTotal: 100, _ctx: 1.0 },
    { promptTotal: 200, _ctx: 2.0 },
    { promptTotal: 300, _ctx: 3.0 },
    { promptTotal: 400, _ctx: 4.0 },
    { promptTotal: 500, _ctx: 5.0 },
  ];
  // 手算:
  //  t0 Cobs=100 未压缩 Ccf=100 saving 0;100>=300? no
  //  t1 Cobs=200 Ccf=200 saving 0;no
  //  t2 Cobs=300 Ccf=300 saving 0;300>=300 YES → insert1 = 0.5e-6*300 + 100*(25e-6+6.25e-6)
  //                                             = 1.5e-4 + 3.125e-3 = 0.003275;compacted,baseline=300
  //  t3 Cobs=400 Ccf=100+(400-300)=200 r=0.5 saving += 0.5*4 = 2.0;200>=300 no
  //  t4 Cobs=500 Ccf=100+(500-300)=300 r=0.6 saving += 0.4*5 = 2.0;300>=300 YES → insert2 = 0.003275
  //  gross=4.0  insertion=0.00655  net=3.99345  inserted=2
  const r = replaySegment(turns, PRICE, 300, 100);
  assert.equal(r.excluded, false);
  assert.equal(r.inserted, 2);
  assert.ok(Math.abs(r.grossSaving - 4.0) < 1e-9, `gross ${r.grossSaving}`);
  assert.ok(Math.abs(r.insertionCost - 0.00655) < 1e-9, `insertion ${r.insertionCost}`);
  assert.ok(Math.abs(r.savingUSD - 3.99345) < 1e-9, `saving ${r.savingUSD}`);
});

test('segment shorter than 3 turns is excluded', () => {
  const r = replaySegment([{ promptTotal: 100, _ctx: 1 }, { promptTotal: 200, _ctx: 2 }], PRICE, 150, 100);
  assert.equal(r.excluded, true);
  assert.equal(r.savingUSD, 0);
});

test('higher threshold yields no more saving than lower (amp interval direction)', () => {
  const turns = Array.from({ length: 10 }, (_, i) => ({ promptTotal: (i + 1) * 100, _ctx: i + 1 }));
  const low = replaySegment(turns, PRICE, 300, 100);
  const high = replaySegment(turns, PRICE, 700, 100);
  assert.ok(low.savingUSD >= high.savingUSD, `low ${low.savingUSD} should be >= high ${high.savingUSD}`);
});

test('threshold above segment peak inserts nothing (early-compaction-only guard)', () => {
  const turns = [
    { promptTotal: 100, _ctx: 1 },
    { promptTotal: 200, _ctx: 2 },
    { promptTotal: 300, _ctx: 3 },
  ];
  const r = replaySegment(turns, PRICE, 10000, 100); // 阈值远高于峰值 300 → 不可观测方向,不模拟
  assert.equal(r.inserted, 0);
  assert.equal(r.grossSaving, 0);
});

test('output cost never enters replay (symmetry) — _ctx-only input', () => {
  // 两个段 _ctx 相同但一个带巨大 output 字段:replay 只读 _ctx,结果必须一致
  const a = [{ promptTotal: 100, _ctx: 1 }, { promptTotal: 400, _ctx: 4 }, { promptTotal: 700, _ctx: 7 }];
  const b = a.map((t) => ({ ...t, output: 999999, _total: 12345 }));
  const ra = replaySegment(a, PRICE, 300, 100);
  const rb = replaySegment(b, PRICE, 300, 100);
  assert.equal(ra.savingUSD, rb.savingUSD);
});

test('replayProject aggregates segments and counts clean/excluded', () => {
  const project = {
    segments: [
      { turns: [{ promptTotal: 100, _ctx: 1 }, { promptTotal: 400, _ctx: 4 }, { promptTotal: 700, _ctx: 7 }] },
      { turns: [{ promptTotal: 100, _ctx: 1 }, { promptTotal: 200, _ctx: 2 }] }, // <3 → excluded
    ],
  };
  const r = replayProject(project, PRICE, 300, 100);
  assert.equal(r.clean_segments, 1);
  assert.equal(r.excluded_segments, 1);
});
