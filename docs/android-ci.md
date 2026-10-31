# Android CI 机制

PocketDev 的 CI 借鉴并移植自 [wenjinliuu/ios-ci-workflows](https://github.com/wenjinliuu/ios-ci-workflows)（MIT）。核心思想：**App 仓库只放代码、测试、一个配置文件和薄工作流入口；编译、测试、报告、签名、上传全部在 GitHub Actions 上完成，本地不构建。** 手机上的 AI 改代码 → push → 读 CI 报告 → 修 → 发布。

## 配置文件 `.android-ci.yml`

App 仓库根目录的 `.android-ci.yml` 保存全部 CI 设置，所有工作流都从这里读；入口文件里只剩 `uses:` 和 `secrets:`。每条工作流的第一个 `config` job 跑 `scripts/ci/android-ci-config.py` 读取它，补默认值、校验，再输出 JSON 给后面的 job 用（`fromJSON(needs.config.outputs.config).<键>`）。配置写错（缺必填键、拼错键名、版本号没加引号）会在这一步直接失败并说明是哪一项。

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `workdir` | `.` | app.json 所在目录，相对仓库根 |
| `app.package` | 必填 | Android 包名，校验构建产物、发版核对 |
| `app.display_name` | `''` | 填了会在发版时核对应用名 |
| `toolchain.node` | `'20'` | Node 版本（要加引号） |
| `toolchain.jdk` | `'17'` | JDK 版本（要加引号） |
| `build_test.typecheck_command` | `npx tsc --noEmit` | 类型检查命令 |
| `build_test.lint_command` | `npx expo lint` | Lint 命令 |
| `build_test.test_command` | `npx jest` | 测试命令 |
| `build_test.pass_with_no_tests` | `true` | 没有测试用例时是否也算通过 |
| `build.prebuild_command` | `npx expo prebuild -p android --no-install` | 生成 `android/` 工程 |
| `build.gradle_command` | `./gradlew assembleRelease` | Gradle 构建命令 |
| `build.gradle_flags` | `--no-daemon --max-workers=1` | Gradle 附加参数 |
| `build.apk_dir` | `android/app/build/outputs/apk/release` | APK 输出目录，相对 workdir |
| `release.artifact_prefix` | `pocketdev` | 产物名前缀，最终 `<prefix>-v<version>.apk` |
| `release.marketing_version` | `''` | 空则用 app.json 的 `expo.version` |
| `release.version_code` | `''` | 空则用 app.json 的 `expo.android.versionCode` |
| `release.acceptance_issue` | `false` | 上传成功后开发版验收 Issue（入口文件要给 `issues: write`） |

## 工作流

| 工作流 | 入口文件 | 触发 | 密钥 | Runner | 性质 |
| --- | --- | --- | --- | --- | --- |
| Build & Test | `build-test.yml` → `reusable-build-test.yml` | 每次 push / PR | 无 | ubuntu-latest | 自动，快而稳 |
| Release | `release.yml` → `reusable-release.yml` | `v*` 标签 / 手动 | 4 项签名密钥 | ubuntu-latest | 发布，上传 GitHub Release |

入口文件用同仓库相对路径复用：`uses: ./.github/workflows/reusable-build-test.yml`。

### Build & Test

1. **config**：跑 `scripts/ci/android-ci-config.py` 解析并校验 `.android-ci.yml`，输出 JSON。
2. **build-test**：`npm ci` → 依次跑 `typecheck_command`、`lint_command`、`test_command`，各自日志写入 `build/ci/*.log` 并记录退出码；`scripts/ci/android-report.py` 聚合结论写 `report/report.md`、`report/report.json`、job summary；上传产物 `android-ci-<run>`；有失败则以 `::error::` 判失败。

### Release

1. **config**：同上。
2. **release**：`npm ci` → 从 Secrets 还原 keystore → `expo prebuild` → Gradle 打 release APK → `zipalign` + `apksigner` 用发布密钥签名并 `verify` → 从 config/app.json 读版本 → 上传产物 → `gh release create` 发布，附 SHA-256 校验文件与更新说明。

## AI 协作闭环（手机 + AI + GitHub Actions）

这是 PocketDev 自研移动端 AI 客户端与 CI 结合的核心：AI 在手机上改 PocketDev 自己的代码，push 后 Build & Test 报告回流，AI 读报告继续修；需要发版时打 `v*` 标签，CI 构建签名 APK 并上传 GitHub Release，App 内的更新检测再拉这个 Release。规则见仓库根目录 `AGENTS.md`。

## Secrets

Release 需要（仅放仓库 Secrets，不进 YAML、日志或提交）：

- `ANDROID_KEYSTORE_BASE64`：`.jks` 的 base64（`base64 -w0 release.jks`）
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Build & Test 不需要任何密钥。
