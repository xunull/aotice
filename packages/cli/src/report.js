// 把 analyze() 结果成形为终端报告。
// 默认:体检报告(Style B,给一眼看懂)。--verbose:完整参数明细(给硬核用户)。
// 语言由调用方传入(默认 en)。技术术语在中文里也保留英文——见 messages.js。
import { fmtTok, fmtUSD, pct } from '@aotice/compaction-model';
import { translator } from './i18n.js';

function pctStr(x) {
  return pct(x * 100);
}
function usd(x) {
  return fmtUSD(x);
}

const RULE = '─'.repeat(64);

// ── 视觉宽度(CJK/全角算 2 列),用于标签列对齐 ──
function vw(s) {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    const wide =
      c >= 0x1100 &&
      (c <= 0x115f ||
        (c >= 0x2e80 && c <= 0xa4cf) ||
        (c >= 0xac00 && c <= 0xd7a3) ||
        (c >= 0xf900 && c <= 0xfaff) ||
        (c >= 0xfe30 && c <= 0xfe4f) ||
        (c >= 0xff00 && c <= 0xff60) ||
        (c >= 0xffe0 && c <= 0xffe6));
    w += wide ? 2 : 1;
  }
  return w;
}
function padLabel(s, cols) {
  const n = cols - vw(s);
  return s + ' '.repeat(n > 0 ? n : 1);
}

// ═══════════════ 默认:体检报告(Style B)═══════════════

// 评级:实际触发点相对最省区间的位置。落在区间内或更早 → 良好;略晚 → 可优化;明显晚 → 偏晚。
function grade(proj) {
  const real = proj.autoTriggerPreTokens; // 只按"自动压缩"评级,手动 /compact 不算
  if (!real) return 'nodata';
  const realPct = real / proj.window;
  const optHi = proj.recommendation.threshold_pct[1];
  if (realPct <= optHi) return 'good';
  if (realPct <= optHi + 0.15) return 'tune';
  return 'late';
}

const GRADE_LABEL = { good: 'bGradeGood', tune: 'bGradeTune', late: 'bGradeLate', nodata: 'bGradeNoData' };
const VERDICT = { good: 'bVerdictGood', tune: 'bVerdictTune', late: 'bVerdictLate', nodata: 'bVerdictNoData' };
const LBL = 12; // 标签列宽
const IND = ' '.repeat(2 + LBL); // 值列缩进(续行对齐用)

function renderProjectB(proj, lang, days, showSubsNote) {
  const _ = translator(lang);
  const g = grade(proj);
  const rec = proj.recommendation;
  const r = proj.replay;
  const model = proj.model || 'unknown';

  const row = (labelKey, value) => `  ${padLabel(_(labelKey), LBL)}${value}`;
  const L = [];

  // 标题:项目名单独一行(可能很长),模型/窗口/评级放副行(不与长名抢位)
  L.push(_('bTitle', proj.name));
  L.push(_('bSubline', model, days, _(GRADE_LABEL[g])));
  L.push(RULE);

  // 你的时机:自动压缩触发点(auto-only);手动 /compact 另起一行
  const auto = proj.autoTriggerPreTokens;
  L.push(
    row('bLblTiming', auto ? _('bTimingAuto', pctStr(auto / proj.window), fmtTok(auto)) : _('bTimingNone'))
  );
  if (proj.manualCompactions > 0) {
    L.push(row('bLblManual', _('bManualVal', proj.manualCompactions, proj.manualMedianPreTokens ? fmtTok(proj.manualMedianPreTokens) : '—')));
  }
  L.push(row('bLblOptimal', _('bOptimalVal', pctStr(rec.threshold_pct[0]), pctStr(rec.threshold_pct[1]))));
  L.push(row('bLblVerdict', _(VERDICT[g])));

  // 成本
  L.push('');
  L.push(row('bLblCost', _('bCostVal', usd(r.actual_usd), usd(r.counterfactual_usd[0]), pctStr(r.saving_pct_upper_bound))));
  if (showSubsNote) L.push(_('bCostNoteSubs'));

  // 可选动作
  L.push('');
  L.push(row('bLblAction', _('bActionVal', pctStr(rec.threshold_pct[0]))));
  L.push(`${IND}${rec.knob.value}`);

  return L.join('\n');
}

// ═══════════════ --verbose:完整明细 ═══════════════

