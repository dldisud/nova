# Webnovel Proofreader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reusable `webnovel-proofreader` skill that inspects folders of episode `.md` drafts, writes report files, and only rewrites user-approved episodes into a separate output folder.

**Architecture:** The skill will live in `${CODEX_HOME:-$HOME/.codex}/skills/webnovel-proofreader` and combine three parts: a deterministic helper script for folder traversal and output-path bookkeeping, a lean `SKILL.md` that enforces the two-phase workflow and anti-invention rules, and reference files for shared rewrite policy plus work-specific overlays such as the Kang Jinwoo profile. The helper script will return machine-readable manifests so Codex can inspect or rewrite files in a predictable order without touching originals.

**Tech Stack:** Markdown, Python 3, pytest, Codex skill metadata.

---

### Task 1: Scaffold the Skill Folder

**Files:**
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/SKILL.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/agents/openai.yaml`
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/`
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/`

- [ ] **Step 1: Run the initializer with the final skill name and UI metadata**

Run:

```bash
python /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  webnovel-proofreader \
  --path /mnt/c/Users/rimur/.codex/skills \
  --resources scripts,references \
  --interface display_name="웹소설 퇴고 검사기" \
  --interface short_description="회차 검사 후 승인본만 별도 재집필하는 스킬" \
  --interface default_prompt='Use $webnovel-proofreader to inspect a folder of episode drafts, report issues, and rewrite only approved files.'
```

Expected: the initializer prints `[OK] Created ...` lines for the skill folder, `SKILL.md`, `agents/openai.yaml`, `scripts/`, and `references/`.

- [ ] **Step 2: Verify the generated layout exists**

Run:

```bash
find /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader -maxdepth 2 -type f | sort
```

Expected: output includes `SKILL.md` and `agents/openai.yaml`.

### Task 2: Write Failing Tests for the Helper Script

**Files:**
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py`

- [ ] **Step 1: Write the failing pytest file for manifest generation and approval filtering**

Create `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py` with:

```python
import json
import subprocess
import sys
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "run_webnovel_pass.py"


def run_script(*args):
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_inspect_manifest_orders_markdown_and_ignores_output_dirs(tmp_path):
    (tmp_path / "002.md").write_text("둘째 원고", encoding="utf-8")
    (tmp_path / "001.md").write_text("첫째 원고", encoding="utf-8")
    (tmp_path / "reports").mkdir()
    (tmp_path / "reports" / "999.md").write_text("무시", encoding="utf-8")
    (tmp_path / "rewritten").mkdir()
    (tmp_path / "rewritten" / "888.md").write_text("무시", encoding="utf-8")

    result = run_script("inspect", "--target", str(tmp_path))

    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert [item["episode_name"] for item in payload["episodes"]] == ["001.md", "002.md"]
    assert payload["summary_report"].endswith("reports/summary.md")
    assert Path(payload["reports_dir"]).is_dir()
    assert Path(payload["rewritten_dir"]).is_dir()


def test_rewrite_manifest_keeps_only_user_approved_files(tmp_path):
    (tmp_path / "001.md").write_text("첫째 원고", encoding="utf-8")
    (tmp_path / "002.md").write_text("둘째 원고", encoding="utf-8")
    (tmp_path / "010.md").write_text("열째 원고", encoding="utf-8")

    result = run_script(
        "rewrite",
        "--target",
        str(tmp_path),
        "--approved",
        "010.md",
        "--approved",
        "002.md",
    )

    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert [item["episode_name"] for item in payload["episodes"]] == ["002.md", "010.md"]
    assert payload["mode"] == "rewrite"


def test_inspect_returns_error_when_no_episode_markdown_exists(tmp_path):
    result = run_script("inspect", "--target", str(tmp_path))

    assert result.returncode == 1
    assert "No episode markdown files found" in result.stderr
```

- [ ] **Step 2: Run the test file and verify it fails because the script does not exist yet**

Run:

```bash
pytest /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py -q
```

Expected: FAIL with an error showing that `run_webnovel_pass.py` is missing or cannot be opened.

### Task 3: Implement the Helper Script

