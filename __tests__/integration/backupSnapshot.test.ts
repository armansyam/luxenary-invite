/**
 * Snapshot database: format custom pg_dump berekstensi .dump, valid untuk pg_restore, dan snapshot lama
 * (.sql, .backup) tetap dikenali. Tes membuat file nyata di direktori backup, jadi hanya berjalan pada
 * DB luxenary_test DAN storage lokal agar tidak pernah mengunggah ke R2/S3 sungguhan.
 */
import { describe, it, expect, afterAll } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma, pool } from "@/lib/prisma";
import { createDatabaseSnapshot, deleteDatabaseSnapshot, listDatabaseSnapshots, isSnapshotFile, getBackupDirectory } from "@/lib/databaseBackup";
import path from "path";

const execFileAsync = promisify(execFile);
const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const IS_LOCAL_STORAGE = (process.env.STORAGE_PROVIDER || "local") === "local";

describe("isSnapshotFile", () => {
  it("mengenali .dump, .sql, dan .backup, dan menolak yang lain", () => {
    expect(isSnapshotFile("snapshot_x.dump")).toBe(true);
    expect(isSnapshotFile("snapshot_x.sql")).toBe(true);
    expect(isSnapshotFile("snapshot_x.backup")).toBe(true);
    expect(isSnapshotFile("catatan.txt")).toBe(false);
    expect(isSnapshotFile("snapshot_x.dump.exe")).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB || !IS_LOCAL_STORAGE)("createDatabaseSnapshot", () => {
  let created = "";

  afterAll(async () => {
    if (created) await deleteDatabaseSnapshot(created);
    await prisma.$disconnect();
    await pool.end();
  });

  it("membuat berkas .dump yang dapat dibaca pg_restore dan tampil di daftar snapshot", async () => {
    const snap = await createDatabaseSnapshot("vitest");
    created = snap.filename;
    expect(snap.filename.endsWith(".dump")).toBe(true);
    expect(snap.offsiteSynced).toBe(false);

    const dir = await getBackupDirectory();
    const { stdout } = await execFileAsync("pg_restore", ["-l", path.join(dir, snap.filename)]);
    expect(stdout).toContain("dbname: luxenary_test");

    const listed = await listDatabaseSnapshots();
    expect(listed.some((s) => s.filename === snap.filename)).toBe(true);
  }, 60_000);
});
