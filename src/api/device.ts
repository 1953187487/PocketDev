import { NativeModules, Platform } from 'react-native';

export type BridgeKind = 'shizuku' | 'dhizuku' | 'none';

export interface DeviceBridgeStatus {
  supported: boolean;
  platform: string;
  bridge: BridgeKind;
  installed: boolean;
  running: boolean;
  permission: boolean;
  message: string;
}

export type ActionKind = 'tap' | 'swipe' | 'input' | 'key' | 'openApp' | 'screenshot';

export interface DeviceAction {
  kind: ActionKind;
  label: string;
  params: Record<string, string | number>;
}

interface BridgeNative {
  getStatus?: () => Promise<{ bridge: string; installed: boolean; running: boolean; permission: boolean }>;
  perform?: (action: DeviceAction) => Promise<{ ok: boolean; message?: string }>;
}

/** 原生桥接由后续 Kotlin/Java 模块注入；未注入时走降级检测路径。 */
const bridge = (NativeModules as Record<string, BridgeNative | undefined>).DeviceBridge;

const BRIDGE_GUIDE: Record<string, string> = {
  shizuku: '安装 Shizuku 并通过无线调试或 ADB 启动后，授予 PocketDev 权限。',
  dhizuku: '使用 Dhizuku（设备所有者委托）时，请先完成 owner 授权并启动服务。',
  none: '当前未检测到 Shizuku / Dhizuku，请先安装并启动其一，再回到本页重试。',
};

export async function getDeviceBridgeStatus(): Promise<DeviceBridgeStatus> {
  if (Platform.OS !== 'android') {
    return {
      supported: false,
      platform: Platform.OS,
      bridge: 'none',
      installed: false,
      running: false,
      permission: false,
      message: '手机自动化目前仅支持 Android。',
    };
  }
  if (!bridge?.getStatus) {
    return {
      supported: false,
      platform: Platform.OS,
      bridge: 'none',
      installed: false,
      running: false,
      permission: false,
      message: '原生设备桥接尚未内置到当前构建，后续版本将开放。你可以先了解准备步骤。',
    };
  }
  try {
    const s = await bridge.getStatus();
    const kind: BridgeKind = s.bridge === 'dhizuku' ? 'dhizuku' : s.bridge === 'shizuku' ? 'shizuku' : 'none';
    return {
      supported: true,
      platform: Platform.OS,
      bridge: kind,
      installed: s.installed,
      running: s.running,
      permission: s.permission,
      message:
        !s.installed || !s.running
          ? BRIDGE_GUIDE[kind]
          : s.permission
            ? '设备桥接已就绪，可逐条确认后执行操作。'
            : '已检测到桥接服务，请在系统弹窗中授予 PocketDev 权限。',
    };
  } catch (e) {
    return {
      supported: true,
      platform: Platform.OS,
      bridge: 'none',
      installed: false,
      running: false,
      permission: false,
      message: `桥接检测失败：${(e as Error).message}`,
    };
  }
}

/** 单条动作执行入口，调用方必须先取得用户明确确认。 */
export async function performDeviceAction(action: DeviceAction): Promise<{ ok: boolean; message: string }> {
  if (!bridge?.perform) {
    return { ok: false, message: '原生设备桥接未内置，当前无法执行设备操作。' };
  }
  try {
    const r = await bridge.perform(action);
    return { ok: !!r.ok, message: r.message ?? (r.ok ? '已执行' : '执行失败') };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export const SUPPORTED_ACTIONS: { kind: ActionKind; label: string; desc: string }[] = [
  { kind: 'tap', label: '点按坐标', desc: '在屏幕指定坐标执行一次点击' },
  { kind: 'swipe', label: '滑动手势', desc: '从起点滑动到终点' },
  { kind: 'input', label: '输入文本', desc: '向当前焦点输入文本' },
  { kind: 'key', label: '按键', desc: '返回、主页、多任务等系统按键' },
  { kind: 'openApp', label: '打开应用', desc: '按包名启动已安装应用' },
  { kind: 'screenshot', label: '截屏', desc: '抓取当前屏幕并保存到本地' },
];
