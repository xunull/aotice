// 模型 id → 定价记录的查找。transcript 里的 model 常带日期后缀
// (claude-opus-4-8-20250101),而定价表用裸 id,故做前缀/去后缀匹配。
import { ANTHROPIC_MODELS } from '@aotice/compaction-model';

// 去掉尾部 -YYYYMMDD 日期快照后缀
function stripDate(id) {
  return id.replace(/-\d{8}$/, '');
}

/**
 * 返回匹配的定价记录,匹配不到返回 null(调用方决定回退)。
 * price 记录字段($/M):input, outputCost, cacheRead, cacheWrite, context
 */
export function findModelPricing(modelId) {
  if (!modelId) return null;
  // 1) 精确
  let hit = ANTHROPIC_MODELS.find((m) => m.id === modelId);
  if (hit) return hit;
  // 2) 去日期后缀精确
  const bare = stripDate(modelId);
  hit = ANTHROPIC_MODELS.find((m) => m.id === bare);
  if (hit) return hit;
  // 3) 表 id 是 transcript id 的前缀(表裸 id vs 带后缀 transcript)
  hit = ANTHROPIC_MODELS.find((m) => modelId.startsWith(m.id));
  if (hit) return hit;
  // 4) transcript id 是表 id 的前缀(反向)
  hit = ANTHROPIC_MODELS.find((m) => m.id.startsWith(bare));
  return hit || null;
}

// 未知模型的保守回退(Opus 4.8 档;调用方须标注 assumed)
export const FALLBACK_PRICING = {
  id: 'unknown',
  name: 'Unknown (Opus-tier fallback)',
  context: 1000000,
  input: 5,
  outputCost: 25,
  cacheRead: 0.5,
  cacheWrite: 6.25,
};
