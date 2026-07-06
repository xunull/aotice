// @aotice/compaction-model — 共享入口。
// 成本模型(EOQ)、定价数据、数字格式化,一处定义,计算器与 CLI 共用,
// 杜绝 EOQ 公式在两处静默分叉。
export * from './model.js';
export * from './pricing.js';
export * from './format.js';
