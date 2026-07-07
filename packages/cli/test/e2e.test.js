import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyze } from '../src/analyze.js';
import { main } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, 'fixtures', 'projects');
const EMPTY = join(here, 'fixtures', 'empty-root');

test('analyze produces the v1 result shape', async () => {
  const r = await analyze({ root: ROOT, sinceDays: 0, billing: 'api' });
  assert.equal(r.version, 1);
  assert.equal(r.billing_mode, 'api');
  assert.equal(r.billing_mode_source, 'flag');
  assert.equal(r.data_insufficient, false);
  assert.equal(r.projects.length, 1);

  const p = r.projects[0];
  assert.equal(p.model, 'claude-opus-4-8');
  assert.ok(p.params.g.value > 0);
  assert.equal(p.params.S.source, 'measured'); // fixture has a compaction event
  assert.equal(p.params.amp.value, 1);
  assert.deepEqual(p.params.amp.sensitivity, [1, 3]);

  // threshold interval is two ascending positive numbers
  const [tLo, tHi] = p.recommendation.threshold_tokens;
  assert.ok(tLo > 0 && tHi >= tLo, `threshold ${tLo}..${tHi}`);
  assert.equal(p.recommendation.basis, 'measured');
  assert.equal(p.recommendation.knob.verified, false);

  // replay bookkeeping present
  assert.ok(p.replay.actual_usd > 0);
  assert.equal(p.replay.threshold_used_tokens.length, 2);
  assert.ok(p.replay.saving_usd_upper_bound >= 0);
});

test('billing defaults to unknown when no flag given', async () => {
  const r = await analyze({ root: ROOT, sinceDays: 0 });
  assert.equal(r.billing_mode, 'unknown');
  assert.equal(r.billing_mode_source, 'default');
});

test('JSON output strips internal cost annotations', async () => {
  const r = await analyze({ root: ROOT, sinceDays: 0 });
  const json = JSON.stringify(r);
  assert.ok(!json.includes('_ctx'));
  assert.ok(!json.includes('_total'));
});

test('empty root → data_insufficient, no crash', async () => {
  const r = await analyze({ root: EMPTY, sinceDays: 0 });
  assert.equal(r.data_insufficient, true);
  assert.equal(r.projects.length, 0);
});

// --- CLI main() smoke: inject an output collector (no global patching → no test races) ---
// 注入 LANG=en 让语言检测确定为英文,使这些英文断言不受运行机器 locale 影响。
async function capture(argv) {
  let out = '';
  let err = '';
  const code = await main(argv, {
    out: (s) => (out += s),
    err: (s) => (err += s),
    env: { LANG: 'en_US.UTF-8' },
  });
  return { code, out, err };
}

test('CLI --help exits 0 and prints usage', async () => {
  const { code, out } = await capture(['--help']);
  assert.equal(code, 0);
  assert.ok(out.includes('USAGE'));
  assert.ok(out.includes('PRIVACY'));
});

test('CLI default report is the compact checkup (Style B)', async () => {
  const { code, out } = await capture(['--root', ROOT, '--since', '0', '--billing', 'api']);
  assert.equal(code, 0);
  assert.ok(out.includes('compaction checkup'));
  assert.ok(out.includes('sweet spot'));
  assert.ok(out.includes('full detail: --verbose'));
  assert.ok(!out.includes('EOQ threshold'), 'default stays compact, not verbose');
});

test('CLI --verbose shows the full parameter breakdown', async () => {
  const { code, out } = await capture(['--root', ROOT, '--since', '0', '--billing', 'api', '--verbose']);
  assert.equal(code, 0);
  assert.ok(out.includes('EOQ threshold'));
  assert.ok(out.includes('UPPER BOUND'));
  assert.ok(out.includes('Replay (ledger recomputation'));
});

test('CLI --json emits valid parseable JSON', async () => {
  const { out } = await capture(['--root', ROOT, '--since', '0', '--json']);
  const parsed = JSON.parse(out);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.projects.length, 1);
});

test('CLI --dry-run lists files, reads no content', async () => {
  const { code, out } = await capture(['--root', ROOT, '--since', '0', '--dry-run']);
  assert.equal(code, 0);
  assert.ok(out.includes('would read 1 file'));
});

test('CLI rejects bad --billing', async () => {
  const { code, err } = await capture(['--billing', 'bogus']);
  assert.equal(code, 2);
  assert.ok(err.includes('--billing'));
});
