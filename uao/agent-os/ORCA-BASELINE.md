# Historical Orca baseline (v1.4.203 vendor)

This record describes the pin the Agent OS patch was written against. This UAO fork tracks upstream `main` (package 1.4.214 when the patch was applied) and keeps the integration as a rebaseable overlay. See [`README.md`](./README.md).

# Orca baseline (vendored)

This tree is a **hard fork** of upstream Orca, vendored as source. See
`../docs/architecture/orca-agentos-merge.md` for the merge topology and
`agent-os/TOUCHPOINTS.md` for everything this repo changes inside it.

| Field | Value |
|---|---|
| Upstream | https://github.com/stablyai/orca.git |
| Pinned ref | `v1.4.203` (release tag — the build the server actually runs) |
| Pinned commit | `776e424e76405a06851dd9ec9ff3b58ffbdb3eea` |
| Upstream version | 1.4.203 |
| Commit date | 2026-09-15T05:13:05Z |
| Commit subject | `release: v1.4.203` |
| Vendored by | `scripts/vendor-orca.sh` |
| Upstream files | 25626 |
| Fork-boundary files | 9 (this repo's own additions; see below) |
| License | MIT (see `LICENSE` — retained in full) |

## Why this pin: it is the deployed build

The pin is the commit the running server was built from, so **a source-level
conclusion describes the binary on the box** — which was not true of either
earlier pin.

Identity of the deployed build, established from its own contents rather than
from a version string:

- `/home/tony/orca/VERSION` → `v1.4.203`
- `squashfs-root/resources/app.asar.unpacked/out/package.json` → `"version": "1.4.203"`
  (read independently of the `VERSION` file, so the two corroborate)
- `v1.4.203` peels to `776e424e76405a06851dd9ec9ff3b58ffbdb3eea`, matching the
  GitHub tags API `commit.sha` exactly
- No embedded 40-hex build SHA exists anywhere in the build, so the release tag
  is the strongest identity available — hence "the commit the tag points at",
  not "the commit the binary records".

Every `serve` flag used by `systemd/installed/orca-serve.service` is present in
both the deployed CLI and this tree (`--port`, `--pairing-address`,
`--mobile-pairing`, `--no-pairing`, `--project-root`, `--recipe-json`), so the
unit is valid against the running binary, not merely against source.

**This parity is a snapshot, not a guarantee.** The AppImage auto-updates
(`squashfs-root/resources/app-update.yml`: github provider, `releaseType: release`),
so the deployed build will move on its own. When `/home/tony/orca/VERSION`
changes, this pin is one command away from being re-derived:

```bash
scripts/diff-orca-upstream.sh v1.4.205    # or whatever the new VERSION reads
scripts/vendor-orca.sh v1.4.205          # re-pin, if that is what you want
```

## Pin history — it moved twice, and why

| # | Ref | Commit | `package.json` | vs. the deployed `v1.4.203` |
|---|---|---|---|---|
| 1 | `main` (first vendor) | `7909dad7` | 1.4.197 (stale) | 4,781 files, +879,293 / −41,605 |
| 2 | `v1.4.206` | `c464b101` | 1.4.206 | 3,277 files, +680,489 / −33,564 |
| 3 | **`v1.4.203` (current)** | **`776e424e`** | **1.4.203** | **identical — it is the runtime** |

Two lessons that cost real work to learn:

**Version numbers do not order these commits.** Orca bumps `package.json` on the
release line, so `main` carried ~880k lines that no release had while still
advertising 1.4.197. Never rank two Orca commits by their version string.

**The release line moves fast.** Three releases — `v1.4.203` → `v1.4.206` —
span 3,277 files and 680k lines. "One release behind" is not a small delta here;
it is a different program in all but name. That is also why a pin that matches
the deployed build is worth more than a pin that is merely newer: it is the only
pin for which source and runtime cannot disagree.

Reproduce any row:

```bash
scripts/diff-orca-upstream.sh v1.4.203        # pin vs. a ref
scripts/diff-orca-upstream.sh v1.4.203 --files
```

## Integrity

Verified in both directions against the upstream file set:

```
0 missing from orca/   (every v1.4.203 file is present)
0 stale in orca/       (nothing left over from an earlier pin)
25626 upstream files + 9 fork-boundary files = 25635 files in orca/
```

The 9 fork-boundary files are this repo's own additions, not upstream's, and are
excluded from the comparison by pattern:

```
Makefile
ORCA-BASELINE.md
ORCA-BASELINE.sha
agent-os/**            (6 files: README, TOUCHPOINTS, design-tokens,
                        agents/agent-os-cli-agents.json,
                        renderer/agent-os-api-client.ts,
                        supervisor/agent-os-backend-supervisor.ts)
```

Upstream has no `Makefile`, no `agent-os/`, and no `ORCA-BASELINE*` anywhere in
the tree, so the pattern cannot mask a real upstream file. Re-check with:

```bash
scripts/vendor-orca.sh --reuse
```

## The SMB deletion trap (an earlier version of this file got this wrong)

A previous revision claimed that unlinking over this SMB mount was unreliable
and that 37 files were permanently stuck, to be removed by hand on the host.
The **symptom was real, the conclusion was wrong**, and the fix is now built into
`scripts/vendor-orca.sh`:

- `unlink` on some names returns `ENOENT` **while `stat` and reads on the same
  name succeed**. That is macOS `smbfs` serving dentry metadata from cache, not a
  permission or filesystem problem — creating and deleting a *new* file in the
  same directory works, so the share and the directory both accept unlinks.
- **`rename` on the same name succeeds, and deleting the renamed entry works.**
  So the script now renames a stale path to `<path>.stale-probe` and removes
  that. This cleared, end to end, the 1,538 files left over when the pin moved
  from `v1.4.206` → `v1.4.203` (1,497 by plain `rm`, the last 41 by rename).
- `rm -f` hides the failure this whole investigation turns on: it suppresses the
  `ENOENT` that distinguishes "deleted" from "not deleted". Do not use `-f` when
  you are trying to learn what happened.

The other SMB hazard stands unchanged: **Samba vetoes names beginning with `._`,
and a naive `rsync` creates exactly such a temp name for `mobile/app/_layout.tsx`,
which kills the copy and leaves `src/`, `native/`, `skills/` empty while
reporting failure only at the end.** `--inplace` is required and is baked in.

## Sync policy

Hard fork: this tree is **not** updated wholesale. Do not run `git pull`,
`git subtree`, or an upstream merge against it. To take an upstream change,
re-vendor into a scratch clone, diff against the pinned commit, and hand-port
the hunks into `orca/agent-os/` or the files listed in
`agent-os/TOUCHPOINTS.md`.

Quarterly, triage upstream for security-relevant work only — auth, the
preload/IPC surface, the auto-updater, native dependencies, and the
child-process/EDR rules upstream documents in its own `AGENTS.md`.

Upstream context for judging that cadence: the repo is ~6 months old
(created 2026-03-17), was pushed within hours of this vendoring, and carries
71.5k stars / 4.7k forks / 6,265 open issues. You are the maintainer of this
copy now.

> Vendoring is bulk source and belongs in its own commit. This workspace also
> carries unrelated in-flight edits and ~2,400 SMB-induced file-mode flips, so
> never commit it together with anything else.
