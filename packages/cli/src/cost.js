// 单轮真实成本(ledger 原子)。全部从 usage 字段直接计,不涉及任何消息正文。
//
// turn 字段(均为 token 数):
//   cacheRead  — cache_read_input_tokens(命中缓存的前缀,按读价)
//   w5 / w1h   — cache_creation 的 5m / 1h 细分(按各自写价)
//   input      — input_tokens(未缓存)
//   output     — output_tokens
//   promptTotal= input + cacheRead + (w5 + w1h)  = 该轮模型看到的上下文总量 C(t)
//
// price 记录字段($/M):input, outputCost, cacheRead, cacheWrite(=5m 写价)
// 1h 写价 = 2 × input(models.dev 不单列,按 Anthropic 定价推导)。

export function turnCost(turn, price) {
  const P = price.input / 1e6;
  const Pout = price.outputCost / 1e6;
  const Pread = price.cacheRead / 1e6;
  const Pw5 = price.cacheWrite / 1e6;
  const Pw1h = (2 * price.input) / 1e6;

  const readCost = (turn.cacheRead || 0) * Pread;
  const writeCost = (turn.w5 || 0) * Pw5 + (turn.w1h || 0) * Pw1h;
  const inputCost = (turn.input || 0) * P;
  const outputCost = (turn.output || 0) * Pout;

  // ctxCost = 处理上下文的成本(读+写+未缓存输入),不含输出。
  // 回放按上下文缩小比例缩放 ctxCost;outputCost 两侧对称,不参与节省。
  const ctxCost = readCost + writeCost + inputCost;
  return { readCost, writeCost, inputCost, outputCost, ctxCost, total: ctxCost + outputCost };
}

// 便捷 per-token 读价(回放插入成本 0.1P·T_c 用)
export function readRate(price) {
  return price.cacheRead / 1e6;
}
export function writeRate5m(price) {
  return price.cacheWrite / 1e6;
}
export function outputRate(price) {
  return price.outputCost / 1e6;
}
