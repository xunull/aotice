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
Project: my-app
  model: claude-opus-4-7 (1M window)
  Measured:  g = 971/turn (n=894, high) · cache hit 97% · floor S = 97K (n=2)
  Assumed:   amp = 1 (not measurable — behavioral, see README)
  EOQ threshold: 211K–295K tokens (21%–30% of window) — basis: measured
    your real auto-compact fires at ~501K (50%)
  Replay (ledger recomputation, last all):
    actual $374 vs counterfactual $194–$192  (API-equivalent estimate)
    → estimated saving up to $179 (48%) — UPPER BOUND, quality/rework not modeled [EXPERIMENTAL]
```

Translation: this session lets context grow to ~50% of the window before
auto-compacting. The cost-optimal point is ~21–30%. Compacting earlier would
have cut the read-tax by up to ~48% on this project.

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
  --json             Stable JSON (schema v1) instead of the terminal report
  --dry-run          List the files that WOULD be read, then exit (reads nothing)
  --paths <p,...>    Files/dirs to scan instead of ~/.claude/projects
  --root <dir>       Override the projects root
  -h, --help
```

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