**Files:**
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py`

- [ ] **Step 1: Write the minimal helper script to satisfy the tests**

Create `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py` with:

```python
#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path


IGNORED_DIRS = {"reports", "rewritten"}


def natural_sort_key(path: Path):
    parts = re.split(r"(\d+)", path.name)
    return [int(part) if part.isdigit() else part.lower() for part in parts]


def collect_episode_files(target: Path):
    episodes = []
    for path in target.iterdir():
        if path.is_dir():
            continue
        if path.suffix.lower() != ".md":
            continue
        episodes.append(path)
    return sorted(episodes, key=natural_sort_key)


def ensure_output_dirs(target: Path):
    reports_dir = target / "reports"
    rewritten_dir = target / "rewritten"
    reports_dir.mkdir(exist_ok=True)
    rewritten_dir.mkdir(exist_ok=True)
    return reports_dir, rewritten_dir


def build_episode_entry(path: Path, reports_dir: Path, rewritten_dir: Path):
    return {
        "episode_name": path.name,
        "source_path": str(path),
        "report_path": str(reports_dir / f"{path.stem}-report.md"),
        "rewrite_path": str(rewritten_dir / path.name),
    }


def build_manifest(mode: str, target: Path, approved: list[str] | None = None):
    if not target.exists() or not target.is_dir():
        raise SystemExit(f"Target directory not found: {target}")

    reports_dir, rewritten_dir = ensure_output_dirs(target)
    episodes = collect_episode_files(target)

    if not episodes:
        print("No episode markdown files found.", file=sys.stderr)
        raise SystemExit(1)

    if approved:
        approved_set = set(approved)
        episodes = [path for path in episodes if path.name in approved_set]

    return {
        "mode": mode,
        "target": str(target),
        "reports_dir": str(reports_dir),
        "rewritten_dir": str(rewritten_dir),
        "summary_report": str(reports_dir / "summary.md"),
        "episodes": [
            build_episode_entry(path, reports_dir, rewritten_dir)
            for path in episodes
        ],
    }


def parse_args():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="mode", required=True)

    inspect_parser = subparsers.add_parser("inspect")
    inspect_parser.add_argument("--target", required=True)

    rewrite_parser = subparsers.add_parser("rewrite")
    rewrite_parser.add_argument("--target", required=True)
    rewrite_parser.add_argument("--approved", action="append", default=[])

    return parser.parse_args()


def main():
    args = parse_args()
    payload = build_manifest(args.mode, Path(args.target), getattr(args, "approved", None))
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Re-run the script tests and verify they pass**

Run:

```bash
pytest /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py -q
```

Expected: `3 passed`.

- [ ] **Step 3: Make the script executable**

Run:

```bash
chmod +x /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py
```

Expected: exit code `0`.

### Task 4: Replace the Generated Skill Instructions and References

**Files:**
- Modify: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/SKILL.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/report-format.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/rewrite-rules.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/profiles/kang-jinwoo.md`

- [ ] **Step 1: Replace `SKILL.md` with the final workflow and trigger description**

Write `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/SKILL.md` so it contains:

```markdown
---
name: webnovel-proofreader
description: Inspect and rewrite Korean webnovel episode drafts stored as .md files. Use when Codex needs to batch-check a folder of episode manuscripts for AI-sounding prose, invented content risk, pacing issues, POV drift, continuity problems, or mobile readability problems, and when Codex must rewrite only user-approved episodes into a separate output folder without expanding the original story scope.
---

# Webnovel Proofreader

## Overview

Inspect episode drafts first, then rewrite only approved episodes. Preserve original files and never invent new story content.

## Workflow

1. Run `scripts/run_webnovel_pass.py inspect --target <folder>` to create a sorted manifest and output folders.
2. Read each source episode and write a report to `reports/<episode>-report.md`.
3. Write `reports/summary.md` with safe-to-rewrite candidates and repeated issues.
4. Stop and wait for user approval before any rewrite.
5. Run `scripts/run_webnovel_pass.py rewrite --target <folder> --approved <file> ...` for approved files.
6. Rewrite only inside the source event boundary and save results to `rewritten/<same-name>.md`.

## Non-Negotiable Rules

