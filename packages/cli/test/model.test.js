// 共享 EOQ 模型的属性测试:最优点处两项可变成本必须相等。
// 这不是"抄对了公式",而是解确实落在理论要求的位置(EOQ 一阶条件)。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holding, Kfix, dCstar, Tstar, total, readTax, comp } from '@aotice/compaction-model';

const state = { P: 5, Pout: 25, cacheRead: 0.5, cacheWrite: 6.25, g: 5000, S: 20000, W: 1000000, amp: 1, ttl: '5m' };

test('EOQ optimum: variable holding cost equals compaction amortization', () => {
  const dc = dCstar(state);
  const variableHolding = holding(state) * (dc / 2); // h·ΔC*/2
  const compactionAmort = (state.g / dc) * Kfix(state); // g/ΔC*·K_fix
  const rel = Math.abs(variableHolding - compactionAmort) / variableHolding;
  assert.ok(rel < 1e-9, `holding ${variableHolding} vs amort ${compactionAmort} (rel ${rel})`);
});

test('total cost is minimized at T* (U-shape check)', () => {
  const Ts = Tstar(state);
  const c = total(state, Ts);
  assert.ok(total(state, Ts * 0.6) > c, 'cost rises to the left of T*');
  assert.ok(total(state, Ts * 1.6) > c, 'cost rises to the right of T*');
});

test('reproduces the documented Opus 4.8 default (~132K, 13%)', () => {
  const Ts = Tstar(state);
  assert.ok(Ts > 125000 && Ts < 140000, `T* = ${Ts}`);
  assert.ok(Math.abs(readTax(state, Ts) + comp(state, Ts) - total(state, Ts)) < 1e-12);
});
