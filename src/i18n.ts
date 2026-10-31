import { useAppStore, type AppLanguage } from '@/store/app';

type Dict = Record<string, string>;

const zh: Dict = {
  'app.name': 'PocketDev',
  'app.tagline': '手机端 AI 开发助手',
  'common.next': '下一步',
  'common.back': '上一步',
  'common.skip': '跳过',
  'common.done': '完成',
  'common.enter': '进入应用',
  'common.agree': '我已阅读并同意',
  'common.cancel': '取消',
  'common.save': '保存',
  'onb.lang.title': '选择语言',
  'onb.lang.sub': '选择 PocketDev 的界面语言',
  'onb.env.title': '准备运行环境',
  'onb.env.sub': '下载运行终端所需的连接参数与模型基础参数',
  'onb.env.check': '检测网络与最新版本',
  'onb.env.ready': '运行环境已就绪',
  'onb.provider.title': '配置自定义服务商',
  'onb.provider.sub': '填入任意 OpenAI 兼容 / Anthropic 接口，或稍后在设置中配置',
  'onb.perm.title': '申请必要权限',
  'onb.perm.sub': '仅申请实现功能所需的最小权限，全部可在系统设置中随时关闭',
  'onb.perm.grant': '允许权限',
  'onb.perm.granted': '已授权',
  'onb.agree.title': '协议与隐私',
  'onb.agree.sub': '请阅读并同意以下协议后进入应用',
  'onb.agree.oss': '开源协议 (AGPL-3.0)',
  'onb.agree.notice': '用户须知',
  'onb.agree.privacy': '用户隐私协议',
  'onb.step': '第 {n} / 4 步',
  'tab.chat': '对话',
  'tab.repo': '仓库',
  'tab.settings': '设置',
};

const en: Dict = {
  'app.name': 'PocketDev',
  'app.tagline': 'AI dev assistant in your pocket',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.skip': 'Skip',
  'common.done': 'Done',
  'common.enter': 'Enter app',
  'common.agree': 'I have read and agree',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'onb.lang.title': 'Choose language',
  'onb.lang.sub': 'Pick the interface language for PocketDev',
  'onb.env.title': 'Prepare runtime',
  'onb.env.sub': 'Download the connection params and base model params for the terminal',
  'onb.env.check': 'Check network & latest version',
  'onb.env.ready': 'Runtime is ready',
  'onb.provider.title': 'Configure provider',
  'onb.provider.sub': 'Enter any OpenAI-compatible / Anthropic endpoint, or set it later',
  'onb.perm.title': 'Grant permissions',
  'onb.perm.sub': 'Only the minimum permissions needed; revoke anytime in system settings',
  'onb.perm.grant': 'Grant permission',
  'onb.perm.granted': 'Granted',
  'onb.agree.title': 'Agreements & privacy',
  'onb.agree.sub': 'Read and accept the agreements to continue',
  'onb.agree.oss': 'Open-source license (AGPL-3.0)',
  'onb.agree.notice': 'User notice',
  'onb.agree.privacy': 'Privacy policy',
  'onb.step': 'Step {n} / 4',
  'tab.chat': 'Chat',
  'tab.repo': 'Repos',
  'tab.settings': 'Settings',
};

const DICTS: Record<AppLanguage, Dict> = { zh, en };

export function translate(lang: AppLanguage, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang]?.[key] ?? DICTS.zh[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useI18n() {
  const { prefs } = useAppStore();
  const lang = prefs.language;
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { lang, t };
}
