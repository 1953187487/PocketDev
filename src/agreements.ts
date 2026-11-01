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
    body: `PocketDev 基于 GNU Affero General Public License v3.0（AGPL-3.0）开源。底层 AI 能力层由 chaitin/MonkeyCode（长亭科技）提供，同样遵循 AGPL-3.0。

【参考与移植的开源项目】
· ZG0704666/Aries-AI（Apache-2.0）：整体 UI 与美学、消息气泡、首页布局与主题配色；
· wenjinliuu/ios-ci-workflows（MIT）：AI + GitHub Actions 自动构建/测试/发布流程架构；
· React Native / Expo（MIT）：跨端运行时与原生能力封装。

【你可以做什么】
你可以自由地使用、复制、修改、分发本软件及其源码，并用于商业用途。使用时需要满足：
1. 修改后的版本必须以相同协议（AGPL-3.0）开源；
2. 通过网络提供服务的修改版本，须向使用者提供其完整源代码的获取途径；
3. 保留原始版权、作者署名与本协议声明。

【免责声明】
本软件按「现状」提供，不附带任何明示或暗示的担保。因使用或依赖本软件造成的任何损失，作者不承担相关责任。

【完整协议】
本协议未尽事宜，以 AGPL-3.0 完整文本为准：
https://www.gnu.org/licenses/agpl-3.0.html`,
  },
  {
    key: 'notice',
    title: '用户须知',
    body: `【一、软件定位】
PocketDev 是面向开发者与 AI 爱好者的移动端 AI 开发助手，提供对话开发、本地工作区、文件管理、仓库接入与项目脚手架等能力。AI 生成的代码、文本、方案等内容仅供学习与研究参考，使用前请自行核实其正确性、适用性与合规性。

【二、服务商与本地模型】
使用自定义服务商或本地模型时，服务可用性、稳定性、数据处理方式与合规性由你所选的服务提供方负责。App 不对第三方服务商的服务质量与数据安全承担担保责任。

【三、代码托管平台】
接入 GitHub、GitLab、Gitee、Gitea 等平台时，访问令牌仅保存在你的设备本地，用于代表你访问对应仓库。仓库的访问权限、可见性与内容合规性由平台规则与仓库所有者决定。

【四、本地文件与项目脚手架】
App 可读写你授权的本地目录，用于保存 AI 产出、计划文件与生成的 Android 项目脚手架。生成的脚手架为通用起点模板，实际项目需要在真实构建环境中完成依赖安装、签名与真机验证。

【五、设备能力差异】
翻译、语音、文件访问与本地模型推理依赖设备能力与网络环境，各机型实际效果存在差异。

【六、使用边界】
请勿将 PocketDev 用于违反法律法规、侵犯他人合法权益或破坏网络与设备环境的行为。

【七、版本更新】
本须知随版本更新，以应用内展示的最新版本为准。`,
  },
  {
    key: 'privacy',
    title: '用户隐私协议',
    body: `PocketDev 高度重视你的隐私安全。本协议说明我们如何处理你的数据。

【一、无云端收集】
我们不部署任何数据采集服务器。你的对话内容、服务商配置、仓库令牌、文件与工作区信息全部保存在你的设备本地（AsyncStorage 与应用私有目录），不会上传到我们的任何服务器。

【二、最小权限】
App 仅申请实现功能所需的最小权限（网络访问、文件导入导出、语音与通知等）。你可在系统设置中查看并随时关闭这些权限。

【三、直连你的服务商】
对话请求由你的设备直接发送到你配置的服务商或本地模型，我们不经手、不记录、不留存你的任何请求内容与响应内容。

【四、令牌与凭据本地保存】
仓库访问令牌、API Key 等凭据仅存于设备本地，用于直连代码托管平台与模型服务商。我们无法读取，也不会同步到云端。

【五、本地文件访问范围】
App 仅在获得你授权的目录范围内读写文件。删除、清空应用数据或卸载应用会一并移除这些本地文件，请提前备份重要内容。

【六、本地模型优先】
你可下载或导入本地模型，在完全离线的环境下完成对话、翻译与语音处理，相关推理在设备本地完成。

【七、统计与广告】
我们不使用 Cookie、不采集设备指纹、不推送广告、不做用户画像。

【八、反馈渠道】
如对隐私保护有疑问或建议，欢迎在仓库提交 Issue：
https://github.com/1953187487/PocketDev/issues`,
  },
];