- Do not add new characters, settings, foreshadowing, backstory, action, or reactions.
- Do not pad thin scenes to manufacture volume.
- Do not add fake aftertaste lines.
- Do not output markdown syntax inside the novel body.
- Do not output screenplay-style dialogue labels.
- Use shared rules from `references/rewrite-rules.md`.
- Load a work profile from `references/profiles/` only when the user provides or selects one.
```

- [ ] **Step 2: Write the shared inspection report format reference**

Create `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/report-format.md` with:

```markdown
# Report Format

## Episode Report

Write a short practical report with these sections in this order:

1. `판정`
2. `추가 창작 위험`
3. `AI 말투 흔적`
4. `지루하거나 늘어진 구간`
5. `시점/일관성 점검`
6. `재집필 시 건드리면 안 되는 정보`

Keep the report factual. Point to phrases or paragraph ranges when possible.

## Summary Report

Include:

- inspected file list
- high-risk files
- rewrite-ready files
- repeated batch issues
```

- [ ] **Step 3: Write the shared rewrite rules reference**

Create `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/rewrite-rules.md` with:

```markdown
# Shared Rewrite Rules

## Highest Priority

- Stay inside the source story boundary.
- If the draft only covers A and B, the rewrite must only cover A and B.
- Treat any newly invented meaning as a rewrite failure.

## Forbidden Moves

- adding new settings or lore
- adding foreshadowing
- adding new characters or backstory
- adding extra action or reaction
- expanding ambiguity with guesswork
- ending on fake grand lines such as `그날, 세상은 아직 몰랐다`

## House Style

- Prefer short sentences.
- Prefer short paragraphs with strong mobile readability.
- Prefer action, reaction, sensory detail, and dialogue over explanation.
- Keep important beats isolated on their own lines when useful.
- Do not emit markdown or bullet formatting in the novel body.
```

- [ ] **Step 4: Write the Kang Jinwoo work profile**

Create `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/profiles/kang-jinwoo.md` with:

```markdown
# Kang Jinwoo Profile

## POV

- Rewrite only in Kang Jinwoo first person.
- Do not state anything he could not directly perceive.
- Do not reveal other characters' inner thoughts directly.

## Combat Identity

- Preserve agility-specialist combat.
- Favor speed, first strike, angle, evasion, trajectory, distance, and openings.
- Do not rewrite him as a tank, bruiser, or mage-like artillery fighter.

## Growth Ceiling

- Early scenes stay within abnormal-but-still-comprehensible human speed.
- Do not inject sonic booms, disaster-scale friction, or late-stage spectacle into early scenes.

## Voice and Continuity

- Keep his thinking efficiency-first.
- Preserve honorifics, knowledge state, movement, and memory continuity.
- Do not add exposition, fake grandeur, or new lore.
```

### Task 5: Regenerate Metadata and Validate the Skill

**Files:**
- Modify: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/agents/openai.yaml`

- [ ] **Step 1: Regenerate `agents/openai.yaml` from the finished skill**

Run:

```bash
python /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py \
  /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader \
  --interface display_name="웹소설 퇴고 검사기" \
  --interface short_description="회차 검사 후 승인본만 별도 재집필하는 스킬" \
  --interface default_prompt='Use $webnovel-proofreader to inspect a folder of episode drafts, report issues, and rewrite only approved files.'
```

Expected: the script updates `agents/openai.yaml` without errors.

- [ ] **Step 2: Run the skill validator**

Run:

```bash
python /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader
```

Expected: `Skill is valid!`

- [ ] **Step 3: Run a smoke test against sample markdown files**

Run:

```bash
tmpdir="$(mktemp -d)"
printf '# 1화\n\n첫 문장\n' > "$tmpdir/001.md"
printf '# 2화\n\n둘째 문장\n' > "$tmpdir/002.md"
python /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py inspect --target "$tmpdir"
python /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py rewrite --target "$tmpdir" --approved 002.md
```

Expected:
- first command prints a JSON manifest containing `001.md` then `002.md`
- second command prints a JSON manifest containing only `002.md`
- `$tmpdir/reports` and `$tmpdir/rewritten` exist after the commands
