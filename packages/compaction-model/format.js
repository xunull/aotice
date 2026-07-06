// 数字格式化助手

export function fmtTok(n) {
  if (n >= 999500) {
    const m = n / 1e6;
    return (m >= 10 ? m.toFixed(0) : m.toFixed(m % 1 < 0.05 ? 0 : 1)) + 'M';
  }
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return Math.round(n).toString();
}

// x 已是 $/100 轮
export function fmtUSD(x) {
  if (x >= 100) return '$' + x.toFixed(0);
  if (x >= 10) return '$' + x.toFixed(1);
  return '$' + x.toFixed(2);
}

export function pct(x) {
  return (x < 10 ? x.toFixed(1) : x.toFixed(0)) + '%';
}
