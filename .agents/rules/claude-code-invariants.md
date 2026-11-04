# Claude Code Strict Execution Invariants & Anti-Fake Success

## 1. Zero-Assertion & Zero-Fake-Success Protocol
- NEVER claim that an issue is fixed or working normally without producing raw execution logs (terminal exit code, typecheck output, or API response) in the same turn.
- NEVER use sycophantic or placating language ("Everything is working perfectly!"). Report only cold, empirical facts: files modified, line ranges, verification command run, and actual exit code.
- If a verification or runtime test fails, ALWAYS report the raw error log honestly. Never hide or swallow errors.

## 2. Deterministic Tool Contracts (No Guessing)
- NO BLIND EDITS: Always view the target file and context (`view_file` or `grep_search`) before making any edits. Never guess variable names, props, database fields, or imports.
- SURGICAL EDITS ONLY: Only edit the specific lines/functions causing the issue (`replace_file_content`). Never overwrite entire files (`write_to_file`) unless creating a new file.

## 3. Anti-Symptom Patching & Anti-Workaround
- NEVER swallow errors with empty `try-catch` blocks.
- NEVER return fake `success: true` or dummy mock fallback objects when a database query or API call fails.
- NEVER bypass authentication, roles, or security guards to make a page appear to work.
- Fix the root cause in the database schema, query logic, or API handler.

## 4. Mandatory Verification Loop (Bukan Sekadar `tsc --noEmit`)
- DILARANG MENYATAKAN SELESAI HANYA BERDASARKAN `npx tsc --noEmit` EXIT 0:
  - `tsc --noEmit` hanya membuktikan keabsahan tipe statis. Itu TIDAK membuktikan bahwa alur sistem, relasi unik database, dan antarmuka UI/UX berfungsi sebagaimana mestinya.
- WAJIB PENGUJIAN FAKTUAL SISTEM & ALUR KERJA (END-TO-END WORKFLOW):
  - Uji alur hulu-ke-hilir nyata (misal pendaftaran, pembayaran, setup onboarding, studio, dan publikasi).
  - Uji skenario batas, re-entry, dan klik ganda/idempotensi untuk mencegah deadlock atau error P2002.
- WAJIB VALIDASI RUNTIME & UI/UX NYATA:
  - Periksa respons API aktual dan pastikan tidak ada catch-block yang memuntahkan pesan error palsu.
  - Periksa perilaku antarmuka pengguna: tombol bekerja, navigasi berpindah ke rute yang benar, dan tidak ada layar macet.
  - Sediakan bukti empiris konkret (terminal logs, API status, atau browser action report).
- Typecheck statis tetap wajib: `npx tsc --noEmit` wajib Exit Code 0.

## 5. Strict Scope Isolation
- ONLY modify files explicitly requested or strictly required to solve the target bug.
- NEVER make unsolicited refactorings, style overhauls, or changes to unrelated modules.
