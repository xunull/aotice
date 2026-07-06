// 本文件由 scripts/sync-pricing.mjs 自动生成,请勿手改。
// 数据源: https://models.dev/api.json
// 重新同步: npm run sync:pricing
export const PRICING_SOURCE = "https://models.dev/api.json";
export const PRICING_SYNCED_AT = "2026-07-03";
export const ANTHROPIC_MODELS = [
  {
    "id": "claude-3-opus-20240229",
    "name": "Claude Opus 3",
    "context": 200000,
    "output": 4096,
    "input": 15,
    "outputCost": 75,
    "cacheRead": 1.5,
    "cacheWrite": 18.75
  },
  {
    "id": "claude-opus-4-0",
    "name": "Claude Opus 4 (latest)",
    "context": 200000,
    "output": 32000,
    "input": 15,
    "outputCost": 75,
    "cacheRead": 1.5,
    "cacheWrite": 18.75
  },
  {
    "id": "claude-opus-4-1",
    "name": "Claude Opus 4.1 (latest)",
    "context": 200000,
    "output": 32000,
    "input": 15,
    "outputCost": 75,
    "cacheRead": 1.5,
    "cacheWrite": 18.75
  },
  {
    "id": "claude-opus-4-1-20250805",
    "name": "Claude Opus 4.1",
    "context": 200000,
    "output": 32000,
    "input": 15,
    "outputCost": 75,
    "cacheRead": 1.5,
    "cacheWrite": 18.75
  },
  {
    "id": "claude-opus-4-20250514",
    "name": "Claude Opus 4",
    "context": 200000,
    "output": 32000,
    "input": 15,
    "outputCost": 75,
    "cacheRead": 1.5,
    "cacheWrite": 18.75
  },
  {
    "id": "claude-fable-5",
    "name": "Claude Fable 5",
    "context": 1000000,
    "output": 128000,
    "input": 10,
    "outputCost": 50,
    "cacheRead": 1,
    "cacheWrite": 12.5
  },
  {
    "id": "claude-opus-4-5",
    "name": "Claude Opus 4.5 (latest)",
    "context": 200000,
    "output": 64000,
    "input": 5,
    "outputCost": 25,
    "cacheRead": 0.5,
    "cacheWrite": 6.25
  },
  {
    "id": "claude-opus-4-5-20251101",
    "name": "Claude Opus 4.5",
    "context": 200000,
    "output": 64000,
    "input": 5,
    "outputCost": 25,
    "cacheRead": 0.5,
    "cacheWrite": 6.25
  },
  {
    "id": "claude-opus-4-6",
    "name": "Claude Opus 4.6",
    "context": 1000000,
    "output": 128000,
    "input": 5,
    "outputCost": 25,
    "cacheRead": 0.5,
    "cacheWrite": 6.25
  },
  {
    "id": "claude-opus-4-7",
    "name": "Claude Opus 4.7",
    "context": 1000000,
    "output": 128000,
    "input": 5,
    "outputCost": 25,
    "cacheRead": 0.5,
    "cacheWrite": 6.25
  },
  {
    "id": "claude-opus-4-8",
    "name": "Claude Opus 4.8",
    "context": 1000000,
    "output": 128000,
    "input": 5,
    "outputCost": 25,
    "cacheRead": 0.5,
    "cacheWrite": 6.25
  },
  {
    "id": "claude-3-5-sonnet-20240620",
    "name": "Claude Sonnet 3.5",
    "context": 200000,
    "output": 8192,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-3-5-sonnet-20241022",
    "name": "Claude Sonnet 3.5 v2",
    "context": 200000,
    "output": 8192,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-3-7-sonnet-20250219",
    "name": "Claude Sonnet 3.7",
    "context": 200000,
    "output": 64000,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-3-sonnet-20240229",
    "name": "Claude Sonnet 3",
    "context": 200000,
    "output": 4096,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 0.3
  },
  {
    "id": "claude-sonnet-4-0",
    "name": "Claude Sonnet 4 (latest)",
    "context": 200000,
    "output": 64000,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-sonnet-4-20250514",
    "name": "Claude Sonnet 4",
    "context": 200000,
    "output": 64000,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-sonnet-4-5",
    "name": "Claude Sonnet 4.5 (latest)",
    "context": 200000,
    "output": 64000,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-sonnet-4-5-20250929",
    "name": "Claude Sonnet 4.5",
    "context": 200000,
    "output": 64000,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-sonnet-4-6",
    "name": "Claude Sonnet 4.6",
    "context": 1000000,
    "output": 64000,
    "input": 3,
    "outputCost": 15,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  },
  {
    "id": "claude-sonnet-5",
    "name": "Claude Sonnet 5",
    "context": 1000000,
    "output": 128000,
    "input": 2,
    "outputCost": 10,
    "cacheRead": 0.2,
    "cacheWrite": 2.5
  },
  {
    "id": "claude-haiku-4-5",
    "name": "Claude Haiku 4.5 (latest)",
    "context": 200000,
    "output": 64000,
    "input": 1,
    "outputCost": 5,
    "cacheRead": 0.1,
    "cacheWrite": 1.25
  },
  {
    "id": "claude-haiku-4-5-20251001",
    "name": "Claude Haiku 4.5",
    "context": 200000,
    "output": 64000,
    "input": 1,
    "outputCost": 5,
    "cacheRead": 0.1,
    "cacheWrite": 1.25
  },
  {
    "id": "claude-3-haiku-20240307",
    "name": "Claude Haiku 3",
    "context": 200000,
    "output": 4096,
    "input": 0.25,
    "outputCost": 1.25,
    "cacheRead": 0.03,
    "cacheWrite": 0.3
  }
];
