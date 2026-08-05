# Fidelity audit — Create Post + AI Copilot channels (2026-08-05)

Source: `composeVals()` / compose sheet (~460–540) and agent composer
(~1590–1603) in `design/handoff/design/PostQueen App v2.dc.html`.
App: `manage.modal.tsx`, `picks.socials.component.tsx`, `editor.tsx`,
`agent.input.tsx`, `agent.chat.tsx`.

Status legend: **Match** · **Delta** · **Intentional** · **Raise**

---

## Create Post (compose sheet)

| Element | Design | App | Status |
| --- | --- | --- | --- |
| Select channels label + badge | UPPERCASE soft + pill `none yet` / `N selected` | `manage.modal.tsx` | **Match** (this pass) |
| Channel circles | 46px, brand ring when on | `PicksSocialsComponent` (pq tokens) | **Match** |
| Let AI write banner | Gradient strip + Claude / ChatGPT pills + dismiss | `editor.tsx` (empty first post) | **Match** LOOK |
| Banner destinations | Design → `page: aiagents` + `aiPick` | Both pills → `/connections` | **Raise** (WORK) |
| CopilotPopup FAB | Design in-sheet AI FAB | Repo `CopilotPopup` kept | **Intentional** (composer.md R1) |

### Raise

| Topic | Why |
| --- | --- |
| Claude / ChatGPT product pick | Design opens an Integrations-style picker (`aiagents`). Repo has no that surface; real MCP setup is **Connections** (`/connections`). Banner is deep-link LOOK only — do not invent a Claude/ChatGPT API write path. |

---

## AI Copilot composer chips

| Element | Design | App | Status |
| --- | --- | --- | --- |
| Empty | soft label `No channel selected` (`chatPostingLabel`) | Muted pill CTA `No channels selected · Select channels` → opens left list / mobile drawer | **Intentional** (owner polish 2026-08-05; prior pass wrongly used compose `none yet`) |
| Selected | `Posting to` + h26 pills (avatar + platform) | `agent.input.tsx` + left `AgentList` → `PropertiesContext` | **Match** |
| MCP empty hero card | Prefer your own AI tool → connections | `agent.chat.tsx` empty state | **Match** (prior) |

Left channel selection already syncs into `properties` → bottom pills; empty CTA only focuses/opens the list — same selection WORK.

**Note:** Compose sheet still uses design `none yet` pill next to SELECT CHANNELS (`manage.modal.tsx`). That string is compose-only (`composeSelLabel`), not Copilot.

---

## How to verify

1. Calendar → create post → empty channels badge reads **none yet**; pick circles → **N selected**.
2. Empty editor shows **Let AI write this post**; Claude/ChatGPT go to `/connections`; dismiss hides until localStorage cleared.
3. Agents → no channels → composer shows muted pill **No channels selected · Select channels**; click expands/opens left list; select → **Posting to** pills.

```bash
scripts/ui-migration-check.sh --update
```
