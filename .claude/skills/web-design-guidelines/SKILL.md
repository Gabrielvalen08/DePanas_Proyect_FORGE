---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the pinned guidelines in `guidelines.md` (next to this file)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

The rules are a pinned copy of
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
(MIT, see `LICENSE.txt`), taken on 2026-11-10. The upstream skill fetches that URL
on every run; this project keeps a local copy instead so the instructions an agent
follows only change through a reviewed commit. To update them, replace
`guidelines.md` with the new upstream file in its own PR.

## Project notes (K-test)

- The UI copy is in Spanish: use sentence case («Empezar a practicar»), not the
  Title Case rule in the guidelines, which is for English.
- Brand, tokens and layout rules live in `docs/marca/DESIGN.md`; when they and the
  guidelines disagree on a visual choice, `DESIGN.md` wins. Accessibility rules
  always apply.

## Usage

When a user provides a file or pattern argument:
1. Read `guidelines.md`
2. Read the specified files
3. Apply all rules from the guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
