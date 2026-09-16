# 产品说明

## 定位

`typora-plugin-bibtex-citation` 是 Typora Community Plugin 插件，面向使用本地 BibTeX 文献库和 CSL 样式撰写 Markdown 的用户。插件读取文献库，不修改 `.bib` 文件。

## 现有能力与关键流程

1. 在设置页逐条配置 BibTeX 文件与 `sourceType`；文档 YAML frontmatter 可声明 `bib` 与 `csl`，路径按当前 Markdown 目录解析。文档级 BibTeX 优先参与合并，重复 key 采用更靠前的条目；文档级 CSL 优先于设置页配置。
2. 输入方括号式 `[@query` 或独立正文位置的 `@query`，按 key、标题、作者、年份和期刊检索，选择候选后插入 `@citationKey`。
3. 侧边栏提供文献库状态、当前文档唯一 key 数和总引用次数，以及 CSL 操作入口；设置页支持 English 与简体中文。
4. 渲染或更新 citation 前扫描并校验全文，使用 CSL HTML 输出；受控 citation 注释保存原始语法，支持再次渲染与恢复。
5. 插入或更新 bibliography 时复用统一引用源，并更新文末受控块；删除操作仅作用于插件生成的 bibliography 块。

## 支持范围与限制

- 依赖 Typora Community Plugin Framework、Node.js >=22、本地 `.bib` 与用于渲染的 `.csl` 文件。
- 平台证据仅限既有 Windows 真机验证；Linux 与 macOS 尚未系统验证。
- 支持严格 `[@key]`、`[@a; @b]` 和已知 key 的独立叙述式引用；不支持 locator、prefix/suffix、复杂 cluster、`-@key` 与 note-style citation。
- 不从最终渲染文本逆向推断 key；未知或非严格方括号引用会阻止相关 CSL 操作。
- 真机体验不能由 Node 单元测试代替。验证状态见 [验证记录](note/verification.md)，完整语法与边界见 [行为规则](note/behavior-rules.md)。

## 状态依据

截至 2026-09-14 的本地检查：Git 最新提交为 `4db9078`，日志记录到 `0.4.5`，但 `package.json`、`manifest.json` 为 `0.4.2`。这表明本地记录与元数据不一致，不能据此确认远端最新发布版本。处置见 [待办](TODO.md)。
