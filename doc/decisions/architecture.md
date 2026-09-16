# 现有架构与维护约束

本记录于 2026-09-14 从既有项目说明与版本记录整理，不表示本轮新增架构决策。

## 模块职责

保持 `main.js` → `src/plugin.js` → `src/plugin/*.js` 的入口与委托结构。文档动作、启动注册、文献库缓存调度及文档状态分别维护，避免业务逻辑回填入口。子模块通过 plugin 公共方法回调，保留测试替换能力。

## 引用源与改写

受控 citation 中的原始 `@key` 语法是持久真源，扫描、校验、统计和 bibliography 复用统一来源模型。不得从最终渲染文本逆向恢复 key。新语法先收紧扫描词法与上下文，不放宽严格方括号解析来复用实现。

## 路径与加载

逐条 `path + sourceType` 严格解析，不回退到进程目录或其他来源类别。文档级 `bib` 与 `csl` 先规范化，再进入统一配置链。CSL 模块保持懒加载，通过 `createRequire(import.meta.url)` 解析插件依赖，以避免宿主加载问题。

## 批量渲染

文档级 CSL 渲染准备全部 cluster 后共享 processor，重建状态后按顺序回填结果，不退回逐块重建全文上下文。相关历史依据为 `17e242d` 及 `CHANGELOG.md` 的 0.4.4 记录。

## 测试布局

`tests/unit/`、`tests/support/`、`tests/fixtures/` 纳入版本控制；`tests/output/` 仅保存本地产物。测试边界与命令见 [测试说明](../../tests/README.md)。
