import './style.css';
import { ANTHROPIC_MODELS, PRICING_SYNCED_AT, fmtTok, fmtUSD, pct, Tstar, dCstar, total } from '@aotice/compaction-model';
import { draw } from './chart.js';

const $ = (id) => document.getElementById(id);

// 默认选中一个当代模型(优先最新 Opus)
const defaultModel =
  ANTHROPIC_MODELS.find((m) => m.id === 'claude-opus-4-8') ||
  ANTHROPIC_MODELS.find((m) => m.id === 'claude-opus-4-6') ||
  ANTHROPIC_MODELS[0];

const state = {
  P: defaultModel.input,
  Pout: defaultModel.outputCost,
  cacheRead: defaultModel.cacheRead,
  cacheWrite: defaultModel.cacheWrite,
  g: 5000,
  S: 20000,
  W: defaultModel.context || 1000000,
  amp: 1,
  ttl: '5m',
  yourPct: 90,
};

let plot = null;
let hover = null;
let dragging = false;

const canvas = $('chart');
const ctx = canvas.getContext('2d');

const clampNum = (v, min, max) => {
  v = parseFloat(v);
  if (Number.isNaN(v)) v = min;
  return Math.max(min, Math.min(max, v));
};

// ---------- 渲染 ----------
function render() {
  const W = state.W, S = state.S;

  // 无效参数守卫:地板 S ≥ 窗口 W 时不存在有效压缩区间。
  // 否则 total(T) 在 T≤S 处除以 ≤0,产生负成本并把图表算崩。
  if (W <= S) {
    $('ro-tstar').textContent = '—';
    $('ro-tstar-sub').textContent = '窗口 W 需大于地板 S';
    $('ro-optcost').textContent = '—';
    $('ro-yourcost').textContent = '—';
    $('ro-save').className = 'save neg';
    $('ro-save').textContent = '参数无效';
    $('punch').innerHTML =
      '上下文窗口 <b class="mono">W</b> 必须大于压缩地板 <b class="mono">S</b>——当前 S≥W,不存在有效压缩区间(压不回比窗口还小的地板)。调大窗口或调小地板。';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    plot = null;
    return;
  }

  const Ts = Tstar(state);
  const beyond = Ts >= W;
  const Teff = Math.min(Ts, W);
  const optCost = total(state, Teff) * 100;
  const yourT = Math.max(S + 1, Math.min(W, (state.yourPct / 100) * W));
  const yourCost = total(state, yourT) * 100;

  $('ro-tstar').textContent = beyond ? '＞窗口' : fmtTok(Ts);
  $('ro-tstar-sub').textContent = beyond
    ? `最优 ${fmtTok(Ts)} 超过窗口,取 W=${fmtTok(W)}`
    : `= ${pct((Ts / W) * 100)} 窗口 · ΔC* ${fmtTok(dCstar(state))}`;
  $('ro-optcost').textContent = fmtUSD(optCost);
  $('ro-yourcost').textContent = fmtUSD(yourCost);
  $('ro-your-k').textContent = `你的阈值 (${state.yourPct}%)`;

  const saveEl = $('ro-save');
  const savePct = ((yourCost - optCost) / yourCost) * 100;
  if (savePct >= 0.5) {
    saveEl.className = 'save';
    saveEl.textContent = `最优可省 ${savePct.toFixed(0)}%`;
  } else if (savePct <= -0.5) {
    saveEl.className = 'save neg';
    saveEl.textContent = `你已更省 ${Math.abs(savePct).toFixed(0)}%`;
  } else {
    saveEl.className = 'save';
    saveEl.textContent = '≈ 已在最优附近';
  }

  const pEl = $('punch');
  if (beyond) {
    pEl.innerHTML =
      `在这套参数下,即使压到窗口上限 <b class="mono">${fmtTok(W)}</b> 仍未达最优——说明 g、S 或重读放大足够大,几乎不必压缩。曲线在窗口内始终下行。`;
  } else {
    const mult = yourCost / optCost;
    pEl.innerHTML =
      `在这套参数下,成本最优是在窗口 <b class="mono">${pct((Ts / W) * 100)}</b> 处触发压缩;拖到 <b class="mono">${state.yourPct}%</b>,阈值相关成本约是最优点的 <b class="mono">${mult.toFixed(1)} 倍</b>。真正推高最优点的是"重读放大"——把它调大,看曲线谷底如何右移。`;
  }

  plot = draw(ctx, canvas, state, hover);
}

