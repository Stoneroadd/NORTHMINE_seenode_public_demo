---
target: landing page (SaaSPrototypePage) re-critique after P0-P2 fixes
total_score: 23
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 0
timestamp: 2026-08-05T13-21-43Z
slug: ponents-brand-prototype-saas-saasprototypepage-tsx
---
Method: dual-agent (A: a58b4f73dad76996d · B: a4f7f7cbd8bacda70), re-critique after P0/P1/P2 fixes from the previous run.

### Design Health Score

Heuristics 7, 9, 10 scored n/a this run (no forms/errors on this page, persuade-mode). Applicable max 28.

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Sticky header + scroll progress; no other in-page state needed |
| 2 | Match Between System and Real World | 4/4 | CAEX/pala/FMS/turno/brecha — exact operator vocabulary |
| 3 | User Control and Freedom | 3/4 | Nav anchors work; no back-to-top on long scroll |
| 4 | Consistency and Standards | 4/4 | Numbered-step motif, mono-label kickers, card patterns repeat predictably |
| 5 | Error Prevention | 3/4 | Clear synthetic-data disclaimers where relevant |
| 6 | Recognition Rather Than Recall | 3/4 | Nav labels short/clear; "Diferencia" is a slight stretch for the FMS-comparison table |
| 7 | Flexibility and Efficiency | n/a | Persuade-mode landing page |
| 8 | Aesthetic and Minimalist Design | 3/4 | Mostly disciplined; the ProblemSolution answer-card overstretch (since fixed) was the one defect found |
| 9 | Help Recognize/Recover from Errors | n/a | No forms/errors on this page |
| 10 | Help and Documentation | n/a | Persuade-mode landing page |
| **Total** | | **23/28 (82%) — Good** | |

Not directly comparable to the previous run's 22/32 (different heuristics scored n/a this time — 7/9/10 vs 7/10 — read the trend as directional, not point-for-point).

### Fixed issues — confirmed resolved

1. ModuleGallery removed — only the single Decision Cockpit capture remains as product evidence.
2. Duplicate "Ingresar a la demo" CTA — merged to one pair.
3. 8-item problem list — confirmed split into 3 labeled, continuously-numbered (01-08) clusters; genuinely improves scanability.
4. NorthmineDefinition — confirmed mounted right after the hero with its Estado→Brecha→Causa→Riesgo→Acción→Resultado sequence.

### New issues found this run (verified by hand, not just taken on the automated tools' word)

**[Verified real, fixed in this pass] Primary CTA button contrast ~2.2:1.** The browser-injected detector flagged white-on-amber text on `.ns-btn--primary`; measured the actual rendered `color` via `getComputedStyle` and confirmed it was rgb(242,243,239) (near-white) instead of the source file's declared `#170f0a` (dark). Root cause: `.nm-saas a { color: inherit }` (specificity 0,1,1) was silently beating the unprefixed `.ns-btn--primary { color: #170f0a }` (specificity 0,1,0). Fixed by scoping all `.ns-btn*` rules under `.nm-saas` to match the base rule's specificity. Confirmed post-fix: computed color is now rgb(23,15,10) = #170f0a as intended.

**[Verified real, fixed in this pass] `.ns-problem__answer` empty space.** CSS Grid's default `align-items: stretch` made the answer card match the height of the now-taller (3-group) 8-item list, leaving visible empty space at the card's bottom (confirmed via screenshot). Fixed with `align-self: start` plus `position: sticky` so the card sits at natural height and stays in view while the longer list scrolls past, rather than just capping height and leaving a static gap.

**[Investigated, likely false positive — not fixed] "1.0:1 invisible text" on `.ns-comparison__column-label`.** The browser-injected detector reported this as a severe finding. Measured directly via `getComputedStyle`: actual computed color/background resolve to ~4.25:1 (readable gray-on-black), not 1:1. The detector's contrast calculation appears to lose track of `background-image` gradients on some elements and falls back to an incorrect ancestor value — the same class of bug that made the primary-button finding look worse than the true button-background gradient (though in that case the underlying color-inheritance bug was real, just not exactly as first described). Not acted on without further reproduction.

### Remaining, not fixed this pass (lower priority, flagged for user to decide)

- **[P3] `--ns-text-muted` (#6f756f) on `--ns-black` (#070807) measures ~4.25:1** — just under the 4.5:1 AA threshold for normal text. This is a global design token used for every mono-label kicker sitewide, pre-existing (not introduced this session). Fixing it means nudging a core token, which has site-wide reach beyond this landing page — flagged, not changed, pending a decision.
- **[P3] Background photo bleed-through still appears in 3+ sections** (ArchitectureDiagram, ResponsibleAI, DecisionCases, in addition to the ones already addressed) — the earlier fix only targeted the 3 originally-flagged consecutive sections (Architecture/Comparison/Flow) and only changed 2 of those 3; the "no repeated bleed-through" goal is now partially rather than fully met.
- **[P3] Nav label "Diferencia"** is a weak content scent for what FMSComparison (a direct FMS-vs-NORTHMINE capability table) actually contains.

### Persona red flags

- **Riley (skeptical technical evaluator)**: would have stalled at the empty answer-card whitespace, reading it as unfinished — now fixed.
- **Casey (time-pressed exec skimmer)**: problem section is now easier to skim thanks to the 3 clusters; no longer a concern.
- **Jordan**: mobile viewport behavior of the newly-clustered problem list and the definition section's two-column grid remains unverified in this session (window-resize tooling didn't cooperate) — worth a real-device check.

### Questions to Consider

1. With only one product screenshot now carrying all product-evidence weight, is a single static Decision Cockpit capture enough to survive a skeptical technical evaluator's "show me it's real" scrutiny?
2. Is it worth nudging `--ns-text-muted` site-wide to clear 4.5:1, given it's currently a ~0.25:1 miss used purely for decorative kickers, not primary reading content?
3. Now that 2 of 3 originally-flagged sections got a "quiet" background, does finishing the other repeated-photo sections (ResponsibleAI, DecisionCases) matter enough to prioritize, or is the current mix (cinematic tint + 2 quiet + a few more photo-bled sections) good enough variety already?
