# Webnovel Skill Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `webnovel-proofreader` into an inspection-focused safety checker and add a separate `munpia-optimizer` skill that uses the same batch flow but owns the final approved rewrite step.

**Architecture:** Keep the folder-scanning manifest workflow because it already works, but separate responsibilities and generated output namespaces. `webnovel-proofreader` will write only proofreader-specific reports into `proofreader-reports/`. `munpia-optimizer` will write Munpia-oriented reports into `munpia-reports/` and approved rewrites into `munpia-rewritten/`. Both skills will remain self-contained and preserve original `.md` files.

**Tech Stack:** Markdown, Python 3, unittest, Codex skill metadata.

---

### Task 1: Update Proofreader Tests for the New Output Namespace

**Files:**
- Modify: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py`

- [ ] **Step 1: Change the proofreader test expectations to the new directory names**

Update the test file so the inspect test expects:

- `proofreader-reports/summary.md`
- `proofreader-reports` to exist
- `proofreader-rewritten` to exist as the computed rewrite namespace, even though the skill no longer documents rewrite as its normal flow

Update the fixture setup to ignore `proofreader-reports/` and `proofreader-rewritten/` instead of `reports/` and `rewritten/`.

- [ ] **Step 2: Run the proofreader tests and verify they fail before the script changes**

Run:

```bash
python3 /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py
```

Expected: FAIL because the current script still writes `reports/` and `rewritten/`.

### Task 2: Update the Proofreader Script and Instructions

**Files:**
- Modify: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py`
- Modify: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/SKILL.md`
- Modify: `/mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/references/report-format.md`

- [ ] **Step 1: Change the proofreader script constants**

Modify `run_webnovel_pass.py` so it uses:

```python
REPORTS_DIRNAME = "proofreader-reports"
REWRITTEN_DIRNAME = "proofreader-rewritten"
```

and builds all output paths from those names instead of generic `reports` and `rewritten`.

- [ ] **Step 2: Re-run the proofreader tests and verify they pass**

Run:

```bash
python3 /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/tests/test_run_webnovel_pass.py
```

Expected: `OK`

- [ ] **Step 3: Rewrite the proofreader skill instructions around inspect-first safety review**

Update `SKILL.md` so it:

- describes the skill as an inspection-focused checker
- documents only the inspect flow as the normal workflow
- tells the user to hand safe files to `munpia-optimizer` for actual commercial rewriting
- keeps anti-invention rules as the top priority

- [ ] **Step 4: Update the proofreader report format**

Change `references/report-format.md` so it explicitly reports:

- whether the episode is safe to hand to `munpia-optimizer`
- what must not change during optimization

### Task 3: Scaffold the New `munpia-optimizer` Skill

**Files:**
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/SKILL.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/agents/openai.yaml`
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/`
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/references/`

- [ ] **Step 1: Run the initializer for the new skill**

Run:

```bash
PROMPT='Use $munpia-optimizer to inspect episode drafts for Munpia-style optimization points and rewrite only approved files.'
python3 /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  munpia-optimizer \
  --path /mnt/c/Users/rimur/.codex/skills \
  --resources scripts,references \
  --interface display_name='문피아 최적화기' \
  --interface short_description='문피아식 흡입력과 회차 리듬을 살려 승인본만 재집필하는 스킬' \
  --interface default_prompt="$PROMPT"
```

Expected: the initializer creates the skill folder and metadata files.

- [ ] **Step 2: Verify the generated layout exists**

Run:

```bash
find /mnt/c/Users/rimur/.codex/skills/munpia-optimizer -maxdepth 2 -type f | sort
```

Expected: output includes `SKILL.md` and `agents/openai.yaml`.

### Task 4: Write Failing Tests for the Optimizer Manifest Script

**Files:**
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/tests/test_run_munpia_pass.py`

- [ ] **Step 1: Add tests that expect `munpia-reports/` and `munpia-rewritten/`**

Write a test file that:

- expects sorted `.md` episode discovery
- expects `munpia-reports/summary.md`
- expects `munpia-reports/` and `munpia-rewritten/` directories
- expects rewrite mode to keep only approved filenames
- expects inspect mode to error when no `.md` files exist

- [ ] **Step 2: Run the optimizer tests and verify they fail before the script exists**

Run:

```bash
python3 /mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/tests/test_run_munpia_pass.py
```

Expected: FAIL because `run_munpia_pass.py` does not exist yet.

### Task 5: Implement and Test the Optimizer Script

**Files:**
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/run_munpia_pass.py`

- [ ] **Step 1: Implement the manifest script with Munpia output namespaces**

Create `run_munpia_pass.py` as a copy of the proofreader manifest helper with:

