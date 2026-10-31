# PocketDev 1.0.3 需求文档

## Introduction

PocketDev 1.0.3 是 1.0.2 之后的功能与修复批次，覆盖更新体验、交互流、引导/服务商、更多功能入口、本地工作区、手机自动化（Shizuku/Dhizuku）与社交账号对接（QQ 对话）。目标：修复 1.0.2 遗留问题并新增一批增强能力。

## Glossary

- **流动式输出**：AI 回复以逐字/逐段流式渲染，而非一次性整段出现。
- **计划模式**：对话前先让 AI 输出执行计划，再由用户确认后执行。
- **待发送消息队列**：发送过程中允许继续输入并排队第二条消息，第一条结束后自动发送；提供「立即发送」提前触发与「停止对话」终止。
- **小龙虾**：手机自动化功能代号（AI 借助 Shizuku/Dhizuku 权限代理执行手机操作）。
- **Shizuku / Dhizuku**：Android 上允许普通应用借用 ADB/设备所有者级权限的合法开源框架。
- **功能应用（Applet）**：可在应用内开发、由 AI 调用的轻量功能脚本。
- **QQ 对接**：将 PocketDev 的 AI 能力对接到即时通讯账号，可在聊天中直接对话。

## Requirements

### R1 更新体验

**User Story:** AS 用户, I want 完整的更新流程体验, so that 升级过程清晰可靠。

#### Acceptance Criteria

1. WHEN 检测到新版本且开始下载，系统 SHALL 显示下载进度条并实时更新百分比。
2. WHEN 下载完成进入安装阶段，系统 SHALL 显示安装引导输出（安装包就绪、唤起安装器状态）。
3. WHEN 发布新版本，系统 SHALL 以更新动画过渡到更新提示，并展示版本更新公告（Release Notes）。
4. IF 下载或安装失败，系统 SHALL 提供重试与跳转发布页两种恢复路径。

### R2 修复批次

**User Story:** AS 用户, I want 1.0.2 遗留问题被修复, so that 引导、模型下载与更新可用。

#### Acceptance Criteria

1. WHEN 首次引导进入协议步骤，系统 SHALL 允许每份协议展开/收起全文，而无需滚动受限。
2. WHEN 用户导入本地模型，系统 SHALL 支持通过自带链接地址直接下载，并在失败时提示链接可用性。
3. WHEN 检测新版本，系统 SHALL 正确解析发布 tag 与下载地址，避免旧版本无法识别新版本。

### R3 AI 交互流

**User Story:** AS 用户, I want 更顺滑可控的对话体验, so that 输出直观且可随时打断。

#### Acceptance Criteria

1. WHEN AI 生成回复，系统 SHALL 以流动式输出渲染文本增量。
2. WHEN 用户开启计划模式，系统 SHALL 在对话前先请求 AI 输出执行计划，并经用户确认后再执行。
3. WHILE AI 正在回复，系统 SHALL 允许用户继续输入并排队下一条消息，待当前回复结束后自动发送。
4. WHEN 存在排队中的消息，系统 SHALL 展示「立即发送」操作，点击后提前发送。
5. WHILE AI 正在回复，系统 SHALL 展示「停止对话」操作，点击后终止当前生成。

### R4 引导与服务商

**User Story:** AS 用户, I want 首次配置更省力, so that 不必记住模型列表。

#### Acceptance Criteria

1. WHEN 用户配置自定义服务商（含引导步骤），系统 SHALL 提供「拉取模型」操作，读取远程模型列表并填充可选模型。

### R5 更多功能入口

**User Story:** AS 用户, I want 一个集中入口承载扩展功能, so that 主界面不膨胀。

#### Acceptance Criteria

1. 底部导航 SHALL 在「仓库」与「设置」之间提供「更多」入口。
2. 「更多」页 SHALL 承载：本地目录工作区、功能应用（Applet）开发、自动化任务入口。
3. WHEN 功能应用开发完成，系统 SHALL 允许 AI 在对话中调用这些功能。

### R6 本地目录工作区

**User Story:** AS 用户, I want 以手机本地目录为工作区, so that 无需远端仓库即可工作。

#### Acceptance Criteria

1. 工作区选择 SHALL 支持从系统目录选择器选择本地目录作为工作区。
2. WHEN 本地目录工作区被激活，对话 SHALL 携带该目录路径作为上下文。

### R7 手机自动化（小龙虾）

**User Story:** AS 用户, I want AI 借助 Shizuku/Dhizuku 代理手机操作, so that 可自动执行设备级任务。

#### Acceptance Criteria

1. 系统 SHALL 检测并提示 Shizuku / Dhizuku 权限可用性。
2. WHEN 获得权限，AI SHALL 通过预设指令集执行受控助手动作（打开应用、读取界面信息、向单个联系人发送一条消息）。
3. 每次设备写操作 SHALL 在用户逐条确认后执行。

### R8 功能应用（Applet）开发

**User Story:** AS 用户, I want 在应用内开发可被 AI 调用的功能, so that 可扩展 PocketDev 能力。

#### Acceptance Criteria

1. 系统 SHALL 提供功能应用开发界面（代码编辑 + 运行/保存）。
2. 系统 SHALL 展示已开发功能应用列表，支持启用、停用与删除。
3. 系统 SHALL 允许 AI 在对话中按名称与参数调用已启用的功能应用。
4. WHEN AI 调用功能应用，系统 SHALL 在对话流中展示调用与结果。
5. 功能应用定义 SHALL 持久化保存，重启后仍可用。

### R9 UI 底层重建

**User Story:** AS 用户, I want 一套全新的 UI 底层与全站界面重做, so that 视觉与交互一致且可扩展。

#### Acceptance Criteria

1. 系统 SHALL 提供独立于业务页面的 UI 基础层（设计令牌、主题、基础组件、布局与动效原语）。
2. 系统 SHALL 将全部页面迁移到新 UI 基础层，替换旧界面。
3. WHEN 主题在浅色/深色间切换，全部页面 SHALL 一致适配。
4. 系统 SHALL 提供统一的图标、间距、圆角、字体与动效规范。
5. 系统 SHALL 支持 Android 8（minSdk 26）至最新 Android 版本（targetSdk 36+）范围。
6. UI 引擎采用 React Native 原生渲染栈（Fabric 新架构 + 极光渐变层 + 毛玻璃层），实现统一的跨版本渲染。

## Scope Boundaries（明确不在本期范围）

- 批量群发、刷量、绕过平台风控/验证码/反机器人检测的自动化，不实现。
- 未经授权的账号接管、凭据窃取类功能，不实现。
- 手机自动化仅限用户主动、逐条确认的助手式动作；自动下单/支付类高风险流程不实现。
- QQ 对接（含扫码/手动）本期不做，用户已决定延后。

## Verification Notes（沙箱限制）

- 可用 TypeScript/构建验证：R1–R6、R8–R9（UI 与交互、更新流程、引导、本地工作区、更多功能、功能应用、UI 重建）。
- 需真机 + 外部申请、沙箱仅交付可编译代码与接入指引：R7（Shizuku/Dhizuku 原生模块）。
- UI 重建解释为：在现有 Expo/React Native 技术栈上重写设计系统与全部界面（非更换框架）。
