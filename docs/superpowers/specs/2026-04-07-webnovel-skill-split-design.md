# Webnovel Skill Split Design Spec

## Goal
Split the current webnovel workflow into two cooperating skills with similar batch mechanics but different responsibilities:

1. `webnovel-proofreader`: inspection-first safety checker
2. `munpia-optimizer`: Munpia-oriented commercial optimizer and final approved rewrite tool

The split must reduce conflicting rewrites, not just duplicate the same job under two names.

## Why Split
If both skills rewrite prose independently, they will eventually disagree on the same line for different reasons.

- The proofreader wants safety, continuity, and anti-invention discipline.
- The Munpia optimizer wants stronger opening lines, faster hook delivery, clearer reward timing, and sharper episode endings.

Those goals overlap, but they are not identical. Making both skills full editors creates avoidable collisions.

## Role Separation

### Webnovel Proofreader
Use this skill as the safety inspector.

- inspect folders of `.md` episode drafts
- produce only report files by default
- flag invention risk, AI tone, pacing drag, POV drift, continuity issues, and mobile readability issues
- identify what must not change before optimization

This skill should not be the normal final rewrite step.

### Munpia Optimizer
Use this skill as the commercial editor.

- inspect folders of `.md` episode drafts with Munpia-oriented criteria
- produce actionable optimization reports
- rewrite only user-approved episodes
- preserve the original story boundary while improving hook, speed, protagonist appeal, reward clarity, and episode-end click pressure

This skill becomes the main final rewrite tool.

## Shared Behavior
Both skills should keep the same broad flow:

1. scan a target folder of top-level `.md` files
2. sort episode files predictably
3. write per-episode reports
4. write one batch summary
5. never overwrite original source files

## Conflict Prevention Rules
Prevent cross-skill conflicts with three guardrails.

### 1. Fixed priority order

1. source boundary preservation
2. work-specific profile rules
3. Munpia optimization

If a Munpia-oriented suggestion requires new story content, it loses automatically.

### 2. Role split

- proofreader reports risk
- munpia optimizer rewrites approved files

That keeps the proofreader from acting like a second editor on the same draft.

### 3. Separate output namespaces
The two skills must not write into the same generated folders.

Recommended output paths:

```text
<target-folder>/
├── 001.md
├── 002.md
├── proofreader-reports/
│   ├── 001-report.md
│   └── summary.md
├── munpia-reports/
│   ├── 001-report.md
│   └── summary.md
└── munpia-rewritten/
    ├── 001.md
    └── 002.md
```

This prevents report overwrites and keeps the user from confusing inspection output with commercial rewrite output.

## Proofreader Output Shape
The proofreader report should answer:

- what feels unsafe or inconsistent
- where AI tone remains
- where pacing drags
- what information must not be expanded or changed
- whether the draft is safe to hand to `munpia-optimizer`

The proofreader summary should list:

- inspected files
- high-risk files
- files safe to optimize
- repeated continuity or style risks

## Munpia Optimizer Output Shape
The optimizer report should answer:

- whether the first line and opening 10-15 lines hook strongly enough
- whether the protagonist's selling points surface early enough
- whether explanation is outrunning result
- whether reward timing feels weak
- whether mobile line breaks drag
- whether the episode ending creates click pressure for the next chapter
- what cannot be changed because of proofreader-style safety boundaries

The optimizer summary should list:

- inspected files
- strong candidates for rewrite
- files that need safety fixes before optimization
- repeated opening, payoff, or ending weaknesses

## Munpia Optimization Policy
The optimizer must push for:

- stronger first line
- faster opening entry
- earlier protagonist appeal
- clearer reward timing
- sharper mobile paragraph rhythm
- stronger next-episode curiosity at the end

But it must never:

- add new incidents
- add new people
- add new setting material
- add new foreshadowing
- invent new payoff
- add fake grand teaser lines

## Recommended Skill Names
- `webnovel-proofreader`
- `munpia-optimizer`

## Validation
Validation must prove:

1. the proofreader writes only proofreader-specific reports
2. the optimizer writes Munpia-specific reports and approved rewrites
3. the two skills do not overwrite each other's output folders
4. both skills preserve original `.md` files
