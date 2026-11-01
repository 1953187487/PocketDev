export interface Agreement {
  key: 'oss' | 'notice' | 'privacy';
  title: string;
  body: string;
}

export interface Reference {
  name: string;
  url: string;
  license: string;
  note: string;
}

/** 本项目引用的第三方开源项目与参考实现。 */
export const REFERENCES: Reference[] = [
  {
    name: 'chaitin/MonkeyCode',
    url: 'https://github.com/chaitin/MonkeyCode',
    license: 'AGPL-3.0',
    note: '底层 AI 能力层（智能体、对话编排、代码执行）',
  },
  {
    name: 'ZG0704666/Aries-AI',
    url: 'https://github.com/ZG0704666/Aries-AI',
    license: 'Apache-2.0',
    note: '整体 UI 与美学、消息气泡、首页布局与主题配色参考',
  },
  {
    name: 'wenjinliuu/ios-ci-workflows',
    url: 'https://github.com/wenjinliuu/ios-ci-workflows',
    license: 'MIT',
    note: 'AI + GitHub Actions 自动构建/测试/发布流程架构',
  },
  {
    name: 'React Native / Expo',
    url: 'https://expo.dev',
    license: 'MIT',
    note: '跨端运行时与原生能力封装',
  },
];

export const AGREEMENTS: Agreement[] = [
  {
    key: 'oss',
    title: '开源协议（AGPL-3.0）',
    body: `PocketDev 基于 AGPL-3.0 协议开源，底层 AI 能力层由 chaitin/MonkeyCode（长亭科技）提供，同样遵循 AGPL-3.0。

本项目参考并移植了以下开源项目：
· ZG0704666/Aries-AI（Apache-2.0）：整体 UI 与美学、消息气泡、首页布局与主题配色；
· wenjinliuu/ios-ci-workflows（MIT）：AI + GitHub Actions 自动构建/测试/发布流程架构；
· React Native / Expo（MIT）：跨端运行时与原生能力封装。

一、你可以自由地使用、复制、修改、分发本软件及其源码，并用于商业用途，前提是：
1. 修改后的版本必须以相同协议（AGPL-3.0）开源；
2. 通过网络提供服务的修改版本，须向用户提供其完整源代码的获取途径；
3. 保留原始版权与作者署名。

二、本软件按“现状”提供，不附带任何明示或暗示的担保。因使用本软件造成的任何损失，作者不承担相关责任。

三、本协议未尽事宜，以 AGPL-3.0 完整文本为准。`,
  },
  {
    key: 'notice',
    title: '用户须知',
    body: `一、PocketDev 是供开发者与 AI 爱好者使用的辅助工具，所生成的代码、文本等内容仅供学习与研究参考，请在使用前自行核实其正确性与合规性。

二、使用自定义服务商或本地模型时，你自行负责其可用性、稳定性与合规性。App 不对第三方服务商的服务质量、数据安全承担担保责任。

三、翻译、语音与本地模型功能依赖的设备能力与网络环境各不相同，实际效果可能有所差异。

四、请勿将 PocketDev 用于任何违反法律法规、侵犯他人权益或破坏网络环境的行为。

五、本须知如有更新，将随新版本发布，请以最新版本为准。`,
  },
  {
    key: 'privacy',
    title: '用户隐私协议',
    body: `PocketDev 高度重视你的隐私安全。我们承诺：

一、无云端收集：我们不部署任何数据采集服务器，你的对话内容、仓库令牌、服务商配置均仅保存在你的设备本地（AsyncStorage / 应用私有目录），不会上传到我们的任何服务器。

二、最小权限：App 仅申请实现功能所必需的最小权限（如网络、文件导入、语音等），你可在系统设置中随时查看并关闭。

三、第三方直连：对话请求由你的设备直连你配置的服务商或本地模型，我们不经手、不记录你的任何请求内容。

四、令牌本地保存：仓库访问令牌仅存于设备本地，用于直连你的代码托管平台，我们无法读取，也不会同步到云端。

五、本地模型优先：为最大程度保护隐私，你可下载或导入本地模型，在完全离线的环境下使用翻译、语音与对话。

六、我们不使用 Cookie、不采集设备指纹、不推送广告。

七、如果你对我们的隐私保护有疑问或建议，欢迎在仓库提出 Issue 反馈。`,
  },
];