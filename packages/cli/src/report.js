// 把 analyze() 结果成形为终端报告。参数画像在前,alpha 标注的回放在后。
// 语言由调用方传入(默认 en)。技术术语在中文里也保留英文——见 messages.js。
import { fmtTok, fmtUSD, pct } from '@aotice/compaction-model';
import { translator } from './i18n.js';

function pctStr(x) {
  return pct(x * 100);
}

function usd(x) {
  return fmtUSD(x);
}

// 返回 measured / assumed 两组已翻译的参数片段。
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
  if (proj.realTriggerPreTokens) {
    L.push(_('realTrigger', fmtTok(proj.realTriggerPreTokens), pctStr(proj.realTriggerPreTokens / proj.window)));
  }

  const r = proj.replay;
  L.push(_('replayHeader', r.window_days));
  L.push(_('replayActual', usd(r.actual_usd), usd(r.counterfactual_usd[0]), usd(r.counterfactual_usd[1])));
  L.push(_('replaySaving', usd(r.saving_usd_upper_bound), pctStr(r.saving_pct_upper_bound)));
  L.push(_('replaySegments', r.clean_segments, r.excluded_segments));
  L.push(_('knobLine', rec.knob.value));
  return L.join('\n');
}

export function renderReport(result, lang = 'en') {
  const _ = translator(lang);
  const L = [];
  L.push('');
  L.push(_('title'));
  L.push(_('metaLine', result.pricing_synced_at, result.billing_mode, result.billing_mode_source));
  L.push('─'.repeat(64));

  if (result.data_insufficient) {
    L.push('');
    L.push(_('insufficient1'));
    L.push(_('insufficient2'));
    L.push('');
    L.push(skippedLine(result.skipped, _));
    return L.join('\n');
  }

  for (const p of result.projects) {
    L.push('');
    L.push(renderProject(p, lang));
  }

  const t = result.totals;
  L.push('');
  L.push('─'.repeat(64));
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
