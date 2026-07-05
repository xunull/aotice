// 上下文压缩的成本模型(EOQ / 经济订货量解)。
//
// state 字段(价格均为 $/M token):
//   P         输入基础价
//   Pout      输出价
//   cacheRead 缓存读价
//   cacheWrite缓存写价(5min TTL)
//   g         每轮新增 token(需求率)
//   S         压缩后地板大小(摘要 + 保留的近期消息)
//   W         上下文窗口上限
//   amp       重读放大系数(压缩后重读被驱逐内容)
//   ttl       '5m' | '1h'
//
// 记号:h = 持有单价($/token/轮)= 缓存读价;写价按 TTL 取值,1h ≈ 2×输入价。

const perTok = (usdPerM) => usdPerM / 1e6;

export function holding(s) {
  return perTok(s.cacheRead); // $/token/轮
}

export function writePerTok(s) {
  return s.ttl === '1h' ? 2 * perTok(s.P) : perTok(s.cacheWrite);
}

// 每次压缩的固定开销 K_fix = amp · S · (输出价 + 写价)
export function Kfix(s) {
  return s.amp * s.S * (perTok(s.Pout) + writePerTok(s));
}

// 最优增长量 ΔC* = √(2·g·K_fix / h)
export function dCstar(s) {
  return Math.sqrt((2 * s.g * Kfix(s)) / holding(s));
}

// 最优阈值 T* = S + ΔC*
export function Tstar(s) {
  return s.S + dCstar(s);
}

// 读税(持有成本),$/轮
export function readTax(s, T) {
  return holding(s) * (s.S + T) / 2;
}

// 压缩开销,$/轮
export function comp(s, T) {
  return (s.g / (T - s.S)) * Kfix(s);
}

// 阈值相关总成本,$/轮
export function total(s, T) {
  return readTax(s, T) + comp(s, T);
}
