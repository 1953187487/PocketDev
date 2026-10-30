# PocketDev

手机端 AI 开发工具（1.0 正式版），基于 [chaitin/MonkeyCode](https://github.com/chaitin/MonkeyCode) 的 AI 能力层构建。

## 功能

- **液态玻璃 UI**：毛玻璃质感、可变色主色调、双主题（浅色 / 深色）
- **主页**：后端连接状态、更新检测、快捷入口、能力说明
- **仓库**：Git 身份绑定、仓库列表、选择开发仓库
- **设置**：
  - 主题模式（跟随系统 / 浅色 / 深色）与主色调切换
  - 应用内更新检测 + 强制更新
  - 自定义服务商 API（Base URL + API Key）
  - 拉取服务商模型列表、测试模型健康检查
  - 支持作者（支付宝 / 微信收款码）
  - 开发者 / 维护者 / 贡献者列表

## 开发者

- **万古沧海** — 主开发者 · 总负责 · 仓库维护
  - 哔哩哔哩：https://b23.tv/H10fiEa （万古沧海的个人空间）

## 技术栈

- Expo SDK 55 / React Native 0.83
- expo-router（文件路由）
- expo-blur / expo-linear-gradient（液态玻璃效果）
- TypeScript
- AGPL-3.0

## 开发

```bash
npm install
npx expo start
```

## 构建 APK

```bash
npx eas build --platform android --profile production
```

产物为 `com.pocketdev.app` 的 APK（EAS 云端构建）。

## 许可

AGPL-3.0。底层 MonkeyCode 亦为 AGPL-3.0（长亭科技 / Chaitin 出品）。