function paramLine(p, _) {
  const measured = [];
  const assumed = [];
  if (p.g.source === 'measured') measured.push(_('paramG', fmtTok(p.g.value), p.g.n, p.g.confidence));
  else assumed.push(_('paramGAssumed', fmtTok(p.g.value)));
  if (p.cacheHit.value != null) measured.push(_('paramCacheHit', Math.round(p.cacheHit.value * 100)));
  if (p.S.source === 'measured') measured.push(_('paramS', fmtTok(p.S.value), p.S.n));
  else assumed.push(_('paramSAssumed', fmtTok(p.S.value)));
  assumed.push(_('paramAmp'));
  return { measured, assumed };
}

export function renderProject(proj, lang = 'en') {
  const _ = translator(lang);
  const L = [];
  const modelTag = proj.modelSource === 'assumed' ? _('pricingAssumedTag') : '';
  L.push(_('projectHeader', proj.name));
  L.push(_('modelLine', proj.model || 'unknown', fmtTok(proj.window), modelTag));

  const { measured, assumed } = paramLine(proj.params, _);
  if (measured.length) L.push(_('measuredLabel', measured.join(' · ')));
  if (assumed.length) L.push(_('assumedLabel', assumed.join(' · ')));

  const rec = proj.recommendation;
  const [tLo, tHi] = rec.threshold_tokens;
  const [pLo, pHi] = rec.threshold_pct;
  let recLine = _('eoqThreshold', fmtTok(tLo), fmtTok(tHi), pctStr(pLo), pctStr(pHi), rec.basis);
  if (rec.beyond_window) recLine += _('beyondWindow');
  L.push(recLine);
  if (proj.autoTriggerPreTokens) {
    L.push(_('realTriggerAuto', fmtTok(proj.autoTriggerPreTokens), pctStr(proj.autoTriggerPreTokens / proj.window), proj.autoCompactions));
  }
  if (proj.manualCompactions > 0) {
    L.push(_('realTriggerManual', proj.manualCompactions, proj.manualMedianPreTokens ? fmtTok(proj.manualMedianPreTokens) : '—'));
  }

  const r = proj.replay;
  L.push(_('replayHeader', r.window_days));
  L.push(_('replayActual', usd(r.actual_usd), usd(r.counterfactual_usd[0]), usd(r.counterfactual_usd[1])));
  L.push(_('replaySaving', usd(r.saving_usd_upper_bound), pctStr(r.saving_pct_upper_bound)));
  L.push(_('replaySegments', r.clean_segments, r.excluded_segments));
  L.push(_('knobLine', rec.knob.value));
  return L.join('\n');
}

// ═══════════════ 入口 ═══════════════

export function renderReport(result, lang = 'en', verbose = false) {
  const _ = translator(lang);
  const L = [];

  if (result.data_insufficient) {
    L.push('');
    L.push(_('title'));
    L.push(RULE);
    L.push('');
    L.push(_('insufficient1'));
    L.push(_('insufficient2'));
    L.push('');
    L.push(skippedLine(result.skipped, _));
    return L.join('\n');
  }

  if (verbose) return renderVerbose(result, lang);

  // 默认:体检报告
  const subs = result.billing_mode !== 'api';
  for (const p of result.projects) {
    L.push('');
    L.push(renderProjectB(p, lang, result.since_days, subs));
  }
  const t = result.totals;
  L.push('');
  if (result.projects.length > 1) {
    L.push(RULE);
    L.push(_('bTotal', result.since_days, usd(t.actual_usd), usd(t.saving_usd_upper_bound), pctStr(t.saving_pct_upper_bound)));
  }
  L.push(_('bFooter', result.pricing_synced_at, result.billing_mode));
  L.push('');
  return L.join('\n');
}

function renderVerbose(result, lang) {
  const _ = translator(lang);
  const L = [];
  L.push('');
  L.push(_('title'));
  L.push(_('metaLine', result.pricing_synced_at, result.billing_mode, result.billing_mode_source));
  L.push(RULE);
  for (const p of result.projects) {
    L.push('');
    L.push(renderProject(p, lang));
  }
  const t = result.totals;
  L.push('');
  L.push(RULE);
  L.push(_('totalLine', result.since_days, usd(t.actual_usd), usd(t.saving_usd_upper_bound), pctStr(t.saving_pct_upper_bound)));
  if (result.billing_mode !== 'api') {
    L.push(_('subsNote1'));
    L.push(_('subsNote2'));
  }
  L.push(skippedLine(result.skipped, _));
  L.push('');
  return L.join('\n');
}

function skippedLine(s, _) {
  return _('skippedLine', s.filesScanned, s.filesSkippedMtime, s.filesUnreadable, s.badLines);
}
