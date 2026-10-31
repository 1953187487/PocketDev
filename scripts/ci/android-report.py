#!/usr/bin/env python3
"""把 Build & Test 各步骤的结果（typecheck / lint / jest）聚合写成报告。

输出：
  - build/ci/report/report.md     人机可读报告（结论 + 各步结果 + 失败摘要）
  - build/ci/report/report.json   机器可读（供 TestFlight 式复用、供 AI 解析）
  - GITHUB_OUTPUT 里的 test_failures / blocking / passed

各步骤结果通过环境变量传入：
  TYPECHECK_EXIT / LINT_EXIT / TEST_EXIT    各步骤退出码（0=通过）
  TYPECHECK_LOG / LINT_LOG / TEST_LOG       各步骤日志路径（失败时读取摘要）
  TEST_SUMMARY                              测试框架的摘要行（如 Jest 的 Tests: X failed）
  PASS_WITH_NO_TESTS                        没有测试用例时是否通过
"""
import json
import os
import re
import sys
from pathlib import Path

REPORT_DIR = Path(os.environ.get("REPORT_DIR", "build/ci/report"))
WORKDIR = Path(os.environ.get("WORKDIR", "."))


def step(name: str, exit_code: str, log: str, summary: str = "") -> dict:
    code = int(exit_code or "0")
    text = ""
    if code != 0 and log and Path(log).is_file():
        # 取日志里出错的行（tsc/lint/jest 都带行号或错误关键字），最多 40 行
        lines = Path(log).read_text(errors="replace").splitlines()
        bad = [ln for ln in lines if re.search(r"error|failed|✕|✗|FAIL|Exception|Error", ln, re.I)]
        text = "\n".join(bad[:40])
        if not text:
            text = "\n".join(lines[-20:])
    return {"name": name, "passed": code == 0, "exit_code": code, "summary": summary, "errors": text}


def main() -> None:
    steps = {
        "typecheck": step("TypeScript (tsc --noEmit)", os.environ.get("TYPECHECK_EXIT"), os.environ.get("TYPECHECK_LOG")),
        "lint": step("Lint (expo lint)", os.environ.get("LINT_EXIT"), os.environ.get("LINT_LOG")),
        "test": step("Tests (jest)", os.environ.get("TEST_EXIT"), os.environ.get("TEST_LOG"), os.environ.get("TEST_SUMMARY", "")),
    }

    # Jest 无测试用例时：npx jest 默认“No tests found”退出码 1。若配置了 pass_with_no_tests
    # 且日志里确实是“没有找到测试”，则视为通过（不阻塞）。
    pass_no_tests = os.environ.get("PASS_WITH_NO_TESTS", "true") == "true"
    test_log = Path(os.environ.get("TEST_LOG", "") or "")
    no_tests = test_log.is_file() and re.search(r"No tests found|No test suites found", test_log.read_text(errors="replace"))
    if pass_no_tests and no_tests and not steps["test"]["passed"]:
        steps["test"]["passed"] = True
        steps["test"]["summary"] = "没有测试用例，按配置视为通过"

    blocking = [s for s in steps.values() if not s["passed"]]
    passed = len(blocking) == 0

    lines = []
    lines.append("# PocketDev CI 报告")
    lines.append("")
    lines.append(f"**结论：{'通过' if passed else '未通过'}**（共 {len(steps)} 步，{len(blocking)} 步失败）")
    lines.append("")
    lines.append("| 步骤 | 结果 | 退出码 | 说明 |")
    lines.append("| --- | --- | --- | --- |")
    for s in steps.values():
        lines.append(f"| {s['name']} | {'✅' if s['passed'] else '❌'} | {s['exit_code']} | {s['summary'] or ''} |")
    lines.append("")
    for s in steps.values():
        if not s["passed"] and s["errors"]:
            lines.append(f"## {s['name']} 失败详情")
            lines.append("")
            lines.append("```text")
            lines.append(s["errors"])
            lines.append("```")
            lines.append("")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    (REPORT_DIR / "report.md").write_text("\n".join(lines), encoding="utf-8")
    (REPORT_DIR / "report.json").write_text(
        json.dumps({
            "passed": passed,
            "blocking": len(blocking),
            "steps": {k: {"passed": v["passed"], "exit_code": v["exit_code"], "summary": v["summary"]} for k, v in steps.items()},
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # 打印到 job summary（GitHub 会在页面上渲染）
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as out:
            out.write(f"blocking={len(blocking)}\n")
            out.write(f"test_failures={int(not steps['test']['passed'])}\n")
            out.write(f"passed={'true' if passed else 'false'}\n")

    if not passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
