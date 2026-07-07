// 双语消息目录。每条 key 一个 { en, zh };带插值的用函数。
// 术语策略:EOQ、cache hit、UPPER BOUND、[EXPERIMENTAL]、amp、模型名、tokens 等
// 技术术语在中文里也保留英文(匹配 docs 的中英双语风格);只翻叙述性文字。
// 注意:--json 输出不走这里(机器 schema 必须稳定,永不翻译)。

const basisWord = { en: (b) => b, zh: (b) => ({ measured: '实测', theoretical: '理论' }[b] || b) };
const win = { en: (d) => (d === 0 ? 'all' : `${d}d`), zh: (d) => (d === 0 ? '全部' : `${d}天`) };

export const MESSAGES = {
  // ── 报告头 ──
  title: {
    en: () => 'aotice — prescriptive compaction audit (alpha, experimental estimates)',
    zh: () => 'aotice — 处方性上下文压缩审计(alpha,实验性估算)',
  },
  metaLine: {
    en: (date, mode, src) => `pricing synced ${date} · billing: ${mode} (${src})`,
    zh: (date, mode, src) => `定价同步于 ${date} · 计费:${mode}(${src})`,
  },

  // ── 数据不足 ──
  insufficient1: {
    en: () => '  Not enough data. No usable transcripts found in the window.',
    zh: () => '  数据不足。窗口内没有找到可用的会话记录。',
  },
  insufficient2: {
    en: () => '  Try a wider window (--since 90) or check ~/.claude/projects exists.',
    zh: () => '  试试更大的窗口(--since 90),或确认 ~/.claude/projects 存在。',
  },

  // ── 项目块 ──
  projectHeader: { en: (name) => `Project: ${name}`, zh: (name) => `项目:${name}` },
  modelLine: {
    en: (model, window, tag) => `  model: ${model} (${window} window)${tag}`,
    zh: (model, window, tag) => `  模型:${model}(${window} 窗口)${tag}`,
  },
  pricingAssumedTag: { en: () => ' [pricing assumed]', zh: () => ' [定价为假设值]' },
  measuredLabel: { en: (body) => `  Measured:  ${body}`, zh: (body) => `  实测:  ${body}` },
  assumedLabel: { en: (body) => `  Assumed:   ${body}`, zh: (body) => `  假设:  ${body}` },

  // 参数片段(g / cache hit / floor S / amp)
  paramG: {
    en: (tok, n, conf) => `g = ${tok}/turn (n=${n}, ${conf})`,
    zh: (tok, n, conf) => `g = ${tok}/轮 (n=${n}, ${conf})`,
  },
  paramGAssumed: { en: (tok) => `g = ${tok}/turn`, zh: (tok) => `g = ${tok}/轮` },
  paramCacheHit: { en: (p) => `cache hit ${p}%`, zh: (p) => `cache hit ${p}%` }, // 术语,保留英文
  paramS: {
    en: (tok, n) => `floor S = ${tok} (n=${n})`,
    zh: (tok, n) => `地板 S = ${tok} (n=${n})`,
  },
  paramSAssumed: { en: (tok) => `floor S = ${tok}`, zh: (tok) => `地板 S = ${tok}` },
  paramAmp: {
    en: () => 'amp = 1 (not measurable — behavioral, see README)',
    zh: () => 'amp = 1(不可测 — 属行为,见 README)',
  },

  // EOQ 阈值 / 触发点
  eoqThreshold: {
    en: (tLo, tHi, pLo, pHi, basis) =>
      `  EOQ threshold: ${tLo}–${tHi} tokens (${pLo}–${pHi} of window) — basis: ${basisWord.en(basis)}`,
    zh: (tLo, tHi, pLo, pHi, basis) =>
      `  EOQ threshold:${tLo}–${tHi} tokens(${pLo}–${pHi} 窗口)— 依据:${basisWord.zh(basis)}`,
  },
  beyondWindow: { en: () => ' [optimum ≥ window]', zh: () => ' [最优 ≥ 窗口]' },
  realTrigger: {
    en: (tok, p) => `    your real auto-compact fires at ~${tok} (${p})`,
    zh: (tok, p) => `    你的实际自动压缩触发点 ~${tok}(${p})`,
  },

  // 回放
  replayHeader: {
    en: (d) => `  Replay (ledger recomputation, last ${win.en(d)}):`,
    zh: (d) => `  回放(账本重算,最近 ${win.zh(d)}):`,
  },
  replayActual: {
    en: (a, c0, c1) => `    actual ${a} vs counterfactual ${c0}–${c1}  (API-equivalent estimate)`,
    zh: (a, c0, c1) => `    实际 ${a} vs 反事实 ${c0}–${c1}(API 等价估算)`,
  },
  replaySaving: {
    en: (s, p) =>
      `    → estimated saving up to ${s} (${p}) — UPPER BOUND, quality/rework not modeled [EXPERIMENTAL]`,
    zh: (s, p) =>
      `    → 估计最多可省 ${s}(${p})— UPPER BOUND,未建模质量/返工损失 [EXPERIMENTAL]`,
  },
  replaySegments: {
    en: (clean, excl) => `    clean segments: ${clean} · excluded (short/dirty): ${excl}`,
    zh: (clean, excl) => `    干净段:${clean} · 排除(过短/脏):${excl}`,
  },
  knobLine: {
    en: (knob) => `  Knob (pending verification — see README): ${knob}`,
    zh: (knob) => `  旋钮(待验证 — 见 README):${knob}`,
  },

  // ── 合计 ──
  totalLine: {
    en: (d, a, s, p) =>
      `TOTAL (last ${win.en(d)}): actual ${a} → estimated saving up to ${s} (${p}, upper bound, API-equivalent)`,
    zh: (d, a, s, p) =>
      `合计(最近 ${win.zh(d)}):实际 ${a} → 估计最多可省 ${s}(${p},上界,API 等价)`,
  },
  subsNote1: {
    en: () => '  Note: $ figures are API-equivalent. On a Max/Pro subscription your marginal $ is ~0;',
    zh: () => '  注:美元数字为 API 等价。Max/Pro 订阅下你的边际成本 ~0;',
  },
  subsNote2: {
    en: () => '        the real win is token savings → usage-cap headroom. Pass --billing api if you pay per token.',
    zh: () => '        真正的收益是省 token → 用量额度余量。按 token 付费请加 --billing api。',
  },
  skippedLine: {
    en: (scanned, mtime, unread, bad) =>
      `  parsed ${scanned} files (${mtime} skipped by date, ${unread} unreadable, ${bad} bad lines skipped)`,
    zh: (scanned, mtime, unread, bad) =>
      `  解析了 ${scanned} 个文件(${mtime} 按日期跳过,${unread} 不可读,${bad} 坏行跳过)`,
  },

  // ── CLI:--dry-run / 报错 ──
  dryRunHeader: {
    en: (n) => `aotice --dry-run: would read ${n} file(s):`,
    zh: (n) => `aotice --dry-run:将读取 ${n} 个文件:`,
  },
  dryRunFooter: {
    en: (mtime, unread) => `  (${mtime} skipped by date, ${unread} unreadable)`,
    zh: (mtime, unread) => `  (${mtime} 按日期跳过,${unread} 不可读)`,
  },
  errBilling: {
    en: () => "aotice: --billing must be 'api' or 'subscription'",
    zh: () => "aotice:--billing 只能是 'api' 或 'subscription'",
  },
  errSince: {
    en: () => 'aotice: --since must be a non-negative number of days',
    zh: () => 'aotice:--since 必须是非负天数',
  },
  errParse: { en: (msg) => `aotice: ${msg}`, zh: (msg) => `aotice:${msg}` },
  errFatal: { en: (e) => `aotice: fatal: ${e}`, zh: (e) => `aotice:致命错误:${e}` },

  // ── 默认输出(体检报告 / Style B)──
  bTitle: {
    en: (model, days) => `compaction checkup · ${model} · ${days === 0 ? 'all history' : 'last ' + days + 'd'}`,
    zh: (model, days) => `压缩时机体检 · ${model} · ${days === 0 ? '全部历史' : '近' + days + '天'}`,
  },
  bGradeGood: { en: () => 'healthy ✅', zh: () => '良好 ✅' },
  bGradeTune: { en: () => 'tunable ⚙', zh: () => '可优化 ⚙' },
  bGradeLate: { en: () => 'late ⚠', zh: () => '偏晚 ⚠' },
  bGradeNoData: { en: () => '—', zh: () => '—' },

  bLblTiming: { en: () => 'your timing', zh: () => '你的时机' },
  bLblOptimal: { en: () => 'sweet spot', zh: () => '最省区间' },
  bLblVerdict: { en: () => 'verdict', zh: () => '综合评价' },
  bLblCost: { en: () => 'cost', zh: () => '本期成本' },
  bLblAction: { en: () => 'suggested', zh: () => '可选动作' },

  bTimingVal: {
    en: (p, tok) => `compacts at ~${p} of window (~${tok})`,
    zh: (p, tok) => `聊到 ~${p} 窗口才压缩(~${tok})`,
  },
  bTimingNone: { en: () => 'no auto-compaction in this window', zh: () => '窗口内无自动压缩记录' },
  bOptimalVal: { en: (lo, hi) => `${lo} – ${hi}`, zh: (lo, hi) => `${lo} – ${hi}` },
  bVerdictGood: {
    en: () => 'near the sweet spot — little to gain',
    zh: () => '已接近最省区间,差距很小',
  },
  bVerdictTune: {
    en: () => 'a bit late — a small tweak helps',
    zh: () => '比最省略晚,微调有帮助',
  },
  bVerdictLate: {
    en: () => 'compacting late — clear room to improve',
    zh: () => '压得偏晚,有明显优化空间',
  },
  bVerdictNoData: {
    en: () => 'no compaction seen — can’t compare your timing',
    zh: () => '无压缩记录,无法对比你的时机',
  },
  bCostVal: {
    en: (a, c, p) => `actual ${a} · ideal ~${c} · up to ${p} off`,
    zh: (a, c, p) => `实际 ${a} · 理论最低 ~${c} · 上限差 ${p}`,
  },
  bCostNoteSubs: {
    en: () => '            ($ is API-equivalent; on a subscription you save quota, not cash)',
    zh: () => '            ($ 按 API 价;订阅制省的是额度不是现金)',
  },
  bActionVal: {
    en: (p) => `set auto-compaction to ~${p} (experimental)`,
    zh: (p) => `把自动压缩阈值设到约 ${p}(实验性)`,
  },
  bFooter: {
    en: (date, mode) => `pricing ${date} · billing ${mode} · full detail: --verbose`,
    zh: (date, mode) => `定价同步 ${date} · 计费 ${mode} · 完整明细见 --verbose`,
  },
  bTotal: {
    en: (days, a, s, p) =>
      `TOTAL (${days === 0 ? 'all' : 'last ' + days + 'd'}): actual ${a} · save up to ~${s} (${p}, upper bound)`,
    zh: (days, a, s, p) =>
      `合计(${days === 0 ? '全部' : '近' + days + '天'}):实际 ${a} · 最多可省 ~${s}(${p},上限)`,
  },

  // ── --help(整块)──
  help: {
    en: () => `aotice — prescriptive compaction audit (alpha, experimental)

USAGE
  npx aotice [options]

Reads ~/.claude/projects/**/*.jsonl locally, fits your real per-session
parameters, and prints the cost-optimal compaction threshold plus a
counterfactual "you could have saved $X" (upper bound, ledger recomputation).

OPTIONS
  --since <days>     Only consider sessions modified in the last N days (default 30; 0 = all)
  --billing <mode>   api | subscription  (default: unknown → $ shown as API-equivalent)
  --lang <zh|en>     Force output language (default: auto-detect from $LANG; AOTICE_LANG also works)
  --verbose          Full parameter breakdown (default is a compact checkup)
  --json             Emit stable JSON (schema v1) instead of the terminal report
  --sweep            (reserved) sweep all thresholds instead of the EOQ interval
  --dry-run          List the transcript files that WOULD be read, then exit (reads nothing)
  --paths <p,...>    Comma-separated files/dirs to scan instead of ~/.claude/projects
  --root <dir>       Override the projects root (default ~/.claude/projects)
  -h, --help         Show this help

PRIVACY
  100% local. No network except an optional pricing sync at build time.
  The parser only reads token-usage and compaction metadata — never message text.
`,
    zh: () => `aotice — 处方性上下文压缩审计(alpha,实验性)

用法
  npx aotice [选项]

本地读取 ~/.claude/projects/**/*.jsonl,拟合你每个会话的真实参数,
打印成本最优的压缩阈值,以及"你本可省下 $X"的反事实估计(上界,账本重算)。

选项
  --since <天数>     只看最近 N 天修改过的会话(默认 30;0 = 全部)
  --billing <模式>   api | subscription(默认:unknown → 美元按 API 等价显示)
  --lang <zh|en>     强制输出语言(默认:按 $LANG 自动检测;也可用 AOTICE_LANG)
  --verbose          完整参数明细(默认是简明体检)
  --json             输出稳定 JSON(schema v1),而非终端报告
  --sweep            (预留)扫所有阈值,而非只 EOQ 区间
  --dry-run          只列将读取的会话文件,然后退出(不读取任何内容)
  --paths <p,...>    逗号分隔的文件/目录,替代 ~/.claude/projects
  --root <目录>      覆盖 projects 根目录(默认 ~/.claude/projects)
  -h, --help         显示本帮助

隐私
  100% 本地。除构建期可选的定价同步外,零网络。
  解析器只读 token 用量和压缩元数据 —— 从不读消息正文。
`,
  },
};
