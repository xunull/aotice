// 成本-阈值曲线的 Canvas 绘制。
import { total, readTax, comp, Tstar, fmtTok, fmtUSD, pct } from '@aotice/compaction-model';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 绘制并返回命中测试所需的几何信息
export function draw(ctx, canvas, s, hover) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const Wpx = canvas.clientWidth;
  const Hpx = canvas.clientHeight;
  canvas.width = Math.round(Wpx * dpr);
  canvas.height = Math.round(Hpx * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, Wpx, Hpx);

  const padL = 52, padR = 16, padT = 14, padB = 40;
  const pw = Wpx - padL - padR;
  const ph = Hpx - padT - padB;
  if (pw < 10 || ph < 10) return null;

  const S = s.S, W = s.W;
  const Ts = Tstar(s);
  const Teff = Math.min(Ts, W);
  const minVis = total(s, Teff);
  const yTop = 2.6 * minVis, yBot = 0;

  // 框定 U 形:在两支上找 total == yTop 的位置
  const crossLeft = (lo, hi) => {
    for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (total(s, m) > yTop) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const crossRight = (lo, hi) => {
    for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (total(s, m) < yTop) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  let xLeft = crossLeft(S + (S * 1e-4 + 1), Teff);
  let xRight = (Ts < W && total(s, W) > yTop) ? crossRight(Ts, W) : W;
  if (!(xRight > xLeft)) { xRight = W; xLeft = S + 1; }

  const X = (T) => padL + ((T - xLeft) / (xRight - xLeft)) * pw;
  const Y = (v) => { v = Math.min(v, yTop); return padT + (1 - (v - yBot) / (yTop - yBot)) * ph; };

  const hairC = css('--hair-2'), faint = css('--faint');
  ctx.textBaseline = 'middle';

  // 横向网格 + y 轴刻度
  for (let i = 0; i <= 4; i++) {
    const vv = (yTop * i) / 4;
    const yy = Y(vv);
    ctx.strokeStyle = hairC; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, yy + 0.5); ctx.lineTo(padL + pw, yy + 0.5); ctx.stroke();
    ctx.fillStyle = faint; ctx.textAlign = 'right'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(fmtUSD(vv * 100), padL - 9, yy);
  }
  // y 轴标题
  ctx.save(); ctx.translate(13, padT + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.fillStyle = faint; ctx.font = '11px ui-monospace,monospace';
  ctx.fillText('$ / 100 轮', 0, 0); ctx.restore();

  // x 轴刻度
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const nT = 5;
  for (let k = 0; k <= nT; k++) {
    const Tt = xLeft + ((xRight - xLeft) * k) / nT;
    const xx = X(Tt);
    ctx.strokeStyle = hairC; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xx + 0.5, padT); ctx.lineTo(xx + 0.5, padT + ph); ctx.stroke();
    ctx.fillStyle = faint; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(fmtTok(Tt), xx, padT + ph + 7);
    ctx.fillStyle = css('--hair'); ctx.font = '10px ui-monospace,monospace';
    ctx.fillText(pct((Tt / W) * 100), xx, padT + ph + 21);
  }

  const pathOf = (fn) => {
    ctx.beginPath();
    const N = Math.max(60, Math.floor(pw));
    for (let i = 0; i <= N; i++) {
      const T = xLeft + ((xRight - xLeft) * i) / N;
      const x = padL + (pw * i) / N, y = Y(fn(T));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  };

  // 总成本下方填充
  pathOf((T) => total(s, T));
  ctx.lineTo(padL + pw, padT + ph); ctx.lineTo(padL, padT + ph); ctx.closePath();
  ctx.fillStyle = 'rgba(23,34,46,.05)'; ctx.fill();

  // 分量曲线
  ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  pathOf((T) => readTax(s, T)); ctx.strokeStyle = css('--teal'); ctx.stroke();
  pathOf((T) => comp(s, T)); ctx.strokeStyle = css('--clay'); ctx.stroke();
  // 总成本(粗)
  pathOf((T) => total(s, T)); ctx.strokeStyle = css('--total'); ctx.lineWidth = 2.5; ctx.stroke();

  // 最优标注
  const amber = css('--amber');
  const Tm = Teff;
  if (Tm >= xLeft && Tm <= xRight) {
    const xm = X(Tm), ym = Y(minVis);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = amber; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xm, padT); ctx.lineTo(xm, padT + ph); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(xm, ym, 4.5, 0, 7); ctx.fillStyle = amber; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    const lbl = 'T* ' + (Ts >= W ? '＞W' : pct((Ts / W) * 100));
    ctx.font = '600 11px ui-monospace,monospace';
    const tw = ctx.measureText(lbl).width + 12;
    const lx = Math.min(padL + pw - tw, Math.max(padL, xm - tw / 2)), ly = padT + 3;
    ctx.fillStyle = amber; roundRect(ctx, lx, ly, tw, 17, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lbl, lx + tw / 2, ly + 9);
  }

  // 你的阈值标注
  const yourT = Math.max(S + 1, Math.min(W, (s.yourPct / 100) * W));
  if (yourT >= xLeft && yourT <= xRight) {
    const xy = X(yourT), yy2 = Y(total(s, yourT));
    ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(xy, padT); ctx.lineTo(xy, padT + ph); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(xy, yy2, 3.5, 0, 7); ctx.fillStyle = css('--panel'); ctx.fill();
    ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1.5; ctx.stroke();
  }

  // 悬停十字线 + 读数
  if (hover != null && hover >= xLeft && hover <= xRight) {
    const xh = X(hover), tv = total(s, hover), yh = Y(tv);
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(23,34,46,.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xh + 0.5, padT); ctx.lineTo(xh + 0.5, padT + ph); ctx.stroke();
    ctx.beginPath(); ctx.arc(xh, yh, 4, 0, 7); ctx.fillStyle = css('--total'); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    const t1 = fmtTok(hover) + '  ' + pct((hover / W) * 100);
    const t2 = fmtUSD(tv * 100) + ' /100轮';
    ctx.font = '600 11.5px ui-monospace,monospace';
    const w1 = ctx.measureText(t1).width;
    ctx.font = '11px ui-monospace,monospace';
    const w2 = ctx.measureText(t2).width;
    const bw = Math.max(w1, w2) + 16, bh = 36;
    let bx = Math.min(padL + pw - bw, Math.max(padL, xh + 10));
    if (xh + 10 + bw > padL + pw) bx = xh - 10 - bw;
    const by = Math.max(padT + 2, yh - bh - 8);
    ctx.fillStyle = css('--ink'); roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff'; ctx.font = '600 11.5px ui-monospace,monospace';
    ctx.fillText(t1, bx + 8, by + 6);
    ctx.fillStyle = '#cdd6df'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(t2, bx + 8, by + 21);
  }

  return { padL, padT, pw, ph, xLeft, xRight };
}
