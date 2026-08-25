<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Strict Agent Execution Protocol (Claude Code Standard)

## 1. Zero-Assertion & Anti-Fake Success Policy
- **NO Hallucinated Success:** NEVER declare an issue fixed, working, or solved without providing concrete, empirical proof from actual tool execution logs (terminal exit code, typecheck output, or API response).
- **Surface Errors Honestly:** If an error occurs, NEVER hide it or pretend it succeeded. Always display the exact error log and traceback so the root cause can be accurately resolved.
- **NO Tone Smoothing / Sycophancy:** Do not use empty pleasantries ("Everything is working perfectly now!"). Summarize with cold, verifiable facts: modified files/lines, verification command run, and actual stdout/stderr.

## 2. Deterministic Tool Contracts & Anti-Symptom Patching
- **NO Blind Edits:** ALWAYS inspect the target file and surrounding context (`view_file` or `grep_search`) before making any edits. Never guess variable names, props, or imports.
- **Surgical Edits Only:** ONLY edit the specific lines/functions causing the issue (`replace_file_content`). NEVER overwrite entire files (`write_to_file`) unless creating an entirely new file.
- **NO Workarounds / NO Dummy Fallbacks:**
  - NEVER swallow errors with empty `try-catch` blocks.
  - NEVER return fake `success: true` or mock objects when a database query or API call fails.
  - NEVER bypass authentication, roles, or security guards to make a page appear to work.
  - Fix the root cause in the database schema, query logic, or API handler.

## 3. Mandatory Empirical Verification Loop
- Before declaring any code task complete, the agent MUST run:
  - Typecheck: `npx tsc --noEmit` (MUST output Exit Code 0).
  - Relevant test or runtime checks if applicable.
- If `tsc` outputs errors, the agent MUST self-correct and re-verify before handing over to the user.

## 4. Strict Scope Isolation
- ONLY modify files explicitly requested or strictly required to solve the target bug.
- NEVER make unsolicited refactorings, style overhauls, or changes to unrelated modules.

# UI Clean Design & Professional Aesthetic Guidelines
1. **No Default OS Emojis in Professional UI:**
   - NEVER use default OS/system emojis (e.g. 🔒, ✏️, 💾, 💳, 🔑, 💰, 🌐, ⚡, 🧪, 🟢, ⚪, 📘, ❌, 👥, 💌, 🎟, 📊, 🎨, ⚙️, 🔍) in dashboard navigation, card headers, buttons, form labels, or status indicators.
   - Use clean, modern SVG vector icons or minimalist typography instead.
2. **Eliminate Redundant / Cluttering State Badges:**
   - Do NOT add redundant status badges like "🔒 Terkunci", "✏️ Mode Edit", or unnecessary decorative state tags in view modes.
   - Keep cards clean, minimal, and elegant.
3. **Clean SaaS Design System:**
   - Use subtle indicators (such as 1.5px dot indicators) with muted modern color palettes rather than heavy emoji badges.

