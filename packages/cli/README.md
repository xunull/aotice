# aotice

**Prescriptive** context-compaction audit for Claude Code. Every other tool
(ccusage & friends) tells you *what you spent*. `aotice` tells you *what knob to
turn*: it reads your own session logs, fits your real parameters, and computes
the cost-optimal compaction threshold — plus a counterfactual "you could have
saved $X."

> ⚠️ **alpha — experimental estimates.** Numbers are upper-bound estimates from a
> ledger recomputation, not a guarantee. See [Limitations](#limitations).

```
npx aotice
```

```
compaction checkup · claude-opus-4-7 · all history        late ⚠
────────────────────────────────────────────────────────────────
  your timing compacts at ~50% of window (~501K)
  sweet spot  21% – 30%
  verdict     compacting late — clear room to improve

  cost        actual $374 · ideal ~$194 · up to 48% off

  suggested   set auto-compaction to ~21% (experimental)
              CLAUDE_AUTOCOMPACT_PCT_OVERRIDE≈21 (or /compact at ~211K tokens)

pricing 2026-07-03 · billing api · full detail: --verbose
```

Read it: this session lets context grow to ~50% of the window before
auto-compacting; the cost-optimal point is ~21–30%. Compacting earlier would
cut the read-tax by up to ~48% here. The default output is this compact
checkup — run **`aotice --verbose`** for the full per-parameter breakdown
(measured `g` / `S` / cache-hit, the EOQ interval, ledger-recomputation replay).

## Why earlier?

Every turn re-sends the whole conversation, and the cached prefix is billed at
0.1× input on **every** turn. That read-tax grows quadratically with context.
Balancing it against the fixed cost of each compaction is a classic
[EOQ](../../docs/EOQ经济订货量详解.md) problem with a closed-form optimum:

```
T* = S + √( 2·g·K_fix / h )
```

Full model: [`docs/`](../../docs/上下文压缩时机的成本建模.md).

## Usage

```
npx aotice [options]

  --since <days>     Sessions modified in the last N days (default 30; 0 = all)
  --billing <mode>   api | subscription   (default: unknown → $ shown as API-equivalent)
  --lang <zh|en>     Output language (default: auto-detect from $LANG)
  --json             Stable JSON (schema v1) instead of the terminal report
  --dry-run          List the files that WOULD be read, then exit (reads nothing)
  --paths <p,...>    Files/dirs to scan instead of ~/.claude/projects
  --root <dir>       Override the projects root
  -h, --help
```

## Language / 语言

The terminal report and `--help` are localized (English / 简体中文). Language is
detected from your **system locale**, in this precedence:

`--lang zh|en` → `AOTICE_LANG` → `LC_ALL` / `LC_MESSAGES` / `LANG` → default `en`.

A locale starting with `zh` (e.g. `zh_CN.UTF-8`) → Chinese; anything else (incl.
`C` / `POSIX` / unset) → English. Detection is **local only** — it reads env vars,
never your IP or any network (that would break the privacy guarantee below).

```bash
aotice --lang zh          # force Chinese
AOTICE_LANG=zh aotice     # same, via env
```

`--json` output is **never** localized: field names and values are a stable
machine schema (v1), identical in any language. Technical terms (EOQ, cache hit,
model ids, UPPER BOUND) stay English even in Chinese output.

## Privacy

- **100% local.** No network at runtime (pricing is baked in at build time). No uploads, ever.
- **Usage-fields only — a hard constraint, not a promise.** The parser reads only
  token-usage counters and compaction metadata. It **never** reads `message.content`
  (your prompts, code, or the model's replies). The data it needs simply does not
  include message text.
- `--dry-run` shows exactly which files would be touched before you run for real.
- `--paths` scopes the scan to a subset you choose.

## Reading the numbers

- **measured vs assumed** — every parameter is labeled. `g` (per-turn growth) and
  `cache hit` are measured from your logs. `S` (post-compaction floor) is measured
  when your sessions contain compaction events, else a default (labeled `assumed`).
  `amp` (re-read amplification) is **not measurable** from usage fields, so it is
  fixed at 1 and surfaced as the `[1,3]` sensitivity interval on the threshold.
- **upper bound** — the replay assumes your trajectory is unchanged (same turns,
  same outputs) and does not model quality loss or re-reads. So the counterfactual
  is a *lower bound on cost* → the saving is an *upper bound*. Real savings are smaller.
- **ledger recomputation, not a reachable counterfactual** — we only simulate
  compacting *earlier* than you actually did (that trajectory is observable), never
  later. Output cost and sidechain cost are symmetric on both sides and cancel out.
- **billing** — on a Max/Pro subscription your marginal dollar cost is ~0; the real
  win is token savings → usage-cap headroom. `$` figures are always API-equivalent.
  Pass `--billing api` if you pay per token.

## Limitations

- **Threshold basis.** When `basis: theoretical`, `S` was assumed (no compaction
  events in your window) — the threshold is a model default, not fit to your data.
- **S may not scale to earlier thresholds.** `S` is measured at your *actual*
  (late) compaction points; the floor at an earlier threshold could differ. A manual
  `/compact` probe at low context would confirm it (planned).
- **The knob is pending verification.** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` exists in
  Claude Code but its exact semantics (used-% vs remaining-%) are not yet confirmed;
  the fallback is a manual `/compact at ~NK tokens` suggestion.
- **Format is reverse-engineered.** Baseline: **Claude Code v2.1.200** JSONL. A
  format change upstream can break parsing; unknown shapes degrade gracefully
  (bad lines are skipped and counted, never fatal).

## Compatibility

| Tool | Status |
|---|---|
| Claude Code (JSONL under `~/.claude/projects`) | ✅ verified v2.1.200 |
| Codex CLI / OpenCode | ⛔ not yet (parser front-end planned) |

## License

Part of the [aotice](../../) workspace.
