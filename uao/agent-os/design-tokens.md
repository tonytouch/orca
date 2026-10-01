# Design tokens: Agent OS → Orca

The two systems must not fight over colour. Both lint raw hex — Orca fails
`pnpm run check:code-quality:changed` on raw palette colours and computed
`className` strings, and Agent OS fails its own `agent-os-ui/scripts/check-hex.sh`
— so the merge needs exactly one mapping, and ported panes must use Orca's
tokens, never Agent OS's values.

## Source of truth

| Side | Canonical token source | Enforcement |
|---|---|---|
| Orca | `orca/src/renderer/src/assets/main.css` (the `@theme`/CSS-var block), primitives in `orca/src/renderer/src/components/ui/` | `pnpm run check:code-quality:changed`, `pnpm run lint:design-system`, `docs/STYLEGUIDE.md` |
| Agent OS | `agent-os-ui/src/index.css` `@theme` block | `agent-os-ui/scripts/check-hex.sh` |

Orca wins. A ported pane is restyled onto Orca tokens; Agent OS's palette is
**not** imported into the Orca renderer.

## Mapping

Agent OS tokens (from `agent-os-ui/src/index.css`, per `agent-os-ui/README.md`):

| Agent OS token | Role | Maps onto Orca |
|---|---|---|
| `--color-accent` | gold brand accent | Orca's primary/accent token — resolve by role, not by hue |
| `--color-accent-2` | blue brand accent | Orca's secondary accent |
| `--color-success` | ok | Orca's success token |
| `--color-danger` | error/deny | Orca's destructive token |
| `--color-warning` | warn | Orca's warning token |
| `--color-review` | "needs review" | no Orca equivalent — use warning + the review badge primitive |
| `--color-border-subtle` | hairline border | Orca's border token |
| `--color-border-strong` | strong border | Orca's border token at the strong tier |
| `--color-surface-raised` | card surface | Orca's elevated surface |
| `--color-accent-soft` | accent wash | Orca's accent at its softest tier |

Two rules the Agent OS README states and that carry over:

1. **Never apply opacity modifiers to pre-mixed (`color-mix`) tokens.** Agent OS
   builds those specifically to be pre-mixed; double-applying alpha silently
   changes the value.
2. **The tone-card system is 12 utility classes** for status-card border and
   background, with text colour set separately. Port them as one Orca component
   instead of copying the class list into each pane.

## The `--color-review` gap

Agent OS has a fourth status colour (review) that Orca's palette does not.
Do not invent a hue to fill it — the tone-card system already carries the
distinction and the "needs review" state is conveyed by the badge primitive.
If a ported pane genuinely needs it, raise it as a styleguide addition in
Orca's own `docs/STYLEGUIDE.md` path rather than adding a one-off hex.

## Not yet done

No mapping has been applied to any file yet. This table is the contract for
Phase 5 (pane promotion); the first ported pane is what proves it. Until then
Agent OS panes render inside Orca at their own colours via the embed path, which
is why the embed host and the native panes will look different side by side.
