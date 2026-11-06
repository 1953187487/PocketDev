export interface AgreementSection {
  key: 'summary' | 'license' | 'use' | 'account' | 'cloud' | 'privacy' | 'security' | 'contact';
  title: string;
  body: string;
}

/** 1.0.8+：三份协议合并为《用户须知协议》，统一在引导与设置中展示。 */
export const NOTICE_TITLE = '用户须知协议';
export const NOTICE_VERSION = '2026-11-06';

export const NOTICE_SECTIONS: AgreementSection[] = [
  {
    key: 'summary',
    title: '一、总则与版本说明',
    body: `欢迎使用 PocketDev（以下简称“本应用”）。本《用户须知协议》合并并替代原《开源协议说明》《用户须知》《用户隐私协议》，自你在应用内勾选同意之时生效。\n\n本应用是面向开发者的移动端 AI 开发助手（Expo/React Native），提供 AI 对话、工作区/仓库协作、项目辅助、账号与云同步等能力。AI 生成内容仅供参考，请自行核验其正确性、安全性与合规性。`,
  },
  {
    key: 'license',
    title: '二、开源许可与第三方声明',
    body: `PocketDev 源码以 GNU Affero General Public License v3.0（AGPL-3.0）发布。你可以使用、复制、修改、分发本软件（含商业用途），但须遵守：修改版本以 AGPL-3.0 开源；通过网络提供修改版本服务时须向使用者提供完整源代码；保留版权与协议声明。\n\n第三方组件/参考：chaitin/MonkeyCode（AGPL-3.0，底层能力参考）、ZG0704666/Aries-AI（Apache-2.0，UI/美学参考）、wenjinliuu/ios-ci-workflows（MIT，CI 架构参考）、React Native/Expo（MIT）。完整 AGPL-3.0 文本：https://www.gnu.org/licenses/agpl-3.0.html`,
  },
  {
    key: 'use',
    title: '三、使用规范与服务商',
    body: `请勿将本应用用于违法违规、侵害他人权益、破坏网络/设备安全或生成/传播有害内容的行为。\n\n你配置的 AI 服务商、本地模型、代码托管平台（GitHub/GitLab/Gitee/Gitea）由对应第三方提供，其可用性、计费、数据处理与合规由第三方规则负责；访问令牌/API Key 仅在你授权范围内用于直连请求。`,
  },
  {
    key: 'account',
    title: '四、云端账号与登录',
    body: `自 1.0.8 起，账号体系采用云端登录：注册需使用邮箱接收验证码并在验证后设置密码；之后使用邮箱+密码登录；同一邮箱不可重复注册；同一账号不支持重复并发登录（以服务端会话为准，后续登录策略以服务端返回为准）。\n\n你应妥善保管密码与验证码。因你保管不当、设备被他人控制或第三方攻击导致的账号风险，由你自行承担；我们将采取合理的技术措施保护账号数据。`,
  },
  {
    key: 'cloud',
    title: '五、云同步与数据存储',
    body: `启用云端功能后，你的账号资料、登录会话标识、云存档/同步内容、公告与渠道消息等必要数据将存储在 PocketDev 云端后端（由你所连接的后端服务承载）并在设备与服务端间传输，用于实现登录、同步与消息通知。\n\n本地仍可能缓存必要的会话信息以维持登录状态；你可通过退出登录、删除存档或清除应用数据来移除本地缓存。云端数据的保留与删除以服务端能力与你的操作为准。`,
  },
  {
    key: 'privacy',
    title: '六、个人信息与隐私',
    body: `我们遵循最小必要原则：账号功能通常涉及邮箱、昵称、密码哈希/凭证校验信息、设备生成的会话标识、你主动提交的云存档与消息内容。验证码邮件通过邮件服务发送，仅用于身份验证。\n\n我们不做广告画像、不出售个人信息。除实现功能所必需的服务端处理与邮件投递外，不会将你的个人信息提供给无关第三方。你可通过应用内功能或联系渠道行使查询/更正/删除等合理请求（受技术与法律约束）。`,
  },
  {
    key: 'security',
    title: '七、安全与免责声明',
    body: `我们采用传输加密（HTTPS，视部署而定）、服务端鉴权、密码哈希存储等合理措施，但互联网传输与存储不存在绝对安全。本应用按“现状”提供，对因网络故障、第三方服务、不可抗力、用户配置错误或设备环境导致的损失不承担超出法律强制范围的责任。`,
  },
  {
    key: 'contact',
    title: '八、联系与争议',
    body: `反馈与隐私请求：请在仓库提交 Issue：https://github.com/1953187487/PocketDev/issues 。本协议未尽事宜以应用内最新版本与适用法律为准。继续使用即表示你理解并同意本协议的更新。`,
  },
];

export const NOTICE_FULL_TEXT = NOTICE_SECTIONS.map((s) => `【${s.title}】\n${s.body}`).join('\n\n');

/** 兼容旧引用（1.0.7 及以前） */
export const AGREEMENTS = [
  { key: 'notice' as const, title: NOTICE_TITLE, body: NOTICE_FULL_TEXT },
];
export const REFERENCES = [
  { name: 'chaitin/MonkeyCode', url: 'https://github.com/chaitin/MonkeyCode', license: 'AGPL-3.0', note: '底层能力参考' },
  { name: 'ZG0704666/Aries-AI', url: 'https://github.com/ZG0704666/Aries-AI', license: 'Apache-2.0', note: 'UI/美学参考' },
  { name: 'wenjinliuu/ios-ci-workflows', url: 'https://github.com/wenjinliuu/ios-ci-workflows', license: 'MIT', note: 'CI 架构参考' },
  { name: 'React Native / Expo', url: 'https://expo.dev', license: 'MIT', note: '跨端框架' },
];
