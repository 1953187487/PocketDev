# PocketDev

手机端 AI 开发工具（1.0 测试版），基于 [chaitin/MonkeyCode](https://github.com/chaitin/MonkeyCode) 的 AI 能力层构建。

## 功能

- **主页**：后端连接状态、更新检测、快捷入口、能力说明
- **仓库**：Git 身份绑定、仓库列表、选择开发仓库
- **设置**：
  - 检查 / 下载更新
  - 自定义服务商 API（Base URL + API Key）
  - 拉取服务商模型列表、测试模型健康检查
  - 感谢者列表

## 技术栈

- Expo SDK 55 / React Native 0.83
- expo-router（文件路由）
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
