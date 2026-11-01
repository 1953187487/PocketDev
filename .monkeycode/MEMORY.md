# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-10-31
- Context: Discovered by Agent while building PocketDev's Android CI (ported from wenjinliuu/ios-ci-workflows)
- Category: Build Methods / Testing Methods / Workflow & Collaboration
- Instructions:
  - PocketDev 的 Android CI 已落地：`.android-ci.yml` 是唯一配置来源，`scripts/ci/` 存放配置解析器与报告生成器，`.github/workflows/` 是薄入口 + `reusable-*.yml` 复用工作流。改构建/测试行为改 `.android-ci.yml`，不直接改 `reusable-*.yml`。
  - Build & Test 报告产物 `android-ci-<run>` 里是 `build/ci/{report/report.md, report/report.json, *.log}`，AI 直接读它修问题。
  - 本地自检用 `npm run ci`（= `tsc --noEmit` + `expo lint` + `jest`）；正式结论以 CI 的 Build & Test 报告为准。
  - 发布只走 CI：打 `v*` 标签触发 Release（expo prebuild → gradle → 签名 → GitHub Release）。Release 签名密钥只放仓库 Secrets（`ANDROID_KEYSTORE_BASE64` / `_PASSWORD` / `ANDROID_KEY_ALIAS` / `_PASSWORD`）。
  - `reusable-*.yml` 里 GitHub Actions 表达式看不到 shell 变量：给 job 用 `env:` 传 `${{ github.* }}` 再在 `run:` 里读环境变量。

[Project Knowledge Summary]
- Date: 2026-11-01
- Context: Discovered by Agent while configuring Release signing Secrets and publishing PocketDev v1.0.5
- Category: Environment Configuration / Workflow & Collaboration / Troubleshooting & Debugging
- Instructions:
  - Actions Secrets（`ANDROID_KEYSTORE_*`）只能由仓库管理员 PAT（含 `repo` + `workflow` scope）写入；`git credential` 的 bot token 有 push/release 权限但无 Secrets 权限（HTTP 403）。配置 Secrets 用 `gh secret set NAME --body "$VAL" --repo <owner/repo>`，需先设 `GH_TOKEN`。
  - 签名 keystore 本地副本在 `dist/pocketdev-release.jks`（`dist/` 已 gitignore，不入库），base64 单行在 `dist/keystore-base64.txt`；密码/alias 只存 Actions Secrets，绝不进仓库或日志。验证签名：`apksigner verify --verbose --print-certs app.apk`，检查 v2/v3 scheme 为 true 且证书 SHA-256 匹配 keystore 指纹。
  - Release 资产名由 `release.artifact_prefix` + 版本组成（如 `pocketdev-1.0.5.apk`），app 内 `buildDownloadUrl` 必须对齐 CI 产出命名（`pocketdev-{version}.apk`，无 `v` 前缀），否则更新下载 404。历史 v1.0.0-1.0.3 亦为此命名。
  - `gh release create` 在 reusable workflow 里必须显式传 `GH_TOKEN: ${{ github.token }}`（顶层 `permissions: contents: write`），否则报 "To use GitHub CLI... set GH_TOKEN"。