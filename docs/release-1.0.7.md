# 1.0.7 发布与配置

## 已完成（本轮）
- 版本：`package.json` / `app.json`(versionCode 8) / `src/config.ts` → **1.0.7**，README 更新。
- 账号（本设备）：邮箱注册 = 输入邮箱→发验证码→验证后设密；邮箱+密码登录；退出可再登；**防重复注册/防重复登录**；内置**官方账号** `official@pocketdev.local`（默认密码见 App 内提示/`src/api/account.ts`）。
- 邮箱：本地 QQ SMTP 服务 `mail-server/server.js`（读取 `mail-server/.env.local`，已 gitignore；本机已用 2865529057@qq.com + 授权码配置）。
- 云存档：全部数据**紧凑 JSON**存本设备（备份/恢复/导出导入），含账号/会话等 key。
- 聊天渠道：内置官方聊天（本地消息+自动回复）+ 公告发布/查看（设置页 & 账号页入口）。
- UI：SettingsHub/More 新增账号、公告、渠道、云存档入口；新增 4 个设置页。
- 质量：`jest` 11 suites / 57 tests 通过；`tsc --noEmit` 通过；新增模块 lint 通过。

## 需要你在本机完成（本环境缺 gh/keytool）
仓库 Secrets（Release 签名用，不进仓库）：
- `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD`

可用脚本：`/sdcard/Download/DSH-Go/pocketdev-1.0.7-release-setup.sh`（需 `gh auth login` + `keytool`）。

触发发布（CI 构建签名 APK → GitHub Release）：
```bash
git tag v1.0.7
git push origin v1.0.7
```

## 安全提醒（务必）
- **立刻吊销/轮换**你在聊天里暴露过的 GitHub PAT（`ghp_...`）和任何 QQ 登录密码；QQ 发信只用 **SMTP 授权码**。
- `mail-server/.env.local`、keystore、授权码 **不要提交**（已 gitignore `mail-server/.env.local`/`data/`）。

## 自动发布状态
- 已推送 commit  与 tag ，触发 Release workflow。
- 已通过 GitHub API 配置 Actions Secrets（ANDROID_KEYSTORE_*，PKCS12/base64；apksigner 自动识别）。
- Actions: https://github.com/1953187487/PocketDev/actions  Releases: https://github.com/1953187487/PocketDev/releases/tag/v1.0.7
- 若签名因 keystore 格式失败：在有 JDK 的机器运行  生成 JKS 并重新设置 Secrets，再重打 tag。
