# aotice

上下文压缩(context compaction)成本工具集。核心问题:Claude Code / Codex 这类
带自动压缩的 agent,**在什么阈值触发压缩最省钱?**

主导成本不是"压缩那一下",而是**每一轮都按缓存读价重读整段上下文**的持有税——它
随上下文二次增长,把成本最优点推得比直觉更早。平衡它与每次压缩的固定开销,得到一个
EOQ(经济订货量)闭式解:

```
T* = S + √( 2·g·K_fix / h )
```

## 两种用法

**🌐 在线计算器** — 拖参数,实时看最优阈值和成本曲线,零安装:

👉 **https://xunull.github.io/aotice/**

**⌨️ 处方性 CLI** — 读你自己的 `~/.claude` 会话记录,实测你的参数,给出**你的**
最优阈值和"本可省多少"(100% 本地,只读 usage 字段,从不读消息正文):

```bash
npx aotice
```

计算器给通用直觉(你喂假设值);CLI 给你的答案(它读真实数据)。

## 仓库结构(npm workspaces monorepo)

```
packages/
├── compaction-model/       共享库:EOQ 数学 + Anthropic 定价(计算器与 CLI 共用)
├── cli/                     aotice CLI(已发布 npm,Apache-2.0)
└── compaction-calculator/   Vite 交互计算器(部署到 GitHub Pages)
docs/                        技术文档:成本建模、公式详解、EOQ 详解、相关研究
```

## 文档

- [上下文压缩时机的成本建模](docs/上下文压缩时机的成本建模.md) — 总览
- [重读放大与公式详解](docs/重读放大与公式详解.md) — 每个变量什么意思
- [EOQ 经济订货量详解](docs/EOQ经济订货量详解.md) — 闭式解怎么来的
- [相关研究综述](docs/相关研究综述.md) — 别人做过的类似工作

## 开发

```bash
npm ci                       # 装全 workspace
npm test -w aotice           # 跑 CLI 测试(含共享模型)
npm run build:calculator     # 构建计算器
npm run cli -- --help        # 本地跑 CLI
```

## License

[Apache-2.0](LICENSE)
