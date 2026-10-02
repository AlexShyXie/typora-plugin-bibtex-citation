---
name: fix-fork-actions-release
overview: 启用 fork 仓库的 GitHub Actions，给 release.yml 补充 workflow_dispatch 手动触发入口，然后重推 1.0.0 tag 触发 Release workflow 生成 release。
todos:
  - id: update-release-yml
    content: 修改 .github/workflows/release.yml：新增带 version 输入的 workflow_dispatch，release 步骤改用 inputs.version || github.ref_name
    status: completed
  - id: push-workflow-change
    content: 提交改动并以 git -c http.proxy=http://127.0.0.1:10809 push origin main 推送到远端
    status: completed
    dependencies:
      - update-release-yml
  - id: enable-actions-in-fork
    content: 提示用户在仓库网页 Actions 标签页手动启用工作流（fork 仓库默认禁用），确认启用完成
    status: completed
  - id: repush-tag
    content: 走代理删除远端 tag（push origin :refs/tags/1.0.0）并重推 1.0.0 触发 Release workflow
    status: completed
    dependencies:
      - enable-actions-in-fork
      - push-workflow-change
  - id: verify-release
    content: 用只读 GitHub API 查询 actions/runs 与 releases，确认 workflow 成功且 Release 含 plugin.zip
    status: completed
    dependencies:
      - repush-tag
---

## User Requirements

- 用户执行 `git push origin 1.0.0` 推送 tag 后，仓库的 Release workflow（`.github/workflows/release.yml`）没有任何反应，云端只有 tag，没有生成 Release。

## Diagnosis Summary（已验证事实）

- 触发器 `on.push.tags: ['[0-9]*']` 能正确匹配 tag `1.0.0`，workflow 语法本身无问题
- tag `1.0.0` 指向 commit `45612a9`（即 origin/main HEAD），该 commit 已包含 release.yml，排除“tag 指向的 commit 缺少 workflow 文件”这一常见原因
- GitHub API 确认 origin 仓库 `AlexShyXie/typora-plugin-bibtex-citation` 为 **fork 仓库**（parent 为 `Li-Lazenca-Qiuqi/typora-plugin-bibtex-citation`）
- `/actions/runs` 返回 `total_count: 0`，从未有任何 workflow 运行记录

## Root Cause

- GitHub 对 fork 仓库默认禁用 Actions，tag push 事件被静默丢弃，因此 workflow 从未触发

## Core Fix Scope

- 用户在网页端启用 fork 仓库的 Actions（唯一需要人工网页操作的步骤）
- release.yml 增加 `workflow_dispatch` 手动触发能力，作为以后免删推 tag 的备用入口
- 删除远端旧 tag 并重新推送以触发 Release（已发生且被丢弃的 push 事件不会补触发）
- 通过 GitHub API 验证 workflow 运行成功且 Release 资产 plugin.zip 存在

## 根因与修复链路

1. **根因**：fork 仓库 Actions 默认禁用 → tag push 事件被丢弃 → `total_count: 0`。启用后，历史事件不会补跑，必须重推 tag。
2. **修复顺序**：先改 workflow 文件并推送 main → 用户网页启用 Actions → 删除远端 tag 重推 → API 验证。

## Implementation Approach

- **release.yml 修改（关键陷阱）**：直接加裸 `workflow_dispatch` 会导致手动触发时 `${{ github.ref_name }}` 取到分支名 `main`，执行 `gh release create "main"` 产生错误 Release。因此必须带 `version` 输入参数，release 步骤改用 `${{ inputs.version || github.ref_name }}`，保证 tag 触发与手动触发两条路径都正确。
- **重推 tag**：`git push origin :refs/tags/1.0.0` 删除远端后重新 `git push origin 1.0.0`（本地 tag 仍在，指向同一 commit `45612a9`，该 commit 中的旧版 release.yml 已含 tag 触发器，重推即可触发）。
- **网络约束**：本机访问 GitHub 必须走 V2Ray 代理，git 命令使用一次性参数 `git -c http.proxy=http://127.0.0.1:10809 <命令>`，不永久修改 git config；API 验证使用只读 web 请求，不执行任何写操作 API。

## Implementation Notes

- 不改动 zip 打包步骤与 `gh release create --verify-tag` 主逻辑，控制影响范围，仅扩展触发器与 ref 取值。
- 启用 Actions 是网页 UI 操作（fork 需在 Actions 页面点击"I understand my workflows, go ahead and enable them"），无 token 情况下无法用 API 代办，需明确提示用户操作路径。
- 验证仅使用只读 GET API（actions/runs 与 releases），避免无关写入。

## Modified Files

- `.github/workflows/release.yml`：唯一需要修改的文件

## Key Code Structures

```
on:
  push:
    tags:
      - '[0-9]*'
  workflow_dispatch:
    inputs:
      version:
        description: '要发布的 tag 名，例如 1.0.0'
        required: true
        type: string
```

- release 步骤中 `github.ref_name` 全部替换为 `${{ inputs.version || github.ref_name }}`（title 与 gh release create 两处）。