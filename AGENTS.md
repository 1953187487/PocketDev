# AI 协作规则（PocketDev）

- 本项目用自带的 Android CI（`.github/workflows/`）编译和测试；本地不跑 Gradle 构建。改完代码 push，读 **Build & Test** 的报告再修。
- 所有 CI 设置集中在根目录的 [`.android-ci.yml`](.android-ci.yml)；入口工作流文件里只留 `uses:` 和 `secrets:`。改构建/测试行为改配置，不直接改复用工作流。
- 本地自检只跑 `npm run ci`（= `tsc --noEmit` + `expo lint` + `jest`）；正式结论以 CI 的 Build & Test 报告为准。
- **CI 是唯一的发布入口。** 打 `v*` 标签触发 Release：构建签名 APK → 上传 GitHub Release。本地不手动打包上传。
- 新功能必须带测试（放在 `src/**/__tests__/*.test.ts`）；能用纯逻辑测试验证的不写成 UI 测试；删测试、改断言预期值要在提交里写明理由。
- 涉及签名/密钥：Release 签名密钥只放在仓库 Secrets（`ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`），不进工作流 YAML、日志或提交。
- 不要在工作流里引用 `@main`；同仓库复用用 `uses: ./.github/workflows/reusable-*.yml`。
- 更多机制说明见 [`docs/android-ci.md`](docs/android-ci.md)。

## 这套流程的来源

PocketDev 的 "AI + GitHub Actions 自动构建/测试/发布" 流程，借鉴并移植自 [wenjinliuu/ios-ci-workflows](https://github.com/wenjinliuu/ios-ci-workflows)（MIT）的架构思想：App 仓库只放代码、测试、一个配置文件和薄工作流入口，编译/测试/报告/签名/上传全在 Actions 上完成，本地不构建；手机上的 AI 改代码 → push → 读 CI 报告 → 修 → 发布。原作者面向 iOS（Xcode/TestFlight），本项目将其改造为 Android（Expo/Gradle/GitHub Release），并接入 PocketDev 自研的移动端 AI 客户端。
