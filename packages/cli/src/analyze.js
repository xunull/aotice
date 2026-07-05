// 编排:parser → 逐轮成本标注 → 参数拟合 → EOQ 阈值(amp 双界)→ 回放。
// 返回结构化结果对象(report.js 负责成形为终端/JSON)。
import { Tstar, dCstar, PRICING_SYNCED_AT } from '@aotice/compaction-model';
import { parseTranscripts, dominantModel } from './parser.js';
import { findModelPricing, FALLBACK_PRICING } from './pricing.js';
import { turnCost } from './cost.js';
import { fitParams } from './fitter.js';
import { replayProject } from './replay.js';

const AMP_LO = 1;
const AMP_HI = 3;

function eqState(price, g, S, amp, ttl) {
  return {
    P: price.input,
    Pout: price.outputCost,
    cacheRead: price.cacheRead,
    cacheWrite: price.cacheWrite,
    g,
    S,
    W: price.context || 1000000,
    amp,
    ttl,
  };
}

function analyzeProject(project) {
  const domId = dominantModel(project.models);
  const domPrice = findModelPricing(domId) || FALLBACK_PRICING;
  const modelSource = findModelPricing(domId) ? 'measured' : 'assumed';

  // 逐轮成本标注(多模型:每轮用自身模型定价)
  let actualUSD = 0;
  for (const t of project.turns) {
    const p = findModelPricing(t.model) || domPrice;
    const c = turnCost(t, p);
    t._ctx = c.ctxCost;
    t._total = c.total;
    actualUSD += c.total;
  }

  const params = fitParams(project);
  const g = params.g.value;
  const S = params.S.value;
  const ttl = params.ttl.value;
  const W = domPrice.context || 1000000;

  // EOQ 阈值:amp 双界
  const tLo = Tstar(eqState(domPrice, g, S, AMP_LO, ttl)); // amp=1 → 阈值更低、更激进
  const tHi = Tstar(eqState(domPrice, g, S, AMP_HI, ttl)); // amp=3 → 阈值更高
  const dcLo = dCstar(eqState(domPrice, g, S, AMP_LO, ttl));

  const clampT = (t) => Math.min(t, W); // 不超过窗口
  const teffLo = clampT(tLo);
  const teffHi = clampT(tHi);
  const beyond = tLo >= W;

  // 回放:amp=1 界(更激进,节省上界) 与 amp=3 界(节省下界)
  const rLo = replayProject(project, domPrice, teffLo, S); // 上界节省
  const rHi = replayProject(project, domPrice, teffHi, S); // 下界节省

  const savingUpper = Math.max(0, rLo.savingUSD);
  const savingLower = Math.max(0, rHi.savingUSD);

  return {
    name: project.name,
    model: domId,
    modelSource,
    window: W,
    realTriggerPreTokens: project.compactions.length
      ? Math.round(project.compactions.reduce((a, c) => a + (c.preTokens || 0), 0) / project.compactions.length)
      : null,
    params: {
      g: params.g,
      S: params.S,
      amp: { value: 1, source: 'assumed', sensitivity: [AMP_LO, AMP_HI] },
      cacheHit: params.cacheHit,
      ttl: params.ttl,
    },
    recommendation: {
      threshold_tokens: [Math.round(tLo), Math.round(tHi)],
      threshold_pct: [tLo / W, tHi / W],
      dc_star: Math.round(dcLo),
      basis: params.S.source === 'measured' ? 'measured' : 'theoretical',
      beyond_window: beyond,
      knob: {
        type: 'env',
        value: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE≈${Math.round((tLo / W) * 100)} (or /compact at ~${Math.round(tLo / 1000)}K tokens)`,
        verified: false,
      },
    },
    replay: {
      window_days: null, // 由上层填
      threshold_used_tokens: [Math.round(teffHi), Math.round(teffLo)],
      actual_usd: round2(actualUSD),
      counterfactual_usd: [round2(actualUSD - savingUpper), round2(actualUSD - savingLower)],
      saving_usd_upper_bound: round2(savingUpper),
      saving_usd_range: [round2(savingLower), round2(savingUpper)],
      saving_pct_upper_bound: actualUSD > 0 ? savingUpper / actualUSD : 0,
      clean_segments: rLo.clean_segments,
      excluded_segments: rLo.excluded_segments,
    },
    turnCount: project.turns.length,
  };
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

/**
 * @param {object} opts  { root, paths, sinceDays, billing, now }
 */
export async function analyze(opts = {}) {
  const sinceDays = opts.sinceDays ?? 30;
  const now = opts.now ?? Date.now();
  const sinceMs = sinceDays > 0 ? now - sinceDays * 86400000 : 0;

  const parsed = await parseTranscripts({ root: opts.root, paths: opts.paths, sinceMs });
  const projects = parsed.projects
    .map(analyzeProject)
    .sort((a, b) => b.replay.actual_usd - a.replay.actual_usd);
  for (const p of projects) p.replay.window_days = sinceDays;

  const totals = {
    actual_usd: round2(projects.reduce((a, p) => a + p.replay.actual_usd, 0)),
    saving_usd_upper_bound: round2(projects.reduce((a, p) => a + p.replay.saving_usd_upper_bound, 0)),
  };
  totals.counterfactual_usd = round2(totals.actual_usd - totals.saving_usd_upper_bound);
  totals.saving_pct_upper_bound = totals.actual_usd > 0 ? totals.saving_usd_upper_bound / totals.actual_usd : 0;

  return {
    version: 1,
    generated_from: 'claude-code-jsonl',
    pricing_synced_at: PRICING_SYNCED_AT,
    billing_mode: opts.billing || 'unknown',
    billing_mode_source: opts.billing ? 'flag' : 'default',
    since_days: sinceDays,
    data_insufficient: projects.length === 0,
    projects,
    totals,
    skipped: parsed.skipped,
  };
}
