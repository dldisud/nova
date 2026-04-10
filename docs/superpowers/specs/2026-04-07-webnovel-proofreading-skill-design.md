# Webnovel Proofreading Skill Design Spec

## Goal
Create one reusable Codex skill that processes a folder of episode draft `.md` files in two phases:

1. Inspect each episode and report problems without rewriting it.
2. Rewrite only user-approved episodes while preserving the original source files.

The skill must optimize for "do not invent anything" over "make it prettier at any cost."

## Core Safety Rule
The skill must treat scope preservation as the highest-priority rule.

- If the source draft only covers A and B, the rewritten text must still cover only A and B.
- Do not add new settings, foreshadowing, characters, backstory, explanation, action, reaction, or worldbuilding.
- Do not "fill in" ambiguity with AI guesswork.
- Do not inflate thin scenes just to increase volume.
- Do not append fake aftertaste lines such as "그날, 세상은 아직 몰랐다" or "모든 것은 이제 시작이었다."

If a rewrite becomes cleaner but introduces new meaning, it is a failed rewrite.

## Product Shape
Build a single skill with two fixed phases.

### Phase 1: Inspection
- Scan a target folder for episode `.md` files.
- Read each file as source material for a single episode.
- Detect:
  - invented or inflated content risk
  - AI-sounding narration and filler
  - boring or slow passages
  - POV drift
  - relationship, honorific, location, memory, or timeline inconsistency
  - weak webnovel paragraph rhythm
  - combat-style mismatch when a work-specific profile is present
- Save per-episode inspection reports.
- Save one summary report for the whole batch.

### Phase 2: Rewrite
- Run only on episodes explicitly approved by the user after inspection.
- Rewrite inside the original event boundary only.
- Allow compression, reordering, paragraph splitting, phrasing cleanup, and voice correction.
- Forbid new plot information, new setting material, new reactions, or new scene outcomes.
- Save outputs to a separate folder and never overwrite the original source file.

## Skill Structure
Implement the skill as a general-purpose webnovel proofreading skill with optional work-specific overlays.

### Shared Rules
Place reusable rules in `SKILL.md`:
- no invention
- no fake emotional aftertaste
- no markdown in novel output
- no screenplay format
- show-don't-tell preference
- short mobile-friendly sentence and paragraph rhythm
- consistent POV, honorifics, movement, and memory
- inspection-first, rewrite-second workflow

### Work-Specific Rules
Place title- or protagonist-specific constraints in `references/`.

Example: a work profile may define:
- fixed protagonist POV
- character-specific speech and thought patterns
- combat identity
- growth-stage ceilings
- banned exaggeration patterns for that work

The skill should load a work-specific reference only when the user provides or selects it.

## Recommended Files
Create the skill in the default discovered location unless the user later requests another path:
`${CODEX_HOME:-$HOME/.codex}/skills`

Recommended skill name:
`webnovel-proofreader`

Recommended internal structure:

```text
webnovel-proofreader/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── scripts/
│   └── run_webnovel_pass.py
└── references/
    ├── report-format.md
    ├── rewrite-rules.md
    └── profiles/
        └── kang-jinwoo.md
```

## Why a Script Is Needed
The skill needs a lightweight script because folder traversal and output bookkeeping are repetitive and error-prone.

The script should handle:
- collecting `.md` files
- sorting them predictably
- creating `reports/` and `rewritten/` output folders
- writing inspection files and rewritten results to the right place
- supporting phase selection such as inspect-only or rewrite-approved

The script should not contain the literary policy itself. The policy belongs in the skill instructions and references.

## Folder and Output Layout
Assume the user points the skill at a working folder containing episode drafts.

Expected outputs:

```text
<target-folder>/
├── 001.md
├── 002.md
├── ...
├── reports/
│   ├── 001-report.md
│   ├── 002-report.md
│   └── summary.md
└── rewritten/
    ├── 001.md
    └── 002.md
```

Rules:
- Keep original files untouched.
- Put inspection results in `reports/`.
- Put approved rewrites in `rewritten/`.
- Reuse the original filename for rewritten episodes so matching stays simple.

## Inspection Output Shape
Inspection output must be practical, not literary criticism.

Each episode report should identify:
- whether the draft appears safe to rewrite
- where invention risk exists
- where AI tone appears
- where pacing drags
- where paragraphing fails mobile readability
- where POV or continuity may break
- what must not change during rewrite

The summary report should identify:
- files inspected
- files with high invention risk
- files that are safe candidates for phase 2
- repeated style issues across the batch

## Rewrite Output Rules
When rewriting an approved episode, output only the revised body text.

Do not output:
- analysis
- reasons for edits
- bullet commentary
- markdown decorations inside the novel body
- meta notes

The rewrite should preserve:
- original event order unless local sentence reordering improves readability without changing meaning
- established facts and relationships
- original POV constraints
- original combat identity and power ceiling if a work profile exists

## Kang Jinwoo Profile Example
The supplied Kang Jinwoo-only prompt should be converted into a work profile under `references/profiles/`.

That profile should include:
- first-person-only POV through Kang Jinwoo
- agility-specialist combat identity
- growth-stage limits on speed and spectacle
- anti-exposition and anti-overdramatization rules
- continuity checks for honorifics, knowledge, movement, and memory

This profile is an overlay, not the base skill. The base skill must remain usable on other webnovels.

## Error Handling
The skill should fail safely.

- If no `.md` files exist, stop and report that no episode drafts were found.
- If the user asks for rewrite before inspection, direct the flow back to inspection first.
- If the user requests a full-folder rewrite without approval, keep the default behavior and require explicit approval for target files.
- If the work profile is missing, continue with only shared rules instead of inventing project-specific assumptions.

## Testing Strategy
Validate at three levels.

1. Skill structure validation
- Run `quick_validate.py` on the finished skill folder.

2. Script smoke test
- Run the script on a small temp folder with sample `.md` files.
- Confirm that `reports/` and `rewritten/` are created as expected.

3. Forward-use validation
- Use the skill on a miniature example set.
- Confirm that inspection happens before rewrite.
- Confirm that rewrite output does not overwrite originals.
- Confirm that a work profile only affects runs where it is explicitly provided.

## Non-Goals
- Do not build an autonomous "rewrite every file" batch editor.
- Do not create a lore-expansion assistant.
- Do not create a general literary analysis essay generator.
- Do not optimize for maximum length.
