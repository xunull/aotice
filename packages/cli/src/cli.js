#!/usr/bin/env node
// aotice — 处方性上下文压缩审计 CLI(alpha)。
// 读你自己的 ~/.claude 会话记录,实测参数 → EOQ 最优压缩阈值 → 反事实节省估计。
// 隐私:全部本地解析,零上传;只读 usage 字段,从不读消息正文。
import { parseArgs } from 'node:util';
import { analyze } from './analyze.js';
import { renderReport } from './report.js';
import { parseTranscripts } from './parser.js';

const HELP = `aotice — prescriptive compaction audit (alpha, experimental)

USAGE
  npx aotice [options]

Reads ~/.claude/projects/**/*.jsonl locally, fits your real per-session
parameters, and prints the cost-optimal compaction threshold plus a
counterfactual "you could have saved $X" (upper bound, ledger recomputation).

OPTIONS
  --since <days>     Only consider sessions modified in the last N days (default 30; 0 = all)
  --billing <mode>   api | subscription  (default: unknown → $ shown as API-equivalent)
  --json             Emit stable JSON (schema v1) instead of the terminal report
  --sweep            (reserved) sweep all thresholds instead of the EOQ interval
  --dry-run          List the transcript files that WOULD be read, then exit (reads nothing)
  --paths <p,...>    Comma-separated files/dirs to scan instead of ~/.claude/projects
  --root <dir>       Override the projects root (default ~/.claude/projects)
  -h, --help         Show this help

PRIVACY
  100% local. No network except an optional pricing sync at build time.
  The parser only reads token-usage and compaction metadata — never message text.
`;

function parsePaths(v) {
  if (!v) return undefined;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function main(argv, io = {}) {
  const out = io.out || ((s) => process.stdout.write(s));
  const err = io.err || ((s) => process.stderr.write(s));
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        since: { type: 'string' },
        billing: { type: 'string' },
        json: { type: 'boolean', default: false },
        sweep: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        paths: { type: 'string' },
        root: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    });
  } catch (e) {
    err(`aotice: ${e.message}\n\n${HELP}`);
    return 2;
  }

  const { values } = parsed;
  if (values.help) {
    out(HELP);
    return 0;
  }

  const billing = values.billing;
  if (billing && billing !== 'api' && billing !== 'subscription') {
    err(`aotice: --billing must be 'api' or 'subscription'\n`);
    return 2;
  }

  const sinceDays = values.since != null ? Number(values.since) : 30;
  if (Number.isNaN(sinceDays) || sinceDays < 0) {
    err(`aotice: --since must be a non-negative number of days\n`);
    return 2;
  }

  const paths = parsePaths(values.paths);

  // --dry-run:只列将读取的文件,不解析内容
  if (values['dry-run']) {
    const now = Date.now();
    const sinceMs = sinceDays > 0 ? now - sinceDays * 86400000 : 0;
    const res = await parseTranscripts({ root: values.root, paths, sinceMs, dryRun: true });
    if (values.json) {
      out(JSON.stringify({ dry_run: true, files: res.files, skipped: res.skipped }, null, 2) + '\n');
    } else {
      out(`aotice --dry-run: would read ${res.files.length} file(s):\n`);
      for (const f of res.files) out(`  ${f}\n`);
      out(`  (${res.skipped.filesSkippedMtime} skipped by date, ${res.skipped.filesUnreadable} unreadable)\n`);
    }
    return 0;
  }

  const result = await analyze({ root: values.root, paths, sinceDays, billing });

  if (values.json) {
    out(JSON.stringify(result, replacerStripInternal, 2) + '\n');
  } else {
    out(renderReport(result) + '\n');
  }
  return result.data_insufficient ? 0 : 0;
}

// JSON 输出剔除内部标注字段(_ctx/_total)
function replacerStripInternal(key, value) {
  if (key === '_ctx' || key === '_total') return undefined;
  if (key === 'turns' || key === 'segments' || key === 'models' || key === 'compactions') return undefined;
  return value;
}

// 直接执行(非 import)时运行
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code || 0))
    .catch((e) => {
      process.stderr.write(`aotice: fatal: ${e?.stack || e}\n`);
      process.exit(1);
    });
}
