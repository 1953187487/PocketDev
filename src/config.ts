export interface SocialLink {
  platform: string;
  label: string;
  url: string;
}

export interface Developer {
  name: string;
  role: string;
  tag?: string;
  link?: string;
  socials?: SocialLink[];
}

export interface Contributor {
  name: string;
  role: string;
  link?: string;
}

export const MAIN_DEVELOPER: Developer = {
  name: '万古沧海',
  role: '主开发者 · 总负责 · 仓库维护',
  tag: '维护者',
  link: 'https://b23.tv/H10fiEa',
  socials: [
    { platform: '哔哩哔哩', label: '万古沧海的个人空间', url: 'https://b23.tv/H10fiEa' },
  ],
};

export const DEVELOPERS: Developer[] = [
  MAIN_DEVELOPER,
];

export const CONTRIBUTORS: Contributor[] = [
  { name: '长亭科技 (Chaitin)', role: '底层平台 MonkeyCode 原作者', link: 'https://github.com/chaitin/MonkeyCode' },
  { name: 'MonkeyCode 开源社区', role: 'AI 能力 / API / 协议实现', link: 'https://github.com/chaitin/MonkeyCode' },
  { name: 'Expo', role: 'React Native 原生工程框架', link: 'https://expo.dev' },
  { name: 'React Native', role: '跨平台移动运行时', link: 'https://reactnative.dev' },
  { name: 'ios-ci-workflows (wenjinliuu)', role: 'CI 架构借鉴（AI+Actions 报告闭环，MIT）', link: 'https://github.com/wenjinliuu/ios-ci-workflows' },
  { name: 'PocketDev Contributors', role: '本项目贡献者', link: 'https://github.com/1953187487/PocketDev' },
];

export const APP_REPO = '1953187487/PocketDev';
export const APP_REPO_URL = 'https://github.com/1953187487/PocketDev';
export const APP_VERSION = '1.0.6';
export const BASE_LAYER_REPO = 'chaitin/MonkeyCode';

export const DONATION = {
  title: '支持 PocketDev',
  desc: '如果 PocketDev 对你有帮助，欢迎扫码支持作者，你的每一份心意都是持续开发的动力。',
  alipay: {
    name: '支付宝',
    tip: '扫码点单店主(**生)',
    qr: require('../assets/donate/alipay.jpg') as number,
  },
  wechat: {
    name: '微信',
    tip: '星空(**生)',
    qr: require('../assets/donate/wechat.png') as number,
  },
};
