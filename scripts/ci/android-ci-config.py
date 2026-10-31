#!/usr/bin/env python3
"""读取 App 仓库的 .android-ci.yml，补上默认值并校验，输出一个 JSON 给后面的 job 用。

所有可复用工作流的第一个 job 都跑这个脚本，结果写进 GITHUB_OUTPUT 的 config，
后面的 job 用 fromJSON(needs.config.outputs.config).<键> 取值。
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # runner 镜像不一定带 PyYAML
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "--user",
                           "--break-system-packages", "pyyaml==6.0.3"])
    import site

    sys.path.append(site.getusersitepackages())
    import yaml

DEFAULTS = {
    "workdir": ".",
    "app": {
        "package": None,
        "display_name": "",
    },
    "toolchain": {
        "node": "20",
        "jdk": "17",
        "expo": "",
    },
    "build_test": {
        "typecheck_command": "npx tsc --noEmit",
        "lint_command": "npx expo lint",
        "test_command": "npx jest",
        "pass_with_no_tests": True,
    },
    "build": {
        "prebuild_command": "npx expo prebuild -p android --no-install",
        "gradle_command": "./gradlew assembleRelease",
        "gradle_flags": "--no-daemon --max-workers=1",
        "apk_dir": "android/app/build/outputs/apk/release",
    },
    "release": {
        "artifact_prefix": "pocketdev",
        "marketing_version": "",
        "version_code": "",
        "acceptance_issue": False,
    },
}

REQUIRED = ("app.package",)


def fail(message: str) -> None:
    print(f"::error::.android-ci.yml：{message}")
    sys.exit(1)


def merge(defaults: dict, values: dict, where: str) -> dict:
    unknown = set(values) - set(defaults)
    if unknown:
        fail(f"{where or '顶层'}里有不认识的键：{', '.join(sorted(unknown))}")
    merged = {}
    for key, default in defaults.items():
        value = values.get(key, default)
        if isinstance(default, dict):
            if not isinstance(value, dict):
                fail(f"{where}{key} 应该是一组键值")
            value = merge(default, value, f"{where}{key}.")
        elif value is None and key in values:
            value = default
        merged[key] = value
    return merged


def dig(config: dict, dotted: str):
    node = config
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def main() -> None:
    path = Path(os.environ.get("CONFIG_PATH") or ".android-ci.yml")
    if not path.is_file():
        fail(f"App 仓库里没有 {path}；从 templates/ 复制一份再改")
    raw = yaml.safe_load(path.read_text()) or {}
    if not isinstance(raw, dict):
        fail("顶层应该是键值")
    config = merge(DEFAULTS, raw, "")

    # 工作流可以用 REQUIRE 追加必填键
    extra = [key for key in os.environ.get("REQUIRE", "").split(",") if key]
    for key in (*REQUIRED, *extra):
        if not dig(config, key):
            fail(f"缺少 {key}")

    # app.package 形如 com.example.app
    package = config["app"]["package"]
    if not re.fullmatch(r"[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+", package):
        fail(f"app.package 形式不对（如 com.example.app），当前：{package}")

    for key in ("node", "jdk"):
        val = config["toolchain"][key]
        if not isinstance(val, str) or not re.fullmatch(r"\d+(\.\d+)*", val):
            fail(f"toolchain.{key} 要是带引号的版本号（如 '17'），当前：{val!r}")

    for key in ("typecheck_command", "lint_command", "test_command"):
        if not isinstance(config["build_test"][key], str) or not config["build_test"][key].strip():
            fail(f"build_test.{key} 不能为空")

    if not isinstance(config["build_test"]["pass_with_no_tests"], bool):
        fail("build_test.pass_with_no_tests 必须是 true 或 false")
    if not isinstance(config["release"]["acceptance_issue"], bool):
        fail("release.acceptance_issue 必须是 true 或 false")

    encoded = json.dumps(config, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(config, ensure_ascii=False, indent=2))
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as out:
            out.write(f"config={encoded}\n")


if __name__ == "__main__":
    main()