```python
REPORTS_DIRNAME = "munpia-reports"
REWRITTEN_DIRNAME = "munpia-rewritten"
```

Keep the same inspect and rewrite manifest behavior.

- [ ] **Step 2: Run the optimizer tests and verify they pass**

Run:

```bash
python3 /mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/tests/test_run_munpia_pass.py
```

Expected: `OK`

- [ ] **Step 3: Make the optimizer script executable**

Run:

```bash
chmod +x /mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/run_munpia_pass.py
```

Expected: exit code `0`

### Task 6: Write the Optimizer Instructions and References

**Files:**
- Modify: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/SKILL.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/references/report-format.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/references/rewrite-rules.md`
- Create: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/references/profiles/kang-jinwoo.md`

- [ ] **Step 1: Replace `SKILL.md` with the Munpia optimization workflow**

The final `SKILL.md` must:

- describe the skill as a commercial Munpia optimizer
- preserve original events, people, settings, and scope
- prioritize first line, opening 10-15 lines, protagonist appeal, reward timing, mobile rhythm, and episode-ending click pressure
- require inspect reports before rewrite
- require rewrite approval
- mention that safety constraints beat optimization ideas

- [ ] **Step 2: Write the optimizer report format**

The report reference must cover:

- hook weakness
- opening 10-15 line effectiveness
- protagonist selling-point clarity
- explanation-before-result drag
- reward timing weakness
- mobile paragraph drag
- ending click-pressure weakness
- absolute no-change items

- [ ] **Step 3: Write the optimizer rewrite rules**

The rewrite rules must include:

- strengthen the first line when possible inside the source boundary
- adjust the opening 10-15 lines for faster pull
- surface the protagonist's strength, lack, or desire earlier if already present in the draft
- compress explanation and sharpen result
- clarify existing reward moments without inventing new payoff
- end with clearer next-action or next-desire pressure
- forbid new scenes, new characters, new lore, new payoff, and fake grand teaser lines

- [ ] **Step 4: Copy and adapt the Kang Jinwoo profile**

Reuse the safety-critical profile rules from the proofreader skill, but add that Munpia-style optimization must remain below the work-specific character and combat rules.

### Task 7: Generate Metadata and Validate Both Skills

**Files:**
- Modify: `/mnt/c/Users/rimur/.codex/skills/munpia-optimizer/agents/openai.yaml`

- [ ] **Step 1: Regenerate the proofreader metadata only if the skill text changed enough to need it**

Run:

```bash
PROMPT='Use $webnovel-proofreader to inspect episode drafts for safety, continuity, and anti-invention issues before passing safe files to $munpia-optimizer.'
python3 /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py \
  /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader \
  --interface display_name='웹소설 퇴고 검사기' \
  --interface short_description='원고 위험 요소를 점검해 최적화 전 금지선을 잡아주는 스킬' \
  --interface default_prompt="$PROMPT"
```

Expected: metadata reflects inspection-focused positioning.

- [ ] **Step 2: Generate the optimizer metadata**

Run:

```bash
PROMPT='Use $munpia-optimizer to inspect episode drafts for Munpia-style optimization points and rewrite only approved files.'
python3 /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py \
  /mnt/c/Users/rimur/.codex/skills/munpia-optimizer \
  --interface display_name='문피아 최적화기' \
  --interface short_description='문피아식 흡입력과 회차 리듬을 살려 승인본만 재집필하는 스킬' \
  --interface default_prompt="$PROMPT"
```

Expected: `agents/openai.yaml` is created without errors.

- [ ] **Step 3: Validate both skills**

Run:

```bash
python3 /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/quick_validate.py /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader
python3 /mnt/c/Users/rimur/.codex/skills/.system/skill-creator/scripts/quick_validate.py /mnt/c/Users/rimur/.codex/skills/munpia-optimizer
```

Expected: both commands print `Skill is valid!`

- [ ] **Step 4: Run smoke tests proving outputs do not collide**

Run:

```bash
tmpdir="$(mktemp -d)"
printf '# 1화\n\n첫 문장\n' > "$tmpdir/001.md"
printf '# 2화\n\n둘째 문장\n' > "$tmpdir/002.md"
python3 /mnt/c/Users/rimur/.codex/skills/webnovel-proofreader/scripts/run_webnovel_pass.py inspect --target "$tmpdir"
python3 /mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/run_munpia_pass.py inspect --target "$tmpdir"
python3 /mnt/c/Users/rimur/.codex/skills/munpia-optimizer/scripts/run_munpia_pass.py rewrite --target "$tmpdir" --approved 002.md
```

Expected:

- `proofreader-reports/` exists
- `munpia-reports/` exists
- `munpia-rewritten/` exists
- the skills do not overwrite each other's report folders
