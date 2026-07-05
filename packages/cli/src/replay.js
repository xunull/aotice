// 反事实回放:固定轨迹的账本重算(ledger recomputation),非可达反事实。
//
// 只在干净段内、且只回放"比实际更早压缩"(阈值 < 段峰值)的反事实——
// 提早压缩点之前的轨迹真实可见,之后按该段实测逐轮累积增量平移到地板 S:
//   C'(t) = S + (C_actual(t) − C_actual(t_compact))
//
// 每轮节省 = (1 − C'/C) × 该轮真实上下文处理成本(turn._ctx);输出成本两侧对称,不计。
// 每次插入压缩的成本 = 0.1P·C'(读旧上下文生成摘要) + S·P_out(生成) + S·P_write5m(重写)。
// amp 在回放中固定为 1(重读是行为效应,反事实不可观测,不计使成本保持下界)。
//
// 口径:反事实成本是真实可达成本的下界,故**节省金额是上界估计**。

import { readRate, writeRate5m, outputRate } from './cost.js';

const MIN_TURNS = 3; // 少于 3 轮无法平移重建

/**
 * @param {object[]} turns  段内轮次,每轮须已标注 _ctx(turnCost.ctxCost)
 * @param {object} price    该段主模型定价记录
 * @param {number} threshold 压缩触发阈值(token)
 * @param {number} floorS   压缩后地板
 * @returns {{excluded:boolean, savingUSD:number, grossSaving:number, insertionCost:number, inserted:number}}
 */
export function replaySegment(turns, price, threshold, floorS) {
  if (!turns || turns.length < MIN_TURNS) {
    return { excluded: true, savingUSD: 0, grossSaving: 0, insertionCost: 0, inserted: 0 };
  }
  const Pread = readRate(price);
  const Pw5 = writeRate5m(price);
  const Pout = outputRate(price);

  let gross = 0;
  let insertion = 0;
  let inserted = 0;
  let compacted = false;
  let baseline = 0;

  for (const t of turns) {
    const Cobs = t.promptTotal || 0;
    const Ccf = compacted ? floorS + (Cobs - baseline) : Cobs;
    const r = Cobs > 0 ? Math.min(1, Ccf / Cobs) : 1;
    gross += (1 - r) * (t._ctx || 0);

    if (Ccf >= threshold) {
      // 插入一次压缩(影响后续轮),成本按 counterfactual 上下文 Ccf 计
      insertion += Pread * Ccf + floorS * (Pout + Pw5);
      inserted++;
      compacted = true;
      baseline = Cobs;
    }
  }

  return {
    excluded: false,
    savingUSD: gross - insertion,
    grossSaving: gross,
    insertionCost: insertion,
    inserted,
  };
}

/**
 * 对一个 project 的所有段回放,汇总。
 * @returns {{savingUSD, clean_segments, excluded_segments, inserted}}
 */
export function replayProject(project, price, threshold, floorS) {
  let saving = 0;
  let clean = 0;
  let excluded = 0;
  let inserted = 0;
  for (const seg of project.segments) {
    const r = replaySegment(seg.turns, price, threshold, floorS);
    if (r.excluded) {
      excluded++;
      continue;
    }
    clean++;
    saving += r.savingUSD;
    inserted += r.inserted;
  }
  return { savingUSD: saving, clean_segments: clean, excluded_segments: excluded, inserted };
}
