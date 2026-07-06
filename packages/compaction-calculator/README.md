# 上下文压缩时机 · 成本最优计算器

交互式工具:求解 LLM 上下文压缩(compaction)在什么阈值触发**成本最优**。
核心模型见 [`../docs/上下文压缩时机的成本建模.md`](../docs/上下文压缩时机的成本建模.md)。

价格数据同步自 [models.dev](https://models.dev/)(含每个 Anthropic 模型的实测缓存读/写价)。

## 运行

```bash
npm install
npm run dev        # 启动开发服务器(自动打开浏览器)
```

其他命令:

```bash
npm run build      # 产出静态文件到 dist/
npm run preview    # 本地预览 dist/
npm run sync:pricing   # 从 models.dev 重新同步价格 → 覆盖 src/pricing.js
```

## 模型

```
src/
  pricing.js   # 由 models.dev 同步的价格(自动生成,勿手改)
  model.js     # 纯成本数学:读税 / 压缩开销 / EOQ 最优解
  chart.js     # Canvas 成本-阈值曲线
  format.js    # 数字格式化
  style.css    # 样式
  main.js      # DOM 装配与联动
scripts/
  sync-pricing.mjs   # 拉取 models.dev/api.json,重新生成 pricing.js
```

### 成本模型

```
读税(持有)   = h · (S + T) / 2
压缩开销      = g / (T − S) · K_fix
K_fix        = amp · S · (输出价 + 写价)
h            = 缓存读价(每 token 每轮的持有成本)
最优阈值 T*  = S + √( 2·g·K_fix / h )      —— EOQ 平方根解
```

- `g` 每轮新增 token(需求率)
- `S` 压缩后地板(摘要 + 保留的近期消息,近似固定)
- `amp` 重读放大系数(压缩驱逐内容后 agent 重读,现实中的主导右移因素)
- `T` 压缩触发阈值 · `W` 上下文窗口

> 假设摘要地板 `S` 近似固定、每轮增长 `g` 恒定;未把"信息损失导致的返工"货币化(会进一步把最优点右移)。
