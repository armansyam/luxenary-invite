import { describe, it, expect } from "vitest";
import { execFileSync } from "child_process";
import path from "path";

const SCRIPT = path.join(process.cwd(), "scripts", "pg-env.cjs");

/** Lingkungan proses anak: DB_URL diisi bila `url` diberikan, dan dibuang bila tidak. */
function envWith(url?: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.DB_URL;
  if (url !== undefined) env.DB_URL = url;
  return env;
}

/** Menjalankan pg-env dan memuat hasil `export` ke objek, persis seperti yang dilakukan `eval` di shell. */
function parse(url: string): Record<string, string> {
  const out = execFileSync("node", [SCRIPT], { env: envWith(url), encoding: "utf8" });
  const fromShell = execFileSync("bash", ["-c", `${out}\nprintf '%s\\n' "$PGHOST" "$PGPORT" "$PGUSER" "$PGPASSWORD" "$PGDATABASE"`], { encoding: "utf8" }).split("\n");
  return { host: fromShell[0], port: fromShell[1], user: fromShell[2], password: fromShell[3], database: fromShell[4] };
}

describe("scripts/pg-env.cjs", () => {
  it("URL Prisma biasa dengan ?schema= dan port", () => {
    expect(parse("postgresql://luxuser:rahasia@db.internal:6543/luxenary?schema=public")).toEqual({
      host: "db.internal", port: "6543", user: "luxuser", password: "rahasia", database: "luxenary",
    });
  });

  it.each([
    ["@ mentah", "Zz@Top!Secret9"],
    ["# mentah", "Zz#Top!Secret9"],
    ["@ dan # mentah", "Zz@Top!Secret#9"],
    ["/ dan ? mentah", "a/b?c=d"],
    ["kutip tunggal dan $", "a'b$c"],
    ["titik dua", "a:b:c"],
  ])("password dengan karakter %s dibaca utuh dan host tetap benar", (_label, password) => {
    const parsed = parse(`postgresql://admin:${password}@localhost:5432/luxenary?schema=public`);
    expect(parsed).toEqual({ host: "localhost", port: "5432", user: "admin", password, database: "luxenary" });
  });

  it("password ter-encode (%40) didekode, dan '%' literal yang tidak valid dipakai apa adanya", () => {
    expect(parse("postgresql://u:p%40ss@h/db").password).toBe("p@ss");
    expect(parse("postgresql://u:100%@h/db").password).toBe("100%");
  });

  it("port bawaan 5432 dan host IPv6", () => {
    expect(parse("postgresql://u:p@localhost/db")).toMatchObject({ host: "localhost", port: "5432" });
    expect(parse("postgresql://u:p@[::1]:5433/db")).toMatchObject({ host: "::1", port: "5433" });
  });

  it("gagal dengan exit non-zero bila URL tidak valid atau kosong", () => {
    expect(() => execFileSync("node", [SCRIPT], { env: envWith("bukan-url"), stdio: "pipe" })).toThrow();
    expect(() => execFileSync("node", [SCRIPT], { env: envWith(), stdio: "pipe" })).toThrow();
    expect(() => execFileSync("node", [SCRIPT], { env: envWith("postgresql://u:p@localhost"), stdio: "pipe" })).toThrow();
  });
});
