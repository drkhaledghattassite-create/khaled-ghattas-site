# Welcome to Dr. Khaled Ghattass Site

## How We Use Claude

Based on Kamal-Chhimi's usage over the last 30 days:

Work Type Breakdown:
  Build Feature      ████████████████████  40%
  Improve Quality    ███████████████░░░░░  30%
  Plan Design        ████████░░░░░░░░░░░░  15%
  Debug Fix          █████░░░░░░░░░░░░░░░  10%

Top Skills & Commands:
  /remote-control    ████████████████████  20x/month
  /model             ████████████████░░░░  16x/month
  /effort            █████████░░░░░░░░░░░  9x/month
  /compact           ███░░░░░░░░░░░░░░░░░  3x/month
  /agents            ███░░░░░░░░░░░░░░░░░  3x/month

Top MCP Servers:
  glance             ████████████████████  120 calls
  playwright         █████████████░░░░░░░  77 calls
  claude-in-chrome   █░░░░░░░░░░░░░░░░░░░  4 calls
  magic              ░░░░░░░░░░░░░░░░░░░░  1 call

## Your Setup Checklist

### Codebases
- [ ] khaled-ghattas-site — https://github.com/drkhaledghattassite-create/khaled-ghattas-site (bilingual Next.js 15 editorial site; read `CLAUDE.md` at the repo root before any work)

### MCP Servers to Activate
- [ ] glance — Codebase overview / quick-look tool used heavily for navigating this repo. Ask Kamal for the install snippet, or check the team's `.mcp.json`.
- [ ] playwright — Browser automation for visual / E2E checks. Install with `claude mcp add playwright npx @playwright/mcp@latest`.
- [ ] claude-in-chrome — Drives an attached Chrome tab for live UI interaction. Install the Claude in Chrome extension from claude.ai and follow the in-app pairing flow.
- [ ] magic — 21st.dev Magic for generating UI component scaffolds. Get a key at 21st.dev and add the server config; only used occasionally.

### Skills to Know About
- /remote-control — Team's most-used command (custom). Ask Kamal what flow it triggers — it's the dominant workflow this month.
- /model — Switch the active Claude model (Opus / Sonnet / Haiku). Default here is Opus 4.7 for deep work.
- /effort — Tune effort level for the current session (e.g., `max` for the deepest reasoning).
- /compact — Compress conversation history when context fills up.
- /agents — List/manage project subagents. There are 8 configured in `.claude/agents/` (design-auditor, code-reviewer, qalem-implementer, translation-syncer, security-auditor, content-swapper, seo-checker, accessibility-checker). Verify with `claude agents`.
- /mcp — Manage MCP server connections.
- /advisor — Bounce the current transcript off a stronger reviewer model for a second opinion before committing to an approach.
- /ultrareview — Multi-agent cloud review of the current branch or a GitHub PR (`/ultrareview <PR#>`). User-triggered and billed.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
