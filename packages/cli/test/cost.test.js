import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turnCost, readRate, writeRate5m, outputRate } from '../src/cost.js';

const PRICE = { input: 5, outputCost: 25, cacheRead: 0.5, cacheWrite: 6.25, context: 1000000 };

test('turnCost splits read / 5m-write / 1h-write / input / output correctly', () => {
  // P=5e-6 Pread=0.5e-6 Pw5=6.25e-6 Pw1h=10e-6 Pout=25e-6
  const turn = { cacheRead: 100000, w5: 20000, w1h: 10000, input: 5000, output: 2000 };
  const c = turnCost(turn, PRICE);
  assert.ok(Math.abs(c.readCost - 0.05) < 1e-12, `read ${c.readCost}`); // 100000*0.5e-6
  assert.ok(Math.abs(c.writeCost - 0.225) < 1e-12, `write ${c.writeCost}`); // 0.125 + 0.1
  assert.ok(Math.abs(c.inputCost - 0.025) < 1e-12, `input ${c.inputCost}`); // 5000*5e-6
  assert.ok(Math.abs(c.outputCost - 0.05) < 1e-12, `output ${c.outputCost}`); // 2000*25e-6
  assert.ok(Math.abs(c.ctxCost - 0.3) < 1e-12, `ctx ${c.ctxCost}`); // read+write+input, no output
  assert.ok(Math.abs(c.total - 0.35) < 1e-12, `total ${c.total}`);
});

test('1h writes cost 2x input rate (more than 5m)', () => {
  const only1h = turnCost({ w1h: 1000 }, PRICE).writeCost; // 1000*10e-6 = 0.01
  const only5m = turnCost({ w5: 1000 }, PRICE).writeCost; // 1000*6.25e-6 = 0.00625
  assert.ok(only1h > only5m);
  assert.ok(Math.abs(only1h - 0.01) < 1e-12);
});

test('missing fields default to 0, no NaN', () => {
  const c = turnCost({}, PRICE);
  assert.equal(c.total, 0);
});

test('rate helpers', () => {
  assert.equal(readRate(PRICE), 0.5e-6);
  assert.equal(writeRate5m(PRICE), 6.25e-6);
  assert.equal(outputRate(PRICE), 25e-6);
});
