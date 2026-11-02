"""Embed referenced command bodies in the issue-resolution DAG, without running it.

Run with: uv run --no-project --with pyyaml python scripts/sync-issue-resolution-prompts.py
"""

from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
DAG = ROOT / ".harness/continuous-issue-resolution.dagu.yml"
REFERENCE = re.compile(r"[Ff]ollow the instructions in @(\.opencode/commands/[\w-]+\.md)")


class ReadableDumper(yaml.SafeDumper):
    def increase_indent(self, flow: bool = False, indentless: bool = False) -> int | None:
        return super().increase_indent(flow, indentless=False)


def represent_string(dumper: ReadableDumper, value: str) -> yaml.ScalarNode:
    return dumper.represent_scalar(
        "tag:yaml.org,2002:str", value,
        style="|" if "\n" in value else ">" if len(value) > 100 else None,
    )


ReadableDumper.add_representer(str, represent_string)


def main() -> None:
    workflows = yaml.safe_load((ROOT / ".made/workflows.yml").read_text())
    source = next(
        workflow for workflow in workflows["workflows"]
        if workflow["id"] == "wf_mmozh3te_a0828"
    )
    document = yaml.safe_load(DAG.read_text())
    if len(document["steps"]) != len(source["steps"]):
        raise ValueError("Source and DAG step counts differ; update their mapping first")
    count = 0
    for step, original in zip(document["steps"], source["steps"], strict=True):
        if original["type"] != "agent":
            continue
        if step.get("action") != "harness.run":
            raise ValueError(f"Expected a harness step for {step['id']}")
        prompt = original["prompt"]
        reference = REFERENCE.search(prompt)
        if reference is None:
            continue
        path = ROOT / reference.group(1)
        content = path.read_text()
        if content.startswith("---\n"):
            _, separator, content = content[4:].partition("\n---\n")
            if not separator:
                raise ValueError(f"Unterminated command metadata in {path.name}")
        body = "\n".join(line.rstrip() for line in content.splitlines()).strip()
        if not body:
            raise ValueError(f"Empty command body in {path.name}")
        context = REFERENCE.sub("Use the embedded instructions below", prompt)
        step["with"]["prompt"] = f"{context}\n\n{body}"
        count += 1
    rendered = yaml.dump(document, Dumper=ReadableDumper, sort_keys=False, allow_unicode=True)
    rendered = rendered.replace(
        "  - id: prepare_main\n",
        "  # Preserves the source workflow's destructive cleanup. Use a dedicated checkout.\n"
        "  - id: prepare_main\n", 1,
    )
    DAG.write_text(
        "# Hand-maintained Dagu counterpart of .made/workflows.yml (wf_mmozh3te_a0828).\n"
        "# Refresh embedded command bodies with scripts/sync-issue-resolution-prompts.py.\n"
        + rendered
    )
    print(f"Embedded {count} command bodies in {DAG.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
