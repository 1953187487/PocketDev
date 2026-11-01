import { makeDir, writeTextFile } from './localfs';

export interface ScaffoldOptions {
  packageName: string;
  appName: string;
  /** 生成后是否作为工作区根。 */
  asWorkspace?: boolean;
}

/** 校验 Android 包名合法性。 */
export function isValidPackageName(pkg: string): boolean {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg.trim());
}

/** 生成基础 Android 项目脚手架。返回写入的文件路径清单。 */
export async function generateAndroidScaffold(
  root: string,
  options: ScaffoldOptions,
): Promise<{ files: string[]; error?: string }> {  const pkg = options.packageName.trim();
  const name = options.appName.trim();
  if (!isValidPackageName(pkg)) {
    return { files: [], error: `包名不合法：${pkg}（应形如 com.example.app）` };
  }
  const safeName = name || 'PocketApp';
  const pkgPath = pkg.replace(/\./g, '/');
  const base = root.replace(/\/+$/, '');
  const files: string[] = [];
  const writes: [string, string][] = [];

  // 1. Gradle 配置
  writes.push([
    `${base}/settings.gradle`,
    `pluginManagement {\n    repositories { google(); mavenCentral(); gradlePluginPortal() }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories { google(); mavenCentral() }\n}\nrootProject.name = "${safeName}"\ninclude ':app'\n`,
  ]);
  writes.push([
    `${base}/build.gradle`,
    `plugins {\n    id 'com.android.application' version '8.5.2' apply false\n    id 'org.jetbrains.kotlin.android' version '1.9.24' apply false\n}\n`,
  ]);
  writes.push([
    `${base}/gradle.properties`,
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n`,
  ]);
  writes.push([
    `${base}/app/build.gradle`,
    `plugins {\n    id 'com.android.application'\n    id 'org.jetbrains.kotlin.android'\n}\n\nandroid {\n    namespace '${pkg}'\n    compileSdk 36\n    defaultConfig {\n        applicationId '${pkg}'\n        minSdk 26\n        targetSdk 36\n        versionCode 1\n        versionName '1.0.0'\n    }\n    buildTypes {\n        release {\n            minifyEnabled false\n        }\n    }\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17\n    }\n    kotlinOptions { jvmTarget = '17' }\n}\n\ndependencies {\n    implementation 'androidx.core:core-ktx:1.13.1'\n    implementation 'androidx.appcompat:appcompat:1.7.0'\n    implementation 'com.google.android.material:material:1.12.0'\n}\n`,
  ]);

  // 2. AndroidManifest
  writes.push([
    `${base}/app/src/main/AndroidManifest.xml`,
    `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application\n        android:allowBackup="true"\n        android:label="${safeName}"\n        android:supportsRtl="true"\n        android:theme="@style/Theme.AppCompat.Light.NoActionBar">\n        <activity\n            android:name=".MainActivity"\n            android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>\n`,
  ]);

  // 3. 入口 Kotlin 源码
  writes.push([
    `${base}/app/src/main/java/${pkgPath}/MainActivity.kt`,
    `package ${pkg}\n\nimport android.os.Bundle\nimport androidx.appcompat.app.AppCompatActivity\n\nclass MainActivity : AppCompatActivity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        setContentView(android.R.layout.activity_list_item)\n    }\n}\n`,
  ]);

  // 4. 说明文档
  writes.push([
    `${base}/README.md`,
    `# ${safeName}\n\n由 PocketDev 生成的 Android 项目脚手架。\n\n## 结构\n- \`app/\`：Android 应用模块\n- \`settings.gradle\` / \`build.gradle\` / \`gradle.properties\`：Gradle 配置\n\n## 下一步\n在真实构建环境执行 \`./gradlew assembleDebug\` 验证；后续 AI 可在此基础上继续开发。\n`,
  ]);

  for (const [path, content] of writes) {
    try {
      await makeDir(path.split('/').slice(0, -1).join('/'), true);
      const ok = await writeTextFile(path, content);
      if (!ok) {
        return { files, error: `写入失败：${path}` };
      }
      files.push(path.slice(base.length + 1));
    } catch {
      return { files, error: `写入失败：${path}` };
    }
  }
  return { files };
}
