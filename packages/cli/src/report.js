// 把 analyze() 结果成形为终端报告。参数画像在前,alpha 标注的回放在后。
// 输出为英文(受众:agent 工具作者)。
import { fmtTok, fmtUSD, pct } from '@aotice/compaction-model';

function pctStr(x) {
  return pct(x * 100);
}

function usd(x) {
  return fmtUSD(x);
}

function paramLine(p) {
  const measured = [];
  const assumed = [];
  if (p.g.source === 'measured')
    measured.push(`g = ${fmtTok(p.g.value)}/turn (n=${p.g.n}, ${p.g.confidence})`);
  else assumed.push(`g = ${fmtTok(p.g.value)}/turn`);

  if (p.cacheHit.value != null) measured.push(`cache hit ${Math.round(p.cacheHit.value * 100)}%`);

  if (p.S.source === 'measured') measured.push(`floor S = ${fmtTok(p.S.value)} (n=${p.S.n})`);
  else assumed.push(`floor S = ${fmtTok(p.S.value)}`);

  assumed.push('amp = 1 (not measurable — behavioral, see README)');

  return { measured, assumed };
}

export function renderProject(proj) {
  const L = [];
  const modelTag = proj.modelSource === 'assumed' ? ' [pricing assumed]' : '';
  L.push(`Project: ${proj.name}`);
  L.push(`  model: ${proj.model || 'unknown'} (${fmtTok(proj.window)} window)${modelTag}`);

  const { measured, assumed } = paramLine(proj.params);
  if (measured.length) L.push(`  Measured:  ${measured.join(' · ')}`);
  if (assumed.length) L.push(`  Assumed:   ${assumed.join(' · ')}`);

  const rec = proj.recommendation;
  const [tLo, tHi] = rec.threshold_tokens;
  const [pLo, pHi] = rec.threshold_pct;
  let recLine = `  EOQ threshold: ${fmtTok(tLo)}–${fmtTok(tHi)} tokens (${pctStr(pLo)}–${pctStr(pHi)} of window) — basis: ${rec.basis}`;
  if (rec.beyond_window) recLine += ' [optimum ≥ window]';
  L.push(recLine);
  if (proj.realTriggerPreTokens) {
    L.push(`    your real auto-compact fires at ~${fmtTok(proj.realTriggerPreTokens)} (${pctStr(proj.realTriggerPreTokens / proj.window)})`);
  }

  const r = proj.replay;
  L.push(`  Replay (ledger recomputation, last ${r.window_days === 0 ? 'all' : r.window_days + 'd'}):`);
  L.push(`    actual ${usd(r.actual_usd)} vs counterfactual ${usd(r.counterfactual_usd[0])}–${usd(r.counterfactual_usd[1])}  (API-equivalent estimate)`);
  L.push(
    `    → estimated saving up to ${usd(r.saving_usd_upper_bound)} (${pctStr(r.saving_pct_upper_bound)}) — UPPER BOUND, quality/rework not modeled [EXPERIMENTAL]`
  );
  L.push(`    clean segments: ${r.clean_segments} · excluded (short/dirty): ${r.excluded_segments}`);
  L.push(`  Knob (pending verification — see README): ${rec.knob.value}`);
  return L.join('\n');
}

export function renderReport(result) {
  const L = [];
  L.push('');
  L.push('aotice — prescriptive compaction audit (alpha, experimental estimates)');
  L.push(`pricing synced ${result.pricing_synced_at} · billing: ${result.billing_mode} (${result.billing_mode_source})`);
  L.push('─'.repeat(64));

  if (result.data_insufficient) {
    L.push('');
    L.push('  Not enough data. No usable transcripts found in the window.');
    L.push('  Try a wider window (--since 90) or check ~/.claude/projects exists.');
    L.push('');
    L.push(skippedLine(result.skipped));
    return L.join('\n');
  }

  for (const p of result.projects) {
    L.push('');
    L.push(renderProject(p));
  }

  const t = result.totals;
  L.push('');
  L.push('─'.repeat(64));
  L.push(
    `TOTAL (last ${result.since_days === 0 ? 'all' : result.since_days + 'd'}): actual ${usd(t.actual_usd)} → estimated saving up to ${usd(t.saving_usd_upper_bound)} (${pctStr(t.saving_pct_upper_bound)}, upper bound, API-equivalent)`
  );
  if (result.billing_mode !== 'api') {
    L.push('  Note: $ figures are API-equivalent. On a Max/Pro subscription your marginal $ is ~0;');
    L.push('        the real win is token savings → usage-cap headroom. Pass --billing api if you pay per token.');
  }
  L.push(skippedLine(result.skipped));
  L.push('');
  return L.join('\n');
}

function skippedLine(s) {
  return `  parsed ${s.filesScanned} files (${s.filesSkippedMtime} skipped by date, ${s.filesUnreadable} unreadable, ${s.badLines} bad lines skipped)`;
}
