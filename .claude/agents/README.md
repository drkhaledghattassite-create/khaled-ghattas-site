# Project agents — drkhaledghattass.com

Eight project-scoped subagents live in this directory. Each is a focused Markdown
file with YAML frontmatter (`name`, `description`, `tools`, `model`) and a body
that is the agent's system prompt.

These agents are loaded automatically by Claude Code from `.claude/agents/`.
Verify discovery with:

```
claude agents
```

You should see all eight under "Project agents".

## The team

| Agent                    | Reads | Writes | Model  | When to invoke |
| ------------------------ | :---: | :----: | ------ | -------------- |
| `design-auditor`         | ✓     |        | sonnet | Before merging UI changes; "is this on-token". |
| `code-reviewer`          | ✓     |        | opus   | Before opening a PR; "review this branch". |
| `qalem-implementer`      | ✓     | ✓      | opus   | "Build / add / implement / create …". |
| `translation-syncer`     | ✓     | ✓ (json only) | sonnet | After UI changes; "sync translations". |
| `security-auditor`       | ✓     |        | opus   | Before launch; before Phase 6; "security review". |
| `content-swapper`        | ✓     | ✓ (data only) | sonnet | New real content arrives from Dr. Khaled. |
| `seo-checker`            | ✓     |        | sonnet | Before launch; after adding a public route. |
| `accessibility-checker`  | ✓     |        | opus   | Before launch; after building a UI surface. |

Read-only agents do NOT have `Edit` / `Write` granted. They report; the
implementer fixes. This separation is deliberate — auditors should not be able
to silently modify what they're judging.

## How invocation works

Claude Code routes agent calls in two ways:

1. **Auto-delegation** — when the Claude conversation is doing a task that
   matches an agent's `description` (e.g. user says "review this branch"), the
   parent Claude should `Agent({ subagent_type: 'code-reviewer', … })`.
2. **Explicit @-mention** — the user types `@design-auditor` or names the agent
   in their request. The parent Claude routes accordingly.

The `description` line in each agent's frontmatter is what the router reads.
Make it specific. Vague descriptions produce missed delegations.

## Common workflows

### Before pushing a UI branch
```
1. @design-auditor   → token + RTL + i18n compliance
2. @accessibility-checker → WCAG gaps
3. @code-reviewer    → quality, security, perf
4. @translation-syncer → ar.json / en.json parity
```

Run them in parallel from the same parent message — they're all read-only and
independent. Take the union of findings.

### Before launch
```
1. @security-auditor → OWASP-style audit; auth, CSRF, rate limits, secrets, headers
2. @seo-checker      → metadata, sitemap, robots, JSON-LD, OG
3. @accessibility-checker → full sweep
4. @code-reviewer    → final pass on the launch diff
```

Cross-reference findings against `LAUNCH-CHECKLIST.md`; resolve everything
critical and high before flipping the DNS.

### When real content arrives
```
1. @content-swapper  → swap real content into lib/placeholder-data.ts (and
                       messages/*.json if site copy)
2. @translation-syncer → confirm parity if messages/*.json was touched
3. @seo-checker      → re-verify the affected detail-page metadata
```

### When implementing a new feature
```
1. @qalem-implementer → build the feature
2. @design-auditor    → audit the new code
3. @translation-syncer → confirm new strings are in both locale files
4. @code-reviewer     → final review
```

## Agent teams (future)

Once the Claude Code teams feature is enabled, these same agent definitions can
be spawned as parallel teammates rather than serial subagents. Example:

> "Spawn a 3-teammate team using design-auditor, code-reviewer, and
> accessibility-checker types to do a parallel pre-merge audit. Have them
> message each other to share findings."

The agent files in this directory work for both modes — no modification
required. Teams use 3–5× more tokens than serial subagents, so reserve them
for adversarial debugging or pre-launch audits where parallel investigation
adds real value. For routine work, serial delegation is cheaper and clearer.

## Maintenance

When changing an agent:

1. Edit the `.md` file.
2. Run `claude agents` to confirm it still parses.
3. Test with a representative invocation.
4. Commit with a message describing the change.

Don't:

- Grant `WebFetch` / `WebSearch` unless the agent genuinely needs to look at
  external URLs (`seo-checker` is the one exception today).
- Grant `Bash` to a read-only auditor when `Read`+`Grep`+`Glob` would do — keep
  capabilities minimal.
- Write descriptions like "general code helper". Describe a concrete trigger
  and a concrete output.
- Bloat a system prompt past ~200 lines. Focus is power.

## Where to learn more

- Project conventions: `CLAUDE.md` (root).
- Pending real content: `CONTENT-NEEDED.md`.
- Launch readiness: `LAUNCH-CHECKLIST.md`.
- Outstanding follow-ups: `TODO.md`.
