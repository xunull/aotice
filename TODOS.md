# TODOS

## P2 — 增量解析缓存(v0.2+)

**What**: 跨运行的增量索引——缓存每个 JSONL 的 `(mtime, size, 已提取 timeline)`,二次运行只重读变化的文件。

**Why**: 首跑 30 秒可接受,但"每周跑一次看趋势"的用户每次全量重扫体验差。mtime 预过滤(工程评审 4A)只跳过窗口外文件,窗口内的大文件仍会整体重读。

**Pros**: 二次运行提速 5-10x;为 watch 模式 / Context Policy Engine(路线图 C)铺路。
**Cons**: 缓存失效逻辑是经典雷区;首版用户少,收益延后;多一个磁盘状态目录要管理。

**Context**: 处方性 CLI 的设计(见 `~/.gstack/projects/xunull-aotice/quincy-compaction-cost-model-design-20260704-223046.md`)已确定流式解析 + mtime 预过滤;本缓存是其上的叠加层,接口自然(parser 前加一层),从 v0.2 做不产生返工。

**Depends on / blocked by**: v0.1 发布;根据真实使用频率决策。

*(来源:2026-07-05 /plan-eng-review,Codex outside voice 第 9 条,用户批准延期)*