// ---------- 画布指针 ----------
function pointerT(ev) {
  if (!plot) return null;
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const frac = (x - plot.padL) / plot.pw;
  if (frac < 0 || frac > 1) return null;
  return plot.xLeft + (plot.xRight - plot.xLeft) * frac;
}
canvas.addEventListener('pointermove', (ev) => {
  const T = pointerT(ev);
  hover = T;
  if (dragging && T != null) setYour(Math.round((T / state.W) * 100));
  render();
});
canvas.addEventListener('pointerleave', () => { hover = null; render(); });
canvas.addEventListener('pointerdown', (ev) => {
  dragging = true;
  canvas.setPointerCapture(ev.pointerId);
  const T = pointerT(ev);
  if (T != null) setYour(Math.round((T / state.W) * 100));
});
canvas.addEventListener('pointerup', (ev) => {
  dragging = false;
  try { canvas.releasePointerCapture(ev.pointerId); } catch (_) {}
});

// ---------- 输入联动 ----------
function setYour(p) {
  p = clampNum(p, 5, 99);
  state.yourPct = p;
  $('your').value = p;
  $('yourNum').value = p;
  render();
}

function pairSlider(sliderId, numId, key, min, max, step) {
  const s = $(sliderId), n = $(numId);
  const apply = (v) => {
    v = clampNum(v, min, max);
    state[key] = v;
    s.value = v;
    n.value = v;
    render();
  };
  s.addEventListener('input', () => apply(s.value));
  n.addEventListener('input', () => apply(n.value));
}
pairSlider('g', 'gNum', 'g', 500, 30000, 100);
pairSlider('S', 'Snum', 'S', 2000, 120000, 1000);
pairSlider('amp', 'ampNum', 'amp', 1, 20, 0.5);
$('your').addEventListener('input', () => setYour($('your').value));
$('yourNum').addEventListener('input', () => setYour($('yourNum').value));

// 价格输入(手动覆盖会取消模型选择的"锁定")
function bindPrice(id, key, min, max) {
  $(id).addEventListener('input', () => {
    state[key] = clampNum($(id).value, min, max);
    $('model').value = ''; // 视为自定义
    render();
  });
}
bindPrice('P', 'P', 0.1, 1000);
bindPrice('Pout', 'Pout', 0.1, 5000);
bindPrice('cr', 'cacheRead', 0.01, 500);
bindPrice('cw', 'cacheWrite', 0.01, 1000);

// 窗口
$('Wnum').addEventListener('input', () => {
  state.W = clampNum($('Wnum').value, 50000, 4000000);
  setWpresetPressed();
  render();
});
function setWpresetPressed() {
  document.querySelectorAll('#wpreset button').forEach((b) => {
    b.setAttribute('aria-pressed', parseFloat(b.dataset.w) === state.W ? 'true' : 'false');
  });
}
document.querySelectorAll('#wpreset button').forEach((b) => {
  b.addEventListener('click', () => {
    state.W = parseFloat(b.dataset.w);
    $('Wnum').value = state.W;
    setWpresetPressed();
    render();
  });
});

// TTL
document.querySelectorAll('#ttl button').forEach((b) => {
  b.addEventListener('click', () => {
    state.ttl = b.dataset.t;
    document.querySelectorAll('#ttl button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    render();
  });
});

// ---------- 模型下拉 ----------
function populateModels() {
  const sel = $('model');
  sel.innerHTML = '';
  for (const m of ANTHROPIC_MODELS) {
    const opt = document.createElement('option');
    opt.value = m.id;
    const win = m.context ? ` · ${fmtTok(m.context)} 窗口` : '';
    opt.textContent = `${m.name} — $${m.input}/$${m.outputCost}${win}`;
    sel.appendChild(opt);
  }
  const custom = document.createElement('option');
  custom.value = '';
  custom.textContent = '自定义';
  custom.hidden = true;
  sel.appendChild(custom);
  sel.value = defaultModel.id;

  sel.addEventListener('change', () => {
    const m = ANTHROPIC_MODELS.find((x) => x.id === sel.value);
    if (!m) return;
    state.P = m.input;
    state.Pout = m.outputCost;
    state.cacheRead = m.cacheRead;
    state.cacheWrite = m.cacheWrite;
    if (m.context) state.W = m.context;
    $('P').value = m.input;
    $('Pout').value = m.outputCost;
    $('cr').value = m.cacheRead;
    $('cw').value = m.cacheWrite;
    $('Wnum').value = state.W;
    setWpresetPressed();
    render();
  });
}

// ---------- 初始化 ----------
function initInputs() {
  $('P').value = state.P;
  $('Pout').value = state.Pout;
  $('cr').value = state.cacheRead;
  $('cw').value = state.cacheWrite;
  $('Wnum').value = state.W;
  $('syncnote').textContent = `· models.dev ${PRICING_SYNCED_AT}`;
  setWpresetPressed();
}

const ro = new ResizeObserver(() => render());
ro.observe(canvas.parentElement);
window.addEventListener('resize', render);

populateModels();
initInputs();
render();
