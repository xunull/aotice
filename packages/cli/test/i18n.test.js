import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { detectLang, t } from '../src/i18n.js';
import { analyze } from '../src/analyze.js';
import { renderReport } from '../src/report.js';
import { main } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, 'fixtures', 'projects');

// ── detectLang 优先级 ──
test('detectLang: zh locale → zh, en/C/empty → en', () => {
  assert.equal(detectLang({ env: { LANG: 'zh_CN.UTF-8' } }), 'zh');
  assert.equal(detectLang({ env: { LANG: 'zh' } }), 'zh');
  assert.equal(detectLang({ env: { LANG: 'zh-Hans' } }), 'zh');
  assert.equal(detectLang({ env: { LANG: 'en_US.UTF-8' } }), 'en');
  assert.equal(detectLang({ env: { LANG: 'C' } }), 'en');
  assert.equal(detectLang({ env: {} }), 'en'); // 未设置 → 默认 en
});

test('detectLang: --lang override beats everything', () => {
  assert.equal(detectLang({ override: 'zh', env: { LANG: 'en_US' } }), 'zh');
  assert.equal(detectLang({ override: 'en', env: { LANG: 'zh_CN' } }), 'en');
  assert.equal(detectLang({ override: '', env: { LANG: 'zh_CN' } }), 'zh'); // 空 override 忽略
});

test('detectLang: precedence AOTICE_LANG > LC_ALL > LC_MESSAGES > LANG', () => {
  assert.equal(detectLang({ env: { AOTICE_LANG: 'zh', LANG: 'en_US' } }), 'zh');
  assert.equal(detectLang({ env: { LC_ALL: 'zh_CN', LANG: 'en_US' } }), 'zh');
  assert.equal(detectLang({ env: { LC_MESSAGES: 'zh_CN', LANG: 'en_US' } }), 'zh');
  assert.equal(detectLang({ env: { AOTICE_LANG: 'en', LC_ALL: 'zh_CN' } }), 'en'); // AOTICE_LANG 最高
});

// ── t() 查表 ──
test('t: returns per-language string, interpolates, falls back on missing', () => {
  assert.match(t('en', 'title'), /prescriptive compaction audit/);
  assert.match(t('zh', 'title'), /处方性/);
  assert.equal(t('en', 'projectHeader', 'foo'), 'Project: foo');
  assert.equal(t('zh', 'projectHeader', 'foo'), '项目:foo');
  assert.equal(t('en', 'no_such_key_xyz'), 'no_such_key_xyz'); // 缺 key → 返回 key
});

// ── 报告 zh vs en ──
async function renderBoth() {
  const result = await analyze({ root: ROOT, sinceDays: 0, billing: 'api' });
  return { en: renderReport(result, 'en'), zh: renderReport(result, 'zh') };
}

test('report renders Chinese vs English by lang', async () => {
  const { en, zh } = await renderBoth();
  assert.match(en, /Project:/);
  assert.match(en, /Replay \(ledger recomputation/);
  assert.ok(zh.includes('项目:'));
  assert.ok(zh.includes('回放') && zh.includes('账本重算'));
  assert.notEqual(en, zh);
});

test('technical terms stay English in zh output', async () => {
  const { zh } = await renderBoth();
  for (const term of ['EOQ threshold', 'cache hit', 'UPPER BOUND', '[EXPERIMENTAL]']) {
    assert.ok(zh.includes(term), `zh 报告应保留术语 "${term}"`);
  }
});

// ── --json 永不翻译:zh 与 en 逐字节相同 ──
async function jsonOut(lang) {
  let out = '';
  await main(['--root', ROOT, '--since', '0', '--json'], {
    out: (s) => (out += s),
    err: () => {},
    env: lang === 'zh' ? { LANG: 'zh_CN.UTF-8' } : { LANG: 'en_US.UTF-8' },
  });
  return out;
}

test('--json output is byte-identical regardless of language', async () => {
  const [zh, en] = await Promise.all([jsonOut('zh'), jsonOut('en')]);
  assert.equal(zh, en, '--json 不能被语言影响(机器 schema 必须稳定)');
  const parsed = JSON.parse(zh);
  assert.equal(parsed.version, 1);
});

// ── 自动检测端到端:LANG=zh 触发中文报告 ──
test('main auto-detects zh from LANG env (no --lang)', async () => {
  let out = '';
  await main(['--root', ROOT, '--since', '0', '--billing', 'api'], {
    out: (s) => (out += s),
    err: () => {},
    env: { LANG: 'zh_CN.UTF-8' },
  });
  assert.match(out, /项目:/, 'LANG=zh 应自动出中文报告');
});
