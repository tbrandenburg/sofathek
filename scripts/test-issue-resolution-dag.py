"""Check source parity and Dagu dry-runs without executing workflow steps.

Run with: uv run --no-project --with pyyaml python scripts/test-issue-resolution-dag.py
"""

import copy
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[1]
DAG = ROOT / ".harness/continuous-issue-resolution.dagu.yml"
IDS = [
    "check_open_issues", "prepare_main", "fix_issue", "commit_push",
    "resolve_ci_errors", "review_pr", "merge_and_notify", "restore_main",
]


class IssueResolutionDagTests(unittest.TestCase):
    def setUp(self) -> None:
        self.dag = yaml.safe_load(DAG.read_text())
        workflows = yaml.safe_load((ROOT / ".made/workflows.yml").read_text())
        self.source = next(
            workflow for workflow in workflows["workflows"]
            if workflow["id"] == "wf_mmozh3te_a0828"
        )
        self.binary = shutil.which("dagu")
        self.assertIsNotNone(self.binary, "Install Dagu before running this check")
        self.temporary = tempfile.TemporaryDirectory(prefix="sofathek-dagu-")
        self.addCleanup(self.temporary.cleanup)
        self.sandbox = Path(self.temporary.name)
        binaries = self.sandbox / "bin"
        binaries.mkdir()
        self.marker = self.sandbox / "unexpected-execution"
        # Tripwires test dry-run non-execution, not simulated agent behavior.
        for binary in ("opencode", "git", "gh"):
            path = binaries / binary
            path.write_text(
                "#!/bin/sh\n"
                f"printf '%s\\n' {binary} >> {shlex.quote(str(self.marker))}\n"
                "exit 99\n"
            )
            path.chmod(0o700)
        self.environment = {
            "HOME": str(self.sandbox),
            "DAGU_HOME": str(self.sandbox / "dagu"),
            "DAGU_OPENCODE_EXECUTABLE": str(binaries / "opencode"),
            "PATH": str(binaries) + os.pathsep + os.defpath,
        }

    def invoke(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            [str(self.binary), *arguments], cwd=self.sandbox,
            env=self.environment, text=True, capture_output=True, timeout=30,
        )
        self.assertFalse(self.marker.exists(), "A dry-run executed a workflow CLI")
        return result

    def test_eight_steps_match_source(self) -> None:
        steps = self.dag["steps"]
        self.assertEqual(len(self.source["steps"]), 8)
        self.assertEqual([step["id"] for step in steps], IDS)
        self.assertEqual(self.dag["type"], "graph")
        self.assertEqual(self.dag["harness"], {"provider": "opencode", "agent": "build"})
        self.assertTrue(self.source["enabled"])
        self.assertEqual(self.dag["schedule"], self.source["schedule"])
        self.assertEqual(self.dag["retry_policy"]["limit"], 0)
        self.assertEqual(self.dag["working_dir"], "${params.project_dir}")
        self.assertEqual(self.dag["params"][0]["default"], "..")
        for index, (step, source) in enumerate(zip(steps, self.source["steps"], strict=True)):
            with self.subTest(step=step["id"]):
                self.assertEqual(step.get("depends", []), IDS[index - 1:index] if index else [])
                if source["type"] == "agent":
                    self.assertEqual(step["action"], "harness.run")
                    self.assertEqual(step["with"]["prompt"], source["prompt"])
                    self.assertEqual(source["agent"], self.dag["harness"]["agent"])
                    self.assertNotIn("run", step)
                    continue
                self.assertNotIn("action", step)
                self.assertTrue(step["run"].startswith("#!/usr/bin/env bash\nset -euo pipefail\n"))
                if index:
                    self.assertEqual(" ".join(step["run"].splitlines()[2:]).split(), source["run"].split())
        guard = steps[0]["run"]
        self.assertIn('issues="$(gh issue list --limit 1 --state open)"', guard)
        self.assertIn('test -n "$issues" || exit 42', guard)
        self.assertNotIn("return 42", guard)
        self.assertNotRegex(DAG.read_text(), r"\\[0-7]{3}|base64|printf '%b'")

    def test_validate_and_default_dry_run(self) -> None:
        validation = self.invoke("validate", str(DAG))
        self.assertEqual(validation.returncode, 0, validation.stderr)
        result = self.invoke("dry", str(DAG))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(re.findall(r"step=([a-z_]+)", result.stderr), IDS)
        for identifier in IDS:
            self.assertIn(f"{identifier} [succeeded]", result.stdout)
        self.assertIn("Dry-run completed", result.stderr)

    def test_dry_run_project_override_with_spaces(self) -> None:
        checkout = self.sandbox / "checkout with spaces"
        checkout.mkdir()
        result = self.invoke("dry", str(DAG), "--", f"project_dir={json.dumps(str(checkout))}")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(re.findall(r"step=([a-z_]+)", result.stderr), IDS)
        self.assertIn(f"project_dir={checkout}", result.stderr)
        self.assertEqual(list(checkout.iterdir()), [])

    def test_dry_run_rejects_missing_prompt(self) -> None:
        invalid = copy.deepcopy(self.dag)
        invalid["steps"][2]["with"] = {}
        fixture = self.sandbox / "missing-prompt.yaml"
        fixture.write_text(yaml.safe_dump(invalid))
        result = self.invoke("dry", str(fixture))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("prompt", result.stderr)
        self.assertNotIn("Step started", result.stderr)

    def test_dry_run_rejects_unknown_provider(self) -> None:
        invalid = copy.deepcopy(self.dag)
        invalid["harness"]["provider"] = "not-a-real-provider"
        fixture = self.sandbox / "unknown-provider.yaml"
        fixture.write_text(yaml.safe_dump(invalid))
        result = self.invoke("dry", str(fixture))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unknown provider", result.stderr)
        self.assertNotIn("Step started", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
