#!/usr/bin/env node
// 从 models.dev 同步 Anthropic 各模型价格,重新生成 src/pricing.js。
// 用法: npm run sync:pricing
import { writeFile } from 'node:fs/promises';

const URL_SRC = 'https://models.dev/api.json';

const res = await fetch(URL_SRC);
if (!res.ok) throw new Error(`拉取失败 ${res.status} ${res.statusText}`);
const data = await res.json();

const prov = data.anthropic;
if (!prov || !prov.models) throw new Error('未找到 anthropic provider');

const models = Object.values(prov.models)
  .map((m) => ({
    id: m.id,
    name: m.name ?? m.id,
    context: m.limit?.context ?? null,
    output: m.limit?.output ?? null,
    input: m.cost?.input ?? null,
    outputCost: m.cost?.output ?? null,
    cacheRead: m.cost?.cache_read ?? null,
    cacheWrite: m.cost?.cache_write ?? null,
  }))
  // 只保留具备缓存价的模型(计算需要 cache_read)
  .filter((m) => m.input != null && m.cacheRead != null)
  .sort((a, b) => b.input - a.input || a.id.localeCompare(b.id));

const today = new Date().toISOString().slice(0, 10);

const body = `// 本文件由 scripts/sync-pricing.mjs 自动生成,请勿手改。
// 数据源: ${URL_SRC}
// 重新同步: npm run sync:pricing
export const PRICING_SOURCE = ${JSON.stringify(URL_SRC)};
export const PRICING_SYNCED_AT = ${JSON.stringify(today)};
export const ANTHROPIC_MODELS = ${JSON.stringify(models, null, 2)};
`;

await writeFile(new URL('../pricing.js', import.meta.url), body);
console.log(`已同步 ${models.length} 个 Anthropic 模型 (${today}) ← models.dev`);
